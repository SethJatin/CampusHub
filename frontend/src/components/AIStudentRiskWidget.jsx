import React, { useState, useEffect } from 'react';

function AIStudentRiskWidget({ userId, token }) {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !token) return;
    fetch(`/api/ml/student-risk/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setRiskData(data))
      .catch(() => setRiskData(null))
      .finally(() => setLoading(false));
  }, [userId, token]);

  if (loading) return <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', marginTop: '30px' }}>Loading Academic Support Summary...</div>;
  if (!riskData) return null;

  const isHigh = riskData.predicted_risk_level === 'High Risk';
  const isMod = riskData.predicted_risk_level === 'Moderate Risk';

  const statusLabel = isHigh ? 'Immediate Action Required' : isMod ? 'Attention Needed' : 'On Track';
  const levelColor = isHigh ? 'var(--danger)' : isMod ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="glass-panel" style={{ padding: '25px', marginTop: '30px', borderLeft: `6px solid ${levelColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          📊 Academic Health & Support Indicator
        </h3>
        <span className="badge" style={{ background: levelColor, color: '#fff', fontSize: '0.85rem', padding: '6px 14px' }}>
          {statusLabel}
        </span>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
        {riskData.recommendation}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Class Attendance Rate</small>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginTop: '4px', color: riskData.attendance_percentage < 75 ? 'var(--danger)' : 'var(--success)' }}>
            {riskData.attendance_percentage}%
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Average Exam Performance</small>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginTop: '4px', color: riskData.avg_exam_score < 50 ? 'var(--danger)' : '#38bdf8' }}>
            {riskData.avg_exam_score}%
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Assignment Completion</small>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginTop: '4px', color: '#a855f7' }}>
            {riskData.avg_assignment_score}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIStudentRiskWidget;
