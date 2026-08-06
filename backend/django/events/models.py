"""
Events App - Models

Models for college events and announcements:
- Event: College events, seminars, workshops
- Announcement: General announcements
"""

from django.db import models
from django.conf import settings


class Event(models.Model):
    """
    Event model - College events, seminars, workshops.
    """

    class Category(models.TextChoices):
        SEMINAR = 'seminar', 'Seminar'
        WORKSHOP = 'workshop', 'Workshop'
        CULTURAL = 'cultural', 'Cultural'
        SPORTS = 'sports', 'Sports'
        ACADEMIC = 'academic', 'Academic'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'
        CANCELLED = 'cancelled', 'Cancelled'
        COMPLETED = 'completed', 'Completed'

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)

    # Timing
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    venue = models.CharField(max_length=200, blank=True)

    # Organizer
    organized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='organized_events'
    )
    department = models.CharField(max_length=100, blank=True)

    # Registration
    registration_required = models.BooleanField(default=False)
    registration_deadline = models.DateTimeField(null=True, blank=True)
    max_participants = models.PositiveIntegerField(null=True, blank=True)

    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # Files
    banner = models.ImageField(upload_to='event_banners/', null=True, blank=True)
    attachment = models.FileField(upload_to='event_attachments/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.title


class EventRegistration(models.Model):
    """Track event registrations."""
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_registrations')
    registered_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='registered')

    class Meta:
        unique_together = ['event', 'user']

    def __str__(self):
        return f"{self.user.email} - {self.event.title}"


class Announcement(models.Model):
    """
    Announcement model - General announcements.
    """

    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'

    title = models.CharField(max_length=200)
    content = models.TextField()
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)

    # Target audience
    target_roles = models.JSONField(default=list, blank=True)  # ['student', 'faculty']

    # Visibility
    is_published = models.BooleanField(default=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    # Author
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='announcements'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
