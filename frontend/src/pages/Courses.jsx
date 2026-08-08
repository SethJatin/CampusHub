import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PendingEnrollmentsPanel from '../components/PendingEnrollmentsPanel';

function Courses() {
  const { token, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [descr, setDescr] = useState('');
  const [dept, setDept] = useState('');
  const [sem, setSem] = useState(1);

  const fetchCourses = () => {
    if (!token || !user) return;

    fetch('/api/courses/', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));

    fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setMyCourses(Array.isArray(data) ? data : []))
      .catch(() => setMyCourses([]));

    if (user.role === 'student') {
      fetch('/api/courses/my-enrollment-status', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setMyEnrollments(Array.isArray(data) ? data : []))
        .catch(() => setMyEnrollments([]));
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [token, user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/courses/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ code, name, description: descr, department: dept, semester: parseInt(sem) })
    });
    if (res.ok) {
      setCode(''); setName(''); setDescr(''); setDept('');
      fetchCourses();
    }
  };

  const handleEnroll = async (courseId) => {
    // Optimistically set enrollment status to 'pending'
    setMyEnrollments(prev => [
      ...prev.filter(e => Number(e.course_id) !== Number(courseId)),
      { course_id: Number(courseId), status: 'pending' }
    ]);
    try {
      await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ course_id: Number(courseId) })
      });
      fetchCourses();
    } catch (err) {
      console.error(err);
      fetchCourses();
    }
  };

  return (
    <div>
      <h2>📚 Class Courses Management</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Register course curriculum structure and request class enrollment.</p>

      {(user.role === 'faculty' || user.role === 'admin') && (
        <PendingEnrollmentsPanel token={token} onStatusChange={fetchCourses} />
      )}

      {user.role === 'faculty' && (
        <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px' }}>
          <h3>Add a New Course</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <input type="text" className="glass-input" placeholder="Course Code (e.g. CS101)" value={code} onChange={e => setCode(e.target.value)} required />
            <input type="text" className="glass-input" placeholder="Course Name" value={name} onChange={e => setName(e.target.value)} required />
            <input type="text" className="glass-input" placeholder="Department" value={dept} onChange={e => setDept(e.target.value)} />
            <input type="number" className="glass-input" placeholder="Semester (1-8)" value={sem} onChange={e => setSem(e.target.value)} />
            <textarea className="glass-input" style={{ gridColumn: 'span 2' }} placeholder="Course Description" value={descr} onChange={e => setDescr(e.target.value)} />
            <button type="submit" className="glow-button" style={{ gridColumn: 'span 2' }}>Create Course Record</button>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '30px' }}>
        <h3>Available Active Courses</h3>
        <table className="glass-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Semester</th>
              <th>Action / Status</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, i) => {
              const enr = myEnrollments.find(e => Number(e.course_id) === Number(c.id));
              const isEnrolledInMyCourses = myCourses.some(mc => Number(mc.id) === Number(c.id));
              const status = enr ? enr.status : (isEnrolledInMyCourses ? 'approved' : null);

              return (
                <tr key={i}>
                  <td><strong>{c.code}</strong></td>
                  <td>{c.name}</td>
                  <td>{c.department}</td>
                  <td>Sem {c.semester}</td>
                  <td>
                    {user.role === 'student' ? (
                      status === 'approved' ? (
                        <button
                          disabled
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'not-allowed',
                            opacity: 0.85
                          }}
                        >
                          Enrolled
                        </button>
                      ) : status === 'pending' ? (
                        <button
                          disabled
                          style={{
                            background: 'rgba(234, 179, 8, 0.2)',
                            color: '#facc15',
                            border: '1px solid rgba(234, 179, 8, 0.4)',
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: 'not-allowed',
                            opacity: 0.85
                          }}
                        >
                          Requested
                        </button>
                      ) : status === 'rejected' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-danger">Rejected</span>
                          <button onClick={() => handleEnroll(c.id)} className="glow-button" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Re-apply</button>
                        </div>
                      ) : (
                        <button onClick={() => handleEnroll(c.id)} className="glow-button" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}>Enroll</button>
                      )
                    ) : (
                      <span className="badge badge-info">Instructor Active</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Courses;
