"""
Events App - Forms
"""

from django import forms
from .models import Event, Announcement


class EventForm(forms.ModelForm):
    """Form for creating/editing events."""

    class Meta:
        model = Event
        fields = ['title', 'description', 'category', 'start_date', 'end_date',
                  'venue', 'department', 'registration_required', 'registration_deadline',
                  'max_participants', 'status', 'banner', 'attachment']
        widgets = {
            'start_date': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'end_date': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'registration_deadline': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'description': forms.Textarea(attrs={'rows': 4}),
        }


class AnnouncementForm(forms.ModelForm):
    """Form for creating announcements."""

    class Meta:
        model = Announcement
        fields = ['title', 'content', 'priority', 'target_roles', 'is_published',
                  'start_date', 'end_date']
        widgets = {
            'start_date': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'end_date': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'content': forms.Textarea(attrs={'rows': 4}),
        }
