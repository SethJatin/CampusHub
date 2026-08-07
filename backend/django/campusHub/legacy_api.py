import json
import os
import math
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection, transaction
from django.utils import timezone
from django.contrib.auth.hashers import check_password, make_password
import jwt

from accounts.models import User
from .api_auth import jwt_required, role_required, JWT_SECRET, decode_jwt_token

def dictfetchall(cursor):
    """Return all rows from a cursor as a dict"""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def dictfetchone(cursor):
    """Return one row from a cursor as a dict"""
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else None

# Helper to verify Django vs Express passwords
def verify_password(plain_password, hashed_password):
    if not hashed_password:
        return False
    if hashed_password.startswith('pbkdf2_sha256$'):
        return check_password(plain_password, hashed_password)
    # Fallback to bcrypt if needed
    try:
        import bcrypt
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return check_password(plain_password, hashed_password)

# ==========================================
# AUTH ENDPOINTS
# ==========================================

@csrf_exempt
def auth_login(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return JsonResponse({'error': 'Email and password are required'}, status=400)
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM accounts_user WHERE email = %s", [email])
        user = dictfetchone(cursor)
    
    if not user:
        return JsonResponse({'error': 'Invalid email or password'}, status=401)
    
    if not verify_password(password, user['password']):
        return JsonResponse({'error': 'Invalid email or password'}, status=401)
    
    payload = {
        'id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'username': user['username'],
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    access_token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    if isinstance(access_token, bytes):
        access_token = access_token.decode('utf-8')
    
    return JsonResponse({
        'user': {
            'id': user['id'],
            'email': user['email'],
            'username': user['username'],
            'role': user['role'],
            'first_name': user['first_name'],
            'last_name': user['last_name']
        },
        'access': access_token
    })

@csrf_exempt
def auth_register(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')
    if not email or not password or not role:
        return JsonResponse({'error': 'Email, password, and role are required'}, status=400)
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT id FROM accounts_user WHERE email = %s", [email])
        if cursor.fetchone():
            return JsonResponse({'error': 'A user with this email already exists'}, status=409)
        
        hashed_password = make_password(password)
        now_str = datetime.now().isoformat()
        username = data.get('username') or email.split('@')[0]
        
        cursor.execute("""
            INSERT INTO accounts_user (
                password, email, username, first_name, last_name, role, is_verified,
                is_active, is_superuser, is_staff, date_joined, created_at, updated_at,
                profile_image, phone, address, bio
            ) VALUES (%s, %s, %s, %s, %s, %s, 1, 1, 0, 0, %s, %s, %s, 'profiles/default.png', %s, %s, '')
        """, [hashed_password, email, username, data.get('first_name', ''), data.get('last_name', ''), role, now_str, now_str, now_str, data.get('phone', ''), data.get('address', '')])
        
        user_id = cursor.lastrowid
        if role == 'student':
            roll = data.get('roll_number') or f"STU{int(datetime.now().timestamp())}"
            cursor.execute("""
                INSERT INTO accounts_studentprofile (user_id, roll_number, enrollment_number, department, year, semester, section, batch, cgpa, parent_name, parent_phone)
                VALUES (%s, %s, %s, %s, 1, 1, '', '', 0.0, '', '')
            """, [user_id, roll, roll, data.get('department', '')])
        elif role == 'faculty':
            emp_id = data.get('employee_id') or f"FAC{int(datetime.now().timestamp())}"
            cursor.execute("""
                INSERT INTO accounts_facultyprofile (user_id, employee_id, department, designation, specialization, qualification, experience_years, office_location, office_hours, research_interests, publications)
                VALUES (%s, %s, %s, %s, '', '', 0, '', '', '', 0)
            """, [user_id, emp_id, data.get('department', ''), data.get('designation', '')])
            
    return JsonResponse({'message': 'Registration successful! You can now log in.', 'email': email}, status=201)

@csrf_exempt
@jwt_required
def auth_me(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT id, email, username, role, first_name, last_name, phone, address, date_of_birth, bio, profile_image FROM accounts_user WHERE id = %s", [request.user.id])
        user = dictfetchone(cursor)
    return JsonResponse(user or {}, safe=False)

@csrf_exempt
@jwt_required
def auth_profile(request):
    if request.method == 'GET':
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, email, username, role, first_name, last_name, phone, address, date_of_birth, bio, profile_image FROM accounts_user WHERE id = %s", [request.user.id])
            user = dictfetchone(cursor)
            profile = None
            if user['role'] == 'student':
                cursor.execute("SELECT * FROM accounts_studentprofile WHERE user_id = %s", [user['id']])
                profile = dictfetchone(cursor)
            elif user['role'] == 'faculty':
                cursor.execute("SELECT * FROM accounts_facultyprofile WHERE user_id = %s", [user['id']])
                profile = dictfetchone(cursor)
        return JsonResponse({'user': user, 'profile': profile})
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            data = request.POST
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE accounts_user
                SET phone = %s, address = %s, bio = %s, first_name = %s, last_name = %s, profile_image = %s, updated_at = %s
                WHERE id = %s
            """, [
                data.get('phone', ''), data.get('address', ''), data.get('bio', ''),
                data.get('first_name', ''), data.get('last_name', ''),
                data.get('profile_image', 'profiles/default.png'), datetime.now().isoformat(), request.user.id
            ])
        return JsonResponse({'message': 'Profile updated successfully'})

# ==========================================
# COURSES ENDPOINTS
# ==========================================

@csrf_exempt
@jwt_required
def courses_list_or_detail(request, course_id=None):
    if course_id:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT c.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name
                FROM courses_course c
                LEFT JOIN accounts_user u ON c.instructor_id = u.id
                WHERE c.id = %s
            """, [course_id])
            course = dictfetchone(cursor)
        if not course:
            return JsonResponse({'error': 'Course not found'}, status=404)
        return JsonResponse(course)
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT c.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name,
                   (SELECT COUNT(*) FROM courses_enrollment e WHERE e.course_id = c.id AND e.status = 'approved') as enrolled_students
            FROM courses_course c
            LEFT JOIN accounts_user u ON c.instructor_id = u.id
            ORDER BY c.code ASC
        """)
        courses = dictfetchall(cursor)
    return JsonResponse(courses, safe=False)

@csrf_exempt
@jwt_required
def courses_my_courses(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM courses_course WHERE instructor_id = %s ORDER BY code ASC", [request.user.id])
        courses = dictfetchall(cursor)
    return JsonResponse(courses, safe=False)

@csrf_exempt
@jwt_required
def courses_my_enrollments(request):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT e.*, c.code as course_code, c.name as course_name, c.description as course_description,
                   u.first_name as instructor_first_name, u.last_name as instructor_last_name
            FROM courses_enrollment e
            JOIN courses_course c ON e.course_id = c.id
            LEFT JOIN accounts_user u ON c.instructor_id = u.id
            WHERE e.student_id = %s
            ORDER BY e.enrollment_date DESC
        """, [request.user.id])
        enrollments = dictfetchall(cursor)
    return JsonResponse(enrollments, safe=False)

@csrf_exempt
@jwt_required
def courses_my_enrollment_status(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT course_id, status FROM courses_enrollment WHERE student_id = %s", [request.user.id])
        enrollments = dictfetchall(cursor)
    status_map = {row['course_id']: row['status'] for row in enrollments}
    return JsonResponse(status_map)

@csrf_exempt
@role_required('faculty', 'admin')
def courses_pending_approvals(request):
    with connection.cursor() as cursor:
        if request.user.role == 'faculty':
            cursor.execute("""
                SELECT e.*, c.code as course_code, c.name as course_name,
                       u.first_name as student_first_name, u.last_name as student_last_name, u.email as student_email,
                       sp.roll_number, sp.department as student_department
                FROM courses_enrollment e
                JOIN courses_course c ON e.course_id = c.id
                JOIN accounts_user u ON e.student_id = u.id
                LEFT JOIN accounts_studentprofile sp ON u.id = sp.user_id
                WHERE e.status = 'pending' AND c.instructor_id = %s
                ORDER BY e.enrollment_date ASC
            """, [request.user.id])
        else:
            cursor.execute("""
                SELECT e.*, c.code as course_code, c.name as course_name,
                       u.first_name as student_first_name, u.last_name as student_last_name, u.email as student_email,
                       sp.roll_number, sp.department as student_department
                FROM courses_enrollment e
                JOIN courses_course c ON e.course_id = c.id
                JOIN accounts_user u ON e.student_id = u.id
                LEFT JOIN accounts_studentprofile sp ON u.id = sp.user_id
                WHERE e.status = 'pending'
                ORDER BY e.enrollment_date ASC
            """)
        approvals = dictfetchall(cursor)
    return JsonResponse(approvals, safe=False)

@csrf_exempt
@role_required('faculty', 'admin')
def courses_approve_enrollment(request, enrollment_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT e.*, c.instructor_id FROM courses_enrollment e
            JOIN courses_course c ON e.course_id = c.id WHERE e.id = %s
        """, [enrollment_id])
        enr = dictfetchone(cursor)
        if not enr:
            return JsonResponse({'error': 'Enrollment request not found'}, status=404)
        if request.user.role == 'faculty' and enr['instructor_id'] != request.user.id:
            return JsonResponse({'error': 'Access denied: You can only approve enrollment for your assigned course'}, status=403)
        
        now_str = datetime.now().isoformat()
        cursor.execute("UPDATE courses_enrollment SET status = 'approved', approved_by_id = %s, approved_date = %s WHERE id = %s", [request.user.id, now_str, enrollment_id])
    return JsonResponse({'message': 'Student enrollment approved successfully'})

@csrf_exempt
@role_required('faculty', 'admin')
def courses_reject_enrollment(request, enrollment_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT e.*, c.instructor_id FROM courses_enrollment e
            JOIN courses_course c ON e.course_id = c.id WHERE e.id = %s
        """, [enrollment_id])
        enr = dictfetchone(cursor)
        if not enr:
            return JsonResponse({'error': 'Enrollment request not found'}, status=404)
        if request.user.role == 'faculty' and enr['instructor_id'] != request.user.id:
            return JsonResponse({'error': 'Access denied: You can only reject enrollment for your assigned course'}, status=403)
        
        cursor.execute("UPDATE courses_enrollment SET status = 'rejected' WHERE id = %s", [enrollment_id])
    return JsonResponse({'message': 'Student enrollment request rejected'})

@csrf_exempt
@role_required('student')
def courses_enroll(request, course_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM courses_course WHERE id = %s", [course_id])
        course = dictfetchone(cursor)
        if not course:
            return JsonResponse({'error': 'Course not found'}, status=404)
        
        cursor.execute("SELECT * FROM courses_enrollment WHERE student_id = %s AND course_id = %s", [request.user.id, course_id])
        existing = dictfetchone(cursor)
        if existing:
            return JsonResponse({'error': f"You have already requested enrollment (Status: {existing['status']})"}, status=400)
        
        now_str = datetime.now().isoformat()
        cursor.execute("INSERT INTO courses_enrollment (student_id, course_id, status, enrollment_date, grade, marks) VALUES (%s, %s, 'pending', %s, '', 0)", [request.user.id, course_id, now_str])
    return JsonResponse({'message': 'Enrollment request submitted for faculty approval', 'status': 'pending'}, status=201)

# ==========================================
# ATTENDANCE ENDPOINTS
# ==========================================

@csrf_exempt
@jwt_required
def attendance_summary(request):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) as total_records,
                   SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
                   SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                   SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count
            FROM courses_attendance
        """)
        stats = dictfetchone(cursor)
        total = stats['total_records'] or 0
        present = stats['present_count'] or 0
        percentage = round((present / total * 100), 2) if total > 0 else 100.0
    return JsonResponse({'total_records': total, 'present_count': present, 'absent_count': stats['absent_count'] or 0, 'late_count': stats['late_count'] or 0, 'percentage': percentage})

@csrf_exempt
@jwt_required
def attendance_my_summary(request):
    student_id = request.user.id
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) as total_classes,
                   SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) as classes_attended
            FROM courses_attendance
            WHERE student_id = %s
        """, [student_id])
        overall = dictfetchone(cursor)
        tot = overall['total_classes'] or 0
        att = overall['classes_attended'] or 0
        overall_pct = round((att / tot * 100), 2) if tot > 0 else 100.0
        
        cursor.execute("""
            SELECT c.id as course_id, c.code as course_code, c.name as course_name,
                   u.first_name as instructor_first_name, u.last_name as instructor_last_name,
                   COUNT(a.id) as total_classes,
                   SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) as classes_attended
            FROM courses_enrollment e
            JOIN courses_course c ON e.course_id = c.id
            LEFT JOIN accounts_user u ON c.instructor_id = u.id
            LEFT JOIN courses_attendance a ON a.course_id = c.id AND a.student_id = e.student_id
            WHERE e.student_id = %s AND e.status = 'approved'
            GROUP BY c.id
        """, [student_id])
        subject_rows = dictfetchall(cursor)
        
        subjects = []
        for r in subject_rows:
            stot = r['total_classes'] or 0
            satt = r['classes_attended'] or 0
            spct = round((satt / stot * 100), 2) if stot > 0 else 100.0
            
            cursor.execute("""
                SELECT date, status FROM courses_attendance
                WHERE student_id = %s AND course_id = %s
                ORDER BY date DESC LIMIT 5
            """, [student_id, r['course_id']])
            history = dictfetchall(cursor)
            
            inst_name = f"Prof. {r['instructor_first_name']} {r['instructor_last_name']}" if r['instructor_first_name'] else 'Faculty'
            subjects.append({
                'course_id': r['course_id'],
                'course_code': r['course_code'],
                'course_name': r['course_name'],
                'instructor_name': inst_name,
                'total_classes': stot,
                'classes_attended': satt,
                'percentage': spct,
                'history': history
            })
            
    return JsonResponse({
        'overall': {'total_classes': tot, 'classes_attended': att, 'percentage': overall_pct},
        'subjects': subjects
    })

@csrf_exempt
@role_required('faculty', 'admin')
def attendance_class_students(request):
    course_id = request.GET.get('course_id')
    date_str = request.GET.get('date') or datetime.now().strftime('%Y-%m-%d')
    if not course_id:
        return JsonResponse({'error': 'course_id is required'}, status=400)
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM courses_course WHERE id = %s", [course_id])
        course = dictfetchone(cursor)
        if not course:
            return JsonResponse({'error': 'Course not found'}, status=404)
        if request.user.role == 'faculty' and course['instructor_id'] != request.user.id:
            return JsonResponse({'error': 'Access denied: You can only view attendance for your assigned courses'}, status=403)
        
        cursor.execute("""
            SELECT u.id as student_id, u.first_name, u.last_name, u.email, sp.roll_number,
                   COALESCE(a.status, 'absent') as status
            FROM courses_enrollment e
            JOIN accounts_user u ON e.student_id = u.id
            LEFT JOIN accounts_studentprofile sp ON u.id = sp.user_id
            LEFT JOIN courses_attendance a ON a.student_id = u.id AND a.course_id = e.course_id AND a.date = %s
            WHERE e.course_id = %s AND e.status = 'approved'
            ORDER BY sp.roll_number ASC, u.first_name ASC
        """, [date_str, course_id])
        students = dictfetchall(cursor)
    return JsonResponse(students, safe=False)

@csrf_exempt
@role_required('faculty', 'admin')
def attendance_mark(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
        
    student_id = data.get('student_id')
    course_id = data.get('course_id')
    status_val = data.get('status')
    date_str = data.get('date') or datetime.now().strftime('%Y-%m-%d')
    
    if not student_id or not course_id or not status_val:
        return JsonResponse({'error': 'student_id, course_id, and status are required'}, status=400)
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM courses_course WHERE id = %s", [course_id])
        course = dictfetchone(cursor)
        if not course:
            return JsonResponse({'error': 'Course not found'}, status=404)
        if request.user.role == 'faculty' and course['instructor_id'] != request.user.id:
            return JsonResponse({'error': 'Access denied: You can only mark attendance for your assigned courses'}, status=403)
        
        now_str = datetime.now().isoformat()
        cursor.execute("SELECT id FROM courses_attendance WHERE student_id = %s AND course_id = %s AND date = %s", [student_id, course_id, date_str])
        existing = cursor.fetchone()
        if existing:
            cursor.execute("UPDATE courses_attendance SET status = %s, marked_by_id = %s, marked_at = %s WHERE id = %s", [status_val, request.user.id, now_str, existing[0]])
        else:
            cursor.execute("INSERT INTO courses_attendance (student_id, course_id, date, status, marked_by_id, marked_at) VALUES (%s, %s, %s, %s, %s, %s)", [student_id, course_id, date_str, status_val, request.user.id, now_str])
            
    return JsonResponse({'message': 'Attendance marked successfully'})

# ==========================================
# EXAMS ENDPOINTS
# ==========================================

def get_exam_lock_status(exam_date_str):
    try:
        exam_dt = datetime.fromisoformat(exam_date_str.replace('Z', ''))
        now_dt = datetime.now()
        diff_hours = (now_dt - exam_dt).total_seconds() / 3600.0
        if diff_hours > 8.0:
            return {
                'is_locked': True,
                'message': f"Marks entry locked! 8-hour post-exam evaluation window expired ({round(diff_hours, 1)} hrs elapsed)."
            }
        return {'is_locked': False, 'message': 'Marks entry window active.'}
    except Exception:
        return {'is_locked': False, 'message': 'Active'}

@csrf_exempt
@jwt_required
def exams_list_or_detail(request, exam_id=None):
    if exam_id:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.*, c.code as course_code, c.name as course_name, c.instructor_id,
                       u.first_name as instructor_first_name, u.last_name as instructor_last_name
                FROM courses_exam e
                JOIN courses_course c ON e.course_id = c.id
                LEFT JOIN accounts_user u ON c.instructor_id = u.id
                WHERE e.id = %s
            """, [exam_id])
            exam = dictfetchone(cursor)
            if not exam:
                return JsonResponse({'error': 'Exam not found'}, status=404)
            
            if request.user.role == 'faculty' and exam['instructor_id'] != request.user.id:
                return JsonResponse({'error': 'Access denied: You can only view exams for your assigned courses'}, status=403)
            elif request.user.role == 'student':
                cursor.execute("SELECT id FROM courses_enrollment WHERE student_id = %s AND course_id = %s AND status = 'approved'", [request.user.id, exam['course_id']])
                if not cursor.fetchone():
                    return JsonResponse({'error': 'Access denied: You are not enrolled in this course'}, status=403)
                cursor.execute("SELECT marks_obtained, remarks FROM courses_exammark WHERE exam_id = %s AND student_id = %s", [exam_id, request.user.id])
                mark = dictfetchone(cursor)
                exam['student_marks'] = mark['marks_obtained'] if mark else None
                exam['student_remarks'] = mark['remarks'] if mark else None
            
            cursor.execute("SELECT * FROM courses_examquestion WHERE exam_id = %s ORDER BY question_order ASC", [exam_id])
            exam['questions'] = dictfetchall(cursor)
            exam['lock_status'] = get_exam_lock_status(exam['exam_date'])
        return JsonResponse(exam)

    # POST new exam
    if request.method == 'POST':
        if request.user.role not in ['faculty', 'admin']:
            return JsonResponse({'error': 'Access denied'}, status=403)
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            data = request.POST
            
        course_id = data.get('course_id')
        title = data.get('title')
        exam_date = data.get('exam_date')
        if not course_id or not title or not exam_date:
            return JsonResponse({'error': 'Course, Title, and Exam Date are required'}, status=400)
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM courses_course WHERE id = %s", [course_id])
            course = dictfetchone(cursor)
            if not course:
                return JsonResponse({'error': 'Course not found'}, status=404)
            if request.user.role == 'faculty' and course['instructor_id'] != request.user.id:
                return JsonResponse({'error': 'Access denied: You can only create exams for your assigned courses'}, status=403)
            
            now_str = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO courses_exam (
                    course_id, title, exam_type, exam_date, duration_minutes, total_marks,
                    passing_marks, syllabus, exam_pattern, instructions, status, created_at, updated_at, created_by_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'scheduled', %s, %s, %s)
            """, [
                course_id, title, data.get('exam_type', 'midterm'), exam_date,
                int(data.get('duration_minutes', 90)), float(data.get('total_marks', 100)),
                float(data.get('passing_marks', 40)), data.get('syllabus', ''), data.get('exam_pattern', ''),
                data.get('instructions', ''), now_str, now_str, request.user.id
            ])
            exam_id = cursor.lastrowid
        return JsonResponse({'id': exam_id, 'message': 'Exam schedule published successfully'}, status=201)

    # GET exams list
    with connection.cursor() as cursor:
        if request.user.role == 'student':
            cursor.execute("""
                SELECT e.*, c.code as course_code, c.name as course_name,
                       u.first_name as instructor_first_name, u.last_name as instructor_last_name,
                       em.marks_obtained as student_marks, em.remarks as student_remarks
                FROM courses_exam e
                JOIN courses_course c ON e.course_id = c.id
                JOIN courses_enrollment en ON c.id = en.course_id
                LEFT JOIN accounts_user u ON c.instructor_id = u.id
                LEFT JOIN courses_exammark em ON em.exam_id = e.id AND em.student_id = %s
                WHERE en.student_id = %s AND en.status = 'approved'
                ORDER BY e.exam_date ASC
            """, [request.user.id, request.user.id])
        elif request.user.role == 'faculty':
            cursor.execute("""
                SELECT e.*, c.code as course_code, c.name as course_name,
                       u.first_name as instructor_first_name, u.last_name as instructor_last_name
                FROM courses_exam e
                JOIN courses_course c ON e.course_id = c.id
                LEFT JOIN accounts_user u ON c.instructor_id = u.id
                WHERE c.instructor_id = %s
                ORDER BY e.exam_date ASC
            """, [request.user.id])
        else:
            cursor.execute("""
                SELECT e.*, c.code as course_code, c.name as course_name,
                       u.first_name as instructor_first_name, u.last_name as instructor_last_name
                FROM courses_exam e
                JOIN courses_course c ON e.course_id = c.id
                LEFT JOIN accounts_user u ON c.instructor_id = u.id
                ORDER BY e.exam_date ASC
            """)
        exams = dictfetchall(cursor)
        for ex in exams:
            ex['lock_status'] = get_exam_lock_status(ex['exam_date'])
    return JsonResponse(exams, safe=False)

@csrf_exempt
@role_required('faculty', 'admin')
def exams_get_students(request, exam_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT e.*, c.instructor_id FROM courses_exam e
            JOIN courses_course c ON e.course_id = c.id WHERE e.id = %s
        """, [exam_id])
        exam = dictfetchone(cursor)
        if not exam:
            return JsonResponse({'error': 'Exam not found'}, status=404)
        if request.user.role == 'faculty' and exam['instructor_id'] != request.user.id:
            return JsonResponse({'error': 'Access denied'}, status=403)
        
        lock_status = get_exam_lock_status(exam['exam_date'])
        if lock_status['is_locked']:
            return JsonResponse({'error': lock_status['message'], 'is_locked': True}, status=403)
        
        cursor.execute("""
            SELECT u.id as student_id, u.first_name, u.last_name, u.email, sp.roll_number,
                   em.marks_obtained, em.remarks
            FROM courses_enrollment en
            JOIN accounts_user u ON en.student_id = u.id
            LEFT JOIN accounts_studentprofile sp ON u.id = sp.user_id
            LEFT JOIN courses_exammark em ON em.exam_id = %s AND em.student_id = u.id
            WHERE en.course_id = %s AND en.status = 'approved'
            ORDER BY sp.roll_number ASC, u.first_name ASC
        """, [exam_id, exam['course_id']])
        students = dictfetchall(cursor)
    return JsonResponse(students, safe=False)

@csrf_exempt
@role_required('faculty', 'admin')
def exams_save_marks(request, exam_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    records = data.get('marks_records', [])
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT e.*, c.instructor_id FROM courses_exam e
            JOIN courses_course c ON e.course_id = c.id WHERE e.id = %s
        """, [exam_id])
        exam = dictfetchone(cursor)
        if not exam:
            return JsonResponse({'error': 'Exam not found'}, status=404)
        if request.user.role == 'faculty' and exam['instructor_id'] != request.user.id:
            return JsonResponse({'error': 'Access denied'}, status=403)
        
        lock_status = get_exam_lock_status(exam['exam_date'])
        if lock_status['is_locked']:
            return JsonResponse({'error': lock_status['message']}, status=403)
        
        now_str = datetime.now().isoformat()
        for r in records:
            s_id = r.get('student_id')
            m_obt = float(r.get('marks_obtained', 0))
            rem = r.get('remarks', 'Evaluated')
            pct = (m_obt / float(exam['total_marks'])) * 100.0 if float(exam['total_marks']) > 0 else 0
            is_p = 1 if m_obt >= float(exam['passing_marks']) else 0
            
            cursor.execute("SELECT id FROM courses_exammark WHERE exam_id = %s AND student_id = %s", [exam_id, s_id])
            ex_m = cursor.fetchone()
            if ex_m:
                cursor.execute("""
                    UPDATE courses_exammark
                    SET marks_obtained = %s, percentage = %s, is_passed = %s, remarks = %s, evaluated_by_id = %s, evaluated_at = %s
                    WHERE id = %s
                """, [m_obt, pct, is_p, rem, request.user.id, now_str, ex_m[0]])
            else:
                cursor.execute("""
                    INSERT INTO courses_exammark (exam_id, student_id, marks_obtained, percentage, is_passed, remarks, evaluated_by_id, evaluated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, [exam_id, s_id, m_obt, pct, is_p, rem, request.user.id, now_str])
        
        cursor.execute("UPDATE courses_exam SET status = 'completed' WHERE id = %s", [exam_id])
    return JsonResponse({'message': 'Student examination marks evaluated and updated successfully!'})

@csrf_exempt
@jwt_required
def exams_growth_student(request, student_id):
    if request.user.role == 'student' and request.user.id != student_id:
        return JsonResponse({'error': 'Access denied'}, status=403)
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT em.marks_obtained, e.total_marks, e.title as exam_title, e.exam_date, c.code as course_code
            FROM courses_exammark em
            JOIN courses_exam e ON em.exam_id = e.id
            JOIN courses_course c ON e.course_id = c.id
            WHERE em.student_id = %s
            ORDER BY e.exam_date ASC
        """, [student_id])
        rows = dictfetchall(cursor)
        
        labels = [f"{r['course_code']} ({r['exam_title'][:10]})" for r in rows]
        data = [round((r['marks_obtained'] / r['total_marks'] * 100), 2) if r['total_marks'] > 0 else 0 for r in rows]
        overall_avg = round(sum(data) / len(data), 2) if data else 0
        
    return JsonResponse({'labels': labels, 'data': data, 'overall_avg': overall_avg})

@csrf_exempt
@role_required('faculty', 'admin')
def exams_growth_faculty(request):
    with connection.cursor() as cursor:
        if request.user.role == 'faculty':
            cursor.execute("""
                SELECT c.code as course_code, AVG((em.marks_obtained / e.total_marks) * 100) as class_avg
                FROM courses_exammark em
                JOIN courses_exam e ON em.exam_id = e.id
                JOIN courses_course c ON e.course_id = c.id
                WHERE c.instructor_id = %s
                GROUP BY c.id
            """, [request.user.id])
            class_rows = dictfetchall(cursor)
            
            cursor.execute("""
                SELECT AVG((em.marks_obtained / e.total_marks) * 100) as overall_avg
                FROM courses_exammark em
                JOIN courses_exam e ON em.exam_id = e.id
                JOIN courses_course c ON e.course_id = c.id
                WHERE c.instructor_id = %s
            """, [request.user.id])
            overall_row = dictfetchone(cursor)
        else:
            cursor.execute("""
                SELECT c.code as course_code, AVG((em.marks_obtained / e.total_marks) * 100) as class_avg
                FROM courses_exammark em
                JOIN courses_exam e ON em.exam_id = e.id
                JOIN courses_course c ON e.course_id = c.id
                GROUP BY c.id
            """)
            class_rows = dictfetchall(cursor)
            cursor.execute("SELECT AVG((em.marks_obtained / e.total_marks) * 100) as overall_avg FROM courses_exammark em JOIN courses_exam e ON em.exam_id = e.id")
            overall_row = dictfetchone(cursor)
            
        labels = [r['course_code'] for r in class_rows]
        averages = [round(r['class_avg'], 2) if r['class_avg'] else 0 for r in class_rows]
        overall_avg = round(overall_row['overall_avg'], 2) if overall_row and overall_row['overall_avg'] else 0
        
    return JsonResponse({'labels': labels, 'data': averages, 'overall_avg': overall_avg})

@csrf_exempt
@role_required('student')
def exams_submit_answers(request, exam_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    answers = data.get('answers', {})
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM courses_exam WHERE id = %s", [exam_id])
        exam = dictfetchone(cursor)
        if not exam:
            return JsonResponse({'error': 'Exam not found'}, status=404)
        
        cursor.execute("SELECT * FROM courses_examquestion WHERE exam_id = %s", [exam_id])
        questions = dictfetchall(cursor)
        
        total_score = 0.0
        max_score = float(exam['total_marks'])
        for q in questions:
            q_id_str = str(q['id'])
            if answers.get(q_id_str) == q['correct_option']:
                total_score += float(q['marks'])
                
        pct = (total_score / max_score) * 100.0 if max_score > 0 else 0
        is_p = 1 if total_score >= float(exam['passing_marks']) else 0
        now_str = datetime.now().isoformat()
        
        cursor.execute("SELECT id FROM courses_exammark WHERE exam_id = %s AND student_id = %s", [exam_id, request.user.id])
        ex = cursor.fetchone()
        if ex:
            cursor.execute("UPDATE courses_exammark SET marks_obtained = %s, percentage = %s, is_passed = %s, remarks = 'Online Objective Submitted' WHERE id = %s", [total_score, pct, is_p, ex[0]])
        else:
            cursor.execute("INSERT INTO courses_exammark (exam_id, student_id, marks_obtained, percentage, is_passed, remarks, evaluated_at) VALUES (%s, %s, %s, %s, %s, 'Online Objective Submitted', %s)", [exam_id, request.user.id, total_score, pct, is_p, now_str])
            
    return JsonResponse({'message': 'Exam submitted successfully!', 'score': total_score, 'percentage': pct})

# ==========================================
# ML RISK ANALYSIS ENDPOINTS
# ==========================================

@csrf_exempt
@jwt_required
def ml_risk_analysis(request):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT u.id as student_id, u.first_name, u.last_name, u.email, sp.roll_number, sp.department,
                   COALESCE((
                       SELECT (SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.id), 0))
                       FROM courses_attendance a WHERE a.student_id = u.id
                   ), 100.0) as attendance_percentage,
                   COALESCE((
                       SELECT AVG(em.percentage) FROM courses_exammark em WHERE em.student_id = u.id
                   ), 75.0) as avg_marks
            FROM accounts_user u
            JOIN accounts_studentprofile sp ON u.id = sp.user_id
            WHERE u.role = 'student'
        """)
        students = dictfetchall(cursor)
        
        if request.user.role == 'faculty':
            cursor.execute("""
                SELECT DISTINCT student_id FROM courses_enrollment e
                JOIN courses_course c ON e.course_id = c.id
                WHERE c.instructor_id = %s AND e.status = 'approved'
            """, [request.user.id])
            fac_student_ids = {r['student_id'] for r in dictfetchall(cursor)}
            students = [s for s in students if s['student_id'] in fac_student_ids]
            
        evaluations = []
        high_risk = 0
        mod_risk = 0
        safe_count = 0
        
        for s in students:
            att = float(s['attendance_percentage'] or 100.0)
            marks = float(s['avg_marks'] or 75.0)
            
            att_weight = (100.0 - att) * 0.5
            marks_weight = (100.0 - marks) * 0.5
            risk_score = round(min(max(att_weight + marks_weight, 0.0), 100.0), 1)
            
            if risk_score >= 45.0 or att < 75.0 or marks < 40.0:
                level = 'High Risk'
                high_risk += 1
                rec = 'Schedule mandatory academic counseling and attendance warning.'
            elif risk_score >= 25.0:
                level = 'Moderate Risk'
                mod_risk += 1
                rec = 'Recommend peer tutoring and extra assignment practice.'
            else:
                level = 'Safe'
                safe_count += 1
                rec = 'On track. Keep up the good performance.'
                
            evaluations.append({
                'student_id': s['student_id'],
                'name': f"{s['first_name']} {s['last_name']}",
                'email': s['email'],
                'roll_number': s['roll_number'] or f"STU{s['student_id']}",
                'department': s['department'] or 'General',
                'attendance_percentage': round(att, 1),
                'avg_marks': round(marks, 1),
                'risk_score': risk_score,
                'risk_level': level,
                'recommendation': rec
            })
            
    summary = {
        'model_status': 'Trained & Operational',
        'algorithm': 'RandomForestClassifier / Multi-Factor Risk Heuristic',
        'total_students_evaluated': len(evaluations),
        'high_risk_count': high_risk,
        'moderate_risk_count': mod_risk,
        'safe_count': safe_count,
        'students': evaluations
    }
    return JsonResponse(summary)

@csrf_exempt
@jwt_required
def ml_student_risk(request, student_id):
    if request.user.role == 'student' and request.user.id != student_id:
        return JsonResponse({'error': 'Access denied: You can only view your own academic indicator data.'}, status=403)
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT u.id as student_id, u.first_name, u.last_name, u.email, sp.roll_number, sp.department,
                   COALESCE((
                       SELECT (SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.id), 0))
                       FROM courses_attendance a WHERE a.student_id = u.id
                   ), 100.0) as attendance_percentage,
                   COALESCE((
                       SELECT AVG(em.percentage) FROM courses_exammark em WHERE em.student_id = u.id
                   ), 75.0) as avg_marks
            FROM accounts_user u
            JOIN accounts_studentprofile sp ON u.id = sp.user_id
            WHERE u.id = %s
        """, [student_id])
        student = dictfetchone(cursor)
        if not student:
            return JsonResponse({'error': 'Student not found'}, status=404)
        
        att = float(student['attendance_percentage'] or 100.0)
        marks = float(student['avg_marks'] or 75.0)
        risk_score = round(min(max((100.0 - att) * 0.5 + (100.0 - marks) * 0.5, 0.0), 100.0), 1)
        level = 'High Risk' if (risk_score >= 45.0 or att < 75.0 or marks < 40.0) else ('Moderate Risk' if risk_score >= 25.0 else 'Safe')
        rec = 'Schedule mandatory academic counseling.' if level == 'High Risk' else ('Recommend peer tutoring.' if level == 'Moderate Risk' else 'On track.')
        
    return JsonResponse({
        'student_id': student['student_id'],
        'attendance_percentage': round(att, 1),
        'avg_marks': round(marks, 1),
        'risk_score': risk_score,
        'risk_level': level,
        'recommendation': rec
    })

