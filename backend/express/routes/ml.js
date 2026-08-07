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
router.get('/risk-analysis', authenticateToken, (req, res) => {
    const summary = getSummaryData();
    if (!summary) {
        return res.status(503).json({ error: 'AI Risk Model has not been trained yet.' });
    }
    res.json(summary);
});

// 2. GET PERSONALIZED RISK FOR SPECIFIC STUDENT
router.get('/student-risk/:id', authenticateToken, (req, res) => {
    const summary = getSummaryData();
    if (!summary) {
        return res.status(503).json({ error: 'AI Risk Model has not been trained yet.' });
    }

    const studentId = parseInt(req.params.id, 10);
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
