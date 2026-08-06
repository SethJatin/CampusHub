"""
Notes App - Models

Models for sharing study notes:
- Note: Shared study materials
- NoteComment: Comments on notes
"""

from django.db import models
from django.conf import settings
from courses.models import Course


class Note(models.Model):
    """
    Note model - Study materials shared by students and faculty.
    """

    class NoteType(models.TextChoices):
        NOTES = 'notes', 'Class Notes'
        SUMMARY = 'summary', 'Summary'
        CHEATSHEET = 'cheatsheet', 'Cheat Sheet'
        QUESTION_PAPER = 'question_paper', 'Question Paper'
        OTHER = 'other', 'Other'

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    note_type = models.CharField(max_length=20, choices=NoteType.choices, default=NoteType.NOTES)

    # Related course
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='notes'
    )

    # Author
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_notes'
    )

    # File
    file = models.FileField(upload_to='notes/')
    content = models.TextField(blank=True)  # For text notes

    # Metadata
    is_public = models.BooleanField(default=True)
    views = models.PositiveIntegerField(default=0)
    downloads = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.course.code} - {self.title}"


class NoteComment(models.Model):
    """Comments on notes."""
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment by {self.user.email} on {self.note.title}"


class NoteRating(models.Model):
    """Ratings for notes."""
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(default=0)  # 1-5

    class Meta:
        unique_together = ['note', 'user']

    def __str__(self):
        return f"{self.user.email} rated {self.note.title}"
