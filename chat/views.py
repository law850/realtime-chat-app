from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from .models import UserProfile, Room, RoomMember

@csrf_exempt
@api_view(['POST'])
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    question = request.data.get('question')
    answer = request.data.get('answer')

    if not username or not password or not question or not answer:
        return Response({'error': 'Please fill all fields'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password)
    UserProfile.objects.create(user=user, security_question=question, security_answer=answer.lower())
    
    return Response({'message': 'User created successfully'}, status=status.HTTP_201_CREATED)

@csrf_exempt
@api_view(['POST'])
def reset_password(request):
    username = request.data.get('username')
    answer = request.data.get('answer')
    new_password = request.data.get('new_password')

    if not username or not answer or not new_password:
        return Response({'error': 'Please fill all fields'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username=username)
        profile = UserProfile.objects.get(user=user)
        
        if profile.security_answer != answer.lower():
            return Response({'error': 'Incorrect security answer'}, status=status.HTTP_401_UNAUTHORIZED)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@csrf_exempt
@api_view(['POST'])
def change_password(request):
    username = request.data.get('username')
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not username or not old_password or not new_password:
        return Response({'error': 'Please fill all fields'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=old_password)
    
    if user is not None:
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
    else:
        return Response({'error': 'Incorrect current password'}, status=status.HTTP_401_UNAUTHORIZED)

@csrf_exempt
def upload_file(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        file_name = default_storage.save(f"chat_uploads/{file.name}", file)
        file_url = f"/media/{file_name}"
        return JsonResponse({'url': file_url})
    return JsonResponse({'error': 'Invalid request'}, status=400)

# --- ADMIN VIEWS ---

@api_view(['GET'])
def check_admin(request):
    username = request.query_params.get('username')
    room_name = request.query_params.get('room')
    
    try:
        user = User.objects.get(username=username)
        room = Room.objects.get(name=room_name)
        member = RoomMember.objects.get(user=user, room=room)
        
        if member.role == 'admin':
            return Response({'is_admin': True}, status=status.HTTP_200_OK)
        return Response({'is_admin': False}, status=status.HTTP_200_OK)
    except:
        return Response({'is_admin': False}, status=status.HTTP_200_OK)

@api_view(['GET'])
def get_room_members(request):
    room_name = request.query_params.get('room')
    try:
        room = Room.objects.get(name=room_name)
        members = RoomMember.objects.filter(room=room).select_related('user')
        member_data = [{'username': m.user.username, 'role': m.role} for m in members]
        return Response({'members': member_data}, status=status.HTTP_200_OK)
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

@csrf_exempt
@api_view(['POST'])
def add_member(request):
    admin_username = request.data.get('admin_username')
    room_name = request.data.get('room_name')
    new_member_username = request.data.get('new_member_username')

    try:
        admin = User.objects.get(username=admin_username)
        room = Room.objects.get(name=room_name)
        
        admin_member = RoomMember.objects.get(user=admin, room=room)
        if admin_member.role != 'admin':
            return Response({'error': 'You are not an admin of this room.'}, status=status.HTTP_403_FORBIDDEN)

        new_member = User.objects.get(username=new_member_username)
        RoomMember.objects.get_or_create(user=new_member, room=room, defaults={'role': 'member'})
        
        return Response({'message': f'{new_member_username} added to {room_name}'}, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response({'error': f'User "{new_member_username}" does not exist. Please ask them to register first.'}, status=status.HTTP_404_NOT_FOUND)
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    except RoomMember.DoesNotExist:
        return Response({'error': 'You are not in this room'}, status=status.HTTP_403_FORBIDDEN)

@csrf_exempt
@api_view(['POST'])
def remove_member(request):
    admin_username = request.data.get('admin_username')
    room_name = request.data.get('room_name')
    member_to_remove = request.data.get('member_to_remove')

    try:
        admin = User.objects.get(username=admin_username)
        room = Room.objects.get(name=room_name)
        
        admin_member = RoomMember.objects.get(user=admin, room=room)
        if admin_member.role != 'admin':
            return Response({'error': 'You are not an admin of this room.'}, status=status.HTTP_403_FORBIDDEN)

        member = User.objects.get(username=member_to_remove)
        RoomMember.objects.filter(user=member, room=room).delete()
        
        return Response({'message': f'{member_to_remove} removed from {room_name}'}, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    except Room.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    except RoomMember.DoesNotExist:
        return Response({'error': 'You are not an admin of this room.'}, status=status.HTTP_403_FORBIDDEN)

# --- CREATE ROOM & FETCH ROOMS ---

@csrf_exempt
@api_view(['POST'])
def create_room(request):
    username = request.data.get('username')
    room_name = request.data.get('room_name')

    if not username or not room_name:
        return Response({'error': 'Missing data'}, status=status.HTTP_400_BAD_REQUEST)

    formatted_room = room_name.strip().lower().replace(' ', '-')

    # --- FIXED LOGIC: Bulletproof DM validation ---
    is_valid = True
    error_message = ''
    
    if '-' in formatted_room:
        users_in_room = formatted_room.split('-')
        for u in users_in_room:
            if not User.objects.filter(username=u).exists():
                is_valid = False
                error_message = f'User "{u}" does not exist. Please ask them to register first.'
                break # Stop checking immediately if one is invalid

    # If validation failed, return the error and stop execution completely
    if not is_valid:
        return Response({'error': error_message}, status=status.HTTP_404_NOT_FOUND)
    # ----------------------------------------------

    try:
        user = User.objects.get(username=username)
        
        if Room.objects.filter(name=formatted_room).exists():
            return Response({'error': 'Room already exists'}, status=status.HTTP_400_BAD_REQUEST)

        room = Room.objects.create(name=formatted_room, created_by=user)
        RoomMember.objects.create(user=user, room=room, role='admin')
        
        return Response({'message': 'Room created successfully', 'room_name': formatted_room}, status=status.HTTP_201_CREATED)

    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@csrf_exempt
@api_view(['GET'])
def get_all_rooms(request):
    username = request.query_params.get('username')
    
    if not username:
        return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username=username)
        user_rooms = RoomMember.objects.filter(user=user).values_list('room__name', flat=True)
        return Response({'rooms': list(user_rooms)}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)