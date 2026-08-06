"""URL configuration for attendance APIs."""

from django.urls import path
from . import views

app_name = 'attendance_api'

urlpatterns = [
    path('mark/<int:course_id>/', views.MarkAttendanceAPIView.as_view(), name='mark_attendance'),
    path('update/<int:attendance_id>/', views.UpdateAttendanceAPIView.as_view(), name='update_attendance'),
    path('student/<int:student_id>/', views.StudentAttendanceAPIView.as_view(), name='student_attendance'),
    path('class/<int:course_id>/', views.ClassAttendanceAPIView.as_view(), name='class_attendance'),
    path('subject/<int:course_id>/', views.SubjectAttendanceAPIView.as_view(), name='subject_attendance'),
    path('percentage/<int:student_id>/', views.AttendancePercentageAPIView.as_view(), name='attendance_percentage'),
]
