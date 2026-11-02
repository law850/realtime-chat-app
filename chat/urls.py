from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('register/', views.register_user, name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('reset-password/', views.reset_password, name='reset_password'),
    path('change-password/', views.change_password, name='change_password'),
    path('upload/', views.upload_file, name='upload_file'),
    
    # --- NEW ADMIN ROUTES ---
    path('check-admin/', views.check_admin, name='check_admin'),
    path('room-members/', views.get_room_members, name='room_members'),
    path('add-member/', views.add_member, name='add_member'),
    path('remove-member/', views.remove_member, name='remove_member'),
    path('create-room/', views.create_room, name='create_room'),
    path('rooms/', views.get_all_rooms, name='get_all_rooms'),
]