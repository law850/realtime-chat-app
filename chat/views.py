from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from .models import UserProfile

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

    # Create the user
    user = User.objects.create_user(username=username, password=password)
    
    # Create the user profile with the security question
    UserProfile.objects.create(
        user=user, 
        security_question=question, 
        security_answer=answer.lower()
    )
    
    return Response({'message': 'User created successfully'}, status=status.HTTP_201_CREATED)

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
        
        # Check if the security answer matches
        if profile.security_answer != answer.lower():
            return Response({'error': 'Incorrect security answer'}, status=status.HTTP_401_UNAUTHORIZED)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@csrf_exempt
def upload_file(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        file_name = default_storage.save(f"chat_uploads/{file.name}", file)
        file_url = f"/media/{file_name}"
        return JsonResponse({'url': file_url})
    return JsonResponse({'error': 'Invalid request'}, status=400)