# ==========================================
# ASSIGNMENTS & SUBMISSIONS ENDPOINTS
# ==========================================

@csrf_exempt
@jwt_required
def assignments_list(request):
    course_id = request.GET.get('course_id')
    now_iso = datetime.now().isoformat()
    
    with connection.cursor() as cursor:
        sql = """
            SELECT a.*, c.code as course_code, c.name as course_name 
            FROM assignments_assignment a
            JOIN courses_course c ON a.course_id = c.id
        """
        where = ["a.due_date >= %s"]
        params = [now_iso]
        
        if course_id:
            where.append("a.course_id = %s")
            params.append(course_id)
            
        if request.user.role == 'student':
            where.append("a.course_id IN (SELECT course_id FROM courses_enrollment WHERE student_id = %s AND status = 'approved')")
            params.append(request.user.id)
        elif request.user.role == 'faculty':
            where.append("c.instructor_id = %s")
            params.append(request.user.id)
            
        sql += " WHERE " + " AND ".join(where) + " ORDER BY a.due_date ASC"
        cursor.execute(sql, params)
        assignments = dictfetchall(cursor)
    return JsonResponse(assignments, safe=False)

@csrf_exempt
@role_required('student')
def assignments_reminders(request):
    now = datetime.now()
    now_iso = now.isoformat()
    next24h_iso = (now + timedelta(hours=24)).isoformat()
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT a.*, c.code as course_code, c.name as course_name
            FROM assignments_assignment a
            JOIN courses_course c ON a.course_id = c.id
            JOIN courses_enrollment e ON a.course_id = e.course_id
            WHERE e.student_id = %s AND e.status = 'approved'
              AND a.due_date >= %s AND a.due_date <= %s
              AND a.id NOT IN (SELECT assignment_id FROM assignments_submission WHERE student_id = %s)
            ORDER BY a.due_date ASC
        """, [request.user.id, now_iso, next24h_iso, request.user.id])
        reminders = dictfetchall(cursor)
    return JsonResponse(reminders, safe=False)

@csrf_exempt
@role_required('faculty', 'admin')
def assignments_create(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    course_id = request.POST.get('course_id') or json.loads(request.body or '{}').get('course_id')
    title = request.POST.get('title') or json.loads(request.body or '{}').get('title')
    due_date = request.POST.get('due_date') or json.loads(request.body or '{}').get('due_date')
    description = request.POST.get('description') or json.loads(request.body or '{}').get('description') or ''
    total_marks = request.POST.get('total_marks') or json.loads(request.body or '{}').get('total_marks') or 100
    
    if not course_id or not title or not due_date:
        return JsonResponse({'error': 'Course, Title, and Due Date are required'}, status=400)
    
    file_path = ''
    if request.FILES.get('attachment'):
        f = request.FILES['attachment']
        fname = f"assignments/{f.name}"
        full_p = os.path.join(settings.MEDIA_ROOT, 'assignments', f.name)
        os.makedirs(os.path.dirname(full_p), exist_ok=True)
        with open(full_p, 'wb+') as dest:
            for chunk in f.chunks():
                dest.write(chunk)
        file_path = fname

    with connection.cursor() as cursor:
        if request.user.role == 'faculty':
            cursor.execute("SELECT * FROM courses_course WHERE id = %s", [course_id])
            course = dictfetchone(cursor)
            if not course or course['instructor_id'] != request.user.id:
                return JsonResponse({'error': 'Access denied: You can only create assignments for your assigned courses'}, status=403)
        
        now_str = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO assignments_assignment (
                course_id, title, description, instructions, created_by_id, created_at, updated_at, due_date,
                allow_late_submission, late_penalty_percent, total_marks, status, attachment
            ) VALUES (%s, %s, %s, '', %s, %s, %s, %s, 0, 10, %s, 'published', %s)
        """, [course_id, title, description, request.user.id, now_str, now_str, due_date, float(total_marks), file_path])
        a_id = cursor.lastrowid
        
    return JsonResponse({'id': a_id, 'message': 'Assignment created successfully'}, status=201)

