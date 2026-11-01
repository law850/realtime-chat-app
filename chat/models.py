from django.db import models
from django.contrib.auth.models import User

class Message(models.Model):
    username = models.CharField(max_length=255)
    room = models.CharField(max_length=255, default='public')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')

    def __str__(self):
        return f"{self.username}: {self.content[:20]}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    security_question = models.CharField(max_length=255)
    security_answer = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.user.username}'s Profile"