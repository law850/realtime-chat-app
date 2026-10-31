import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        await self.send_history()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        action = text_data_json.get('action', 'message')

        if action == 'delete':
            message_id = text_data_json.get('id')
            await self.delete_message_from_db(message_id)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_deleted',
                    'id': message_id
                }
            )
            
        elif action == 'edit':
            message_id = text_data_json.get('id')
            new_message = text_data_json.get('message')
            
            await self.edit_message_in_db(message_id, new_message)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'message_edited',
                    'id': message_id,
                    'message': new_message
                }
            )
            
        else:
            message = text_data_json['message']
            username = text_data_json.get('username', 'Anonymous')
            reply_to_id = text_data_json.get('reply_to') # <-- NEW

            msg_id = await self.save_message(username, self.room_name, message, reply_to_id)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'id': msg_id,
                    'message': message,
                    'username': username,
                    'room': self.room_name,
                    'reply_to': reply_to_id # <-- NEW
                }
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'id': event['id'],
            'message': event['message'],
            'username': event['username'],
            'room': event['room'],
            'reply_to': event.get('reply_to') # <-- NEW
        }))

    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            'action': 'delete',
            'id': event['id']
        }))

    async def message_edited(self, event):
        await self.send(text_data=json.dumps({
            'action': 'edit',
            'id': event['id'],
            'message': event['message']
        }))

    @database_sync_to_async
    def save_message(self, username, room, content, reply_to_id=None): # <-- NEW
        msg = Message.objects.create(
            username=username, 
            room=room, 
            content=content, 
            reply_to_id=reply_to_id
        )
        return msg.id

    @database_sync_to_async
    def delete_message_from_db(self, message_id):
        Message.objects.filter(id=message_id).delete()

    @database_sync_to_async
    def edit_message_in_db(self, message_id, new_content):
        Message.objects.filter(id=message_id).update(content=new_content)

    @database_sync_to_async
    def get_history(self):
        # NEW: Include reply_to in the history
        messages = list(Message.objects.filter(room=self.room_name).order_by('-timestamp')[:50].values('id', 'username', 'content', 'reply_to'))
        return messages[::-1] 

    async def send_history(self):
        history = await self.get_history()
        for msg in history:
            await self.send(text_data=json.dumps({
                'id': msg['id'],
                'message': msg['content'],
                'username': msg['username'],
                'room': self.room_name,
                'reply_to': msg['reply_to'] # <-- NEW
            }))