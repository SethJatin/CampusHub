"""
Notes App - Forms
"""

from django import forms
from .models import Note, NoteComment


class NoteForm(forms.ModelForm):
    """Form for uploading notes."""

    class Meta:
        model = Note
        fields = ['title', 'description', 'note_type', 'course', 'file', 'content', 'is_public']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
            'content': forms.Textarea(attrs={'rows': 10}),
        }


class NoteCommentForm(forms.ModelForm):
    """Form for commenting on notes."""

    class Meta:
        model = NoteComment
        fields = ['content']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Write a comment...'}),
        }
