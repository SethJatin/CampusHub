"""
Assignments App - Forms
"""

from django import forms
from .models import Assignment, Submission


class AssignmentForm(forms.ModelForm):
    """Form for creating/editing assignments."""

    class Meta:
        model = Assignment
        fields = ['title', 'description', 'instructions', 'due_date',
                  'allow_late_submission', 'late_penalty_percent', 'total_marks',
                  'status', 'attachment']
        widgets = {
            'due_date': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'description': forms.Textarea(attrs={'rows': 4}),
            'instructions': forms.Textarea(attrs={'rows': 3}),
        }


class SubmissionForm(forms.ModelForm):
    """Form for submitting assignments."""

    class Meta:
        model = Submission
        fields = ['content', 'attachment']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 5, 'placeholder': 'Enter your submission content...'}),
        }


class GradeSubmissionForm(forms.ModelForm):
    """Form for grading submissions."""

    class Meta:
        model = Submission
        fields = ['marks_obtained', 'grade', 'feedback', 'status']
        widgets = {
            'feedback': forms.Textarea(attrs={'rows': 3}),
        }
