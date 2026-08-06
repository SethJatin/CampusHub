"""Serializers for attendance API responses."""

from rest_framework import serializers

from accounts.api.serializers import UserSerializer
from courses.api.serializers import CourseSerializer
from courses.models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    course_details = CourseSerializer(source='course', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_details', 'course', 'course_details',
            'date', 'status', 'status_display', 'marked_by', 'marked_at',
        ]
        read_only_fields = ['id', 'marked_at']
