"""
Notes App - Views

Views for notes sharing.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Avg
from .models import Note, NoteComment, NoteRating
from .forms import NoteForm, NoteCommentForm
from courses.models import Enrollment


def note_list(request):
    """List all public notes."""
    course_id = request.GET.get('course')
    note_type = request.GET.get('type')

    notes = Note.objects.filter(is_public=True)

    if course_id:
        notes = notes.filter(course_id=course_id)
    if note_type:
        notes = notes.filter(note_type=note_type)

    # Add average rating
    notes = notes.select_related('course', 'uploaded_by').annotate(
        avg_rating=Avg('ratings__rating')
    ).order_by('-created_at')

    paginator = Paginator(notes, 12)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {'page_obj': page_obj, 'course_id': course_id, 'note_type': note_type}
    return render(request, 'notes/note_list.html', context)


def note_detail(request, note_id):
    """View note details and comments."""
    note = get_object_or_404(Note, id=note_id, is_public=True)

    # Increment view count
    note.views += 1
    note.save(update_fields=['views'])

    # Get user's rating if logged in
    user_rating = None
    if request.user.is_authenticated:
        user_rating = NoteRating.objects.filter(note=note, user=request.user).first()

    # Get comments
    comments = note.comments.select_related('user')

    # Calculate average rating
    avg_rating = note.ratings.aggregate(Avg('rating'))['rating__avg'] or 0

    # Comment form
    if request.method == 'POST' and request.user.is_authenticated:
        comment_form = NoteCommentForm(request.POST)
        if comment_form.is_valid():
            comment = comment_form.save(commit=False)
            comment.note = note
            comment.user = request.user
            comment.save()
            messages.success(request, "Comment added!")
            return redirect('notes:note_detail', note_id=note_id)
    else:
        comment_form = NoteCommentForm()

    context = {
        'note': note,
        'comments': comments,
        'comment_form': comment_form,
        'user_rating': user_rating,
        'avg_rating': avg_rating,
    }
    return render(request, 'notes/note_detail.html', context)


@login_required
def upload_note(request):
    """Upload a new note."""
    if request.method == 'POST':
        form = NoteForm(request.POST, request.FILES)
        if form.is_valid():
            note = form.save(commit=False)
            note.uploaded_by = request.user
            note.save()
            messages.success(request, "Note uploaded successfully!")
            return redirect('notes:note_detail', note_id=note.id)
    else:
        form = NoteForm()

    # Get user's enrolled courses (for students) or taught courses (for faculty)
    if request.user.role == 'student':
        course_ids = Enrollment.objects.filter(
            student=request.user, status='approved'
        ).values_list('course_id', flat=True)
    else:
        from courses.models import Course
        course_ids = Course.objects.filter(instructor=request.user).values_list('id', flat=True)

    from courses.models import Course
    courses = Course.objects.filter(id__in=course_ids) if course_ids else Course.objects.none()

    context = {'form': form, 'courses': courses, 'action': 'Upload'}
    return render(request, 'notes/note_form.html', context)


@login_required
def my_notes(request):
    """View user's uploaded notes."""
    notes = Note.objects.filter(
        uploaded_by=request.user
    ).select_related('course').order_by('-created_at')

    context = {'notes': notes}
    return render(request, 'notes/my_notes.html', context)


@login_required
def download_note(request, note_id):
    """Track note download."""
    note = get_object_or_404(Note, id=note_id, is_public=True)

    note.downloads += 1
    note.save(update_fields=['downloads'])

    # Redirect to file
    return redirect(note.file.url)


@login_required
def rate_note(request, note_id):
    """Rate a note."""
    if request.method == 'POST':
        note = get_object_or_404(Note, id=note_id)
        rating = int(request.POST.get('rating', 0))

        if 1 <= rating <= 5:
            NoteRating.objects.update_or_create(
                note=note, user=request.user, defaults={'rating': rating}
            )
            messages.success(request, "Rating saved!")

        return redirect('notes:note_detail', note_id=note_id)
    return redirect('notes:note_list')
