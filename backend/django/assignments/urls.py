"""
Assignments App - URL Configuration
"""

from django.urls import path
from . import views

app_name = 'assignments'

urlpatterns = [
    # Assignment list and detail
    path('', views.assignment_list, name='assignment_list'),
    path('<int:assignment_id>/', views.assignment_detail, name='assignment_detail'),

    # Create/Edit assignments (faculty)
    path('create/', views.create_assignment, name='create_assignment'),
    path('<int:assignment_id>/edit/', views.edit_assignment, name='edit_assignment'),

    # Submit assignment (students)
    path('<int:assignment_id>/submit/', views.submit_assignment, name='submit_assignment'),

    # My submissions (students)
    path('my-submissions/', views.my_submissions, name='my_submissions'),

    # View/Grade submissions (faculty)
    path('<int:assignment_id>/submissions/', views.view_submissions, name='view_submissions'),
    path('submissions/<int:submission_id>/grade/', views.grade_submission, name='grade_submission'),
]
