"""URL configuration for the attendance app."""

from django.urls import path
from . import views

app_name = 'attendance'

urlpatterns = [
    path('', views.redirect_to_role_dashboard, name='index'),
    path('student/', views.student_dashboard, name='student_dashboard'),
    path('faculty/', views.faculty_dashboard, name='faculty_dashboard'),
    path('admin/', views.admin_reports, name='admin_reports'),
    path('history/', views.attendance_history, name='attendance_history'),
]
