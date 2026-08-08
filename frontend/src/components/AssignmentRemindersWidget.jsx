import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function AssignmentRemindersWidget({ token }) {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/assignments/reminders', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setReminders(Array.isArray(data) ? data : []))
      .catch(() => setReminders([]));
  }, [token]);

  if (reminders.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '20px 25px', marginBottom: '25px', borderLeft: '5px solid #ef4444', background: 'rgba(239, 68, 68, 0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
          ⏰ URGENT ASSIGNMENT REMINDER ({reminders.length})
        </h3>
        <span className="badge badge-danger">Due in less than 24 hours!</span>
      </div>
      <p style={{ margin: '8px 0 15px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        You have unsubmitted homework tasks due within 24 hours. Please upload your completed work before the deadline.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {reminders.map((r, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 15px', borderRadius: '8px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong style={{ color: '#fff' }}>[{r.course_code}] {r.title}</strong>
              <div style={{ fontSize: '0.8rem', color: '#fb7185', marginTop: '3px' }}>
                ⏳ Deadline: {new Date(r.due_date).toLocaleString()}
              </div>
            </div>
            <Link to="/assignments" className="glow-button" style={{ padding: '6px 14px', fontSize: '0.8rem', textDecoration: 'none' }}>
              Complete & Upload
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AssignmentRemindersWidget;
