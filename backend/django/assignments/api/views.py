"""
Assignments API - Views
"""

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone

from assignments.models import Assignment, Submission
from .serializers import AssignmentSerializer, SubmissionSerializer


class AssignmentListCreateView(generics.ListCreateAPIView):
    """
    API endpoint to list assignments or create a new one.

    GET /api/assignments/
    POST /api/assignments/
    """
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Assignment.objects.all()

        # Filter by course
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        # Filter by status (default: published)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        elif not self.request.user.is_staff:
            queryset = queryset.filter(status='published')

        return queryset.select_related('course', 'created_by')


class AssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint to get, update, or delete an assignment.

    GET /api/assignments/<id>/
    PUT /api/assignments/<id>/
    DELETE /api/assignments/<id>/
    """
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Assignment.objects.all()
        return Assignment.objects.filter(status='published')


class MyAssignmentsView(APIView):
    """
    API endpoint to get assignments for current user.

    GET /api/assignments/my-assignments/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'student':
            # Get assignments for enrolled courses
            from courses.models import Enrollment
            enrollments = Enrollment.objects.filter(
                student=user,
                status='approved'
            ).values_list('course_id', flat=True)

            assignments = Assignment.objects.filter(
                course_id__in=enrollments,
                status='published'
            ).select_related('course', 'created_by')
        elif user.role == 'faculty':
            # Get assignments created by faculty
            assignments = Assignment.objects.filter(
                created_by=user
            ).select_related('course')
        else:
            assignments = Assignment.objects.none()

        serializer = AssignmentSerializer(assignments, many=True)
        return Response(serializer.data)


class SubmissionCreateView(generics.CreateAPIView):
    """
    API endpoint for students to submit assignments.

    POST /api/assignments/<assignment_id>/submit/
    """
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        assignment = get_object_or_404(Assignment, pk=kwargs['assignment_id'])

        # Check if assignment is open
        if assignment.status != 'published':
            return Response(
                {'error': 'Assignment is not open for submission'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if past due date
        if timezone.now() > assignment.due_date and not assignment.allow_late_submission:
            return Response(
                {'error': 'Submission deadline has passed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already submitted
        if Submission.objects.filter(assignment=assignment, student=request.user).exists():
            return Response(
                {'error': 'You have already submitted this assignment'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(assignment=assignment, student=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SubmissionListView(generics.ListAPIView):
    """
    API endpoint to list submissions.

    GET /api/assignments/submissions/
    """
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Submission.objects.all().select_related('student', 'assignment', 'assignment__course')
        elif user.role == 'faculty':
            return Submission.objects.filter(
                assignment__course__instructor=user
            ).select_related('student', 'assignment')
        else:
            return Submission.objects.filter(student=user).select_related('assignment')


class GradeSubmissionView(APIView):
    """
    API endpoint for faculty to grade submissions.

    POST /api/assignments/submissions/<id>/grade/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, submission_id):
        submission = get_object_or_404(
            Submission,
            id=submission_id,
            assignment__course__instructor=request.user
        )

        marks = request.data.get('marks_obtained')
        grade = request.data.get('grade')
        feedback = request.data.get('feedback', '')

        if marks is not None:
            submission.marks_obtained = marks
        if grade:
            submission.grade = grade
        if feedback:
            submission.feedback = feedback

        submission.graded_by = request.user
        submission.graded_at = timezone.now()
        submission.status = 'graded'
        submission.save()

        return Response(
            {'message': 'Submission graded successfully'},
            status=status.HTTP_200_OK
        )
