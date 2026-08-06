"""
Courses API - Serializers
"""

from rest_framework import serializers
from courses.models import Course, Enrollment, CourseMaterial, Attendance
from accounts.api.serializers import UserSerializer


class CourseSerializer(serializers.ModelSerializer):
    """
    Serializer for Course model.
    """
    instructor_name = serializers.CharField(source='instructor.get_full_name', read_only=True)
    enrolled_students = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'code', 'name', 'description', 'department',
            'credits', 'semester', 'instructor', 'instructor_name',
            'max_students', 'room', 'schedule', 'status',
            'start_date', 'end_date', 'enrolled_students', 'is_full',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EnrollmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Enrollment model.
    """
    student_details = UserSerializer(source='student', read_only=True)
    course_details = CourseSerializer(source='course', read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_details', 'course', 'course_details',
            'status', 'enrollment_date', 'approved_by', 'approved_date',
            'grade', 'marks'
        ]
        read_only_fields = ['id', 'enrollment_date']


class CourseMaterialSerializer(serializers.ModelSerializer):
    """
    Serializer for CourseMaterial model.
    """
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = CourseMaterial
        fields = [
            'id', 'course', 'title', 'description', 'material_type',
            'file', 'external_link', 'uploaded_by', 'uploaded_by_name',
            'is_published', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AttendanceSerializer(serializers.ModelSerializer):
    """
    Serializer for Attendance model.
    """
    student_details = UserSerializer(source='student', read_only=True)
    course_details = CourseSerializer(source='course', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_details', 'course', 'course_details',
            'date', 'status', 'marked_by', 'marked_at'
        ]
        read_only_fields = ['id', 'marked_at']