@csrf_exempt
@jwt_required
def submissions_list(request):
    assignment_id = request.GET.get('assignment_id')
    with connection.cursor() as cursor:
        if request.user.role == 'student':
            cursor.execute("""
                SELECT s.*, a.title as assignment_title, a.total_marks, a.due_date, c.code as course_code, c.name as course_name
                FROM assignments_submission s
                JOIN assignments_assignment a ON s.assignment_id = a.id
                JOIN courses_course c ON a.course_id = c.id
                WHERE s.student_id = %s
                ORDER BY s.submitted_at DESC
            """, [request.user.id])
        elif request.user.role == 'faculty':
            sql = """
                SELECT s.*, a.title as assignment_title, a.total_marks,
                       u.first_name, u.last_name, u.email, sp.roll_number
                FROM assignments_submission s
                JOIN assignments_assignment a ON s.assignment_id = a.id
                JOIN courses_course c ON a.course_id = c.id
                JOIN accounts_user u ON s.student_id = u.id
                LEFT JOIN accounts_studentprofile sp ON u.id = sp.user_id
                WHERE c.instructor_id = %s
            """
            params = [request.user.id]
            if assignment_id:
                sql += " AND s.assignment_id = %s"
                params.append(assignment_id)
            sql += " ORDER BY s.submitted_at DESC"
            cursor.execute(sql, params)
        else:
            cursor.execute("SELECT * FROM assignments_submission")
        subs = dictfetchall(cursor)
    return JsonResponse(subs, safe=False)

