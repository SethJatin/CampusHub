"""
URL configuration for CampusHub Pure REST API Backend.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from campusHub import views as campus_views
from django.http import JsonResponse


def health_view(request):
    return JsonResponse({"message": "Django backend is running", "status": "healthy"})


urlpatterns = [
    # Root API Info & Health Check
    path('', campus_views.api_root_view, name='api_root'),
    path('api/health/', health_view, name='health'),

    # Django Admin
    path("admin/", admin.site.urls),

    # Debug Toolbar
    path('__debug__/', include('debug_toolbar.urls')),

    # Pure REST API Routes
    path('api/accounts/', include('accounts.api.urls')),
    path('accounts/api/', include('accounts.api.urls')),  # Compatibility alias
    path('api/courses/', include('courses.api.urls')),
    path('api/attendance/', include('attendance.api.urls')),
    path('api/assignments/', include('assignments.api.urls')),
    path('api/events/', include('events.api.urls')),
    path('api/notes/', include('notes.api.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Custom JSON error handlers
handler404 = 'campusHub.views.handler404'
handler500 = 'campusHub.views.handler500'
