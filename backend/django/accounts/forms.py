"""
Accounts App - Forms

Forms for user registration, authentication, and profile management.
"""

from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User, StudentProfile, FacultyProfile, Department


class UserCreationFormWithEmail(UserCreationForm):
    """
    Custom user creation form with email as username.

    Django's default uses username. We want email-based login.
    """

    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'last_name', 'role')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add CSS classes for styling
        for field in self.fields:
            self.fields[field].widget.attrs.update({
                'class': 'form-control'
            })
        if 'role' in self.fields:
            self.fields['role'].widget = forms.HiddenInput()
            self.fields['role'].initial = User.Role.STUDENT
        # Make password fields optional styling
        self.fields['password1'].widget.attrs.update({
            'placeholder': 'Enter password'
        })
        self.fields['password2'].widget.attrs.update({
            'placeholder': 'Confirm password'
        })


class UserChangeFormWithEmail(UserChangeForm):
    """
    Custom user change form.
    """

    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'last_name', 'role',
                  'profile_image', 'phone', 'address', 'date_of_birth', 'bio', 'is_verified')


class StudentRegistrationForm(forms.ModelForm):
    """
    Form for student registration with additional fields.
    """

    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control'}))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control'}))

    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'last_name', 'password')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs.update({'class': 'form-control'})

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        if password != confirm_password:
            raise forms.ValidationError("Passwords do not match!")
        return cleaned_data


class StudentProfileForm(forms.ModelForm):
    """
    Form for student profile details.
    """

    class Meta:
        model = StudentProfile
        exclude = ('user',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs.update({'class': 'form-control'})


class FacultyRegistrationForm(forms.ModelForm):
    """
    Form for faculty registration.
    """

    password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control'}))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs={'class': 'form-control'}))

    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'last_name', 'password')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs.update({'class': 'form-control'})

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        if password != confirm_password:
            raise forms.ValidationError("Passwords do not match!")
        return cleaned_data


class FacultyProfileForm(forms.ModelForm):
    """
    Form for faculty profile details.
    """

    class Meta:
        model = FacultyProfile
        exclude = ('user',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs.update({'class': 'form-control'})


class UserProfileUpdateForm(forms.ModelForm):
    """
    Form for updating user profile.
    """

    phone = forms.CharField(
        required=False,
        max_length=10,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'pattern': '[0-9]+',
            'inputmode': 'numeric',
            'type': 'text'
        })
    )

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'phone',
                  'address', 'date_of_birth', 'bio', 'profile_image')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs.update({'class': 'form-control'})

        self.fields['date_of_birth'].widget = forms.DateInput(
            attrs={'class': 'form-control', 'type': 'date'}
        )

    def clean_phone(self):
        phone = self.cleaned_data.get('phone', '')
        if phone and not phone.isdigit():
            raise forms.ValidationError('Phone number must contain only digits.')
        if phone and len(phone) != 10:
            raise forms.ValidationError('Phone number must be exactly 10 digits.')
        return phone
