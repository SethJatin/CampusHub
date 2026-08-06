"""
Assignments API - URL Configuration
"""

from django.urls import path
from . import views

app_name = 'assignments_api'

urlpatterns = [
    # Assignments
    path('', views.AssignmentListCreateView.as_view(), name='assignment_list'),
    path('<int:pk>/', views.AssignmentDetailView.as_view(), name='assignment_detail'),
    path('my-assignments/', views.MyAssignmentsView.as_view(), name='my_assignments'),

    # Submissions
    path('submissions/', views.SubmissionListView.as_view(), name='submission_list'),
    path('<int:assignment_id>/submit/', views.SubmissionCreateView.as_view(), name='submission_create'),
    path('submissions/<int:submission_id>/grade/', views.GradeSubmissionView.as_view(), name='grade_submission'),
]
