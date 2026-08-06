"""
Courses API - URL Configuration
"""

from django.urls import path
from . import views

app_name = 'courses_api'

urlpatterns = [
    # Courses
    path('', views.CourseListCreateView.as_view(), name='course_list'),
    path('<int:pk>/', views.CourseDetailView.as_view(), name='course_detail'),

    # My Courses
    path('my-courses/', views.MyCoursesView.as_view(), name='my_courses'),

    # Enrollments
    path('enrollments/', views.EnrollmentListView.as_view(), name='enrollment_list'),
    path('enrollments/<int:pk>/', views.EnrollmentDetailView.as_view(), name='enrollment_detail'),
    path('enrollments/<int:enrollment_id>/approve/', views.ApproveEnrollmentView.as_view(), name='enrollment_approve'),
    path('enrollments/<int:enrollment_id>/reject/', views.RejectEnrollmentView.as_view(), name='enrollment_reject'),

    # Course Materials
    path('<int:course_id>/materials/', views.CourseMaterialsView.as_view(), name='course_materials'),

    # Attendance
    path('attendance/', views.AttendanceListView.as_view(), name='attendance_list'),
    path('<int:course_id>/attendance/', views.MarkAttendanceView.as_view(), name='mark_attendance'),
    path('my-attendance/', views.MyAttendanceView.as_view(), name='my_attendance'),
]
