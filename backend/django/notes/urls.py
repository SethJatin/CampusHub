"""
Notes App - URL Configuration
"""

from django.urls import path
from . import views

app_name = 'notes'

urlpatterns = [
    path('', views.note_list, name='note_list'),
    path('<int:note_id>/', views.note_detail, name='note_detail'),
    path('upload/', views.upload_note, name='upload_note'),
    path('my-notes/', views.my_notes, name='my_notes'),
    path('<int:note_id>/download/', views.download_note, name='download_note'),
    path('<int:note_id>/rate/', views.rate_note, name='rate_note'),
]
