"""
Accounts App - Models

This module defines the custom User model and related models for CampusHub.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    Custom User model for CampusHub.

    This extends Django's built-in AbstractUser to add custom fields
    specific to our college portal - roles, profile images, etc.

    Why use Custom User Model?
    - Flexibility to add custom fields
    - Better for future scalability
    - Easier to customize authentication
    """

    # User role choices
    class Role(models.TextChoices):
        ADMIN = 'admin', _('Administrator')
        FACULTY = 'faculty', _('Faculty')
        STUDENT = 'student', _('Student')

    # Fields
    email = models.EmailField(
        _('email address'),
        unique=True,
        help_text=_('Required. A valid email address.')
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        help_text=_('User role in the system')
    )
    profile_image = models.ImageField(
        upload_to='profiles/',
        default='profiles/default.png',
        blank=True,
        help_text=_('User profile picture')
    )
    phone = models.CharField(
        max_length=10,
        blank=True,
        help_text=_('Contact number')
    )
    address = models.TextField(
        blank=True,
        help_text=_('Address')
    )
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        help_text=_('Date of birth')
    )
    bio = models.TextField(
        blank=True,
        help_text=_('Short biography')
    )
    is_verified = models.BooleanField(
        default=False,
        help_text=_('Whether the user email is verified')
    )
    security_sentence = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text=_('Unique secret sentence used for password recovery')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Make email required
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']

    def __str__(self):
        """Return string representation of user."""
        return f"{self.get_full_name()} ({self.email})"

    @property
    def get_role_display_name(self):
        """Return human-readable role name."""
        return self.get_role_display()


class StudentProfile(models.Model):
    """
    Extended profile for students.

    One-to-One relationship with User model.
    Stores additional student-specific information.
    """

    # Academic details
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student_profile',
        help_text=_('Associated user account')
    )
    roll_number = models.CharField(
        max_length=20,
        unique=True,
        help_text=_('Unique roll number')
    )
    enrollment_number = models.CharField(
        max_length=30,
        unique=True,
        null=True,
        blank=True,
        help_text=_('University enrollment number')
    )
    department = models.CharField(
        max_length=100,
        help_text=_('Department/Branch')
    )
    year = models.PositiveIntegerField(
        help_text=_('Current year (1, 2, 3, 4)')
    )
    semester = models.PositiveIntegerField(
        help_text=_('Current semester (1-8)')
    )
    section = models.CharField(
        max_length=5,
        blank=True,
        help_text=_('Section (A, B, C)')
    )
    batch = models.CharField(
        max_length=10,
        blank=True,
        help_text=_('Batch year (e.g., 2024-2028)')
    )
    cgpa = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Current CGPA')
    )
    parent_name = models.CharField(
        max_length=100,
        blank=True,
        help_text=_('Parent/Guardian name')
    )
    parent_phone = models.CharField(
        max_length=15,
        blank=True,
        help_text=_('Parent contact number')
    )

    class Meta:
        verbose_name = _('student profile')
        verbose_name_plural = _('student profiles')

    def __str__(self):
        return f"Student: {self.user.get_full_name()} ({self.roll_number})"


class FacultyProfile(models.Model):
    """
    Extended profile for faculty members.

    One-to-One relationship with User model.
    Stores faculty-specific information.
    """

    # Professional details
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='faculty_profile',
        help_text=_('Associated user account')
    )
    employee_id = models.CharField(
        max_length=20,
        unique=True,
        help_text=_('Unique employee ID')
    )
    department = models.CharField(
        max_length=100,
        help_text=_('Department')
    )
    designation = models.CharField(
        max_length=100,
        help_text=_('Designation (Professor, Associate Professor, etc.)')
    )
    specialization = models.CharField(
        max_length=200,
        blank=True,
        help_text=_('Area of expertise')
    )
    qualification = models.CharField(
        max_length=200,
        blank=True,
        help_text=_('Highest qualification')
    )
    experience_years = models.PositiveIntegerField(
        default=0,
        help_text=_('Years of experience')
    )
    office_location = models.CharField(
        max_length=100,
        blank=True,
        help_text=_('Office room number')
    )
    office_hours = models.CharField(
        max_length=100,
        blank=True,
        help_text=_('Office hours (e.g., Mon-Fri 10AM-5PM)')
    )
    research_interests = models.TextField(
        blank=True,
        help_text=_('Research interests')
    )
    publications = models.PositiveIntegerField(
        default=0,
        help_text=_('Number of publications')
    )

    class Meta:
        verbose_name = _('faculty profile')
        verbose_name_plural = _('faculty profiles')

    def __str__(self):
        return f"Faculty: {self.user.get_full_name()} ({self.employee_id})"


class Department(models.Model):
    """
    Department model for the college.

    Stores department information that can be referenced
    by students and faculty.
    """

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text=_('Department name')
    )
    code = models.CharField(
        max_length=10,
        unique=True,
        help_text=_('Department code (e.g., CSE, ECE)')
    )
    description = models.TextField(blank=True)
    head = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='headed_departments',
        help_text=_('Department head')
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('department')
        verbose_name_plural = _('departments')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class PasswordResetOTP(models.Model):
    """
    Model for storing temporary OTPs sent to users for password recovery via email.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_otps'
    )
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        verbose_name = _('password reset OTP')
        verbose_name_plural = _('password reset OTPs')
        ordering = ['-created_at']

    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and timezone.now() <= self.expires_at

    def __str__(self):
        return f"OTP for {self.user.email} (used={self.is_used})"

