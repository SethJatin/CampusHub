"""
Master Seeding Script for CampusHub
Populates all 75 enrolled students, 5 faculty members, 5 courses, and complete sample data
for every application feature (Attendance, Exams, Assignments, Submissions, Notes, Events, Announcements, Departments).
"""

import os
import sys
import random
from datetime import datetime, timedelta
import django

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'campusHub.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import connection
from accounts.models import StudentProfile, FacultyProfile, Department
from courses.models import Course, Enrollment, Attendance, CourseMaterial
from assignments.models import Assignment, Submission
from events.models import Event, EventRegistration, Announcement
from notes.models import Note, NoteComment, NoteRating


User = get_user_model()
PASSWORD = 'Password123!'

def run_seed():
    print("=========================================================")
    print("      CAMPUSHUB MASTER DATABASE SEEDING PROCESS          ")
    print("=========================================================")

    # ---------------------------------------------------------
    # 1. SEED DEPARTMENTS
    # ---------------------------------------------------------
    print("\n[1/10] Seeding Departments...")
    depts_data = [
        {'name': 'Computer Science & Engineering', 'code': 'CSE', 'description': 'Department of Computer Science and Software Systems'},
        {'name': 'Information Technology', 'code': 'IT', 'description': 'Department of Information Systems and Cloud Architecture'},
        {'name': 'Electronics & Communication', 'code': 'ECE', 'description': 'Department of Communication Networks and Embedded Systems'},
        {'name': 'Electrical Engineering', 'code': 'EEE', 'description': 'Department of Power Systems and Automation'},
        {'name': 'Mechanical Engineering', 'code': 'ME', 'description': 'Department of Robotics and Applied Thermodynamics'}
    ]
    created_depts = {}
    for d in depts_data:
        dept_obj, _ = Department.objects.get_or_create(code=d['code'], defaults=d)
        created_depts[d['code']] = dept_obj
    print(f" [OK] {len(created_depts)} Departments verified.")

    # ---------------------------------------------------------
    # 2. SEED FACULTY MEMBERS
    # ---------------------------------------------------------
    print("\n[2/10] Seeding Faculty Members...")
    faculties_data = [
        {
            'email': 'turing@campushub.edu', 'username': 'faculty1', 'first_name': 'Rajesh', 'last_name': 'Sharma',
            'emp_id': 'FAC1001', 'dept': 'Computer Science', 'desig': 'Professor', 'spec': 'Algorithms & Theory'
        },
        {
            'email': 'lovelace@campushub.edu', 'username': 'faculty2', 'first_name': 'Priya', 'last_name': 'Nambiar',
            'emp_id': 'FAC1002', 'dept': 'Computer Science', 'desig': 'Associate Professor', 'spec': 'Data Structures'
        },
        {
            'email': 'codd@campushub.edu', 'username': 'faculty3', 'first_name': 'Amitava', 'last_name': 'Roy',
            'emp_id': 'FAC1003', 'dept': 'Computer Science', 'desig': 'Assistant Professor', 'spec': 'Database Systems'
        },
        {
            'email': 'cerf@campushub.edu', 'username': 'faculty4', 'first_name': 'Sunita', 'last_name': 'Kulkarni',
            'emp_id': 'FAC1004', 'dept': 'Computer Science', 'desig': 'Professor', 'spec': 'Computer Networks & Security'
        },
        {
            'email': 'hamilton@campushub.edu', 'username': 'faculty5', 'first_name': 'Vikram', 'last_name': 'Mehta',
            'emp_id': 'FAC1005', 'dept': 'Computer Science', 'desig': 'Professor', 'spec': 'Software Architecture'
        }
    ]

    faculty_users = []
    for f in faculties_data:
        user, created = User.objects.get_or_create(
            email=f['email'],
            defaults={
                'username': f['username'],
                'first_name': f['first_name'],
                'last_name': f['last_name'],
                'role': User.Role.FACULTY,
                'is_verified': True,
                'is_staff': True
            }
        )
        user.set_password(PASSWORD)
        user.first_name = f['first_name']
        user.last_name = f['last_name']
        user.role = User.Role.FACULTY
        user.save()

        FacultyProfile.objects.update_or_create(
            user=user,
            defaults={
                'employee_id': f['emp_id'],
                'department': f['dept'],
                'designation': f['desig'],
                'specialization': f['spec'],
                'qualification': 'Ph.D. in Computer Science',
                'experience_years': 12,
                'office_location': 'Academic Block A, Suite 304',
                'office_hours': 'Mon-Fri 10:00 AM - 04:00 PM'
            }
        )
        faculty_users.append(user)
    print(f" [OK] {len(faculty_users)} Faculty members seeded.")

    # ---------------------------------------------------------
    # 3. SEED ADMIN USER
    # ---------------------------------------------------------
    print("\n[3/10] Seeding Admin User...")
    admin_user, _ = User.objects.get_or_create(
        email='admin@campushub.edu',
        defaults={
            'username': 'admin',
            'first_name': 'Campus',
            'last_name': 'Administrator',
            'role': User.Role.ADMIN,
            'is_verified': True,
            'is_staff': True,
            'is_superuser': True
        }
    )
    admin_user.set_password(PASSWORD)
    admin_user.save()
    print(" [OK] Admin account (admin@campushub.edu) ready.")

    # ---------------------------------------------------------
    # 4. SEED COURSES
    # ---------------------------------------------------------
    print("\n[4/10] Seeding Courses...")
    courses_info = [
        {
            'code': 'CS101', 'name': 'Programming Fundamentals', 'dept': 'Computer Science',
            'credits': 4, 'sem': 1, 'instructor': faculty_users[0], 'room': 'Lab 1', 'schedule': 'Mon/Wed 09:00 AM'
        },
        {
            'code': 'CS102', 'name': 'Data Structures & Algorithms', 'dept': 'Computer Science',
            'credits': 4, 'sem': 2, 'instructor': faculty_users[1], 'room': 'Lab 2', 'schedule': 'Tue/Thu 10:30 AM'
        },
        {
            'code': 'CS103', 'name': 'Database Management Systems', 'dept': 'Computer Science',
            'credits': 3, 'sem': 3, 'instructor': faculty_users[2], 'room': 'Hall 101', 'schedule': 'Mon/Wed 11:30 AM'
        },
        {
            'code': 'CS104', 'name': 'Computer Networks & Security', 'dept': 'Computer Science',
            'credits': 4, 'sem': 4, 'instructor': faculty_users[3], 'room': 'Hall 202', 'schedule': 'Tue/Thu 02:00 PM'
        },
        {
            'code': 'CS105', 'name': 'Software Engineering Principles', 'dept': 'Computer Science',
            'credits': 3, 'sem': 5, 'instructor': faculty_users[4], 'room': 'Hall 303', 'schedule': 'Fri 10:00 AM'
        }
    ]

    courses_map = {}
    for c in courses_info:
        course, _ = Course.objects.update_or_create(
            code=c['code'],
            defaults={
                'name': c['name'],
                'description': f"Core curriculum module covering {c['name']} concepts, practical labs, and evaluation.",
                'department': c['dept'],
                'credits': c['credits'],
                'semester': c['sem'],
                'instructor': c['instructor'],
                'max_students': 60,
                'room': c['room'],
                'schedule': c['schedule'],
                'status': 'active'
            }
        )
        courses_map[c['code']] = course
    print(f" [OK] {len(courses_map)} Courses active.")

    # ---------------------------------------------------------
    # 5. SEED ALL 75 ENROLLED STUDENTS
    # ---------------------------------------------------------
    print("\n[5/10] Seeding 75 Enrolled Students...")
    students_raw_data = [
        # CS101 (1 - 15)
        (1, "STU2026001", "Aarav Sharma", "student1@campushub.edu", "CS101"),
        (2, "STU2026002", "Ananya Verma", "student2@campushub.edu", "CS101"),
        (3, "STU2026003", "Rohan Gupta", "student3@campushub.edu", "CS101"),
        (4, "STU2026004", "Ishaan Patel", "student4@campushub.edu", "CS101"),
        (5, "STU2026005", "Diya Reddy", "student5@campushub.edu", "CS101"),
        (6, "STU2026006", "Kabir Joshi", "student6@campushub.edu", "CS101"),
        (7, "STU2026007", "Vihaan Kulkarni", "student7@campushub.edu", "CS101"),
        (8, "STU2026008", "Saisha Mehta", "student8@campushub.edu", "CS101"),
        (9, "STU2026009", "Aditya Rao", "student9@campushub.edu", "CS101"),
        (10, "STU2026010", "Meera Nair", "student10@campushub.edu", "CS101"),
        (11, "STU2026011", "Arjun Roy", "student11@campushub.edu", "CS101"),
        (12, "STU2026012", "Kavya Sengupta", "student12@campushub.edu", "CS101"),
        (13, "STU2026013", "Dev Das", "student13@campushub.edu", "CS101"),
        (14, "STU2026014", "Anvi Chatterjee", "student14@campushub.edu", "CS101"),
        (15, "STU2026015", "Siddharth Iyer", "student15@campushub.edu", "CS101"),

        # CS102 (16 - 30)
        (16, "STU2026016", "Riya Agarwal", "student16@campushub.edu", "CS102"),
        (17, "STU2026017", "Reyansh Jain", "student17@campushub.edu", "CS102"),
        (18, "STU2026018", "Tanvi Mishra", "student18@campushub.edu", "CS102"),
        (19, "STU2026019", "Yash Pandey", "student19@campushub.edu", "CS102"),
        (20, "STU2026020", "Avani Deshmukh", "student20@campushub.edu", "CS102"),
        (21, "STU2026021", "Aryan Bhat", "student21@campushub.edu", "CS102"),
        (22, "STU2026022", "Navya Hegde", "student22@campushub.edu", "CS102"),
        (23, "STU2026023", "Pranav Singh", "student23@campushub.edu", "CS102"),
        (24, "STU2026024", "Sneha Choudhury", "student24@campushub.edu", "CS102"),
        (25, "STU2026025", "Parth Saxena", "student25@campushub.edu", "CS102"),
        (26, "STU2026026", "Aditi Sharma", "student26@campushub.edu", "CS102"),
        (27, "STU2026027", "Krishna Verma", "student27@campushub.edu", "CS102"),
        (28, "STU2026028", "Ishita Gupta", "student28@campushub.edu", "CS102"),
        (29, "STU2026029", "Varun Patel", "student29@campushub.edu", "CS102"),
        (30, "STU2026030", "Shreya Reddy", "student30@campushub.edu", "CS102"),

        # CS103 (31 - 45)
        (31, "STU2026031", "Sameer Joshi", "student31@campushub.edu", "CS103"),
        (32, "STU2026032", "Pooja Kulkarni", "student32@campushub.edu", "CS103"),
        (33, "STU2026033", "Harish Mehta", "student33@campushub.edu", "CS103"),
        (34, "STU2026034", "Neha Rao", "student34@campushub.edu", "CS103"),
        (35, "STU2026035", "Karan Nair", "student35@campushub.edu", "CS103"),
        (36, "STU2026036", "Swati Roy", "student36@campushub.edu", "CS103"),
        (37, "STU2026037", "Nikhil Sengupta", "student37@campushub.edu", "CS103"),
        (38, "STU2026038", "Tarun Das", "student38@campushub.edu", "CS103"),
        (39, "STU2026039", "Radhika Chatterjee", "student39@campushub.edu", "CS103"),
        (40, "STU2026040", "Vivek Iyer", "student40@campushub.edu", "CS103"),
        (41, "STU2026041", "Priyanka Agarwal", "student41@campushub.edu", "CS103"),
        (42, "STU2026042", "Rahul Jain", "student42@campushub.edu", "CS103"),
        (43, "STU2026043", "Simran Mishra", "student43@campushub.edu", "CS103"),
        (44, "STU2026044", "Gautam Pandey", "student44@campushub.edu", "CS103"),
        (45, "STU2026045", "Divya Deshmukh", "student45@campushub.edu", "CS103"),

        # CS104 (46 - 60)
        (46, "STU2026046", "Manish Bhat", "student46@campushub.edu", "CS104"),
        (47, "STU2026047", "Deepak Hegde", "student47@campushub.edu", "CS104"),
        (48, "STU2026048", "Srishti Singh", "student48@campushub.edu", "CS104"),
        (49, "STU2026049", "Alok Choudhury", "student49@campushub.edu", "CS104"),
        (50, "STU2026050", "Bhavna Saxena", "student50@campushub.edu", "CS104"),
        (51, "STU2026051", "Chetan Sharma", "student51@campushub.edu", "CS104"),
        (52, "STU2026052", "Geeta Verma", "student52@campushub.edu", "CS104"),
        (53, "STU2026053", "Hemant Gupta", "student53@campushub.edu", "CS104"),
        (54, "STU2026054", "Indira Patel", "student54@campushub.edu", "CS104"),
        (55, "STU2026055", "Jayesh Reddy", "student55@campushub.edu", "CS104"),
        (56, "STU2026056", "Kiran Joshi", "student56@campushub.edu", "CS104"),
        (57, "STU2026057", "Madhav Kulkarni", "student57@campushub.edu", "CS104"),
        (58, "STU2026058", "Neeraj Mehta", "student58@campushub.edu", "CS104"),
        (59, "STU2026059", "Omkar Rao", "student59@campushub.edu", "CS104"),
        (60, "STU2026060", "Payal Nair", "student60@campushub.edu", "CS104"),

        # CS105 (61 - 75)
        (61, "STU2026061", "Rakesh Roy", "student61@campushub.edu", "CS105"),
        (62, "STU2026062", "Sandeep Sengupta", "student62@campushub.edu", "CS105"),
        (63, "STU2026063", "Trupti Das", "student63@campushub.edu", "CS105"),
        (64, "STU2026064", "Utkarsh Chatterjee", "student64@campushub.edu", "CS105"),
        (65, "STU2026065", "Vandana Iyer", "student65@campushub.edu", "CS105"),
        (66, "STU2026066", "Wasim Agarwal", "student66@campushub.edu", "CS105"),
        (67, "STU2026067", "Yamini Jain", "student67@campushub.edu", "CS105"),
        (68, "STU2026068", "Yogesh Mishra", "student68@campushub.edu", "CS105"),
        (69, "STU2026069", "Abhinav Pandey", "student69@campushub.edu", "CS105"),
        (70, "STU2026070", "Bhuvan Deshmukh", "student70@campushub.edu", "CS105"),
        (71, "STU2026071", "Chaitra Bhat", "student71@campushub.edu", "CS105"),
        (72, "STU2026072", "Darshan Hegde", "student72@campushub.edu", "CS105"),
        (73, "STU2026073", "Esha Singh", "student73@campushub.edu", "CS105"),
        (74, "STU2026074", "Farhan Choudhury", "student74@campushub.edu", "CS105"),
        (75, "STU2026075", "Gaurav Saxena", "student75@campushub.edu", "CS105"),
    ]

    all_students = []
    student_primary_course = {}

    random.seed(42) # Reproducible realistic distribution

    for idx, roll, full_name, email, primary_course_code in students_raw_data:
        parts = full_name.split(' ', 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': f"student{idx}",
                'first_name': first_name,
                'last_name': last_name,
                'role': User.Role.STUDENT,
                'is_verified': True
            }
        )
        user.set_password(PASSWORD)
        user.first_name = first_name
        user.last_name = last_name
        user.role = User.Role.STUDENT
        user.save()

        # CGPA between 6.8 and 9.7
        cgpa_val = round(7.0 + (idx * 0.035) % 2.8, 2)
        sem_num = int(primary_course_code.replace('CS10', ''))

        StudentProfile.objects.update_or_create(
            user=user,
            defaults={
                'roll_number': roll,
                'enrollment_number': f"ENR2026{idx:03d}",
                'department': 'Computer Science',
                'year': (sem_num + 1) // 2,
                'semester': sem_num,
                'section': 'A' if idx % 2 == 1 else 'B',
                'batch': '2024-2028',
                'cgpa': cgpa_val,
                'parent_name': f"Parent of {first_name}",
                'parent_phone': f"+91 98765{idx:05d}"
            }
        )

        # Primary Course Enrollment
        p_course = courses_map[primary_course_code]
        Enrollment.objects.update_or_create(
            student=user,
            course=p_course,
            defaults={'status': 'approved', 'grade': 'A', 'marks': 85.0}
        )

        # Also enroll in an elective course for realistic multi-course experience
        elective_code = f"CS10{(sem_num % 5) + 1}"
        e_course = courses_map[elective_code]
        Enrollment.objects.get_or_create(
            student=user,
            course=e_course,
            defaults={'status': 'approved', 'grade': 'B+', 'marks': 78.0}
        )

        all_students.append(user)
        student_primary_course[user.id] = p_course

    print(f" [OK] {len(all_students)} Students created & enrolled.")

    # ---------------------------------------------------------
    # 6. SEED ATTENDANCE RECORDS
    # ---------------------------------------------------------
    print("\n[6/10] Seeding Real Attendance Sessions...")
    start_date = datetime.now().date() - timedelta(days=40)

    total_att = 0
    for course_code, course in courses_map.items():
        # Get enrolled students
        enrolled_users = [e.student for e in Enrollment.objects.filter(course=course, status='approved')]

        for d_offset in range(0, 40, 3): # 14 class sessions
            class_date = start_date + timedelta(days=d_offset)

            for s in enrolled_users:
                # 88% present probability, 8% absent, 4% late
                rand = random.random()
                status_val = 'present' if rand < 0.88 else ('absent' if rand < 0.96 else 'late')

                Attendance.objects.update_or_create(
                    student=s,
                    course=course,
                    date=class_date,
                    defaults={
                        'status': status_val,
                        'marked_by': course.instructor
                    }
                )
                total_att += 1
    print(f" [OK] {total_att} Attendance records generated across 14 class sessions per course.")

    # ---------------------------------------------------------
    # 7. SEED EXAMS, QUESTIONS, SUBMISSIONS & MARKS
    # ---------------------------------------------------------
    print("\n[7/10] Seeding Exams, Questions, and Evaluated Marks...")
    total_exams = 0
    total_marks_entries = 0

    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM courses_exammark")
        cursor.execute("DELETE FROM courses_examsubmission")
        cursor.execute("DELETE FROM courses_examquestion")
        cursor.execute("DELETE FROM courses_exam")

        date_now_iso = timezone.now().isoformat()
        past_exam_date = (timezone.now() - timedelta(days=15)).isoformat()
        future_exam_date = (timezone.now() + timedelta(days=14)).isoformat()

        for course_code, course in courses_map.items():
            # Exam 1: Mid-Term
            cursor.execute("""
                INSERT INTO courses_exam (
                    course_id, title, exam_date, duration_minutes, total_marks,
                    syllabus, exam_pattern, status, created_at, created_by_id
                ) VALUES (%s, %s, %s, 90, 100.0, %s, %s, 'completed', %s, %s)
            """, [
                course.id, f"{course_code} - Mid-Term Examination 2026", past_exam_date,
                f"Modules 1 & 2 of {course.name}", "Section A: MCQs (30m), Section B: Theory (70m)",
                date_now_iso, course.instructor.id
            ])
            exam1_id = cursor.lastrowid
            total_exams += 1

            # Exam 2: End-Term
            cursor.execute("""
                INSERT INTO courses_exam (
                    course_id, title, exam_date, duration_minutes, total_marks,
                    syllabus, exam_pattern, status, created_at, created_by_id
                ) VALUES (%s, %s, %s, 180, 100.0, %s, %s, 'scheduled', %s, %s)
            """, [
                course.id, f"{course_code} - End-Semester Final Examination 2026", future_exam_date,
                f"Full Syllabus for {course.name}", "Section A: 10 MCQs (20 Marks), Section B: 5 Long Answers (80 Marks)",
                date_now_iso, course.instructor.id
            ])
            total_exams += 1

            # Questions
            cursor.execute("""
                INSERT INTO courses_examquestion (
                    exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, 10.0)
            """, [
                exam1_id, f"What is the primary objective of {course.name}?",
                "Theory Analysis", "Practical Problem Solving", "System Architecture", "All of the above", "D"
            ])

            # Marks
            enrolled_users = [e.student for e in Enrollment.objects.filter(course=course, status='approved')]
            for s in enrolled_users:
                score = round(random.uniform(66.0, 97.0), 1)
                remark = "Outstanding performance" if score > 88 else ("Good effort, keep improving" if score > 75 else "Needs further revision")

                cursor.execute("""
                    INSERT INTO courses_exammark (
                        exam_id, student_id, marks_obtained, total_marks, remarks, evaluated_at, evaluated_by_id
                    ) VALUES (%s, %s, %s, 100.0, %s, %s, %s)
                """, [exam1_id, s.id, score, remark, date_now_iso, course.instructor.id])
                total_marks_entries += 1

    print(f" [OK] {total_exams} Exams created, {total_marks_entries} Exam marks entries populated.")


    # ---------------------------------------------------------
    # 8. SEED ASSIGNMENTS & SUBMISSIONS
    # ---------------------------------------------------------
    print("\n[8/10] Seeding Assignments & Student Submissions...")
    total_assignments = 0
    total_submissions = 0

    for course_code, course in courses_map.items():
        # Assignment 1 (Graded)
        asgn1, _ = Assignment.objects.update_or_create(
            course=course,
            title=f"{course_code} - Assignment 1: Practical Problem Solving",
            defaults={
                'description': f"Comprehensive assignment covering core topics of {course.name}.",
                'instructions': "Submit code implementation or PDF documentation before deadline.",
                'created_by': course.instructor,
                'due_date': timezone.now() - timedelta(days=5),
                'total_marks': 50.0,
                'status': 'published'
            }
        )
        total_assignments += 1

        # Assignment 2 (Open)
        asgn2, _ = Assignment.objects.update_or_create(
            course=course,
            title=f"{course_code} - Assignment 2: Advanced System Design",
            defaults={
                'description': f"Design and architectural assignment for {course.name}.",
                'instructions': "Upload your submission in PDF format.",
                'created_by': course.instructor,
                'due_date': timezone.now() + timedelta(days=7),
                'total_marks': 50.0,
                'status': 'published'
            }
        )
        total_assignments += 1

        # Submissions for Assignment 1
        enrolled_users = [e.student for e in Enrollment.objects.filter(course=course, status='approved')]
        for s in enrolled_users:
            score = round(random.uniform(38.0, 49.5), 1)
            Submission.objects.update_or_create(
                assignment=asgn1,
                student=s,
                defaults={
                    'content': f"Submission solution by {s.get_full_name()} for {asgn1.title}.",
                    'submitted_at': timezone.now() - timedelta(days=6),
                    'marks_obtained': score,
                    'grade': 'A' if score > 43 else 'B',
                    'feedback': "Well constructed logic and modular clean code structure.",
                    'graded_by': course.instructor,
                    'status': 'graded'
                }
            )
            total_submissions += 1

    print(f" [OK] {total_assignments} Assignments posted, {total_submissions} Student submissions graded.")

    # ---------------------------------------------------------
    # 9. SEED STUDY NOTES & LECTURE MATERIALS
    # ---------------------------------------------------------
    print("\n[9/10] Seeding Study Notes & Course Materials...")
    total_notes = 0

    notes_topics = {
        'CS101': [("Pointers & Memory Allocation in C/C++", "Complete guide to stack vs heap memory"), ("Recursion & Stack Frames", "Detailed diagrams of recursive functions")],
        'CS102': [("Trees, AVL & Red-Black Balancing", "Balanced search trees and rotational mechanics"), ("Graph Algorithms: Dijkstra & A*", "Pathfinding and minimum spanning trees")],
        'CS103': [("Relational Algebra & SQL Joins", "Inner, outer, left, right join optimization"), ("Database Normalization (1NF to BCNF)", "Eliminating functional dependencies and anomalies")],
        'CS104': [("TCP/IP 4-Layer vs OSI 7-Layer Model", "Packet headers, sockets, and multiplexing"), ("Public Key Cryptography & RSA Algorithm", "Asymmetric encryption and digital signatures")],
        'CS105': [("Agile, Scrum & Kanban Frameworks", "Sprint planning, user stories, and velocity"), ("Design Patterns: Factory, Singleton & Observer", "Object oriented architectural patterns")]
    }

    for course_code, course in courses_map.items():
        # Course Materials
        CourseMaterial.objects.get_or_create(
            course=course,
            title=f"{course_code} - Syllabus & Course Handbook 2026",
            defaults={
                'description': f"Official lecture outline and grading breakdown for {course.name}.",
                'material_type': 'document',
                'uploaded_by': course.instructor,
                'is_published': True
            }
        )

        # Notes
        for title, desc in notes_topics[course_code]:
            note, _ = Note.objects.update_or_create(
                course=course,
                title=title,
                defaults={
                    'description': desc,
                    'note_type': 'lecture',
                    'uploaded_by': course.instructor,
                    'content': f"# {title}\n\n## Overview\n{desc}.\n\n### Key Concepts\n- Concept 1\n- Concept 2\n- Code Examples",
                    'is_public': True,
                    'views': random.randint(45, 180),
                    'downloads': random.randint(15, 60)
                }
            )
            total_notes += 1

            # Seed Note Comments & Ratings
            NoteRating.objects.get_or_create(note=note, user=all_students[0], defaults={'rating': 5})
            NoteComment.objects.get_or_create(
                note=note, user=all_students[0],
                defaults={'content': f"Great notes! Very helpful for {course_code} preparation."}
            )

    print(f" [OK] {total_notes} Study notes and materials uploaded with student ratings and comments.")

    # ---------------------------------------------------------
    # 10. SEED CAMPUS EVENTS & ANNOUNCEMENTS
    # ---------------------------------------------------------
    print("\n[10/10] Seeding Campus Events & Announcements...")
    events_data = [
        {
            'title': ' Grand 80th Independence Day Celebration 2026',
            'description': 'Flag Hoisting Ceremony, NCC Cadets March Past, and Cultural Gala.',
            'category': 'cultural',
            'start_date': timezone.now() + timedelta(days=7),
            'end_date': timezone.now() + timedelta(days=7, hours=4),
            'venue': 'Main Campus Flag Lawn & Auditorium',
            'department': 'General',
            'registration_required': True,
            'max_participants': 500,
            'status': 'published'
        },
        {
            'title': ' HACK-CAMPUS 2026: 48-Hour AI & Tech Hackathon',
            'description': 'National level 48-hour student hackathon with ₹1.5 Lakh cash prizes.',
            'category': 'academic',
            'start_date': timezone.now() + timedelta(days=14),
            'end_date': timezone.now() + timedelta(days=16),
            'venue': 'Central Computer Complex & Innovation Hub',
            'department': 'Computer Science',
            'registration_required': True,
            'max_participants': 200,
            'status': 'published'
        },
        {
            'title': ' SPANDAN 2026: Annual Cultural Gala & Live Concert',
            'description': 'Live music, battle of bands, dance drama, and celebrity guest performance.',
            'category': 'cultural',
            'start_date': timezone.now() + timedelta(days=28),
            'end_date': timezone.now() + timedelta(days=28, hours=6),
            'venue': 'Open Air Amphitheatre',
            'department': 'General',
            'registration_required': True,
            'max_participants': 1000,
            'status': 'published'
        }
    ]

    for ev in events_data:
        event_obj, _ = Event.objects.update_or_create(
            title=ev['title'],
            defaults={
                'description': ev['description'],
                'category': ev['category'],
                'start_date': ev['start_date'],
                'end_date': ev['end_date'],
                'venue': ev['venue'],
                'department': ev['department'],
                'registration_required': ev['registration_required'],
                'max_participants': ev['max_participants'],
                'status': ev['status'],
                'organized_by': faculty_users[0]
            }
        )

        # Seed registrations for event
        for s in all_students[:10]:
            EventRegistration.objects.get_or_create(event=event_obj, user=s, defaults={'status': 'confirmed'})

    announcements_data = [
        {
            'title': ' Mid-Term Examination Results & Performance Analysis',
            'content': 'Mid-term results for CS101-CS105 have been published. Check your Dashboard for details.',
            'priority': 'high', 'target_roles': '["student","faculty"]'
        },
        {
            'title': ' Official Invitation: Independence Day Celebrations 2026',
            'content': 'All students and faculty members are invited to gather at Flag Lawn on Aug 15th at 8:30 AM.',
            'priority': 'urgent', 'target_roles': '["student","faculty","admin"]'
        },
        {
            'title': ' Registrations Open for HACK-CAMPUS 2026!',
            'content': 'Form teams of 2 to 4 students and register before Aug 20th to win cash prizes.',
            'priority': 'normal', 'target_roles': '["student"]'
        }
    ]

    for a in announcements_data:
        Announcement.objects.update_or_create(
            title=a['title'],
            defaults={
                'content': a['content'],
                'priority': a['priority'],
                'target_roles': a['target_roles'],
                'is_published': True,
                'start_date': timezone.now() - timedelta(days=2),
                'end_date': timezone.now() + timedelta(days=20),
                'created_by': faculty_users[0]
            }
        )

    print(" [OK] Campus events, student registrations, and system announcements ready.")

    print("\n=========================================================")
    print("  [OK] SUCCESS: CampusHub Database Fully Seeded & Verified! ")
    print("=========================================================\n")

if __name__ == '__main__':
    run_seed()
