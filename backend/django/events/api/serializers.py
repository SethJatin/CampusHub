"""
Events API - Serializers
"""

from rest_framework import serializers
from events.models import Event, EventRegistration, Announcement
from accounts.api.serializers import UserSerializer


class EventSerializer(serializers.ModelSerializer):
    """
    Serializer for Event model.
    """
    organized_by_name = serializers.CharField(source='organized_by.get_full_name', read_only=True)
    registered_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'category', 'start_date', 'end_date',
            'venue', 'organized_by', 'organized_by_name', 'department',
            'registration_required', 'registration_deadline', 'max_participants',
            'status', 'banner', 'attachment', 'registered_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_registered_count(self, obj):
        return obj.registrations.count()


class EventRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for EventRegistration model.
    """
    user_details = UserSerializer(source='user', read_only=True)
    event_details = EventSerializer(source='event', read_only=True)

    class Meta:
        model = EventRegistration
        fields = ['id', 'event', 'event_details', 'user', 'user_details', 'registered_at', 'status']
        read_only_fields = ['id', 'registered_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    """
    Serializer for Announcement model.
    """
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content', 'priority', 'target_roles',
            'is_published', 'start_date', 'end_date', 'created_by',
            'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
