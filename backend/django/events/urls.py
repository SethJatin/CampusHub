"""
Events App - URL Configuration
"""

from django.urls import path
from . import views

app_name = 'events'

urlpatterns = [
    # Events
    path('', views.event_list, name='event_list'),
    path('<int:event_id>/', views.event_detail, name='event_detail'),
    path('create/', views.create_event, name='create_event'),
    path('<int:event_id>/register/', views.register_event, name='register_event'),
    path('my-events/', views.my_events, name='my_events'),

    # Announcements
    path('announcements/', views.announcement_list, name='announcement_list'),
    path('announcements/<int:announcement_id>/', views.announcement_detail, name='announcement_detail'),
    path('announcements/create/', views.create_announcement, name='create_announcement'),
]
