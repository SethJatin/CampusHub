const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// ==========================================
// EXAMS & MARKS API ROUTES
// ==========================================

function getMarksLockStatus(exam) {
    const examStartMs = new Date(exam.exam_date).getTime();
    const durationMs = (exam.duration_minutes || 90) * 60 * 1000;
    const examEndMs = examStartMs + durationMs;
    const eightHoursMs = 8 * 60 * 60 * 1000;
    const marksAllowedMs = examEndMs + eightHoursMs;
    const nowMs = Date.now();

    if (nowMs < examEndMs) {
        return {
            is_locked: true,
            reason: 'ongoing_or_future',
            marks_allowed_at: new Date(marksAllowedMs).toISOString(),
            message: `Exam is ongoing or scheduled. Marks entry opens 8 hours after exam completion at ${new Date(marksAllowedMs).toLocaleString()}.`
        };
    }

    if (nowMs < marksAllowedMs) {
        const remainingMs = marksAllowedMs - nowMs;
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        return {
            is_locked: true,
            reason: 'eight_hour_buffer',
            marks_allowed_at: new Date(marksAllowedMs).toISOString(),
            message: `Marks entry locked! Mandatory 8-hour gap after exam completion required. Unlocks in ${hours}h ${mins}m (at ${new Date(marksAllowedMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`
        };
    }

    return { is_locked: false, message: 'Marks entry unlocked' };
}

