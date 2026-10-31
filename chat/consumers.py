import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get the room name from the URL
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send the history for this specific room
        await self.send_history()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        username = text_data_json.get('username', 'Anonymous')

        # Save the message to the database with the room name
        await self.save_message(username, self.room_name, message)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'username': username,
                'room': self.room_name
            }
        )

    async def chat_message(self, event):
        message = event['message']
        username = event['username']
        room = event['room']

        await self.send(text_data=json.dumps({
            'message': message,
            'username': username,
            'room': room
        }))

    @database_sync_to_async
    def save_message(self, username, room, content):
        Message.objects.create(username=username, room=room, content=content)

    @database_sync_to_async
    def get_history(self):
        # Get history for this specific room only
        messages = list(Message.objects.filter(room=self.room_name).order_by('-timestamp')[:50].values('username', 'content'))
        return messages[::-1] 

    async def send_history(self):
        history = await self.get_history()
        for msg in history:
            await self.send(text_data=json.dumps({
                'message': msg['content'],
                'username': msg['username'],
                'room': self.room_name
            }))