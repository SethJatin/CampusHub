"""
CampusHub Backend REST API Views & Handlers
"""

from django.http import JsonResponse


def api_root_view(request):
    """Headless REST API Root Endpoint."""
    return JsonResponse({
        "status": "ok",
        "service": "CampusHub Pure Backend REST API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health/",
            "admin": "/admin/",
            "accounts_api": "/api/accounts/",
            "courses_api": "/api/courses/",
            "attendance_api": "/api/attendance/",
            "assignments_api": "/api/assignments/",
            "events_api": "/api/events/",
            "notes_api": "/api/notes/",
        }
    })


def handler404(request, exception=None):
    """JSON 404 error handler for REST API."""
    return JsonResponse({"error": "Resource not found", "status": 404}, status=404)


def handler500(request):
    """JSON 500 error handler for REST API."""
    return JsonResponse({"error": "Internal server error", "status": 500}, status=500)
