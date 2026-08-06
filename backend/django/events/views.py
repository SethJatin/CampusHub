"""
Events App - Views

Views for events and announcements.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.utils import timezone
from django.db.models import Q
from .models import Event, EventRegistration, Announcement
from .forms import EventForm, AnnouncementForm


def event_list(request):
    """List all published events."""
    category = request.GET.get('category')
    status_filter = request.GET.get('status')

    events = Event.objects.filter(status='published')

    if category:
        events = events.filter(category=category)

    events = events.order_by('start_date')

    # Pagination
    paginator = Paginator(events, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    context = {
        'page_obj': page_obj,
        'category': category,
    }
    return render(request, 'events/event_list.html', context)


def event_detail(request, event_id):
    """View event details."""
    event = get_object_or_404(Event, id=event_id)

    # Check registration
    is_registered = False
    if request.user.is_authenticated:
        is_registered = EventRegistration.objects.filter(
            event=event, user=request.user
        ).exists()

    context = {
        'event': event,
        'is_registered': is_registered,
        'now': timezone.now(),
    }
    return render(request, 'events/event_detail.html', context)


@login_required
def create_event(request):
    """Create a new event."""
    if request.method == 'POST':
        form = EventForm(request.POST, request.FILES)
        if form.is_valid():
            event = form.save(commit=False)
            event.organized_by = request.user
            event.save()
            messages.success(request, "Event created successfully!")
            return redirect('events:event_detail', event_id=event.id)
    else:
        form = EventForm()

    context = {'form': form, 'action': 'Create'}
    return render(request, 'events/event_form.html', context)


@login_required
def register_event(request, event_id):
    """Register for an event."""
    event = get_object_or_404(Event, id=event_id)

    if not event.registration_required:
        messages.error(request, "Registration not required for this event.")
        return redirect('events:event_detail', event_id=event_id)

    if event.registration_deadline and timezone.now() > event.registration_deadline:
        messages.error(request, "Registration deadline has passed.")
        return redirect('events:event_detail', event_id=event_id)

    if event.max_participants:
        current = EventRegistration.objects.filter(event=event).count()
        if current >= event.max_participants:
            messages.error(request, "Event is full.")
            return redirect('events:event_detail', event_id=event_id)

    existing = EventRegistration.objects.filter(event=event, user=request.user).first()
    if existing:
        messages.info(request, "You are already registered.")
        return redirect('events:event_detail', event_id=event_id)

    EventRegistration.objects.create(event=event, user=request.user)
    messages.success(request, "Registered successfully!")
    return redirect('events:event_detail', event_id=event_id)


@login_required
def my_events(request):
    """View user's registered events."""
    registrations = EventRegistration.objects.filter(
        user=request.user
    ).select_related('event')

    context = {'registrations': registrations}
    return render(request, 'events/my_events.html', context)


# ==================== Announcements ====================

def announcement_list(request):
    """List all announcements."""
    announcements = Announcement.objects.filter(is_published=True)

    # Filter by role if user is logged in
    if request.user.is_authenticated:
        announcements = announcements.filter(
            Q(target_roles__len=0) | Q(target_roles__contains=[request.user.role])
        )

    announcements = announcements.order_by('-created_at')[:20]

    context = {'announcements': announcements}
    return render(request, 'events/announcement_list.html', context)


def announcement_detail(request, announcement_id):
    """View announcement details."""
    announcement = get_object_or_404(Announcement, id=announcement_id)
    context = {'announcement': announcement}
    return render(request, 'events/announcement_detail.html', context)


@login_required
def create_announcement(request):
    """Create announcement (admin/faculty only."""
    if request.user.role not in ['faculty', 'admin'] and not request.user.is_staff:
        messages.error(request, "Only faculty and admins can create announcements.")
        return redirect('events:announcement_list')

    if request.method == 'POST':
        form = AnnouncementForm(request.POST)
        if form.is_valid():
            announcement = form.save(commit=False)
            announcement.created_by = request.user
            announcement.save()
            messages.success(request, "Announcement posted!")
            return redirect('events:announcement_list')
    else:
        form = AnnouncementForm()

    context = {'form': form, 'action': 'Create'}
    return render(request, 'events/announcement_form.html', context)
