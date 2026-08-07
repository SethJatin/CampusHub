"""
Notes API - Serializers
"""

from rest_framework import serializers
from notes.models import Note, NoteComment, NoteRating
from accounts.api.serializers import UserSerializer
from courses.api.serializers import CourseSerializer


class NoteCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = NoteComment
        fields = ['id', 'note', 'user', 'content', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class NoteRatingSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = NoteRating
        fields = ['id', 'note', 'user', 'rating']
        read_only_fields = ['id', 'user']


class NoteSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    course_detail = CourseSerializer(source='course', read_only=True)
    average_rating = serializers.SerializerMethodField()
    comments = NoteCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Note
        fields = [
            'id', 'title', 'description', 'note_type', 'course', 'course_detail',
            'uploaded_by', 'file', 'content', 'is_public', 'views', 'downloads',
            'average_rating', 'comments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'views', 'downloads', 'created_at', 'updated_at']

    def get_average_rating(self, obj):
        ratings = obj.ratings.all()
        if not ratings:
            return 0
        return sum(r.rating for r in ratings) / len(ratings)
