"""
Notes API - URL Configuration
"""

from django.urls import path
from . import views

app_name = 'notes_api'

urlpatterns = [
    path('', views.NoteListCreateView.as_view(), name='note_list_create'),
    path('<int:pk>/', views.NoteDetailView.as_view(), name='note_detail'),
    path('<int:pk>/download/', views.NoteDownloadView.as_view(), name='note_download'),
    path('<int:pk>/comment/', views.NoteCommentCreateView.as_view(), name='note_comment'),
    path('<int:pk>/rate/', views.NoteRateView.as_view(), name='note_rate'),
]
