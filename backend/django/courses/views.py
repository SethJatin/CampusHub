"""
Courses App - Views

Views for course management, enrollment, and materials.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.exceptions import ObjectDoesNotExist
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Course, Enrollment, CourseMaterial, Attendance
from .forms import CourseForm, EnrollmentForm, CourseMaterialForm


# ==================== Course Views ====================

def course_list(request):
    """
    Display list of all courses.
    Supports filtering by department and semester.
    """
    courses = Course.objects.filter(status='active')

    # Filter by department
    department = request.GET.get('department')
    if department:
        courses = courses.filter(department=department)

    # Filter by semester
    semester = request.GET.get('semester')
    if semester:
        courses = courses.filter(semester=semester)

    # Search
    search = request.GET.get('search')
    if search:
        courses = courses.filter(
            Q(code__icontains=search) |
            Q(name__icontains=search)
        )

    # Pagination
    paginator = Paginator(courses, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Get unique departments for filter
    departments = Course.objects.values_list('department', flat=True).distinct()

    context = {
        'page_obj': page_obj,
        'departments': departments,
    }
    return render(request, 'courses/course_list.html', context)


def course_detail(request, course_id):
    """Display course details and materials."""
    course = get_object_or_404(Course, id=course_id)
    materials = course.materials.filter(is_published=True)

    # Check user enrollment status
    is_enrolled = False
    enrollment_status = None
    if request.user.is_authenticated:
        enrollment = Enrollment.objects.filter(
            student=request.user,
            course=course
        ).first()
        if enrollment:
            enrollment_status = enrollment.status
            if enrollment.status == 'approved':
                is_enrolled = True

    context = {
        'course': course,
        'materials': materials,
        'is_enrolled': is_enrolled,
        'enrollment_status': enrollment_status,
    }
    return render(request, 'courses/course_detail.html', context)


# ==================== Enrollment Views ====================

@login_required
def enroll_course(request, course_id):
    """Handle course enrollment."""
    course = get_object_or_404(Course, id=course_id, status='active')

    # Check if already enrolled
    existing = Enrollment.objects.filter(
        student=request.user,
        course=course
    ).first()

    if existing:
        messages.warning(request, 'You have already enrolled in this course.')
        return redirect('courses:course_detail', course_id)

    if course.is_full:
        messages.error(request, 'This course is full.')
        return redirect('courses:course_detail', course_id)

    if request.user.role == 'student':
        try:
            student_profile = request.user.student_profile
        except ObjectDoesNotExist:
            student_profile = None

        student_semester = getattr(student_profile, 'semester', None)
        if student_semester is None:
            student_semester = 99

        if course.semester > student_semester:
            messages.error(
                request,
                'You are only eligible to enroll in courses for your current semester or lower.'
            )
            return redirect('courses:course_detail', course_id)

    # Create enrollment
    Enrollment.objects.create(
        student=request.user,
        course=course,
        status='pending'
    )

    return redirect('courses:course_detail', course_id)


@login_required
def my_courses(request):
    """Display user's enrolled courses."""
    if request.user.role == 'student':
        enrollments = Enrollment.objects.filter(
            student=request.user
        ).select_related('course', 'course__instructor').order_by('-enrollment_date')
    elif request.user.role == 'faculty':
        enrollments = Course.objects.filter(
            instructor=request.user
        )
    else:
        enrollments = []

    context = {
        'enrollments': enrollments,
    }
    return render(request, 'courses/my_courses.html', context)


# ==================== Material Views ====================

@login_required
def material_upload(request, course_id):
    """Upload course material (faculty only)."""
    course = get_object_or_404(Course, id=course_id)

    if request.user != course.instructor and request.user.role != 'admin':
        messages.error(request, 'You are not authorized to upload materials.')
        return redirect('courses:course_detail', course_id)

    if request.method == 'POST':
        form = CourseMaterialForm(request.POST, request.FILES)
        if form.is_valid():
            material = form.save(commit=False)
            material.course = course
            material.uploaded_by = request.user
            material.save()
            messages.success(request, 'Material uploaded successfully!')
            return redirect('courses:course_detail', course_id)
    else:
        form = CourseMaterialForm()

    context = {
        'form': form,
        'course': course,
    }
    return render(request, 'courses/material_upload.html', context)


