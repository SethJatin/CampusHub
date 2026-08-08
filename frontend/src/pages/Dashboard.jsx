import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PendingEnrollmentsPanel from '../components/PendingEnrollmentsPanel';
import AIRiskAnalysisPanel from '../components/AIRiskAnalysisPanel';
import AIStudentRiskWidget from '../components/AIStudentRiskWidget';
import AssignmentRemindersWidget from '../components/AssignmentRemindersWidget';

export function StudentDashboard() {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [percentData, setPercentData] = useState({ percentage: 0, total_classes: 0, classes_attended: 0 });
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!token || !user?.id) return;

    fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));

    fetch(`/api/attendance/percentage/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPercentData(data && typeof data === 'object' && !data.error ? data : { percentage: 0, total_classes: 0, classes_attended: 0 }))
      .catch(() => setPercentData({ percentage: 0, total_classes: 0, classes_attended: 0 }));

    fetch('/api/announcements', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAnnouncements(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => setAnnouncements([]));
  }, [token, user]);

  return (
    <div>
      <h1 style={{ marginBottom: '10px' }}>Welcome back, {user.first_name}!</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Review your academic performance overview and class notifications.</p>

      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <small style={{ color: 'var(--text-secondary)' }}>Overall Attendance</small>
          <div className="metric-value" style={{ color: 'var(--success)' }}>{percentData.percentage}%</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Attended {percentData.classes_attended} of {percentData.total_classes} sessions</p>
        </div>
        <div className="metric-card glass-panel">
          <small style={{ color: 'var(--text-secondary)' }}>Enrolled Courses</small>
          <div className="metric-value">{courses.length}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Active this semester</p>
        </div>
        <div className="metric-card glass-panel">
          <small style={{ color: 'var(--text-secondary)' }}>Eligibility Status</small>
          <div className="metric-value">
            {percentData.percentage >= 75 ? (
              <span style={{ color: 'var(--success)' }}>Eligible</span>
            ) : (
              <span style={{ color: 'var(--danger)' }}>Shortage</span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Min threshold: 75% required</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginTop: '30px' }}>
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3>📢 Announcements Board</h3>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {announcements.map((a, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1.1rem' }}>{a.title}</h4>
                  <span className={`badge ${a.priority === 'urgent' ? 'badge-danger' : a.priority === 'high' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>{a.priority}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginTop: '5px', fontSize: '0.9rem' }}>{a.content}</p>
              </div>
            ))}
            {announcements.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No announcements posted.</p>}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3>📌 Quick Links</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <Link to="/courses" style={{ color: 'var(--primary)', textDecoration: 'none' }}>📚 Search and register class courses</Link>
            <Link to="/assignments" style={{ color: 'var(--primary)', textDecoration: 'none' }}>📝 Submit current week assignments</Link>
            <Link to="/notes" style={{ color: 'var(--primary)', textDecoration: 'none' }}>📁 Share notes with classmates</Link>
          </div>
        </div>
      </div>

      {/* 24-Hour Assignment Reminder Banner */}
      <div style={{ marginTop: '25px' }}>
        <AssignmentRemindersWidget token={token} />
      </div>

      {/* AI Risk Assessment Widget */}
      <AIStudentRiskWidget userId={user?.id} token={token} />
    </div>
  );
}

export function FacultyDashboard() {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!token) return;

    fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));

    fetch('/api/announcements', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAnnouncements(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => setAnnouncements([]));
  }, [token]);

  return (
    <div>
      <h1>Hello, Prof. {user.last_name}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Faculty Dashboard - CampusHub Portal</p>

      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <small style={{ color: 'var(--text-secondary)' }}>Assigned Courses</small>
          <div className="metric-value">{courses.length}</div>
        </div>
        <div className="metric-card glass-panel">
          <small style={{ color: 'var(--text-secondary)' }}>Student Inquiries</small>
          <div className="metric-value">Active</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginTop: '30px' }}>
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3>My Classes Overview</h3>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Name</th>
                <th>Credits</th>
                <th>Capacity</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr key={i}>
                  <td>{c.code}</td>
                  <td>{c.name}</td>
                  <td>{c.credits}</td>
                  <td>{c.max_students} students</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3>⚙ Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <Link to="/attendance" style={{ color: 'var(--primary)', textDecoration: 'none' }}>📊 Log attendance register</Link>
            <Link to="/assignments" style={{ color: 'var(--primary)', textDecoration: 'none' }}>📝 Create assignment or grade</Link>
            <Link to="/events" style={{ color: 'var(--primary)', textDecoration: 'none' }}>📢 Share news notice</Link>
          </div>
        </div>
      </div>

      {/* Pending Enrollment Requests Panel for Faculty */}
      <div style={{ marginTop: '30px' }}>
        <PendingEnrollmentsPanel token={token} />
      </div>

      {/* AI Model Benchmarks & Risk Radar Panel */}
      <AIRiskAnalysisPanel token={token} />
    </div>
  );
}

export function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState({ students: 0, faculty: 0, users: 0 });

  useEffect(() => {
    setStats({ students: 12, faculty: 5, users: 18 });
  }, []);

  return (
    <div>
      <h1>System Administration Portal</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Overview of all campus records, databases, and migrations.</p>

      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <small style={{ color: 'var(--text-secondary)' }}>Total Students</small>
          <div className="metric-value">{stats.students}</div>
        </div>
        <div className="metric-card glass-panel">
          <small style={{ color: 'var(--text-secondary)' }}>Total Faculty</small>
          <div className="metric-value">{stats.faculty}</div>
        </div>
        <div className="metric-card glass-panel">
          <small style={{ color: 'var(--text-secondary)' }}>Active Database</small>
          <div className="metric-value" style={{ fontSize: '1.25rem', marginTop: '15px' }}>SQLite (db.sqlite3)</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '30px', marginTop: '30px' }}>
        <h3>Django Admin Controls</h3>
        <p style={{ marginTop: '10px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          DB Schemas, migrations, Django Superusers, and raw model logs should be handled via the Django Administration Console at port 8000.
        </p>
        <a href="http://localhost:8000/admin/" target="_blank" rel="noreferrer" className="glow-button" style={{ display: 'inline-block', marginTop: '20px', textDecoration: 'none' }}>
          Open Django Admin Terminal
        </a>
      </div>

      <div style={{ marginTop: '30px' }}>
        <PendingEnrollmentsPanel token={token} />
      </div>

      {/* AI Model Benchmarks & Risk Radar Panel */}
      <AIRiskAnalysisPanel token={token} />
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'faculty') return <FacultyDashboard />;
  return <StudentDashboard />;
}

export default Dashboard;
