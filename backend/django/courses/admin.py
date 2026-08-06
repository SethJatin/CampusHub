"""
Courses App - Admin Configuration
"""

from django.contrib import admin
from .models import Course, Enrollment, CourseMaterial, Attendance


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'department', 'semester', 'instructor', 'status', 'enrolled_students')
    list_filter = ('department', 'semester', 'status')
    search_fields = ('code', 'name', 'description')
    raw_id_fields = ('instructor',)
    date_hierarchy = 'created_at'


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'status', 'enrollment_date', 'grade')
    list_filter = ('status', 'course')
    search_fields = ('student__email', 'course__code')
    raw_id_fields = ('student', 'course', 'approved_by')
    date_hierarchy = 'enrollment_date'


@admin.register(CourseMaterial)
class CourseMaterialAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'material_type', 'uploaded_by', 'is_published', 'created_at')
    list_filter = ('material_type', 'is_published', 'course')
    search_fields = ('title', 'course__code')
    raw_id_fields = ('course', 'uploaded_by')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'date', 'status', 'marked_by')
    list_filter = ('status', 'date', 'course')
    search_fields = ('student__email', 'course__code')
    raw_id_fields = ('student', 'course', 'marked_by')
    date_hierarchy = 'date'
