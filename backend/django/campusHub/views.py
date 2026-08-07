"""
Custom error handlers for CampusHub.
"""

from pathlib import Path
from django.http import HttpResponse
from django.shortcuts import render
from django.views.static import serve

PROJECT_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIST = PROJECT_ROOT / 'frontend' / 'dist'


def home_view(request):
    """Serve the Django home page template."""
    return render(request, 'home.html')


def render_react_page(request):
    """Return the built React frontend HTML shell."""
    index_path = FRONTEND_DIST / 'index.html'
    if index_path.exists():
        html = index_path.read_text(encoding='utf-8')
        return HttpResponse(html)

    html = """
    <!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
        <title>CampusHub</title>
      </head>
      <body>
        <div id=\"root\"></div>
        <p>React build not found. Please run npm run build in the frontend folder.</p>
      </body>
    </html>
    """
    return HttpResponse(html)


def spa_view(request, path=''):
    """Serve the React SPA for non-API frontend routes."""
    return render_react_page(request)


def serve_react_asset(request, path):
    """Serve built React JS and CSS files from the frontend dist folder."""
    asset_path = FRONTEND_DIST / 'assets' / path
    if asset_path.exists():
        return serve(request, path, document_root=str(FRONTEND_DIST / 'assets'))
    return HttpResponse(status=404)


def handler404(request, exception):
    """Custom 404 error page."""
    return render(request, 'errors/404.html', status=404)


def handler500(request):
    """Custom 500 error page."""
    return render(request, 'errors/500.html', status=500)
