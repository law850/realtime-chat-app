from django.db import models
from django.contrib.auth.models import User

class Room(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_rooms')

    def __str__(self):
        return self.name

class RoomMember(models.Model):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('member', 'Member'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')

    class Meta:
        unique_together = ('user', 'room') # A user can only be in a room once

    def __str__(self):
        return f"{self.user.username} in {self.room.name} ({self.role})"

class Message(models.Model):
    username = models.CharField(max_length=255)
    room = models.CharField(max_length=255, default='public') # We keep this as text for now to not break existing messages
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    # --- NEW FIELD ADDED HERE ---
    is_edited = models.BooleanField(default=False) 

    def __str__(self):
        return f"{self.username}: {self.content[:20]}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    security_question = models.CharField(max_length=255)
    security_answer = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.user.username}'s Profile"