import React, { useState, useEffect } from 'react';

function PendingEnrollmentsPanel({ token, onStatusChange }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchPendingRequests = () => {
    if (!token) return;
    fetch('/api/courses/pending-approvals', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPendingRequests();
  }, [token]);

  const handleAction = async (enrollmentId, action) => {
    try {
      const res = await fetch(`/api/courses/enrollments/${enrollmentId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message || 'Request updated successfully'}`);
        setTimeout(() => setMessage(''), 4000);
        fetchPendingRequests();
        if (onStatusChange) onStatusChange();
      } else {
        alert(data.error || 'Failed to update enrollment request');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating enrollment request');
    }
  };

  if (loading) return null;

  return (
    <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px', borderLeft: '4px solid #facc15' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔔 Pending Course Enrollment Approval Requests
        </h3>
        <span className="badge badge-warning" style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
          {requests.length} Pending
        </span>
      </div>

      {message && (
        <div style={{ color: '#10b981', padding: '10px 14px', background: 'rgba(16,185,129,0.15)', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      {requests.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          No pending student enrollment requests for assigned courses at this time.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {requests.map((req) => (
            <div
              key={req.enrollment_id}
              className="glass-panel"
              style={{
                padding: '18px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px'
              }}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#fff' }}>
                    {req.first_name} {req.last_name}
                  </strong>
                  <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                    Roll: {req.roll_number || 'N/A'}
                  </span>
                  <span className="badge badge-secondary" style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                    Enr: {req.enrollment_number || 'N/A'}
                  </span>
                  {req.is_my_course && (
                    <span className="badge badge-success" style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                      ⭐ Your Course
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span>📧 {req.email}</span>
                  <span>🏛️ {req.department || 'CS'} (Year {req.year || 1}, Sem {req.semester || 1})</span>
                  <span>🎓 CGPA: <strong style={{ color: '#38bdf8' }}>{req.cgpa || 'N/A'}</strong></span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.85rem', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>Requested Course: <strong style={{ color: '#a855f7' }}>[{req.course_code}] {req.course_name}</strong></span>
                  {req.instructor_first_name && (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      👨‍🏫 Instructor: <strong>Prof. {req.instructor_first_name} {req.instructor_last_name}</strong> ({req.instructor_email})
                    </span>
                  )}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    📅 {new Date(req.enrollment_date).toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleAction(req.enrollment_id, 'approve')}
                  className="glow-button"
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px' }}
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => handleAction(req.enrollment_id, 'reject')}
                  style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' }}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PendingEnrollmentsPanel;
