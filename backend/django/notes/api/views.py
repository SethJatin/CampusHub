"""
Notes API - Views
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404

from notes.models import Note, NoteComment, NoteRating
from .serializers import NoteSerializer, NoteCommentSerializer, NoteRatingSerializer


class NoteListCreateView(generics.ListCreateAPIView):
    """
    API endpoint to list and upload notes.

    GET /api/notes/
    POST /api/notes/
    """
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Note.objects.filter(is_public=True).select_related('course', 'uploaded_by').prefetch_related('comments', 'ratings')
        course_id = self.request.query_params.get('course')
        note_type = self.request.query_params.get('type')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        if note_type:
            queryset = queryset.filter(note_type=note_type)
        return queryset

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint to retrieve, update, or delete a note.

    GET /api/notes/<id>/
    PUT/PATCH /api/notes/<id>/
    DELETE /api/notes/<id>/
    """
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class NoteDownloadView(APIView):
    """
    API endpoint to download a note file.

    GET /api/notes/<id>/download/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        note = get_object_or_404(Note, pk=pk)
        if not note.file:
            raise Http404("Note file does not exist")
        
        note.downloads += 1
        note.save(update_fields=['downloads'])
        return FileResponse(note.file.open('rb'), as_attachment=True, filename=note.file.name)


class NoteCommentCreateView(generics.CreateAPIView):
    """
    API endpoint to add a comment to a note.

    POST /api/notes/<id>/comment/
    """
    serializer_class = NoteCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        note = get_object_or_404(Note, pk=self.kwargs['pk'])
        serializer.save(user=self.request.user, note=note)


class NoteRateView(APIView):
    """
    API endpoint to rate a note (1-5).

    POST /api/notes/<id>/rate/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        note = get_object_or_404(Note, pk=pk)
        rating_value = request.data.get('rating')
        if not rating_value or not (1 <= int(rating_value) <= 5):
            return Response({'error': 'Rating must be an integer between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
        
        rating_obj, _ = NoteRating.objects.update_or_create(
            note=note,
            user=request.user,
            defaults={'rating': int(rating_value)}
        )
        return Response(NoteRatingSerializer(rating_obj).data)
