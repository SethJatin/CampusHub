"""
Courses App - URL Configuration
"""

from django.urls import path
from . import views

app_name = 'courses'

urlpatterns = [
    # Course URLs
    path('', views.course_list, name='course_list'),
    path('<int:course_id>/', views.course_detail, name='course_detail'),
    path('<int:course_id>/enroll/', views.enroll_course, name='enroll_course'),
    path('<int:course_id>/upload/', views.material_upload, name='material_upload'),
    path('<int:course_id>/attendance/', views.mark_attendance, name='mark_attendance'),

    # My Courses
    path('my-courses/', views.my_courses, name='my_courses'),

    # Enrollment Management
    path('enrollments/', views.manage_enrollments, name='manage_enrollments'),
    path('enrollments/<int:enrollment_id>/approve/', views.approve_enrollment, name='approve_enrollment'),
    path('enrollments/<int:enrollment_id>/reject/', views.reject_enrollment, name='reject_enrollment'),

    # Attendance
    path('attendance/', views.my_attendance, name='my_attendance'),
]
