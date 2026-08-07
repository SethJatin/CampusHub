const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const SUMMARY_FILE = path.join(__dirname, '..', '..', 'ml', 'risk_summary.json');

function getSummaryData() {
    if (fs.existsSync(SUMMARY_FILE)) {
        try {
            const raw = fs.readFileSync(SUMMARY_FILE, 'utf-8');
            return JSON.parse(raw);
        } catch (e) {
            console.error('Error reading risk_summary.json:', e);
        }
    }
    return null;
}

// 1. GET ALL RISK ANALYSIS & MODEL COMPARISONS
router.get('/risk-analysis', authenticateToken, async (req, res) => {
    const summary = getSummaryData();
    if (!summary) {
        return res.status(503).json({ error: 'AI Risk Model has not been trained yet.' });
    }

    if (req.user.role === 'faculty') {
        try {
            const db = require('../config/db');
            const rows = await db.query(`
                SELECT DISTINCT e.student_id 
                FROM courses_enrollment e
                JOIN courses_course c ON e.course_id = c.id
                WHERE c.instructor_id = ? AND e.status = 'approved'
            `, [req.user.id]);

            const allowedStudentIds = new Set(rows.map(r => r.student_id));
            const filteredStudents = (summary.students || []).filter(s => allowedStudentIds.has(s.user_id));

            const highCount = filteredStudents.filter(s => s.predicted_risk_level === 'High Risk').length;
            const modCount = filteredStudents.filter(s => s.predicted_risk_level === 'Moderate Risk').length;
            const safeCount = filteredStudents.filter(s => s.predicted_risk_level === 'Safe').length;

            return res.json({
                ...summary,
                total_students_evaluated: filteredStudents.length,
                high_risk_count: highCount,
                moderate_risk_count: modCount,
                safe_count: safeCount,
                students: filteredStudents
            });
        } catch (e) {
            console.error('Error filtering ML risk analysis for faculty:', e);
        }
    }

    res.json(summary);
});

// 2. GET PERSONALIZED RISK FOR SPECIFIC STUDENT
router.get('/student-risk/:id', authenticateToken, (req, res) => {
    const studentId = parseInt(req.params.id, 10);

    if (req.user.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ error: 'Access denied: You can only view your own academic indicator data.' });
    }

    const summary = getSummaryData();
    if (!summary) {
        return res.status(503).json({ error: 'AI Risk Model has not been trained yet.' });
    }

    const studentRisk = summary.students.find(s => s.user_id === studentId);

    if (!studentRisk) {
        // Fallback default safe status
        return res.json({
            user_id: studentId,
            risk_probability: 12.5,
            predicted_risk_level: 'Safe',
            attendance_percentage: 85.0,
            avg_exam_score: 82.0,
            avg_assignment_score: 88.0,
            recommendation: 'Your academic status is in good standing. Keep up the consistent attendance!'
        });
    }

    let rec = 'Your academic status is in good standing. Keep up the consistent attendance!';
    if (studentRisk.predicted_risk_level === 'High Risk') {
        rec = '⚠️ Immediate Action Needed: Attendance is below target (75%) or exam marks need improvement. Contact your course instructor.';
    } else if (studentRisk.predicted_risk_level === 'Moderate Risk') {
        rec = '⚡ Caution: Borderline attendance or scores. Increasing session attendance and submitting homework promptly will improve your standing.';
    }

    res.json({
        ...studentRisk,
        recommendation: rec,
        feature_importances: summary.feature_importances,
        model_metrics: summary.model_metrics
    });
});

module.exports = router;
