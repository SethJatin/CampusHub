const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer file upload
const mediaDir = path.resolve(__dirname, '..', '..', 'django', 'media');
const notesDir = path.join(mediaDir, 'notes');
const subDir = path.join(mediaDir, 'submissions');
const eventDir = path.join(mediaDir, 'event_banners');

[notesDir, subDir, eventDir].forEach(d => {
    if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = notesDir;
        if (file.fieldname === 'submission') dest = subDir;
        if (file.fieldname === 'banner') dest = eventDir;
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// ==========================================
// ASSIGNMENTS
// ==========================================

// 1. Get assignments (All or course specific)
router.get('/assignments', authenticateToken, async (req, res) => {
    const { course_id } = req.query;
    try {
        let assignments;
        if (course_id) {
            assignments = await db.query('SELECT * FROM assignments_assignment WHERE course_id = ?', [course_id]);
        } else {
            if (req.user.role === 'student') {
                assignments = await db.query(`
          SELECT a.* FROM assignments_assignment a
          JOIN courses_enrollment e ON a.course_id = e.course_id
          WHERE e.student_id = ? AND e.status = 'approved'
        `, [req.user.id]);
            } else if (req.user.role === 'faculty') {
                assignments = await db.query('SELECT * FROM assignments_assignment WHERE created_by_id = ?', [req.user.id]);
            } else {
                assignments = await db.query('SELECT * FROM assignments_assignment');
            }
        }
        res.status(200).json(assignments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Create Assignment (Faculty)
router.post('/assignments', authenticateToken, authorizeRoles('admin', 'faculty'), upload.single('attachment'), async (req, res) => {
    const { course_id, title, description, instructions, due_date, allow_late_submission, late_penalty_percent, total_marks } = req.body;
    if (!course_id || !title || !due_date) {
        return res.status(400).json({ error: 'Course, Title, and Due Date are required' });
    }
    try {
        const file_path = req.file ? `assignments/${req.file.filename}` : '';
        const date = new Date().toISOString();
        const result = await db.run(`
      INSERT INTO assignments_assignment (
        course_id, title, description, instructions, created_by_id, created_at, updated_at, due_date,
        allow_late_submission, late_penalty_percent, total_marks, status, attachment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
    `, [course_id, title, description || '', instructions || '', req.user.id, date, date, due_date,
            allow_late_submission === 'true' ? 1 : 0, late_penalty_percent || 10, total_marks || 100, file_path]);

        res.status(201).json({ id: result.id, message: 'Assignment created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. Get Submissions
router.get('/submissions', authenticateToken, async (req, res) => {
    try {
        let submissions;
        if (req.user.role === 'student') {
            submissions = await db.query('SELECT * FROM assignments_submission WHERE student_id = ?', [req.user.id]);
        } else if (req.user.role === 'faculty') {
            submissions = await db.query(`
        SELECT s.* FROM assignments_submission s
        JOIN assignments_assignment a ON s.assignment_id = a.id
        WHERE a.created_by_id = ?
      `, [req.user.id]);
        } else {
            submissions = await db.query('SELECT * FROM assignments_submission');
        }
        res.status(200).json(submissions);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. Submit Assignment (Student)
router.post('/assignments/:id/submit', authenticateToken, authorizeRoles('student'), upload.single('submission'), async (req, res) => {
    const { content } = req.body;
    try {
        const existing = await db.get('SELECT * FROM assignments_submission WHERE assignment_id = ? AND student_id = ?', [req.params.id, req.user.id]);
        if (existing) {
            return res.status(400).json({ error: 'Already submitted this assignment' });
        }

        const file_path = req.file ? `submissions/${req.file.filename}` : '';
        const date = new Date().toISOString();
        await db.run(`
      INSERT INTO assignments_submission (
        assignment_id, student_id, submitted_at, content, attachment, marks_obtained, grade, feedback, graded_by_id, graded_at, status
      ) VALUES (?, ?, ?, ?, ?, NULL, '', '', NULL, NULL, 'submitted')
    `, [req.params.id, req.user.id, date, content || '', file_path]);

        res.status(201).json({ message: 'Submission uploaded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 5. Grade Submission (Faculty)
router.post('/submissions/:id/grade', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    const { marks_obtained, grade, feedback } = req.body;
    if (marks_obtained === undefined || !grade) {
        return res.status(400).json({ error: 'Marks and grade are required' });
    }
    try {
        const date = new Date().toISOString();
        await db.run(`
      UPDATE assignments_submission
      SET marks_obtained = ?, grade = ?, feedback = ?, graded_by_id = ?, graded_at = ?, status = 'graded'
      WHERE id = ?
    `, [marks_obtained, grade, feedback || '', req.user.id, date, req.params.id]);

        res.status(200).json({ message: 'Submission graded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// EVENTS & ANNOUNCEMENTS
// ==========================================

// 1. Get events
router.get('/events', authenticateToken, async (req, res) => {
    try {
        const events = await db.query('SELECT * FROM events_event WHERE status = "published" ORDER BY start_date DESC');
        res.status(200).json(events);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Register for Event Check-in
router.post('/events/:id/register', authenticateToken, async (req, res) => {
    try {
        const event = await db.get('SELECT * FROM events_event WHERE id = ?', [req.params.id]);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const existing = await db.get('SELECT * FROM events_eventregistration WHERE event_id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existing) return res.status(400).json({ error: 'Already registered for this event' });

        const date = new Date().toISOString();
        await db.run(`
      INSERT INTO events_eventregistration (event_id, user_id, registered_at, status)
      VALUES (?, ?, ?, 'registered')
    `, [req.params.id, req.user.id, date]);

        res.status(201).json({ message: 'Registered for event check-in successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. Get announcements
router.get('/announcements', authenticateToken, async (req, res) => {
    try {
        const announcements = await db.query('SELECT * FROM events_announcement WHERE is_published = 1 ORDER BY created_at DESC');
        res.status(200).json(announcements);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. Create Announcement (Faculty/Admin)
router.post('/announcements', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    const { title, content, priority, target_roles } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    try {
        const date = new Date().toISOString();
        const targetRolesJson = JSON.stringify(target_roles || []);
        await db.run(`
      INSERT INTO events_announcement (title, content, priority, target_roles, is_published, created_by_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `, [title, content, priority || 'normal', targetRolesJson, req.user.id, date, date]);

        res.status(201).json({ message: 'Announcement created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// STUDY NOTES
// ==========================================

// 1. Get Notes
router.get('/notes', authenticateToken, async (req, res) => {
    try {
        const notes = await db.query('SELECT * FROM notes_note WHERE is_public = 1 ORDER BY created_at DESC');
        res.status(200).json(notes);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Upload NOTE (All verified users)
router.post('/notes', authenticateToken, upload.single('file'), async (req, res) => {
    const { title, description, note_type, course_id, content } = req.body;
    if (!title || !course_id) {
        return res.status(400).json({ error: 'Title and Course ID are required' });
    }
    try {
        const file_path = req.file ? `notes/${req.file.filename}` : '';
        const date = new Date().toISOString();
        await db.run(`
      INSERT INTO notes_note (
        title, description, note_type, course_id, uploaded_by_id, file, content, is_public, views, downloads, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
    `, [title, description || '', note_type || 'notes', course_id, req.user.id, file_path, content || '', date, date]);

        res.status(201).json({ message: 'Note uploaded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
