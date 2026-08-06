"""
Assignments App - Views

Views for assignment management and submissions.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.utils import timezone
from django.db.models import Q
from .models import Assignment, Submission
from .forms import AssignmentForm, SubmissionForm, GradeSubmissionForm
from courses.models import Enrollment


@login_required
def assignment_list(request):
    """List all assignments - filtered by course if specified."""
    course_id = request.GET.get('course')
    status_filter = request.GET.get('status')

    # Base query - show published assignments or user's own
    if request.user.role == 'faculty':
        assignments = Assignment.objects.filter(
            Q(course__instructor=request.user) | Q(created_by=request.user)
        )
    else:
        # Students see published assignments for enrolled courses
        enrolled_course_ids = Enrollment.objects.filter(
            student=request.user,
            status='approved'
        ).values_list('course_id', flat=True)
        assignments = Assignment.objects.filter(
            Q(course_id__in=enrolled_course_ids) | Q(status='published')
        )
        if course_id:
            assignments = assignments.filter(course_id=course_id)

    if status_filter:
        assignments = assignments.filter(status=status_filter)

    assignments = assignments.select_related('course', 'created_by').order_by('due_date')

    # Pagination
    paginator = Paginator(assignments, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'page_obj': page_obj,
        'course_id': course_id,
        'status_filter': status_filter,
    }
    return render(request, 'assignments/assignment_list.html', context)


@login_required
def assignment_detail(request, assignment_id):
    """View assignment details and submission status."""
    assignment = get_object_or_404(
        Assignment,
        id=assignment_id,
    )

    # Check access
    if request.user.role == 'student':
        is_enrolled = Enrollment.objects.filter(
            student=request.user,
            course=assignment.course,
            status='approved'
        ).exists()
        if not is_enrolled and assignment.status != 'published':
            messages.error(request, "You don't have access to this assignment.")
            return redirect('assignments:assignment_list')

    # Get student's submission if exists
    submission = None
    if request.user.role == 'student':
        submission = Submission.objects.filter(
            assignment=assignment,
            student=request.user
        ).first()

    context = {
        'assignment': assignment,
        'submission': submission,
        'now': timezone.now(),
    }
    return render(request, 'assignments/assignment_detail.html', context)


@login_required
def create_assignment(request):
    """Create a new assignment (faculty only)."""
    if request.user.role != 'faculty' and not request.user.is_staff:
        messages.error(request, "Only faculty can create assignments.")
        return redirect('assignments:assignment_list')

    if request.method == 'POST':
        form = AssignmentForm(request.POST, request.FILES)
        if form.is_valid():
            assignment = form.save(commit=False)
            assignment.created_by = request.user
            assignment.save()
            messages.success(request, "Assignment created successfully!")
            return redirect('assignments:assignment_detail', assignment_id=assignment.id)
    else:
        form = AssignmentForm()

    # Get faculty's courses
    from courses.models import Course
    courses = Course.objects.filter(instructor=request.user)

    context = {'form': form, 'courses': courses, 'action': 'Create'}
    return render(request, 'assignments/assignment_form.html', context)


@login_required
def edit_assignment(request, assignment_id):
    """Edit an assignment (faculty only)."""
    assignment = get_object_or_404(Assignment, id=assignment_id)

    if request.user != assignment.created_by and not request.user.is_staff:
        messages.error(request, "You can only edit your own assignments.")
        return redirect('assignments:assignment_list')

    if request.method == 'POST':
        form = AssignmentForm(request.POST, request.FILES, instance=assignment)
        if form.is_valid():
            form.save()
            messages.success(request, "Assignment updated successfully!")
            return redirect('assignments:assignment_detail', assignment_id=assignment.id)
    else:
        form = AssignmentForm(instance=assignment)

    courses = Course.objects.filter(instructor=request.user)
    context = {'form': form, 'courses': courses, 'action': 'Edit', 'assignment': assignment}
    return render(request, 'assignments/assignment_form.html', context)


@login_required
def submit_assignment(request, assignment_id):
    """Submit an assignment (students only)."""
    assignment = get_object_or_404(Assignment, id=assignment_id)

    if request.user.role != 'student':
        messages.error(request, "Only students can submit assignments.")
        return redirect('assignments:assignment_list')

    # Check enrollment
    is_enrolled = Enrollment.objects.filter(
        student=request.user,
        course=assignment.course,
        status='approved'
    ).exists()
    if not is_enrolled:
        messages.error(request, "You must be enrolled in the course to submit.")
        return redirect('assignments:assignment_list')

    # Check if already submitted
    existing = Submission.objects.filter(
        assignment=assignment,
        student=request.user
    ).first()

    if request.method == 'POST':
        if existing:
            form = SubmissionForm(request.POST, request.FILES, instance=existing)
        else:
            form = SubmissionForm(request.POST, request.FILES)

        if form.is_valid():
            submission = form.save(commit=False)
            submission.assignment = assignment
            submission.student = request.user
            submission.status = 'submitted'
            submission.save()
            messages.success(request, "Assignment submitted successfully!")
            return redirect('assignments:assignment_detail', assignment_id=assignment.id)
    else:
        form = SubmissionForm(instance=existing)

    context = {'form': form, 'assignment': assignment, 'submission': existing}
    return render(request, 'assignments/submission_form.html', context)


@login_required
def my_submissions(request):
    """View student's submissions."""
    submissions = Submission.objects.filter(
        student=request.user
    ).select_related('assignment', 'assignment__course').order_by('-submitted_at')

    # Filter by status
    status = request.GET.get('status')
    if status:
        submissions = submissions.filter(status=status)

    paginator = Paginator(submissions, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {'page_obj': page_obj, 'status': status}
    return render(request, 'assignments/my_submissions.html', context)


@login_required
def view_submissions(request, assignment_id):
    """View all submissions for an assignment (faculty only)."""
    assignment = get_object_or_404(Assignment, id=assignment_id)

    if request.user != assignment.created_by and not request.user.is_staff:
        messages.error(request, "You can only view submissions for your own assignments.")
        return redirect('assignments:assignment_list')

    submissions = Submission.objects.filter(
        assignment=assignment
    ).select_related('student').order_by('-submitted_at')

    # Calculate stats
    total = submissions.count()
    submitted = submissions.filter(status='submitted').count()
    graded = submissions.filter(status='graded').count()

    context = {
        'assignment': assignment,
        'submissions': submissions,
        'total': total,
        'submitted': submitted,
        'graded': graded,
    }
    return render(request, 'assignments/view_submissions.html', context)


@login_required
def grade_submission(request, submission_id):
    """Grade a submission (faculty only)."""
    submission = get_object_or_404(Submission, id=submission_id)

    if request.user != submission.assignment.created_by and not request.user.is_staff:
        messages.error(request, "You can only grade submissions for your own assignments.")
        return redirect('assignments:assignment_list')

    if request.method == 'POST':
        form = GradeSubmissionForm(request.POST, instance=submission)
        if form.is_valid():
            submission = form.save(commit=False)
            submission.graded_by = request.user
            submission.status = 'graded'
            submission.save()
            messages.success(request, "Submission graded successfully!")
            return redirect('assignments:view_submissions', assignment_id=submission.assignment.id)
    else:
        form = GradeSubmissionForm(instance=submission)

    context = {'form': form, 'submission': submission}
    return render(request, 'assignments/grade_form.html', context)
