import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'chat_room'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send the last 50 messages to the user who just connected
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

        # Save the message to the database
        await self.save_message(username, message)

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'username': username
            }
        )

    async def chat_message(self, event):
        message = event['message']
        username = event['username']

        await self.send(text_data=json.dumps({
            'message': message,
            'username': username
        }))

    # --- HELPER FUNCTIONS ---

    @database_sync_to_async
    def save_message(self, username, content):
        Message.objects.create(username=username, content=content)

    @database_sync_to_async
    def get_history(self):
        # Get the last 50 messages, order them oldest to newest
        messages = list(Message.objects.order_by('-timestamp')[:50].values('username', 'content'))
        return messages[::-1] 

    async def send_history(self):
        history = await self.get_history()
        for msg in history:
            await self.send(text_data=json.dumps({
                'message': msg['content'],
                'username': msg['username']
            }))