from django.db import models

class Message(models.Model):
    username = models.CharField(max_length=255)
    room = models.CharField(max_length=255, default='public')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    # NEW: Link to the message being replied to
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')

    def __str__(self):
        return f"{self.username}: {self.content[:20]}"