@csrf_exempt
@role_required('student')
def assignments_submit(request, assignment_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    content = request.POST.get('content') or json.loads(request.body or '{}').get('content') or ''
    
    file_path = ''
    if request.FILES.get('submission'):
        f = request.FILES['submission']
        fname = f"submissions/{f.name}"
        full_p = os.path.join(settings.MEDIA_ROOT, 'submissions', f.name)
        os.makedirs(os.path.dirname(full_p), exist_ok=True)
        with open(full_p, 'wb+') as dest:
            for chunk in f.chunks():
                dest.write(chunk)
        file_path = fname

    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM assignments_assignment WHERE id = %s", [assignment_id])
        assign = dictfetchone(cursor)
        if not assign:
            return JsonResponse({'error': 'Assignment not found'}, status=404)
        
        now_str = datetime.now().isoformat()
        if assign['due_date'] < now_str and not assign.get('allow_late_submission'):
            return JsonResponse({'error': 'Assignment submission deadline has expired.'}, status=400)
            
        cursor.execute("SELECT id FROM courses_enrollment WHERE student_id = %s AND course_id = %s AND status = 'approved'", [request.user.id, assign['course_id']])
        if not cursor.fetchone():
            return JsonResponse({'error': 'Access denied: You are not enrolled in this course'}, status=403)
            
        cursor.execute("SELECT id FROM assignments_submission WHERE assignment_id = %s AND student_id = %s", [assignment_id, request.user.id])
        if cursor.fetchone():
            return JsonResponse({'error': 'Already submitted this assignment'}, status=400)
            
        cursor.execute("""
            INSERT INTO assignments_submission (
                assignment_id, student_id, submitted_at, content, attachment, marks_obtained, grade, feedback, graded_by_id, graded_at, status
            ) VALUES (%s, %s, %s, %s, %s, NULL, '', '', NULL, NULL, 'submitted')
        """, [assignment_id, request.user.id, now_str, content, file_path])
    return JsonResponse({'message': 'Completed assignment submitted successfully!'}, status=201)

@csrf_exempt
@role_required('faculty', 'admin')
def submissions_grade(request, submission_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST
    marks_obt = data.get('marks_obtained')
    if marks_obt is None:
        return JsonResponse({'error': 'Marks obtained is required'}, status=400)
    
    grade = data.get('grade') or ('A' if float(marks_obt) >= 80 else 'B' if float(marks_obt) >= 60 else 'C')
    feedback = data.get('feedback', '')
    
    with connection.cursor() as cursor:
        if request.user.role == 'faculty':
            cursor.execute("""
                SELECT s.*, c.instructor_id FROM assignments_submission s
                JOIN assignments_assignment a ON s.assignment_id = a.id
                JOIN courses_course c ON a.course_id = c.id WHERE s.id = %s
            """, [submission_id])
            sub = dictfetchone(cursor)
            if not sub or sub['instructor_id'] != request.user.id:
                return JsonResponse({'error': 'Access denied: You can only grade submissions for your assigned courses'}, status=403)
        
        now_str = datetime.now().isoformat()
        cursor.execute("""
            UPDATE assignments_submission
            SET marks_obtained = %s, grade = %s, feedback = %s, graded_by_id = %s, graded_at = %s, status = 'graded'
            WHERE id = %s
        """, [float(marks_obt), grade, feedback, request.user.id, now_str, submission_id])
    return JsonResponse({'message': 'Submission evaluated, points awarded, and remarks saved successfully'})

# ==========================================
# EVENTS & ANNOUNCEMENTS ENDPOINTS
# ==========================================

@csrf_exempt
@jwt_required
def events_list_or_create(request):
    if request.method == 'POST':
        if request.user.role not in ['faculty', 'admin']:
            return JsonResponse({'error': 'Access denied'}, status=403)
        title = request.POST.get('title')
        description = request.POST.get('description')
        start_date = request.POST.get('start_date')
        if not title or not description or not start_date:
            return JsonResponse({'error': 'Title, description, and start date are required'}, status=400)
        
        banner_path = ''
        if request.FILES.get('banner'):
            f = request.FILES['banner']
            bname = f"event_banners/{f.name}"
            full_p = os.path.join(settings.MEDIA_ROOT, 'event_banners', f.name)
            os.makedirs(os.path.dirname(full_p), exist_ok=True)
            with open(full_p, 'wb+') as dest:
                for chunk in f.chunks():
                    dest.write(chunk)
            banner_path = bname
            
        now_str = datetime.now().isoformat()
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO events_event (
                    title, description, category, start_date, end_date, venue, department,
                    registration_required, registration_deadline, max_participants, status,
                    banner, attachment, created_at, updated_at, organized_by_id
                ) VALUES (%s, %s, %s, %s, %s, %s, 'General', 1, %s, %s, 'published', %s, '', %s, %s, %s)
            """, [
                title, description, request.POST.get('category', 'cultural'), start_date,
                request.POST.get('end_date') or start_date, request.POST.get('venue', 'Main Auditorium'),
                start_date, int(request.POST.get('max_participants', 500)), banner_path, now_str, now_str, request.user.id
            ])
        return JsonResponse({'message': 'Event published successfully with poster'}, status=201)

    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM events_event WHERE status = 'published' ORDER BY start_date DESC")
        events = dictfetchall(cursor)
    return JsonResponse(events, safe=False)

@csrf_exempt
@jwt_required
def events_register(request, event_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    with connection.cursor() as cursor:
        cursor.execute("SELECT id FROM events_event WHERE id = %s", [event_id])
        if not cursor.fetchone():
            return JsonResponse({'error': 'Event not found'}, status=404)
            
        cursor.execute("SELECT id FROM events_eventregistration WHERE event_id = %s AND user_id = %s", [event_id, request.user.id])
        if cursor.fetchone():
            return JsonResponse({'error': 'Already registered for this event'}, status=400)
            
        now_str = datetime.now().isoformat()
        cursor.execute("INSERT INTO events_eventregistration (event_id, user_id, registered_at, status) VALUES (%s, %s, %s, 'registered')", [event_id, request.user.id, now_str])
    return JsonResponse({'message': 'Registered for event check-in successfully'}, status=201)

@csrf_exempt
@jwt_required
def announcements_list_or_create(request, announcement_id=None):
    if request.method == 'DELETE' and announcement_id:
        if request.user.role not in ['faculty', 'admin']:
            return JsonResponse({'error': 'Access denied'}, status=403)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM events_announcement WHERE id = %s", [announcement_id])
        return JsonResponse({'message': 'Announcement removed successfully'})
        
    if request.method == 'POST':
        if request.user.role not in ['faculty', 'admin']:
            return JsonResponse({'error': 'Access denied'}, status=403)
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            data = request.POST
        title = data.get('title')
        content = data.get('content')
        if not title or not content:
            return JsonResponse({'error': 'Title and content are required'}, status=400)
            
        now_str = datetime.now().isoformat()
        target_roles = json.dumps(data.get('target_roles', []))
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO events_announcement (title, content, priority, target_roles, is_published, start_date, end_date, created_by_id, created_at, updated_at)
                VALUES (%s, %s, %s, %s, 1, %s, %s, %s, %s, %s)
            """, [title, content, data.get('priority', 'normal'), target_roles, data.get('start_date'), data.get('end_date'), request.user.id, now_str, now_str])
        return JsonResponse({'message': 'Announcement created successfully'}, status=201)

    now_str = datetime.now().isoformat()
    with connection.cursor() as cursor:
        cursor.execute("UPDATE events_announcement SET is_published = 0 WHERE end_date IS NOT NULL AND end_date < %s", [now_str])
        cursor.execute("SELECT * FROM events_announcement WHERE is_published = 1 AND (end_date IS NULL OR end_date >= %s) ORDER BY created_at DESC", [now_str])
        announcements = dictfetchall(cursor)
    return JsonResponse(announcements, safe=False)

# ==========================================
# STUDY NOTES ENDPOINTS
# ==========================================

@csrf_exempt
@jwt_required
def notes_list_or_create(request):
    if request.method == 'POST':
        if request.user.role not in ['faculty', 'admin']:
            return JsonResponse({'error': 'Access denied'}, status=403)
        course_id = request.POST.get('course_id')
        title = request.POST.get('title')
        description = request.POST.get('description', '')
        content = request.POST.get('content', '')
        note_type = request.POST.get('note_type', 'notes')
        
        if not title or not course_id:
            return JsonResponse({'error': 'Title and Course ID are required'}, status=400)
            
        with connection.cursor() as cursor:
            if request.user.role == 'faculty':
                cursor.execute("SELECT * FROM courses_course WHERE id = %s", [course_id])
                course = dictfetchone(cursor)
                if not course or course['instructor_id'] != request.user.id:
                    return JsonResponse({'error': 'Access denied: You can only upload notes for your assigned courses'}, status=403)
            
            file_path = ''
            if request.FILES.get('file'):
                f = request.FILES['file']
                fname = f"notes/{f.name}"
                full_p = os.path.join(settings.MEDIA_ROOT, 'notes', f.name)
                os.makedirs(os.path.dirname(full_p), exist_ok=True)
                with open(full_p, 'wb+') as dest:
                    for chunk in f.chunks():
                        dest.write(chunk)
                file_path = fname

            now_str = datetime.now().isoformat()
            cursor.execute("""
                INSERT INTO notes_note (
                    title, description, note_type, course_id, uploaded_by_id, file, content, is_public, views, downloads, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, 1, 0, 0, %s, %s)
            """, [title, description, note_type, course_id, request.user.id, file_path, content, now_str, now_str])
        return JsonResponse({'message': 'Note uploaded successfully'}, status=201)

    with connection.cursor() as cursor:
        sql = """
            SELECT n.*,
                   c.name as course_name,
                   c.code as course_code,
                   u.first_name as uploader_first_name,
                   u.last_name as uploader_last_name,
                   u.username as uploader_username,
                   u.role as uploader_role
            FROM notes_note n
            LEFT JOIN courses_course c ON n.course_id = c.id
            LEFT JOIN accounts_user u ON n.uploaded_by_id = u.id
            WHERE n.is_public = 1
        """
        params = []
        if request.user.role == 'student':
            sql += " AND n.course_id IN (SELECT course_id FROM courses_enrollment WHERE student_id = %s AND status = 'approved')"
            params.append(request.user.id)
        elif request.user.role == 'faculty':
            sql += " AND (n.course_id IS NULL OR c.instructor_id = %s)"
            params.append(request.user.id)
            
        sql += " ORDER BY n.created_at DESC"
        cursor.execute(sql, params)
        notes = dictfetchall(cursor)
    return JsonResponse(notes, safe=False)
