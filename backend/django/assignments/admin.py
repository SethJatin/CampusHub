"""
Assignments App - Admin Configuration
"""

from django.contrib import admin
from .models import Assignment, Submission


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'created_by', 'due_date', 'status', 'total_marks']
    list_filter = ['status', 'course', 'created_at']
    search_fields = ['title', 'description']
    date_hierarchy = 'created_at'


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'student', 'submitted_at', 'marks_obtained', 'status']
    list_filter = ['status', 'submitted_at']
    search_fields = ['student__email', 'assignment__title']
    date_hierarchy = 'submitted_at'
