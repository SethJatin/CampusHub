"""
Events API - URL Configuration
"""

from django.urls import path
from . import views

app_name = 'events_api'

urlpatterns = [
    # Events
    path('', views.EventListCreateView.as_view(), name='event_list'),
    path('<int:pk>/', views.EventDetailView.as_view(), name='event_detail'),
    path('<int:event_id>/register/', views.EventRegistrationView.as_view(), name='event_register'),
    path('my-registrations/', views.MyEventRegistrationsView.as_view(), name='my_registrations'),

    # Announcements
    path('announcements/', views.AnnouncementListCreateView.as_view(), name='announcement_list'),
    path('announcements/<int:pk>/', views.AnnouncementDetailView.as_view(), name='announcement_detail'),
]
