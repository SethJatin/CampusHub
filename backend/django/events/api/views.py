"""
Events API - Views
"""

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import models

from events.models import Event, EventRegistration, Announcement
from .serializers import (
    EventSerializer, EventRegistrationSerializer, AnnouncementSerializer
)


class EventListCreateView(generics.ListCreateAPIView):
    """
    API endpoint to list events or create a new one.

    GET /api/events/
    POST /api/events/
    """
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Event.objects.all()

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Filter by status (default: published)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        elif not self.request.user.is_staff:
            queryset = queryset.filter(status='published')

        return queryset.select_related('organized_by')


class EventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint to get, update, or delete an event.

    GET /api/events/<id>/
    PUT /api/events/<id>/
    DELETE /api/events/<id>/
    """
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class EventRegistrationView(APIView):
    """
    API endpoint to register for an event.

    POST /api/events/<id>/register/
    DELETE /api/events/<id>/register/ (to cancel)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, status='published')

        # Check if already registered
        if EventRegistration.objects.filter(event=event, user=request.user).exists():
            return Response(
                {'error': 'Already registered for this event'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if event is full
        if event.max_participants:
            current_count = event.registrations.count()
            if current_count >= event.max_participants:
                return Response(
                    {'error': 'Event is full'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        registration = EventRegistration.objects.create(event=event, user=request.user)
        return Response(
            {'message': 'Successfully registered for event'},
            status=status.HTTP_201_CREATED
        )

    def delete(self, request, event_id):
        event = get_object_or_404(Event, id=event_id)
        registration = get_object_or_404(
            EventRegistration,
            event=event,
            user=request.user
        )
        registration.delete()
        return Response(
            {'message': 'Registration cancelled'},
            status=status.HTTP_200_OK
        )


class MyEventRegistrationsView(APIView):
    """
    API endpoint to get current user's event registrations.

    GET /api/events/my-registrations/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        registrations = EventRegistration.objects.filter(
            user=request.user
        ).select_related('event')

        serializer = EventRegistrationSerializer(registrations, many=True)
        return Response(serializer.data)


# ==================== Announcement Views ====================

class AnnouncementListCreateView(generics.ListCreateAPIView):
    """
    API endpoint to list announcements or create a new one.

    GET /api/events/announcements/
    POST /api/events/announcements/
    """
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Announcement.objects.all()

        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        # Filter by published status
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_published=True)

        # Filter by target role
        user_role = self.request.user.role
        queryset = queryset.filter(
            models.Q(target_roles=[]) |
            models.Q(target_roles__contains=[user_role])
        )

        return queryset.select_related('created_by')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    API endpoint to get, update, or delete an announcement.

    GET /api/events/announcements/<id>/
    PUT /api/events/announcements/<id>/
    DELETE /api/events/announcements/<id>/
    """
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAdminUser]
