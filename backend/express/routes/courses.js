const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for course materials
const uploadDir = path.resolve(__dirname, '..', '..', 'django', 'media', 'course_materials');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// 1. GET ALL COURSES (Optionally filter by department/semester)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const courses = await db.query('SELECT * FROM courses_course WHERE status = "active"');
        res.status(200).json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. CREATE A COURSE (Faculty/Admin)
router.post('/', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    const { code, name, description, department, credits, semester, max_students, room, schedule } = req.body;
    if (!code || !name) {
        return res.status(400).json({ error: 'Course code and name are required' });
    }
    try {
        const existing = await db.get('SELECT * FROM courses_course WHERE code = ?', [code]);
        if (existing) {
            return res.status(400).json({ error: 'Course with this code already exists' });
        }
        const created_at = new Date().toISOString();
        const result = await db.run(`
      INSERT INTO courses_course (
        code, name, description, department, credits, semester, instructor_id,
        max_students, room, schedule, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [code, name, description || '', department || '', credits || 3, semester || 1, req.user.id, max_students || 60, room || '', schedule || '', created_at, created_at]);

        res.status(201).json({ id: result.id, message: 'Course created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. GET MY COURSES
router.get('/my-courses', authenticateToken, async (req, res) => {
    try {
        let courses;
        if (req.user.role === 'student') {
            courses = await db.query(`
        SELECT c.* FROM courses_course c
        JOIN courses_enrollment e ON c.id = e.course_id
        WHERE e.student_id = ? AND e.status = 'approved'
      `, [req.user.id]);
        } else if (req.user.role === 'faculty') {
            courses = await db.query('SELECT * FROM courses_course WHERE instructor_id = ?', [req.user.id]);
        } else {
            courses = await db.query('SELECT * FROM courses_course');
        }
        res.status(200).json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 5. GET STUDENT ENROLLMENT STATUSES
router.get('/my-enrollment-status', authenticateToken, authorizeRoles('student'), async (req, res) => {
    try {
        const enrollments = await db.query(`
            SELECT e.id AS enrollment_id, e.course_id, e.status, e.enrollment_date, e.approved_date
            FROM courses_enrollment e
            WHERE e.student_id = ?
        `, [req.user.id]);
        res.status(200).json(enrollments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 6. GET PENDING ENROLLMENT APPROVAL REQUESTS (Faculty/Admin)
router.get('/pending-approvals', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    try {
        let query = `
            SELECT 
                e.id AS enrollment_id,
                e.enrollment_date,
                e.status,
                c.id AS course_id,
                c.code AS course_code,
                c.name AS course_name,
                c.instructor_id,
                inst.first_name AS instructor_first_name,
                inst.last_name AS instructor_last_name,
                inst.email AS instructor_email,
                u.id AS student_id,
                u.first_name,
                u.last_name,
                u.email,
                sp.roll_number,
                sp.enrollment_number,
                sp.department,
                sp.year,
                sp.semester,
                sp.cgpa,
                sp.parent_name,
                sp.parent_phone
            FROM courses_enrollment e
            JOIN courses_course c ON e.course_id = c.id
            JOIN accounts_user u ON e.student_id = u.id
            LEFT JOIN accounts_user inst ON c.instructor_id = inst.id
            LEFT JOIN accounts_studentprofile sp ON u.id = sp.user_id
            WHERE e.status = 'pending'
        `;

        const params = [];
        if (req.user.role === 'faculty') {
            query += ` AND c.instructor_id = ? `;
            params.push(req.user.id);
        }

        query += ` ORDER BY e.enrollment_date DESC `;

        const pendingRequests = await db.query(query, params);
        const result = pendingRequests.map(r => ({
            ...r,
            is_my_course: r.instructor_id === req.user.id || req.user.role === 'admin'
        }));

        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. GET COURSE BY ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const course = await db.get('SELECT * FROM courses_course WHERE id = ?', [req.params.id]);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        const instructor = await db.get('SELECT id, first_name, last_name, email FROM accounts_user WHERE id = ?', [course.instructor_id]);
        res.status(200).json({ ...course, instructor });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 7. ENROLL IN COURSE (Student)
router.post('/enroll', authenticateToken, authorizeRoles('student'), async (req, res) => {
    const { course_id } = req.body;
    if (!course_id) {
        return res.status(400).json({ error: 'Course ID is required' });
    }
    try {
        // Check if course is active
        const course = await db.get('SELECT * FROM courses_course WHERE id = ?', [course_id]);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Check existing enrollment
        const existing = await db.get('SELECT * FROM courses_enrollment WHERE student_id = ? AND course_id = ?', [req.user.id, course_id]);
        const date = new Date().toISOString();

        if (existing) {
            if (existing.status === 'approved') {
                return res.status(400).json({ error: 'You are already enrolled in this course' });
            }
            if (existing.status === 'pending') {
                return res.status(400).json({ error: 'Enrollment request is currently pending faculty approval' });
            }
            // If rejected previously, allow re-submitting request
            await db.run(`
                UPDATE courses_enrollment
                SET status = 'pending', enrollment_date = ?, approved_by_id = NULL, approved_date = NULL
                WHERE id = ?
            `, [date, existing.id]);
            return res.status(200).json({ message: 'Enrollment request resubmitted for faculty approval' });
        }

        await db.run(`
            INSERT INTO courses_enrollment (student_id, course_id, status, enrollment_date, grade, marks)
            VALUES (?, ?, 'pending', ?, '', 0.0)
        `, [req.user.id, course_id, date]);

        res.status(201).json({ message: 'Enrollment requested successfully and sent to faculty for approval' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 8. APPROVE/REJECT ENROLLMENT (Faculty/Admin)
router.post('/enrollments/:enrollment_id/approve', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    try {
        const enrollment = await db.get(`
            SELECT e.*, c.instructor_id 
            FROM courses_enrollment e
            JOIN courses_course c ON e.course_id = c.id
            WHERE e.id = ?
        `, [req.params.enrollment_id]);

        if (!enrollment) {
            return res.status(404).json({ error: 'Enrollment record not found' });
        }
        if (req.user.role === 'faculty' && enrollment.instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only approve enrollments for your assigned courses' });
        }

        const approved_date = new Date().toISOString();
        await db.run(`
      UPDATE courses_enrollment
      SET status = 'approved', approved_by_id = ?, approved_date = ?
      WHERE id = ?
    `, [req.user.id, approved_date, req.params.enrollment_id]);

        res.status(200).json({ message: 'Enrollment approved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/enrollments/:enrollment_id/reject', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    try {
        const enrollment = await db.get(`
            SELECT e.*, c.instructor_id 
            FROM courses_enrollment e
            JOIN courses_course c ON e.course_id = c.id
            WHERE e.id = ?
        `, [req.params.enrollment_id]);

        if (!enrollment) {
            return res.status(404).json({ error: 'Enrollment record not found' });
        }
        if (req.user.role === 'faculty' && enrollment.instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only reject enrollments for your assigned courses' });
        }

        const approved_date = new Date().toISOString();
        await db.run(`
      UPDATE courses_enrollment
      SET status = 'rejected', approved_by_id = ?, approved_date = ?
      WHERE id = ?
    `, [req.user.id, approved_date, req.params.enrollment_id]);

        res.status(200).json({ message: 'Enrollment rejected successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 7. GET COURSE MATERIALS
router.get('/:course_id/materials', authenticateToken, async (req, res) => {
    try {
        const materials = await db.query('SELECT * FROM courses_coursematerial WHERE course_id = ?', [req.params.course_id]);
        res.status(200).json(materials);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 8. UPLOAD COURSE MATERIAL (Faculty)
router.post('/:course_id/materials', authenticateToken, authorizeRoles('admin', 'faculty'), upload.single('file'), async (req, res) => {
    const { title, description, material_type, external_link } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    try {
        const file_path = req.file ? `course_materials/${req.file.filename}` : '';
        const date = new Date().toISOString();
        await db.run(`
      INSERT INTO courses_coursematerial (
        course_id, title, description, material_type, file, external_link, uploaded_by_id, is_published, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [req.params.course_id, title, description || '', material_type || 'note', file_path, external_link || '', req.user.id, date, date]);

        res.status(201).json({ message: 'Course material uploaded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
