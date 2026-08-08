"""
Accounts App - Admin Configuration

This module registers models to Django admin panel.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, StudentProfile, FacultyProfile, Department


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin with role-based display."""

    list_display = ('email', 'username', 'first_name', 'last_name', 'role', 'is_verified', 'is_active')
    list_filter = ('role', 'is_verified', 'is_active', 'is_staff')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-created_at',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'profile_image', 'phone', 'address', 'date_of_birth', 'bio', 'is_verified', 'security_sentence')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('role',)}),
    )


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """Admin for Student Profiles."""

    list_display = ('roll_number', 'user', 'department', 'year', 'semester', 'section')
    search_fields = ('roll_number', 'enrollment_number', 'user__first_name', 'user__last_name')
    list_filter = ('department', 'year', 'semester')
    raw_id_fields = ('user',)


@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    """Admin for Faculty Profiles."""

    list_display = ('employee_id', 'user', 'department', 'designation')
    search_fields = ('employee_id', 'user__first_name', 'user__last_name', 'department')
    list_filter = ('department', 'designation')
    raw_id_fields = ('user',)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """Admin for Departments."""

    list_display = ('name', 'code', 'head')
    search_fields = ('name', 'code')
