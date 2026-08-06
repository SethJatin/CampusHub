"""
Courses App - Models

This module defines models for Course Management including:
- Course: The main course entity
- CourseMaterial: Notes and materials for courses
- Enrollment: Student course enrollments
"""

from django.db import models
from django.utils import timezone
from django.conf import settings


class Course(models.Model):
    """
    Course model representing a subject/class.

    This is the core model for the course management system.
    Each course belongs to a department and can have multiple enrollments.
    """

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        ARCHIVED = 'archived', 'Archived'
        CANCELLED = 'cancelled', 'Cancelled'

    # Basic Information
    code = models.CharField(
        max_length=20,
        unique=True,
        help_text="Course code (e.g., CS101, ECE201)"
    )
    name = models.CharField(
        max_length=200,
        help_text="Course name"
    )
    description = models.TextField(
        blank=True,
        help_text="Course description and syllabus"
    )

    # Academic Details
    department = models.CharField(
        max_length=100,
        help_text="Department offering the course"
    )
    credits = models.PositiveIntegerField(
        default=3,
        help_text="Course credits"
    )
    semester = models.PositiveIntegerField(
        help_text="Semester (1-8)"
    )

    # Faculty (Who teaches this course)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='taught_courses',
        limit_choices_to={'role': 'faculty'},
        help_text="Course instructor"
    )

    # Capacity and Schedule
    max_students = models.PositiveIntegerField(
        default=60,
        help_text="Maximum students allowed"
    )
    room = models.CharField(
        max_length=50,
        blank=True,
        help_text="Room number"
    )
    schedule = models.CharField(
        max_length=100,
        blank=True,
        help_text="Schedule (e.g., Mon/Wed 10:00-11:30)"
    )

    # Status and Dates
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    start_date = models.DateField(
        null=True,
        blank=True
    )
    end_date = models.DateField(
        null=True,
        blank=True
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['department', 'semester', 'code']
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def enrolled_students(self):
        """Return count of enrolled students."""
        return self.enrollments.count()

    @property
    def is_full(self):
        """Check if course is at maximum capacity."""
        return self.enrolled_students >= self.max_students


class Enrollment(models.Model):
    """
    Enrollment model - Links students to courses.

    This implements a Many-to-Many relationship between
    User (student) and Course through explicit enrollment tracking.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        DROPPED = 'dropped', 'Dropped'

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )

    # Enrollment Details
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    enrollment_date = models.DateTimeField(
        auto_now_add=True
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_enrollments'
    )
    approved_date = models.DateTimeField(
        null=True,
        blank=True
    )

    # Academic Performance
    grade = models.CharField(
        max_length=5,
        blank=True,
        help_text="Final grade (A, B+, B, C, etc.)"
    )
    marks = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total marks obtained"
    )

    class Meta:
        # Each student can only enroll once per course
        unique_together = ['student', 'course']
        ordering = ['-enrollment_date']
        verbose_name = 'Enrollment'
        verbose_name_plural = 'Enrollments'

    def __str__(self):
        return f"{self.student.email} - {self.course.code}"


class CourseMaterial(models.Model):
    """
    Course materials including notes, slides, and resources.
    """

    class MaterialType(models.TextChoices):
        NOTE = 'note', 'Study Notes'
        SLIDE = 'slide', 'Presentation'
        VIDEO = 'video', 'Video Lecture'
        ASSIGNMENT = 'assignment', 'Assignment'
        OTHER = 'other', 'Other'

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='materials'
    )
    title = models.CharField(
        max_length=200
    )
    description = models.TextField(
        blank=True
    )
    material_type = models.CharField(
        max_length=20,
        choices=MaterialType.choices,
        default=MaterialType.NOTE
    )
    file = models.FileField(
        upload_to='course_materials/',
        blank=True,
        null=True
    )
    external_link = models.URLField(
        blank=True,
        help_text="External link to resource"
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    is_published = models.BooleanField(
        default=False,
        help_text="Whether visible to students"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.course.code} - {self.title}"


class Attendance(models.Model):
    """
    Track student attendance for each course session.
    """

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('present', 'Present'),
            ('absent', 'Absent'),
            ('late', 'Late'),
            ('excused', 'Excused')
        ],
        default='present'
    )
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='marked_attendance'
    )
    marked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One attendance record per student per course per day
        unique_together = ['student', 'course', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.student.email} - {self.course.code} - {self.date}"
