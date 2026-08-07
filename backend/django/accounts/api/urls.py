"""
Accounts API - URL Configuration
"""

from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),

    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('me/', views.current_user, name='current_user'),
    path('student-profile/', views.StudentProfileView.as_view(), name='student_profile'),
    path('faculty-profile/', views.FacultyProfileView.as_view(), name='faculty_profile'),

    # Admin
    path('users/', views.UserListView.as_view(), name='user_list'),
]
