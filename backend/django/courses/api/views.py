"""
Courses API - Views

API views for course management, enrollment, materials, and attendance.
"""

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Count

from .serializers import (
    CourseSerializer, EnrollmentSerializer,
    CourseMaterialSerializer, AttendanceSerializer
)
from courses.models import Course, Enrollment, CourseMaterial, Attendance


class IsInstructorOrReadOnly(permissions.BasePermission):
    """
    Permission to only allow instructors to modify courses.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.instructor == request.user or request.user.is_staff


class CourseListCreateView(generics.ListCreateAPIView):
    """
    API endpoint to list all courses or create a new course.

    GET /api/courses/
    POST /api/courses/
    """
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint to get, update, or delete a course.

    GET /api/courses/<id>/
    PUT /api/courses/<id>/
    DELETE /api/courses/<id>/
    """
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsInstructorOrReadOnly]


class MyCoursesView(APIView):
    """
    API endpoint to get courses for the current user.

    GET /api/courses/my-courses/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'student':
            enrollments = Enrollment.objects.filter(
                student=user,
                status=Enrollment.Status.APPROVED
            ).select_related('course', 'course__instructor')
            courses = [enrollment.course for enrollment in enrollments]
            serializer = CourseSerializer(courses, many=True)
        elif user.role == 'faculty':
            courses = Course.objects.filter(instructor=user)
            serializer = CourseSerializer(courses, many=True)
        else:
            courses = Course.objects.none()
            serializer = CourseSerializer(courses, many=True)

        return Response(serializer.data)


class EnrollmentCreateView(generics.CreateAPIView):
    """
    API endpoint for students to enroll in a course.

    POST /api/courses/enrollments/
    """
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)


class EnrollmentListView(generics.ListAPIView):
    """
    API endpoint to list enrollments.

    GET /api/courses/enrollments/
    """
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Enrollment.objects.all().select_related('student', 'course')
        elif user.role == 'faculty':
            return Enrollment.objects.filter(
                course__instructor=user
            ).select_related('student', 'course')
        else:
            return Enrollment.objects.filter(
                student=user
            ).select_related('course')


class EnrollmentDetailView(generics.RetrieveUpdateAPIView):
    """
    API endpoint to get or update an enrollment.

    GET /api/courses/enrollments/<id>/
    PUT /api/courses/enrollments/<id>/
    """
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Enrollment.objects.all()
        elif user.role == 'faculty':
            return Enrollment.objects.filter(course__instructor=user)
        else:
            return Enrollment.objects.filter(student=user)


class ApproveEnrollmentView(APIView):
    """
    API endpoint to approve an enrollment.

    POST /api/courses/enrollments/<id>/approve/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, enrollment_id):
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            course__instructor=request.user
        )
        enrollment.status = Enrollment.Status.APPROVED
        enrollment.approved_by = request.user
        enrollment.save()
        return Response(
            {'message': 'Enrollment approved', 'status': enrollment.status},
            status=status.HTTP_200_OK
        )


class RejectEnrollmentView(APIView):
    """
    API endpoint to reject an enrollment.

    POST /api/courses/enrollments/<id>/reject/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, enrollment_id):
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            course__instructor=request.user
        )
        enrollment.status = Enrollment.Status.REJECTED
        enrollment.approved_by = request.user
        enrollment.save()
        return Response(
            {'message': 'Enrollment rejected', 'status': enrollment.status},
            status=status.HTTP_200_OK
        )


class CourseMaterialsView(generics.ListCreateAPIView):
    """
    API endpoint to list or create course materials.

    GET /api/courses/<course_id>/materials/
    POST /api/courses/<course_id>/materials/
    """
    serializer_class = CourseMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        course_id = self.kwargs.get('course_id')
        return CourseMaterial.objects.filter(
            course_id=course_id,
            is_published=True
        ).select_related('uploaded_by')

    def perform_create(self, serializer):
        course_id = self.kwargs.get('course_id')
        course = get_object_or_404(Course, id=course_id)
        serializer.save(course=course, uploaded_by=self.request.user)


class AttendanceListView(generics.ListCreateAPIView):
    """
    API endpoint to list or create attendance records.

    GET /api/courses/attendance/
    POST /api/courses/attendance/
    """
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Attendance.objects.all().select_related('student', 'course')
        elif user.role == 'faculty':
            course_ids = Course.objects.filter(instructor=user).values_list('id', flat=True)
            return Attendance.objects.filter(
                course_id__in=course_ids
            ).select_related('student', 'course')
        else:
            return Attendance.objects.filter(
                student=user
            ).select_related('course')

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)


class MarkAttendanceView(APIView):
    """
    API endpoint for instructors to mark attendance.

    POST /api/courses/<course_id>/attendance/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id, instructor=request.user)

        attendance_data = request.data.get('attendance_records', [])
        created_records = []

        for record in attendance_data:
            student_id = record.get('student_id')
            date = record.get('date')
            status_val = record.get('status', 'present')

            attendance, created = Attendance.objects.update_or_create(
                student_id=student_id,
                course=course,
                date=date,
                defaults={
                    'status': status_val,
                    'marked_by': request.user
                }
            )
            created_records.append(attendance.id)

        return Response(
            {'message': f'Attendance marked for {len(created_records)} students'},
            status=status.HTTP_201_CREATED
        )


class MyAttendanceView(APIView):
    """
    API endpoint for students to view their attendance.

    GET /api/courses/my-attendance/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        enrollments = Enrollment.objects.filter(
            student=user,
            status=Enrollment.Status.APPROVED
        ).values_list('course_id', flat=True)

        attendance = Attendance.objects.filter(
            student=user,
            course_id__in=enrollments
        ).select_related('course')

        serializer = AttendanceSerializer(attendance, many=True)
        return Response(serializer.data)
