"""REST API views for attendance management."""

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.models import Attendance, Course, Enrollment

from .serializers import AttendanceSerializer

User = get_user_model()


def _attendance_queryset_for_user(user):
    if user.role == 'admin':
        return Attendance.objects.all()
    if user.role == 'faculty':
        return Attendance.objects.filter(course__instructor=user)
    return Attendance.objects.filter(student=user)


class MarkAttendanceAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        if request.user.role not in {'admin', 'faculty'}:
            return Response({'detail': 'Not allowed to mark attendance.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == 'faculty' and course.instructor_id != request.user.id:
            return Response({'detail': 'Not allowed to mark this class.'}, status=status.HTTP_403_FORBIDDEN)

        records = request.data.get('attendance_records')
        if records is None:
            records = [request.data]
        if not isinstance(records, list):
            return Response({'detail': 'attendance_records must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

        date = request.data.get('date')
        if not date:
            return Response({'detail': 'date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        updated = []
        for record in records:
            student_id = record.get('student_id')
            if not student_id:
                return Response({'detail': 'Each record requires student_id.'}, status=status.HTTP_400_BAD_REQUEST)

            status_value = record.get('status', 'present')
            if status_value not in {'present', 'absent'}:
                status_value = 'present'

            if request.user.role != 'admin':
                enrolled = Enrollment.objects.filter(
                    student_id=student_id,
                    course=course,
                    status=Enrollment.Status.APPROVED,
                ).exists()
                if not enrolled:
                    return Response({'detail': f'Student {student_id} is not enrolled in this class.'}, status=status.HTTP_400_BAD_REQUEST)

            attendance, _ = Attendance.objects.update_or_create(
                student_id=student_id,
                course=course,
                date=date,
                defaults={'status': status_value, 'marked_by': request.user},
            )
            updated.append(attendance)

        return Response(
            {'detail': f'Attendance saved for {len(updated)} students.', 'records': AttendanceSerializer(updated, many=True).data},
            status=status.HTTP_201_CREATED,
        )


class UpdateAttendanceAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, attendance_id):
        attendance = get_object_or_404(Attendance, id=attendance_id)
        if request.user.role not in {'admin', 'faculty'}:
            return Response({'detail': 'Not allowed to update this record.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == 'faculty' and attendance.course.instructor_id != request.user.id:
            return Response({'detail': 'Not allowed to update this record.'}, status=status.HTTP_403_FORBIDDEN)

        status_value = request.data.get('status')
        if status_value and status_value not in {'present', 'absent'}:
            return Response({'detail': 'Invalid status value.'}, status=status.HTTP_400_BAD_REQUEST)

        date = request.data.get('date')
        if status_value:
            attendance.status = status_value
        if date:
            attendance.date = date
        attendance.marked_by = request.user
        attendance.save()
        return Response(AttendanceSerializer(attendance).data)


class StudentAttendanceAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id):
        student = get_object_or_404(User, id=student_id)
        if request.user.role == 'student' and request.user.id != student.id:
            return Response({'detail': 'Not allowed to view this student.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role not in {'admin', 'faculty', 'student'}:
            return Response({'detail': 'Not allowed to view this student.'}, status=status.HTTP_403_FORBIDDEN)

        records = _attendance_queryset_for_user(request.user).filter(student=student).select_related('student', 'course')
        course_id = request.query_params.get('course')
        if course_id:
            records = records.filter(course_id=course_id)
        date = request.query_params.get('date')
        if date:
            records = records.filter(date=date)
        return Response(AttendanceSerializer(records, many=True).data)


class ClassAttendanceAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        if request.user.role == 'faculty' and course.instructor_id != request.user.id:
            return Response({'detail': 'Not allowed to view this class.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == 'student':
            enrolled = Enrollment.objects.filter(course=course, student=request.user, status=Enrollment.Status.APPROVED).exists()
            if not enrolled:
                return Response({'detail': 'Not allowed to view this class.'}, status=status.HTTP_403_FORBIDDEN)

        records = Attendance.objects.filter(course=course).select_related('student', 'course')
        student_id = request.query_params.get('student')
        if student_id:
            records = records.filter(student_id=student_id)
        date = request.query_params.get('date')
        if date:
            records = records.filter(date=date)
        return Response(AttendanceSerializer(records, many=True).data)


class SubjectAttendanceAPIView(ClassAttendanceAPIView):
    pass


class AttendancePercentageAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, student_id):
        student = get_object_or_404(User, id=student_id)
        if request.user.role == 'student' and request.user.id != student.id:
            return Response({'detail': 'Not allowed to calculate this percentage.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role not in {'admin', 'faculty', 'student'}:
            return Response({'detail': 'Not allowed to calculate this percentage.'}, status=status.HTTP_403_FORBIDDEN)

        course_id = request.query_params.get('course')
        records = _attendance_queryset_for_user(request.user).filter(student=student)
        if course_id:
            records = records.filter(course_id=course_id)

        total = records.count()
        present = records.filter(status='present').count()
        percentage = round((present / total) * 100, 1) if total else 0
        return Response({
            'student_id': student.id,
            'total_classes': total,
            'classes_attended': present,
            'percentage': percentage,
        })
