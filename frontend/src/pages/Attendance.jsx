import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function Attendance() {
  const { token, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLiveClass, setIsLiveClass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Student specific parameters
  const [studentPercentage, setStudentPercentage] = useState(null);
  const [subjectWise, setSubjectWise] = useState([]);
  const [expandedCourse, setExpandedCourse] = useState(null);

  useEffect(() => {
    if (!user || !token) return;

    if (user.role === 'faculty' || user.role === 'admin') {
      fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          const list = Array.isArray(data) ? data : [];
          setCourses(list);
          if (list.length > 0) {
            setSelectedCourse(list[0]);
            handleFetchEnrolled(list[0].id, attendanceDate);
          }
        });
    } else if (user.role === 'student') {
      // Overall percentage
      fetch(`/api/attendance/percentage/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setStudentPercentage(data));

      // Subject wise breakdown
      fetch(`/api/attendance/subject-wise/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setSubjectWise(Array.isArray(data) ? data : []));
    }
  }, [token, user]);

  const handleFetchEnrolled = async (courseId, targetDate) => {
    setErrorMsg('');
    setSuccessMsg('');
    const dt = targetDate || attendanceDate;
    try {
      const res = await fetch(`/api/attendance/enrolled/${courseId}?date=${dt}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttendanceRecords(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setIsLiveClass(false);
    handleFetchEnrolled(course.id, attendanceDate);
  };

  const handleStartLiveClass = () => {
    if (!selectedCourse) return;
    const today = new Date().toISOString().split('T')[0];
    setAttendanceDate(today);
    setIsLiveClass(true);
    setErrorMsg('');
    setSuccessMsg(`Live session started for ${selectedCourse.code} (${selectedCourse.name}). Real-time attendance active.`);
    handleFetchEnrolled(selectedCourse.id, today);
  };

  const handleMarkAttendance = async (studentId, statusValue) => {
    if (!selectedCourse) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/attendance/mark/${selectedCourse.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          date: attendanceDate,
          attendance_records: [{ student_id: studentId, status: statusValue }]
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Attendance marked as ${statusValue.toUpperCase()}`);
        handleFetchEnrolled(selectedCourse.id, attendanceDate);
      } else {
        setErrorMsg(data.error || 'Failed to update attendance');
      }
    } catch (err) {
      setErrorMsg('Network error while marking attendance.');
    }
  };

  const handleMarkAllPresent = async () => {
    if (!selectedCourse || attendanceRecords.length === 0) return;
    setErrorMsg('');
    setSuccessMsg('');

    const recordsToMark = attendanceRecords.map(r => ({ student_id: r.student_id, status: 'present' }));
    try {
      const res = await fetch(`/api/attendance/mark/${selectedCourse.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          date: attendanceDate,
          attendance_records: recordsToMark
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`All ${recordsToMark.length} students marked PRESENT!`);
        handleFetchEnrolled(selectedCourse.id, attendanceDate);
      } else {
        setErrorMsg(data.error || 'Failed to mark attendance');
      }
    } catch (err) {
      setErrorMsg('Network error while marking attendance.');
    }
  };

  return (
    <div>
      <h2>📊 Class Attendance Registry</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
        {user.role === 'faculty' || user.role === 'admin'
          ? 'Conduct real-time live classes, register student presence, and manage 60-minute edit time windows.'
          : 'Track overall academic attendance metrics and review subject-wise class performance.'}
      </p>

      {user.role === 'faculty' || user.role === 'admin' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '30px' }}>
          {/* Sidebar Class Selection */}
          <div className="glass-panel" style={{ padding: '20px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>My Assigned Classes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {courses.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectCourse(c)}
                  className="glow-button"
                  style={{
                    background: selectedCourse?.id === c.id ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                    boxShadow: selectedCourse?.id === c.id ? '0 0 15px rgba(59,130,246,0.5)' : 'none',
                    textAlign: 'left',
                    padding: '12px 15px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <strong style={{ fontSize: '0.95rem' }}>{c.code}</strong>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{c.name}</span>
                </button>
              ))}
              {courses.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No assigned classes found.</p>}
            </div>
          </div>

          {/* Main Attendance Registry Area */}
          <div className="glass-panel" style={{ padding: '30px' }}>
            {selectedCourse ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{selectedCourse.code} - {selectedCourse.name}</h3>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Schedule: {selectedCourse.schedule || 'TBA'} | Room: {selectedCourse.room || 'Main Hall'}
                    </p>
                  </div>

                  <button
                    onClick={handleStartLiveClass}
                    className="glow-button"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      boxShadow: '0 0 20px rgba(239,68,68,0.5)',
                      padding: '10px 20px',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    🔴 Take Live Class
                  </button>
                </div>

                {isLiveClass && (
                  <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                      REAL-TIME CLASS SESSION IN PROGRESS
                    </span>
                    <button onClick={handleMarkAllPresent} className="glow-button" style={{ padding: '6px 14px', fontSize: '0.8rem', background: 'var(--success)' }}>
                      Mark All Present
                    </button>
                  </div>
                )}

                {/* Filter and Edit Limit Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem' }}>Session Date:</label>
                    <input
                      type="date"
                      className="glass-input"
                      style={{ width: '170px', padding: '6px 10px', fontSize: '0.85rem' }}
                      value={attendanceDate}
                      onChange={e => {
                        setAttendanceDate(e.target.value);
                        handleFetchEnrolled(selectedCourse.id, e.target.value);
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--warning)', background: 'rgba(245,158,11,0.1)', padding: '6px 12px', borderRadius: '6px' }}>
                    ⏳ Edit Limit: Faculty can edit attendance within 60 minutes of marking
                  </span>
                </div>

                {errorMsg && <div style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '10px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>{errorMsg}</div>}
                {successMsg && <div style={{ color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '10px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>{successMsg}</div>}

                {/* Enrolled Students Attendance List */}
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>Attendance Status</th>
                      <th>Action Buttons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((r, i) => {
                      const isLocked = r.marked_at && (Date.now() - new Date(r.marked_at).getTime() > 60 * 60 * 1000);

                      return (
                        <tr key={i}>
                          <td><strong>{r.roll_number || `STU${r.student_id}`}</strong></td>
                          <td>{r.first_name} {r.last_name}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.email}</td>
                          <td>
                            {r.status ? (
                              <span className={`badge ${r.status === 'present' ? 'badge-success' : r.status === 'absent' ? 'badge-danger' : 'badge-warning'}`}>
                                {r.status.toUpperCase()}
                              </span>
                            ) : (
                              <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>Pending</span>
                            )}
                          </td>
                          <td>
                            {isLocked ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🔒 Locked (60m Expired)</span>
                            ) : (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => handleMarkAttendance(r.student_id, 'present')}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    background: r.status === 'present' ? '#10b981' : 'rgba(16,185,129,0.2)',
                                    color: '#fff'
                                  }}
                                >
                                  Present
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(r.student_id, 'absent')}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    background: r.status === 'absent' ? '#ef4444' : 'rgba(239,68,68,0.2)',
                                    color: '#fff'
                                  }}
                                >
                                  Absent
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(r.student_id, 'late')}
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    background: r.status === 'late' ? '#f59e0b' : 'rgba(245,158,11,0.2)',
                                    color: '#fff'
                                  }}
                                >
                                  Late
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {attendanceRecords.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>
                          No enrolled students found for this class.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>Please select an assigned class from the left sidebar.</p>
            )}
          </div>
        </div>
      ) : (
        /* STUDENT ATTENDANCE DASHBOARD */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Overall Attendance Summary Cards */}
          <div className="metrics-grid">
            <div className="metric-card glass-panel">
              <small style={{ color: 'var(--text-secondary)' }}>Overall Attendance Rate</small>
              <div className="metric-value" style={{ color: (studentPercentage?.percentage || 0) >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                {studentPercentage?.percentage || 0}%
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Attended {studentPercentage?.classes_attended || 0} of {studentPercentage?.total_classes || 0} total sessions
              </p>
            </div>

            <div className="metric-card glass-panel">
              <small style={{ color: 'var(--text-secondary)' }}>Enrolled Subjects</small>
              <div className="metric-value">{subjectWise.length}</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Active academic courses</p>
            </div>

            <div className="metric-card glass-panel">
              <small style={{ color: 'var(--text-secondary)' }}>Exam Eligibility Status</small>
              <div className="metric-value">
                {(studentPercentage?.percentage || 0) >= 75 ? (
                  <span style={{ color: 'var(--success)' }}>Eligible</span>
                ) : (
                  <span style={{ color: 'var(--danger)' }}>Shortage</span>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Minimum 75% requirement</p>
            </div>
          </div>

          {/* Subject-Wise Attendance Breakdown Table */}
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h3>📚 Subject-Wise Attendance Breakdown</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Review your course presence records and 5-day session history per subject.
            </p>

            <table className="glass-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Faculty Instructor</th>
                  <th>Attended / Total</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Session History</th>
                </tr>
              </thead>
              <tbody>
                {subjectWise.map((sw, i) => {
                  const isEligible = sw.percentage >= 75;
                  const isExpanded = expandedCourse === sw.course_id;

                  return (
                    <React.Fragment key={i}>
                      <tr>
                        <td><strong>{sw.course_code}</strong></td>
                        <td>{sw.course_name}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{sw.instructor_name}</td>
                        <td>{sw.classes_attended} / {sw.total_classes}</td>
                        <td>
                          <strong style={{ color: isEligible ? 'var(--success)' : 'var(--danger)' }}>
                            {sw.percentage}%
                          </strong>
                        </td>
                        <td>
                          <span className={`badge ${isEligible ? 'badge-success' : 'badge-danger'}`}>
                            {isEligible ? 'Eligible' : 'Shortage'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => setExpandedCourse(isExpanded ? null : sw.course_id)}
                            className="glow-button"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', boxShadow: 'none' }}
                          >
                            {isExpanded ? 'Hide Logs ▲' : 'View 5-Day Logs ▼'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable 5-Day Attendance Log Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="7" style={{ padding: '15px 25px', background: 'rgba(0,0,0,0.2)' }}>
                            <h5 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>📅 5-Day Class Session Logs for {sw.course_code}</h5>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                              {sw.logs.map((log, lIdx) => (
                                <div key={lIdx} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </div>
                                  <div style={{ marginTop: '5px' }}>
                                    <span className={`badge ${log.status === 'present' ? 'badge-success' : log.status === 'absent' ? 'badge-danger' : 'badge-warning'}`}>
                                      {log.status.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {sw.logs.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No session logs recorded.</p>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {subjectWise.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>
                      No enrolled subject attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;
