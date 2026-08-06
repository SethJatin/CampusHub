"""Attendance views for students, faculty, and admins."""

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.shortcuts import redirect, render
from django.utils import timezone

from courses.models import Attendance, Course, Enrollment


def _role_dashboard(user):
    if user.role == 'faculty':
        return 'attendance:faculty_dashboard'
    if user.role == 'admin':
        return 'attendance:admin_reports'
    return 'attendance:student_dashboard'


def _attendance_courses_for_user(user):
    if user.role == 'admin':
        return Course.objects.all().select_related('instructor')
    return Course.objects.filter(instructor=user).select_related('instructor')


def _student_courses(student):
    return Course.objects.filter(
        enrollments__student=student,
        enrollments__status=Enrollment.Status.APPROVED,
    ).distinct().select_related('instructor')


def _calculate_percentage(records):
    total = records.count()
    present = records.filter(status='present').count()
    percentage = round((present / total) * 100, 1) if total else 0
    return total, present, percentage


@login_required
def redirect_to_role_dashboard(request):
    return redirect(_role_dashboard(request.user))


@login_required
def student_dashboard(request):
    if request.user.role != 'student':
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    courses = _student_courses(request.user)
    selected_course_id = request.GET.get('course')
    selected_date = request.GET.get('date')

    records = Attendance.objects.filter(student=request.user).select_related('course', 'marked_by')
    if selected_course_id:
        records = records.filter(course_id=selected_course_id)
    if selected_date:
        records = records.filter(date=selected_date)

    overall_records = Attendance.objects.filter(student=request.user)
    total_classes, classes_attended, overall_percentage = _calculate_percentage(overall_records)

    course_summaries = []
    for course in courses:
        course_records = Attendance.objects.filter(student=request.user, course=course)
        course_total, course_present, course_percentage = _calculate_percentage(course_records)
        course_summaries.append({
            'course': course,
            'total': course_total,
            'present': course_present,
            'percentage': course_percentage,
        })

    context = {
        'courses': courses,
        'records': records,
        'course_summaries': course_summaries,
        'total_classes': total_classes,
        'classes_attended': classes_attended,
        'overall_percentage': overall_percentage,
        'low_attendance': overall_percentage < 75,
        'selected_course_id': selected_course_id,
        'selected_date': selected_date,
    }
    return render(request, 'attendance/student_dashboard.html', context)


@login_required
def faculty_dashboard(request):
    if request.user.role not in {'faculty', 'admin'}:
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    courses = _attendance_courses_for_user(request.user)
    selected_course_id = request.POST.get('course') or request.GET.get('course')
    selected_course = courses.filter(id=selected_course_id).first() if selected_course_id else courses.first()
    selected_date = request.POST.get('date') or request.GET.get('date') or timezone.localdate().isoformat()

    if request.method == 'POST':
        if not selected_course:
            messages.error(request, 'Please choose a class before saving attendance.')
            return redirect('attendance:faculty_dashboard')

        enrolled_students = Enrollment.objects.filter(
            course=selected_course,
            status=Enrollment.Status.APPROVED,
        ).select_related('student', 'student__student_profile')

        saved = 0
        for enrollment in enrolled_students:
            status_value = request.POST.get(f'status_{enrollment.student_id}', 'present')
            if status_value not in {'present', 'absent'}:
                status_value = 'present'
            Attendance.objects.update_or_create(
                student=enrollment.student,
                course=selected_course,
                date=selected_date,
                defaults={
                    'status': status_value,
                    'marked_by': request.user,
                },
            )
            saved += 1

        messages.success(request, f'Attendance saved for {saved} students.')
        return redirect(f'{request.path}?course={selected_course.id}&date={selected_date}')

    enrolled_students = []
    records_by_student = {}
    course_history = Attendance.objects.none()
    session_records = Attendance.objects.none()

    if selected_course:
        enrolled_students = list(
            Enrollment.objects.filter(
                course=selected_course,
                status=Enrollment.Status.APPROVED,
            ).select_related('student', 'student__student_profile')
        )
        session_records = Attendance.objects.filter(course=selected_course, date=selected_date).select_related('student')
        records_by_student = {record.student_id: record for record in session_records}
        course_history = Attendance.objects.filter(course=selected_course).select_related('student', 'marked_by').order_by('-date')[:100]

    for enrollment in enrolled_students:
        enrollment.current_status = records_by_student.get(enrollment.student_id).status if enrollment.student_id in records_by_student else 'present'

    total_students = len(enrolled_students)
    marked_present = session_records.filter(status='present').count()
    marked_absent = session_records.filter(status='absent').count()

    context = {
        'courses': courses,
        'selected_course': selected_course,
        'selected_date': selected_date,
        'enrolled_students': enrolled_students,
        'course_history': course_history,
        'total_students': total_students,
        'marked_present': marked_present,
        'marked_absent': marked_absent,
    }
    return render(request, 'attendance/faculty_dashboard.html', context)


@login_required
def admin_reports(request):
    if request.user.role != 'admin':
        messages.error(request, 'Access denied.')
        return redirect('accounts:dashboard')

    records = Attendance.objects.select_related('student', 'course', 'marked_by').order_by('-date', 'course__code', 'student__last_name')
    selected_course_id = request.GET.get('course')
    selected_student = request.GET.get('student', '').strip()
    selected_date = request.GET.get('date')

    if selected_course_id:
        records = records.filter(course_id=selected_course_id)
    if selected_student:
        records = records.filter(
            Q(student__first_name__icontains=selected_student)
            | Q(student__last_name__icontains=selected_student)
            | Q(student__email__icontains=selected_student)
            | Q(student__student_profile__roll_number__icontains=selected_student)
        )
    if selected_date:
        records = records.filter(date=selected_date)

    total_records, present_records, overall_percentage = _calculate_percentage(records)
    distinct_students = records.values('student').distinct().count()
    course_summary = records.values('course_id', 'course__code', 'course__name').annotate(
        total=Count('id'),
        present=Count('id', filter=Q(status='present')),
    ).order_by('course__code')

    context = {
        'records': records,
        'courses': Course.objects.all().order_by('code'),
        'selected_course_id': selected_course_id,
        'selected_student': selected_student,
        'selected_date': selected_date,
        'total_records': total_records,
        'present_records': present_records,
        'absent_records': total_records - present_records,
        'overall_percentage': overall_percentage,
        'distinct_students': distinct_students,
        'course_summary': course_summary,
    }
    return render(request, 'attendance/admin_reports.html', context)


@login_required
def attendance_history(request):
    if request.user.role == 'student':
        return redirect('attendance:student_dashboard')
    if request.user.role == 'faculty':
        return redirect('attendance:faculty_dashboard')
    return redirect('attendance:admin_reports')