# ==================== Admin Views ====================

@login_required
def manage_enrollments(request):
    """Manage all enrollments (admin/faculty)."""
    if request.user.role not in ['admin', 'faculty']:
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    enrollments = Enrollment.objects.select_related(
        'student', 'course', 'course__instructor'
    ).order_by('-enrollment_date')

    if request.user.role == 'faculty':
        enrollments = enrollments.filter(course__instructor=request.user)

    # Filter by status
    status = request.GET.get('status')
    if status:
        enrollments = enrollments.filter(status=status)

    paginator = Paginator(enrollments, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {'page_obj': page_obj}
    return render(request, 'courses/manage_enrollments.html', context)


@login_required
def approve_enrollment(request, enrollment_id):
    """Approve an enrollment request."""
    enrollment = get_object_or_404(Enrollment, id=enrollment_id)

    if request.user.role not in ['admin', 'faculty']:
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    if request.user.role == 'faculty' and enrollment.course.instructor != request.user:
        messages.error(request, 'You can only approve enrollments for your assigned courses.')
        return redirect('courses:manage_enrollments')

    enrollment.status = 'approved'
    enrollment.approved_by = request.user
    enrollment.save()

    messages.success(request, 'Enrollment approved!')
    return redirect('courses:manage_enrollments')


@login_required
def reject_enrollment(request, enrollment_id):
    """Reject an enrollment request."""
    enrollment = get_object_or_404(Enrollment, id=enrollment_id)

    if request.user.role not in ['admin', 'faculty']:
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    if request.user.role == 'faculty' and enrollment.course.instructor != request.user:
        messages.error(request, 'You can only reject enrollments for your assigned courses.')
        return redirect('courses:manage_enrollments')

    enrollment.status = 'rejected'
    enrollment.save()

    messages.success(request, 'Enrollment rejected.')
    return redirect('courses:manage_enrollments')


# ==================== Attendance Views ====================

@login_required
def mark_attendance(request, course_id):
    """Mark attendance for a course (faculty only)."""
    course = get_object_or_404(Course, id=course_id)

    if request.user != course.instructor and request.user.role != 'admin':
        messages.error(request, 'Only course instructor can mark attendance.')
        return redirect('courses:course_detail', course_id)

    if request.method == 'POST':
        date = request.POST.get('date')
        student_ids = request.POST.getlist('students')

        for student_id in student_ids:
            attendance, created = Attendance.objects.update_or_create(
                student_id=student_id,
                course=course,
                date=date,
                defaults={
                    'status': 'present',
                    'marked_by': request.user
                }
            )

        messages.success(request, 'Attendance marked successfully!')
        return redirect('courses:course_detail', course_id)

    # Get enrolled students
    enrollments = Enrollment.objects.filter(
        course=course,
        status='approved'
    ).select_related('student')

    context = {
        'course': course,
        'enrollments': enrollments,
    }
    return render(request, 'courses/mark_attendance.html', context)


@login_required
def my_attendance(request):
    """View student's attendance records."""
    if request.user.role != 'student':
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    attendances = Attendance.objects.filter(
        student=request.user
    ).select_related('course').order_by('-date')

    # Filter by course
    course_id = request.GET.get('course')
    if course_id:
        attendances = attendances.filter(course_id=course_id)

    # Calculate attendance percentage
    total = attendances.count()
    present = attendances.filter(status='present').count()
    percentage = (present / total * 100) if total > 0 else 0

    context = {
        'attendances': attendances,
        'total': total,
        'present': present,
        'percentage': round(percentage, 1),
    }
    return render(request, 'courses/my_attendance.html', context)
