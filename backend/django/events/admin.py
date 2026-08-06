"""
Events App - Admin Configuration
"""

from django.contrib import admin
from .models import Event, EventRegistration, Announcement


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'start_date', 'status', 'organized_by']
    list_filter = ['status', 'category', 'start_date']
    search_fields = ['title', 'description']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'priority', 'is_published', 'created_by', 'created_at']
    list_filter = ['priority', 'is_published', 'created_at']
    search_fields = ['title', 'content']
