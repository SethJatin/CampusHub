import React, { useState, useEffect } from 'react';

function AIRiskAnalysisPanel({ token }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/ml/risk-analysis', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAnalysis(data))
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', marginTop: '30px' }}>Loading Academic Performance Overview...</div>;
  if (!analysis) return null;

  const imp = analysis.feature_importances || {};

  return (
    <div style={{ marginTop: '35px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🎯 Academic Early Support & Performance Summary</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>
          Real-time summary of student attendance, course participation, and academic standing across all classes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Primary Factors */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <h3 style={{ marginBottom: '15px' }}>💡 Primary Performance Factors</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(imp).map(([key, val]) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')} Impact</span>
                  <strong>{(val * 100).toFixed(0)}%</strong>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${val * 100}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High Risk Roster Table */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>📢 Students Requiring Academic Attention</h3>
            <span className="badge badge-danger">
              {analysis.high_risk_count + analysis.moderate_risk_count} Students
            </span>
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Attendance</th>
                  <th>Academic Standing</th>
                </tr>
              </thead>
              <tbody>
                {(analysis.students || [])
                  .filter(s => (s.predicted_risk_level && s.predicted_risk_level !== 'Safe') || (s.risk_level && s.risk_level !== 'Safe') || (s.attendance_percentage !== undefined && s.attendance_percentage < 75))
                  .map((s, i) => (
                    <tr key={i}>
                      <td>{s.roll_number}</td>
                      <td><strong>{s.first_name ? `${s.first_name} ${s.last_name}` : s.name}</strong></td>
                      <td>{s.department || 'General'}</td>
                      <td style={{ color: s.attendance_percentage < 75 ? 'var(--danger)' : 'var(--success)' }}>
                        {s.attendance_percentage}%
                      </td>
                      <td>
                        <span className={`badge ${(s.predicted_risk_level === 'High Risk' || s.risk_level === 'High Risk' || s.attendance_percentage < 75) ? 'badge-danger' : 'badge-warning'}`}>
                          {(s.predicted_risk_level === 'High Risk' || s.risk_level === 'High Risk' || s.attendance_percentage < 75) ? 'Immediate Support Needed' : 'Attention Advised'}
                        </span>
                      </td>
                    </tr>
                  ))}
                {(analysis.students || []).filter(s => (s.predicted_risk_level && s.predicted_risk_level !== 'Safe') || (s.risk_level && s.risk_level !== 'Safe') || (s.attendance_percentage !== undefined && s.attendance_percentage < 75)).length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      All students are currently in good academic standing!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIRiskAnalysisPanel;
