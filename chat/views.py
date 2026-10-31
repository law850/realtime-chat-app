from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
import os

@csrf_exempt
def upload_file(request):
    if request.method == 'POST' and request.FILES.get('file'):
        file = request.FILES['file']
        file_name = default_storage.save(f"chat_uploads/{file.name}", file)
        file_url = f"/media/{file_name}"
        return JsonResponse({'url': file_url})
    return JsonResponse({'error': 'Invalid request'}, status=400)