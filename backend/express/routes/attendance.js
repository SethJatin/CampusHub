const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// 1. MARK ATTENDANCE (Faculty / Admin only)
// POST /attendance/mark/:course_id
router.post('/mark/:course_id', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    const { course_id } = req.params;
    const { date, attendance_records } = req.body;

    if (!date || !attendance_records || !Array.isArray(attendance_records)) {
        return res.status(400).json({ error: 'Date and attendance_records (array) are required' });
    }

    try {
        const course = await db.get('SELECT * FROM courses_course WHERE id = ?', [course_id]);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Verify instructor
        if (req.user.role === 'faculty' && course.instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to mark attendance for this course' });
        }

        const marked_at = new Date().toISOString();
        const results = [];

        for (const record of attendance_records) {
            const { student_id, status } = record;
            if (!student_id || !status) continue;

            // Verify enrollment
            const enrolled = await db.get(
                'SELECT * FROM courses_enrollment WHERE student_id = ? AND course_id = ? AND status = "approved"',
                [student_id, course_id]
            );
            if (!enrolled) continue;

            // Check if attendance already exists
            const existing = await db.get(
                'SELECT id FROM courses_attendance WHERE student_id = ? AND course_id = ? AND date = ?',
                [student_id, course_id, date]
            );

            if (existing) {
                await db.run(
                    'UPDATE courses_attendance SET status = ?, marked_by_id = ?, marked_at = ? WHERE id = ?',
                    [status, req.user.id, marked_at, existing.id]
                );
            } else {
                await db.run(`
          INSERT INTO courses_attendance (student_id, course_id, date, status, marked_by_id, marked_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [student_id, course_id, date, status, req.user.id, marked_at]);
            }
            results.push({ student_id, status });
        }

        res.status(200).json({ message: 'Attendance marked successfully', records: results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. UPDATE ATTENDANCE (Faculty / Admin only)
// PUT /attendance/update/:attendance_id
router.put('/update/:attendance_id', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    const { attendance_id } = req.params;
    const { status, date } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    try {
        const attendance = await db.get('SELECT * FROM courses_attendance WHERE id = ?', [attendance_id]);
        if (!attendance) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }

        const course = await db.get('SELECT * FROM courses_course WHERE id = ?', [attendance.course_id]);

        // Check auth
        if (req.user.role === 'faculty' && course.instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to update this attendance record' });
        }

        const marked_at = new Date().toISOString();
        await db.run(
            'UPDATE courses_attendance SET status = ?, date = ?, marked_by_id = ?, marked_at = ? WHERE id = ?',
            [status, date || attendance.date, req.user.id, marked_at, attendance_id]
        );

        res.status(200).json({ message: 'Attendance updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. GET STUDENT ATTENDANCE LOGS
// GET /attendance/student/:student_id
router.get('/student/:student_id', authenticateToken, async (req, res) => {
    const { student_id } = req.params;
    const { course_id } = req.query;

    // Students can only view their own logs
    if (req.user.role === 'student' && req.user.id !== parseInt(student_id)) {
        return res.status(403).json({ error: 'Access denied: cannot view another student\'s logs' });
    }

    try {
        let queryStr = 'SELECT a.*, c.name as course_name, c.code as course_code FROM courses_attendance a JOIN courses_course c ON a.course_id = c.id WHERE a.student_id = ?';
        const params = [student_id];

        if (course_id) {
            queryStr += ' AND a.course_id = ?';
            params.push(course_id);
        }

        queryStr += ' ORDER BY a.date DESC';
        const records = await db.query(queryStr, params);
        res.status(200).json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. GET CLASS ATTENDANCE LOGS
// GET /attendance/class/:course_id
router.get('/class/:course_id', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    const { course_id } = req.params;

    try {
        const course = await db.get('SELECT * FROM courses_course WHERE id = ?', [course_id]);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        if (req.user.role === 'faculty' && course.instructor_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized class access' });
        }

        const records = await db.query(`
      SELECT a.*, u.first_name, u.last_name, u.email
      FROM courses_attendance a
      JOIN accounts_user u ON a.student_id = u.id
      WHERE a.course_id = ?
      ORDER BY a.date DESC, u.first_name ASC
    `, [course_id]);

        res.status(200).json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 5. GET STUDENT ATTENDANCE PERCENTAGE
// GET /attendance/percentage/:student_id
router.get('/percentage/:student_id', authenticateToken, async (req, res) => {
    const { student_id } = req.params;
    const { course_id } = req.query;

    if (req.user.role === 'student' && req.user.id !== parseInt(student_id)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        let whereClause = 'WHERE student_id = ?';
        const params = [student_id];

        if (course_id) {
            whereClause += ' AND course_id = ?';
            params.push(course_id);
        }

        const records = await db.query(`SELECT status FROM courses_attendance ${whereClause}`, params);
        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const percentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;

        res.status(200).json({
            student_id: parseInt(student_id),
            total_classes: total,
            classes_attended: present,
            percentage: percentage
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
