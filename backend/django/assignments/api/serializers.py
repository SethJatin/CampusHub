"""
Assignments API - Serializers
"""

from rest_framework import serializers
from assignments.models import Assignment, Submission
from accounts.api.serializers import UserSerializer
from courses.api.serializers import CourseSerializer


class AssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Assignment model.
    """
    course_details = CourseSerializer(source='course', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Assignment
        fields = [
            'id', 'course', 'course_details', 'title', 'description',
            'instructions', 'created_by', 'created_by_name', 'created_at',
            'updated_at', 'due_date', 'allow_late_submission',
            'late_penalty_percent', 'total_marks', 'status', 'attachment'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubmissionSerializer(serializers.ModelSerializer):
    """
    Serializer for Submission model.
    """
    student_details = UserSerializer(source='student', read_only=True)
    assignment_details = AssignmentSerializer(source='assignment', read_only=True)

    class Meta:
        model = Submission
        fields = [
            'id', 'assignment', 'assignment_details', 'student', 'student_details',
            'submitted_at', 'content', 'attachment', 'marks_obtained',
            'grade', 'feedback', 'graded_by', 'graded_at', 'status', 'is_late'
        ]
        read_only_fields = ['id', 'submitted_at', 'graded_at']
