"""
Notes App - Admin Configuration
"""

from django.contrib import admin
from .models import Note, NoteComment, NoteRating


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'note_type', 'uploaded_by', 'views', 'created_at']
    list_filter = ['note_type', 'course', 'created_at']
    search_fields = ['title', 'description']


@admin.register(NoteComment)
class NoteCommentAdmin(admin.ModelAdmin):
    list_display = ['note', 'user', 'created_at']
    search_fields = ['content']
