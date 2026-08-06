"""
Accounts App - Views

Views for authentication, registration, and user management.
"""

from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.forms import AuthenticationForm
from .forms import (
    UserCreationFormWithEmail,
    StudentProfileForm,
    FacultyProfileForm,
    UserProfileUpdateForm
)
from .models import User, StudentProfile, FacultyProfile


def login_view(request):
    """
    User login view.

    If user is already authenticated, redirect to dashboard.
    Otherwise, show login form.

    Key Concepts:
    - AuthenticationForm: Django's built-in form for login
    - authenticate(): Verifies credentials
    - login(): Creates session for user
    """
    # If user is already logged in, redirect to dashboard
    if request.user.is_authenticated:
        return redirect('accounts:dashboard')

    if request.method == 'POST':
        # Create form with submitted data
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            # Get cleaned data
            email = form.cleaned_data.get('username')  # Using email as username
            password = form.cleaned_data.get('password')

            # Try to authenticate (Note: Need custom authentication backend)
            user = authenticate(request, username=email, password=password)

            if user is not None:
                login(request, user)
                messages.success(request, f"Welcome back, {user.first_name}!")
                return redirect('accounts:dashboard')
            else:
                messages.error(request, "Invalid email or password.")
        else:
            messages.error(request, "Invalid email or password.")
    else:
        form = AuthenticationForm()

    return render(request, 'accounts/login.html', {'form': form})


def logout_view(request):
    """
    User logout view.

    Logs out the user and redirects to login page.
    """
    logout(request)
    messages.info(request, "You have been logged out successfully.")
    return redirect('accounts:login')


def register_view(request):
    """
    User registration view.

    Allows general user registration (student by default).
    """
    if request.user.is_authenticated:
        return redirect('accounts:dashboard')

    if request.method == 'POST':
        form = UserCreationFormWithEmail(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            user.role = User.Role.STUDENT  # Default role
            user.save()

            # Create empty student profile
            StudentProfile.objects.create(user=user)

            messages.success(request, "Registration successful! Please log in.")
            return redirect('accounts:login')
    else:
        form = UserCreationFormWithEmail()

    return render(request, 'accounts/register.html', {'form': form})


def student_register_view(request):
    """
    Student registration view with profile creation.
    """
    if request.user.is_authenticated:
        return redirect('accounts:dashboard')

    if request.method == 'POST':
        user_form = UserCreationFormWithEmail(request.POST)
        profile_form = StudentProfileForm(request.POST)

        if user_form.is_valid() and profile_form.is_valid():
            user = user_form.save(commit=False)
            user.role = User.Role.STUDENT
            user.save()

            # Create student profile
            profile = profile_form.save(commit=False)
            profile.user = user
            profile.save()

            messages.success(request, "Student registration successful! Please log in.")
            return redirect('accounts:login')
    else:
        user_form = UserCreationFormWithEmail()
        profile_form = StudentProfileForm()

    return render(request, 'accounts/student_register.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })


def faculty_register_view(request):
    """
    Faculty registration view with profile creation.
    """
    if request.user.is_authenticated:
        return redirect('accounts:dashboard')

    if request.method == 'POST':
        user_form = UserCreationFormWithEmail(request.POST)
        profile_form = FacultyProfileForm(request.POST)

        if user_form.is_valid() and profile_form.is_valid():
            user = user_form.save(commit=False)
            user.role = User.Role.FACULTY
            user.save()

            # Create faculty profile
            profile = profile_form.save(commit=False)
            profile.user = user
            profile.save()

            messages.success(request, "Faculty registration successful! Please log in.")
            return redirect('accounts:login')
    else:
        user_form = UserCreationFormWithEmail()
        profile_form = FacultyProfileForm()

    return render(request, 'accounts/faculty_register.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })


@login_required
def profile_view(request):
    """
    User profile view.

    Shows user information and role-specific profile data.
    """
    user = request.user

    # Get role-specific profile
    profile = None
    if user.role == User.Role.STUDENT:
        try:
            profile = user.student_profile
        except StudentProfile.DoesNotExist:
            profile = None
    elif user.role == User.Role.FACULTY:
        try:
            profile = user.faculty_profile
        except FacultyProfile.DoesNotExist:
            profile = None

    context = {
        'user': user,
        'profile': profile,
    }
    return render(request, 'accounts/profile.html', context)


@login_required
def profile_edit_view(request):
    """
    Edit user profile view.
    """
    if request.method == 'POST':
        form = UserProfileUpdateForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, "Profile updated successfully!")
            return redirect('accounts:profile')
    else:
        form = UserProfileUpdateForm(instance=request.user)

    return render(request, 'accounts/profile_edit.html', {'form': form})


@login_required
def dashboard_view(request):
    """
    User dashboard view.

    Shows different dashboards based on user role:
    - Student: Courses, assignments, attendance
    - Faculty: Courses, students, assignments to grade
    - Admin: System overview with quick account creation actions
    """
    user = request.user
    context = {
        'user': user,
        'role': user.role,
        'total_students': User.objects.filter(role=User.Role.STUDENT).count(),
        'total_faculty': User.objects.filter(role=User.Role.FACULTY).count(),
        'total_admins': User.objects.filter(role=User.Role.ADMIN).count(),
        'total_users': User.objects.count(),
        'recent_users': User.objects.order_by('-created_at')[:5],
    }

    active_form = request.GET.get('action') if request.method == 'GET' else None

    if user.role == User.Role.ADMIN and request.method == 'POST':
        action = request.POST.get('action')
        if action == 'add_student':
            active_form = 'student'
            student_form = UserCreationFormWithEmail(request.POST)
            student_profile_form = StudentProfileForm(request.POST)
            if student_form.is_valid() and student_profile_form.is_valid():
                new_user = student_form.save(commit=False)
                new_user.role = User.Role.STUDENT
                new_user.save()

                profile = student_profile_form.save(commit=False)
                profile.user = new_user
                profile.save()

                messages.success(request, 'Student account created successfully.')
                return redirect('accounts:dashboard')

            context['student_form'] = student_form
            context['student_profile_form'] = student_profile_form
        elif action == 'add_faculty':
            active_form = 'faculty'
            faculty_form = UserCreationFormWithEmail(request.POST)
            faculty_profile_form = FacultyProfileForm(request.POST)
            if faculty_form.is_valid() and faculty_profile_form.is_valid():
                new_user = faculty_form.save(commit=False)
                new_user.role = User.Role.FACULTY
                new_user.save()

                profile = faculty_profile_form.save(commit=False)
                profile.user = new_user
                profile.save()

                messages.success(request, 'Faculty account created successfully.')
                return redirect('accounts:dashboard')

            context['faculty_form'] = faculty_form
            context['faculty_profile_form'] = faculty_profile_form
    elif user.role == User.Role.ADMIN and request.method == 'GET':
        if active_form == 'student':
            context['student_form'] = UserCreationFormWithEmail()
            context['student_profile_form'] = StudentProfileForm()
        elif active_form == 'faculty':
            context['faculty_form'] = UserCreationFormWithEmail()
            context['faculty_profile_form'] = FacultyProfileForm()

    # Add role-specific data
    if user.role == User.Role.STUDENT:
        try:
            profile = user.student_profile
            context['profile'] = profile
        except StudentProfile.DoesNotExist:
            context['profile'] = None

    elif user.role == User.Role.FACULTY:
        try:
            profile = user.faculty_profile
            context['profile'] = profile
        except FacultyProfile.DoesNotExist:
            context['profile'] = None

    context['active_form'] = active_form
    return render(request, 'accounts/dashboard.html', context)