// 1. Get all exams
router.get('/', authenticateToken, async (req, res) => {
    const { course_id } = req.query;
    try {
        let sql = `
            SELECT e.*, c.code as course_code, c.name as course_name,
                   u.first_name as instructor_first_name, u.last_name as instructor_last_name,
                   (SELECT COUNT(*) FROM courses_examquestion eq WHERE eq.exam_id = e.id) as total_questions,
                   em.marks_obtained as student_marks, em.remarks as student_remarks
            FROM courses_exam e
            JOIN courses_course c ON e.course_id = c.id
            LEFT JOIN accounts_user u ON c.instructor_id = u.id
            LEFT JOIN courses_exammark em ON em.exam_id = e.id AND em.student_id = ?
        `;
        const params = [req.user.id];

        if (course_id) {
            sql += ` WHERE e.course_id = ?`;
            params.push(course_id);
        }

        sql += ` ORDER BY e.exam_date ASC`;
        const exams = await db.query(sql, params);

        const enrichedExams = exams.map(ex => ({
            ...ex,
            lock_status: getMarksLockStatus(ex)
        }));

        res.status(200).json(enrichedExams);
    } catch (err) {
        console.error('Error fetching exams:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Get single exam with questions
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const exam = await db.get(`
            SELECT e.*, c.code as course_code, c.name as course_name
            FROM courses_exam e
            JOIN courses_course c ON e.course_id = c.id
            WHERE e.id = ?
        `, [req.params.id]);

        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const questions = await db.query(`
            SELECT id, question_text, option_a, option_b, option_c, option_d, marks
            FROM courses_examquestion WHERE exam_id = ? ORDER BY id ASC
        `, [req.params.id]);

        const submission = await db.get(`
            SELECT * FROM courses_examsubmission WHERE exam_id = ? AND student_id = ?
        `, [req.params.id, req.user.id]);

        const mark = await db.get(`
            SELECT * FROM courses_exammark WHERE exam_id = ? AND student_id = ?
        `, [req.params.id, req.user.id]);

        res.status(200).json({
            ...exam,
            lock_status: getMarksLockStatus(exam),
            questions,
            is_submitted: !!submission,
            student_mark: mark
        });
    } catch (err) {
        console.error('Error fetching exam details:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. Create Exam & Syllabus (Faculty/Admin)
router.post('/', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    const { course_id, title, exam_date, duration_minutes, total_marks, syllabus, exam_pattern, questions } = req.body;
    if (!course_id || !title || !exam_date) {
        return res.status(400).json({ error: 'Course, exam title, and exam date are required' });
    }
    try {
        const dateNow = new Date().toISOString();
        const examRes = await db.run(`
            INSERT INTO courses_exam (
                course_id, title, exam_date, duration_minutes, total_marks,
                syllabus, exam_pattern, status, created_at, created_by_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
        `, [
            course_id, title, exam_date, duration_minutes || 90, total_marks || 100.0,
            syllabus || '', exam_pattern || '', dateNow, req.user.id
        ]);

        const examId = examRes.id;

        if (Array.isArray(questions) && questions.length > 0) {
            for (const q of questions) {
                await db.run(`
                    INSERT INTO courses_examquestion (
                        exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [examId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option || 'A', q.marks || 10.0]);
            }
        }

        res.status(201).json({ message: 'Exam and syllabus published successfully', exam_id: examId });
    } catch (err) {
        console.error('Error creating exam:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. Submit Online Exam (Student)
router.post('/:id/submit', authenticateToken, authorizeRoles('student'), async (req, res) => {
    const { answers } = req.body;
    try {
        const exam = await db.get('SELECT * FROM courses_exam WHERE id = ?', [req.params.id]);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const existingSub = await db.get('SELECT * FROM courses_examsubmission WHERE exam_id = ? AND student_id = ?', [req.params.id, req.user.id]);
        if (existingSub) return res.status(400).json({ error: 'Exam already submitted' });

        const questions = await db.query('SELECT * FROM courses_examquestion WHERE exam_id = ?', [req.params.id]);
        let calculatedScore = 0;
        let totalPossible = 0;

        questions.forEach(q => {
            totalPossible += (parseFloat(q.marks) || 0);
            if (answers && answers[q.id] === q.correct_option) {
                calculatedScore += (parseFloat(q.marks) || 0);
            }
        });

        const dateNow = new Date().toISOString();
        await db.run(`
            INSERT INTO courses_examsubmission (exam_id, student_id, submitted_at, status, answers_json)
            VALUES (?, ?, ?, 'submitted', ?)
        `, [req.params.id, req.user.id, dateNow, JSON.stringify(answers || {})]);

        const normalizedScore = totalPossible > 0 ? (calculatedScore / totalPossible) * exam.total_marks : calculatedScore;

        await db.run(`
            INSERT INTO courses_exammark (exam_id, student_id, marks_obtained, total_marks, remarks, evaluated_at, evaluated_by_id)
            VALUES (?, ?, ?, ?, 'Online Auto-Graded Submission', ?, ?)
        `, [req.params.id, req.user.id, normalizedScore.toFixed(1), exam.total_marks, dateNow, req.user.id]);

        res.status(200).json({
            message: 'Exam submitted successfully!',
            score: normalizedScore.toFixed(1),
            total_marks: exam.total_marks
        });
    } catch (err) {
        console.error('Error submitting exam:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 5. Get Enrolled Students for Mark Entry (Faculty/Admin)
router.get('/:id/students', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    try {
        const exam = await db.get('SELECT * FROM courses_exam WHERE id = ?', [req.params.id]);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const lockStatus = getMarksLockStatus(exam);
        if (lockStatus.is_locked) {
            return res.status(400).json({
                error: lockStatus.message,
                lock_status: lockStatus
            });
        }

        const students = await db.query(`
            SELECT u.id as student_id, u.first_name, u.last_name, u.email, sp.roll_number,
                   em.id as mark_id, em.marks_obtained, em.remarks,
                   es.submitted_at, es.status as submission_status
            FROM courses_enrollment e
            JOIN accounts_user u ON e.student_id = u.id
            LEFT JOIN accounts_studentprofile sp ON u.id = sp.user_id
            LEFT JOIN courses_exammark em ON em.exam_id = ? AND em.student_id = u.id
            LEFT JOIN courses_examsubmission es ON es.exam_id = ? AND es.student_id = u.id
            WHERE e.course_id = ? AND e.status = 'approved'
            ORDER BY u.id ASC
        `, [req.params.id, req.params.id, exam.course_id]);

        res.status(200).json(students);
    } catch (err) {
        console.error('Error fetching exam student marks:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 6. Save / Update Exam Marks (Faculty/Admin)
router.post('/:id/marks', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    const { marks_records } = req.body;
    if (!Array.isArray(marks_records) || marks_records.length === 0) {
        return res.status(400).json({ error: 'No mark records provided' });
    }
    try {
        const exam = await db.get('SELECT * FROM courses_exam WHERE id = ?', [req.params.id]);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const lockStatus = getMarksLockStatus(exam);
        if (lockStatus.is_locked) {
            return res.status(400).json({
                error: lockStatus.message,
                lock_status: lockStatus
            });
        }

        const dateNow = new Date().toISOString();

        for (const rec of marks_records) {
            const existing = await db.get('SELECT id FROM courses_exammark WHERE exam_id = ? AND student_id = ?', [req.params.id, rec.student_id]);
            if (existing) {
                await db.run(`
                    UPDATE courses_exammark
                    SET marks_obtained = ?, remarks = ?, evaluated_at = ?, evaluated_by_id = ?
                    WHERE id = ?
                `, [rec.marks_obtained, rec.remarks || 'Evaluated', dateNow, req.user.id, existing.id]);
            } else {
                await db.run(`
                    INSERT INTO courses_exammark (exam_id, student_id, marks_obtained, total_marks, remarks, evaluated_at, evaluated_by_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [req.params.id, rec.student_id, rec.marks_obtained, exam.total_marks, rec.remarks || 'Evaluated', dateNow, req.user.id]);
            }
        }

        await db.run('UPDATE courses_exam SET status = "completed" WHERE id = ?', [req.params.id]);

        res.status(200).json({ message: 'Exam marks updated successfully' });
    } catch (err) {
        console.error('Error updating exam marks:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 7. Student Personal Growth Analytics
router.get('/growth/student/:student_id', authenticateToken, async (req, res) => {
    const studentId = req.params.student_id;
    try {
        // Marks history trend
        const history = await db.query(`
            SELECT em.marks_obtained, em.total_marks, em.remarks, e.title as exam_title, e.exam_date,
                   c.code as course_code, c.name as course_name
            FROM courses_exammark em
            JOIN courses_exam e ON em.exam_id = e.id
            JOIN courses_course c ON e.course_id = c.id
            WHERE em.student_id = ?
            ORDER BY e.exam_date ASC
        `, [studentId]);

        // Calculate stats
        let totalPct = 0;
        let highestPct = 0;
        const trend = history.map(h => {
            const pct = Math.round((h.marks_obtained / h.total_marks) * 100);
            totalPct += pct;
            if (pct > highestPct) highestPct = pct;
            return {
                exam_title: h.exam_title,
                course_code: h.course_code,
                course_name: h.course_name,
                exam_date: h.exam_date,
                marks_obtained: h.marks_obtained,
                total_marks: h.total_marks,
                percentage: pct
            };
        });

        const overallAverage = history.length > 0 ? (totalPct / history.length).toFixed(1) : 0;

        // Subject wise breakdown
        const subjectWise = await db.query(`
            SELECT c.code as course_code, c.name as course_name,
                   AVG((em.marks_obtained / em.total_marks) * 100) as avg_pct,
                   COUNT(em.id) as total_exams
            FROM courses_exammark em
            JOIN courses_exam e ON em.exam_id = e.id
            JOIN courses_course c ON e.course_id = c.id
            WHERE em.student_id = ?
            GROUP BY c.id
        `, [studentId]);

        res.status(200).json({
            overall_average: parseFloat(overallAverage),
            highest_percentage: highestPct,
            total_exams_taken: history.length,
            trend,
            subject_breakdown: subjectWise.map(s => ({
                course_code: s.course_code,
                course_name: s.course_name,
                average_percentage: Math.round(s.avg_pct || 0),
                total_exams: s.total_exams
            }))
        });
    } catch (err) {
        console.error('Error fetching student growth analytics:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 8. Faculty / Overall Growth Analytics
router.get('/growth/faculty-overview', authenticateToken, authorizeRoles('admin', 'faculty'), async (req, res) => {
    try {
        // Course averages
        const courseStats = await db.query(`
            SELECT c.id as course_id, c.code as course_code, c.name as course_name,
                   u.first_name as instructor_first_name, u.last_name as instructor_last_name,
                   AVG((em.marks_obtained / em.total_marks) * 100) as class_avg_pct,
                   MAX((em.marks_obtained / em.total_marks) * 100) as max_pct,
                   MIN((em.marks_obtained / em.total_marks) * 100) as min_pct,
                   COUNT(DISTINCT em.student_id) as student_count
            FROM courses_course c
            LEFT JOIN accounts_user u ON c.instructor_id = u.id
            LEFT JOIN courses_exam e ON e.course_id = c.id
            LEFT JOIN courses_exammark em ON em.exam_id = e.id
            GROUP BY c.id
        `);

        // Overall average across all courses
        const overallRes = await db.get(`
            SELECT AVG((marks_obtained / total_marks) * 100) as overall_avg FROM courses_exammark
        `);

        res.status(200).json({
            overall_average: Math.round(overallRes?.overall_avg || 0),
            course_analytics: courseStats.map(cs => ({
                course_id: cs.course_id,
                course_code: cs.course_code,
                course_name: cs.course_name,
                instructor_name: cs.instructor_first_name ? `Prof. ${cs.instructor_first_name} ${cs.instructor_last_name}` : 'Unassigned',
                class_average: Math.round(cs.class_avg_pct || 0),
                highest_score: Math.round(cs.max_pct || 0),
                lowest_score: Math.round(cs.min_pct || 0),
                student_count: cs.student_count || 15
            }))
        });
    } catch (err) {
        console.error('Error fetching faculty analytics:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
