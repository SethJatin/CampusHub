"""Seed sample attendance data for the faculty and student portals."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import FacultyProfile, StudentProfile
from courses.models import Attendance, Course, Enrollment


User = get_user_model()


class Command(BaseCommand):
    help = 'Create sample attendance data for testing faculty and student portals.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            default='CampusHub123!',
            help='Password for all demo accounts (default: CampusHub123!)',
        )

    def handle(self, *args, **options):
        password = options['password']

        with transaction.atomic():
            admin_user = self._ensure_user(
                email='admin@campushub.local',
                username='campushub_demo_admin',
                first_name='Campus',
                last_name='Admin',
                role=User.Role.ADMIN,
                password=password,
                is_staff=True,
                is_superuser=True,
            )

            faculty_user = self._ensure_user(
                email='faculty@campushub.local',
                username='campushub_demo_rita_mehra',
                first_name='Rita',
                last_name='Mehra',
                role=User.Role.FACULTY,
                password=password,
            )
            FacultyProfile.objects.update_or_create(
                user=faculty_user,
                defaults={
                    'employee_id': 'ATD-FAC-1001',
                    'department': 'Computer Science',
                    'designation': 'Associate Professor',
                    'specialization': 'Data Structures and Web Development',
                    'qualification': 'M.Tech',
                    'experience_years': 8,
                    'office_location': 'Block B - 204',
                    'office_hours': 'Mon-Fri 2:00 PM - 4:00 PM',
                    'research_interests': 'Learning systems, web applications, student analytics',
                    'publications': 12,
                },
            )

            student_specs = [
                ('student1@campushub.local', 'campushub_demo_arjun', 'Arjun', 'Sharma', 'ATD2401', 'CSE', 2, 4, 'A'),
                ('student2@campushub.local', 'campushub_demo_meera', 'Meera', 'Patel', 'ATD2402', 'CSE', 2, 4, 'A'),
                ('student3@campushub.local', 'campushub_demo_kabir', 'Kabir', 'Singh', 'ATD2403', 'CSE', 2, 4, 'A'),
                ('student4@campushub.local', 'campushub_demo_sara', 'Sara', 'Khan', 'ATD2404', 'CSE', 2, 4, 'A'),
                ('student5@campushub.local', 'campushub_demo_neha', 'Neha', 'Iyer', 'ATD2405', 'CSE', 2, 4, 'A'),
            ]

            students = []
            for index, spec in enumerate(student_specs, start=1):
                email, username, first_name, last_name, roll_number, department, year, semester, section = spec
                student = self._ensure_user(
                    email=email,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    role=User.Role.STUDENT,
                    password=password,
                )
                StudentProfile.objects.update_or_create(
                    user=student,
                    defaults={
                        'roll_number': roll_number,
                        'enrollment_number': f'ENR2026{index:03d}',
                        'department': department,
                        'year': year,
                        'semester': semester,
                        'section': section,
                        'batch': '2024-2028',
                        'cgpa': 8.0 + (index * 0.1),
                        'parent_name': f'Parent {first_name}',
                        'parent_phone': f'90000000{index:02d}',
                    },
                )
                students.append(student)

            course_specs = [
                ('ATD-CS101', 'Database Systems', 'Computer Science', 4, 'Mon/Wed/Fri 10:00 AM - 11:00 AM', 'Room 204'),
                ('ATD-CS102', 'Web Application Development', 'Computer Science', 4, 'Tue/Thu 1:00 PM - 2:30 PM', 'Room 305'),
            ]

            courses = []
            for code, name, department, semester, schedule, room in course_specs:
                course, _ = Course.objects.update_or_create(
                    code=code,
                    defaults={
                        'name': name,
                        'description': f'Sample course for {name.lower()}.',
                        'department': department,
                        'credits': 3,
                        'semester': semester,
                        'instructor': faculty_user,
                        'max_students': 60,
                        'room': room,
                        'schedule': schedule,
                        'status': Course.Status.ACTIVE,
                        'start_date': timezone.localdate() - timedelta(days=30),
                        'end_date': timezone.localdate() + timedelta(days=60),
                    },
                )
                courses.append(course)

            for course in courses:
                for student in students:
                    Enrollment.objects.update_or_create(
                        student=student,
                        course=course,
                        defaults={
                            'status': Enrollment.Status.APPROVED,
                            'approved_by': admin_user,
                            'approved_date': timezone.now(),
                        },
                    )

            demo_dates = [timezone.localdate() - timedelta(days=offset) for offset in range(5, 0, -1)]
            attendance_rows = []
            for course_index, course in enumerate(courses):
                for date_index, attendance_date in enumerate(demo_dates):
                    for student_index, student in enumerate(students):
                        if course_index == 0:
                            status = 'present' if student_index != 4 or date_index < 3 else 'absent'
                        else:
                            status = 'present' if (student_index + date_index) % 4 != 0 else 'absent'

                        attendance_rows.append(
                            Attendance(
                                student=student,
                                course=course,
                                date=attendance_date,
                                status=status,
                                marked_by=faculty_user,
                            )
                        )

            created_count = 0
            updated_count = 0
            for attendance in attendance_rows:
                _, created = Attendance.objects.update_or_create(
                    student=attendance.student,
                    course=attendance.course,
                    date=attendance.date,
                    defaults={
                        'status': attendance.status,
                        'marked_by': attendance.marked_by,
                    },
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        self.stdout.write(self.style.SUCCESS('Attendance demo data is ready.'))
        self.stdout.write(f'Admin login: admin@campushub.local / {password}')
        self.stdout.write(f'Faculty login: faculty@campushub.local / {password}')
        self.stdout.write('Student logins: student1@campushub.local through student5@campushub.local')
        self.stdout.write(f'Courses created: {len(courses)}')
        self.stdout.write(f'Attendance rows created: {created_count}, updated: {updated_count}')

    def _ensure_user(self, *, email, username, first_name, last_name, role, password, is_staff=False, is_superuser=False):
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'first_name': first_name,
                'last_name': last_name,
                'role': role,
                'is_staff': is_staff,
                'is_superuser': is_superuser,
            },
        )
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.is_active = True
        user.set_password(password)
        user.save()
        return user