"""
URL configuration for CampusHub Pure REST API Backend.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from campusHub import views as campus_views
from campusHub import legacy_api
from django.http import JsonResponse


def health_view(request):
    return JsonResponse({"message": "Django backend is running and verified", "status": "healthy"})


urlpatterns = [
    # Root API Info & Health Check
    path('', campus_views.api_root_view, name='api_root'),
    path('api/health/', health_view, name='health'),
    path('api/stats', legacy_api.platform_stats),
    path('api/stats/', legacy_api.platform_stats),

    # Django Admin
    path("admin/", admin.site.urls),

    # Debug Toolbar
    path('__debug__/', include('debug_toolbar.urls')),

    # Auth & Profile Endpoints
    path('accounts/api/login', legacy_api.auth_login),
    path('accounts/api/login/', legacy_api.auth_login),
    path('accounts/api/register', legacy_api.auth_register),
    path('accounts/api/register/', legacy_api.auth_register),
    path('accounts/api/me', legacy_api.auth_me),
    path('accounts/api/me/', legacy_api.auth_me),
    path('accounts/api/profile', legacy_api.auth_profile),
    path('accounts/api/profile/', legacy_api.auth_profile),
    path('accounts/api/change-password', legacy_api.auth_change_password),
    path('accounts/api/change-password/', legacy_api.auth_change_password),
    path('accounts/api/forgot-password', legacy_api.auth_reset_password_with_sentence),
    path('accounts/api/forgot-password/', legacy_api.auth_reset_password_with_sentence),
    path('accounts/api/forgot-password/send-otp', legacy_api.auth_send_otp),
    path('accounts/api/forgot-password/send-otp/', legacy_api.auth_send_otp),
    path('accounts/api/forgot-password/verify-otp', legacy_api.auth_verify_otp_reset),
    path('accounts/api/forgot-password/verify-otp/', legacy_api.auth_verify_otp_reset),


    # Courses Endpoints
    path('api/courses', legacy_api.courses_list_or_detail),
    path('api/courses/', legacy_api.courses_list_or_detail),
    path('api/courses/my-courses', legacy_api.courses_my_courses),
    path('api/courses/my-courses/', legacy_api.courses_my_courses),
    path('api/courses/my-enrollments', legacy_api.courses_my_enrollments),
    path('api/courses/my-enrollments/', legacy_api.courses_my_enrollments),
    path('api/courses/my-enrollment-status', legacy_api.courses_my_enrollment_status),
    path('api/courses/my-enrollment-status/', legacy_api.courses_my_enrollment_status),
    path('api/courses/pending-approvals', legacy_api.courses_pending_approvals),
    path('api/courses/pending-approvals/', legacy_api.courses_pending_approvals),
    path('api/courses/enroll', legacy_api.courses_enroll_body),
    path('api/courses/enroll/', legacy_api.courses_enroll_body),
    path('api/courses/enroll/<int:course_id>', legacy_api.courses_enroll),
    path('api/courses/enroll/<int:course_id>/', legacy_api.courses_enroll),
    path('api/courses/enrollments/<int:enrollment_id>/approve', legacy_api.courses_approve_enrollment),
    path('api/courses/enrollments/<int:enrollment_id>/approve/', legacy_api.courses_approve_enrollment),
    path('api/courses/enrollments/<int:enrollment_id>/reject', legacy_api.courses_reject_enrollment),
    path('api/courses/enrollments/<int:enrollment_id>/reject/', legacy_api.courses_reject_enrollment),
    path('api/courses/<int:course_id>', legacy_api.courses_list_or_detail),
    path('api/courses/<int:course_id>/', legacy_api.courses_list_or_detail),
    path('api/courses/<int:course_id>/materials', legacy_api.courses_materials),
    path('api/courses/<int:course_id>/materials/', legacy_api.courses_materials),

    # Attendance Endpoints
    path('api/attendance/summary', legacy_api.attendance_summary),
    path('api/attendance/summary/', legacy_api.attendance_summary),
    path('api/attendance/my-summary', legacy_api.attendance_my_summary),
    path('api/attendance/my-summary/', legacy_api.attendance_my_summary),
    path('api/attendance/class-students', legacy_api.attendance_class_students),
    path('api/attendance/class-students/', legacy_api.attendance_class_students),
    path('api/attendance/mark', legacy_api.attendance_mark),
    path('api/attendance/mark/', legacy_api.attendance_mark),
    path('api/attendance/mark/<int:course_id>', legacy_api.attendance_mark_course),
    path('api/attendance/mark/<int:course_id>/', legacy_api.attendance_mark_course),
    path('api/attendance/update/<int:attendance_id>', legacy_api.attendance_update),
    path('api/attendance/update/<int:attendance_id>/', legacy_api.attendance_update),
    path('api/attendance/enrolled/<int:course_id>', legacy_api.attendance_enrolled_students),
    path('api/attendance/enrolled/<int:course_id>/', legacy_api.attendance_enrolled_students),
    path('api/attendance/student/<int:student_id>', legacy_api.attendance_student_logs),
    path('api/attendance/student/<int:student_id>/', legacy_api.attendance_student_logs),
    path('api/attendance/subject-wise/<int:student_id>', legacy_api.attendance_subject_wise),
    path('api/attendance/subject-wise/<int:student_id>/', legacy_api.attendance_subject_wise),
    path('api/attendance/percentage/<int:student_id>', legacy_api.attendance_percentage),
    path('api/attendance/percentage/<int:student_id>/', legacy_api.attendance_percentage),

    # Exams & Analytics Endpoints
    path('api/exams', legacy_api.exams_list_or_detail),
    path('api/exams/', legacy_api.exams_list_or_detail),
    path('api/exams/growth/student/<int:student_id>', legacy_api.exams_growth_student),
    path('api/exams/growth/student/<int:student_id>/', legacy_api.exams_growth_student),
    path('api/exams/growth/faculty-overview', legacy_api.exams_growth_faculty),
    path('api/exams/growth/faculty-overview/', legacy_api.exams_growth_faculty),
    path('api/exams/<int:exam_id>', legacy_api.exams_list_or_detail),
    path('api/exams/<int:exam_id>/', legacy_api.exams_list_or_detail),
    path('api/exams/<int:exam_id>/students', legacy_api.exams_get_students),
    path('api/exams/<int:exam_id>/students/', legacy_api.exams_get_students),
    path('api/exams/<int:exam_id>/marks', legacy_api.exams_save_marks),
    path('api/exams/<int:exam_id>/marks/', legacy_api.exams_save_marks),
    path('api/exams/<int:exam_id>/submit', legacy_api.exams_submit_answers),
    path('api/exams/<int:exam_id>/submit/', legacy_api.exams_submit_answers),

    # ML & Risk Indicator Endpoints
    path('api/ml/risk-analysis', legacy_api.ml_risk_analysis),
    path('api/ml/risk-analysis/', legacy_api.ml_risk_analysis),
    path('api/ml/student-risk/<int:student_id>', legacy_api.ml_student_risk),
    path('api/ml/student-risk/<int:student_id>/', legacy_api.ml_student_risk),

    # Assignments Endpoints
    path('api/assignments', legacy_api.assignments_list),
    path('api/assignments/', legacy_api.assignments_list),
    path('api/assignments/reminders', legacy_api.assignments_reminders),
    path('api/assignments/reminders/', legacy_api.assignments_reminders),
    path('api/submissions', legacy_api.submissions_list),
    path('api/submissions/', legacy_api.submissions_list),
    path('api/assignments/<int:assignment_id>/submit', legacy_api.assignments_submit),
    path('api/assignments/<int:assignment_id>/submit/', legacy_api.assignments_submit),
    path('api/submissions/<int:submission_id>/grade', legacy_api.submissions_grade),
    path('api/submissions/<int:submission_id>/grade/', legacy_api.submissions_grade),

    # Events & Announcements Endpoints
    path('api/events', legacy_api.events_list_or_create),
    path('api/events/', legacy_api.events_list_or_create),
    path('api/events/<int:event_id>/register', legacy_api.events_register),
    path('api/events/<int:event_id>/register/', legacy_api.events_register),
    path('api/announcements', legacy_api.announcements_list_or_create),
    path('api/announcements/', legacy_api.announcements_list_or_create),
    path('api/announcements/<int:announcement_id>', legacy_api.announcements_list_or_create),
    path('api/announcements/<int:announcement_id>/', legacy_api.announcements_list_or_create),

    # Notes Endpoints
    path('api/notes', legacy_api.notes_list_or_create),
    path('api/notes/', legacy_api.notes_list_or_create),

    # DRF Sub-app API Endpoints
    path('drf/accounts/', include('accounts.api.urls')),
    path('drf/courses/', include('courses.api.urls')),
    path('drf/attendance/', include('attendance.api.urls')),
    path('drf/assignments/', include('assignments.api.urls')),
    path('drf/events/', include('events.api.urls')),
    path('drf/notes/', include('notes.api.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom JSON error handlers
handler404 = 'campusHub.views.handler404'
handler500 = 'campusHub.views.handler500'
