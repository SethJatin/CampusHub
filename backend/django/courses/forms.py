"""
Courses App - Forms
"""

from django import forms
from .models import Course, Enrollment, CourseMaterial, Attendance


class CourseForm(forms.ModelForm):
    """Form for creating and editing courses."""

    class Meta:
        model = Course
        fields = '__all__'
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
            'start_date': forms.DateInput(attrs={'type': 'date'}),
            'end_date': forms.DateInput(attrs={'type': 'date'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            if not isinstance(self.fields[field].widget, forms.CheckboxInput):
                self.fields[field].widget.attrs.update({'class': 'form-control'})


class EnrollmentForm(forms.ModelForm):
    """Form for course enrollment."""

    class Meta:
        model = Enrollment
        fields = ['course']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['course'].widget.attrs.update({'class': 'form-control'})


class CourseMaterialForm(forms.ModelForm):
    """Form for uploading course materials."""

    class Meta:
        model = CourseMaterial
        exclude = ('uploaded_by',)
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            if not isinstance(self.fields[field].widget, forms.CheckboxInput):
                self.fields[field].widget.attrs.update({'class': 'form-control'})


class AttendanceForm(forms.ModelForm):
    """Form for marking attendance."""

    class Meta:
        model = Attendance
        fields = ['student', 'course', 'date', 'status']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs.update({'class': 'form-control'})


class BulkAttendanceForm(forms.Form):
    """Form for bulk attendance marking."""
    date = forms.DateField(widget=forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}))
    course = forms.ModelChoiceField(
        queryset=Course.objects.all(),
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    status = forms.ChoiceField(
        choices=[
            ('present', 'Present'),
            ('absent', 'Absent'),
            ('late', 'Late'),
            ('excused', 'Excused')
        ],
        widget=forms.Select(attrs={'class': 'form-control'})
    )
