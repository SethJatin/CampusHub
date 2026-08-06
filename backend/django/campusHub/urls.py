"""
URL configuration for CampusHub project.

This file maps URLs to views for the entire application.
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from campusHub import views as campus_views
from django.http import JsonResponse


def health_view(request):
    return JsonResponse({"message": "Django backend is running"})

urlpatterns = [
    # Root URL - home page
    path('', campus_views.home_view, name='home'),
    path('api/health/', health_view, name='health'),

    # Django Admin
    path("admin/", admin.site.urls),

    # Debug Toolbar (Development only)
    path('__debug__/', include('debug_toolbar.urls')),

    # REST Framework - API Documentation (disabled for now)
    # path('api/schema/', include('drf_spectacular.urls', namespace='drf-spectacular')),

    # Local apps
    path('accounts/', include('accounts.urls')),
    path('accounts/api/', include('accounts.api.urls')),
    path('courses/', include('courses.urls', namespace='courses')),
    path('api/courses/', include('courses.api.urls')),
    path('attendance/', include('attendance.urls', namespace='attendance')),
    path('api/attendance/', include('attendance.api.urls')),
    path('assignments/', include('assignments.urls', namespace='assignments')),
    path('api/assignments/', include('assignments.api.urls')),
    path('events/', include('events.urls', namespace='events')),
    path('api/events/', include('events.api.urls')),
    path('notes/', include('notes.urls', namespace='notes')),
    path('assets/<path:path>', campus_views.serve_react_asset, name='react-asset'),

    # Frontend SPA fallback for app routes
    re_path(r'^(?!api/|admin/|accounts/|courses/|attendance/|assignments/|events/|notes/|__debug__/).*$', campus_views.spa_view, name='spa'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom error handlers
handler404 = 'campusHub.views.handler404'
handler500 = 'campusHub.views.handler500'
