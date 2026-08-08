import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function ExamsAndPerformance() {
  const { token, user } = useAuth();
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('schedule');

  // Exam creation fields (Faculty/Admin)
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [duration, setDuration] = useState(90);
  const [totalMarks, setTotalMarks] = useState(100);
  const [syllabus, setSyllabus] = useState('');
  const [examPattern, setExamPattern] = useState('');

  // Grade Entry state (Faculty)
  const [gradingExam, setGradingExam] = useState(null);
  const [studentMarkRecords, setStudentMarkRecords] = useState([]);
  const [savingMarks, setSavingMarks] = useState(false);
  const [gradeMsg, setGradeMsg] = useState('');

  // Growth Analytics data
  const [studentGrowth, setStudentGrowth] = useState(null);
  const [facultyAnalytics, setFacultyAnalytics] = useState(null);

  const fetchExams = () => {
    fetch('/api/exams', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setExams(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    if (!token || !user) return;

    fetchExams();
    fetch('/api/courses/', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(Array.isArray(data) ? data : []));

    if (user.role === 'student') {
      fetch(`/api/exams/growth/student/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setStudentGrowth(data));
    } else {
      fetch('/api/exams/growth/faculty-overview', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setFacultyAnalytics(data));
    }
  }, [token, user]);

  const handleScheduleExam = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        course_id: courseId,
        title,
        exam_date: examDate,
        duration_minutes: parseInt(duration),
        total_marks: parseFloat(totalMarks),
        syllabus,
        exam_pattern: examPattern
      })
    });
    if (res.ok) {
      alert('Offline exam schedule & syllabus published successfully!');
      setShowScheduleForm(false);
      setTitle(''); setExamDate(''); setSyllabus(''); setExamPattern('');
      fetchExams();
    }
  };

  const handleOpenGrading = async (exam) => {
    if (exam.lock_status?.is_locked) {
      alert(`⚠️ Marks Entry Locked!\n${exam.lock_status.message}`);
      return;
    }
    setGradingExam(exam);
    setGradeMsg('');
    const res = await fetch(`/api/exams/${exam.id}/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setStudentMarkRecords(data.map(s => ({
        student_id: s.student_id,
        roll_number: s.roll_number || `STU${s.student_id}`,
        name: `${s.first_name} ${s.last_name}`,
        email: s.email,
        marks_obtained: s.marks_obtained !== null && s.marks_obtained !== undefined ? s.marks_obtained : '',
        remarks: s.remarks || 'Evaluated'
      })));
      setActiveTab('grade_marks');
    } else {
      const errData = await res.json();
      alert(`⚠️ ${errData.error || 'Marks entry locked'}`);
    }
  };

  const handleSaveMarks = async () => {
    if (!gradingExam) return;
    setSavingMarks(true);
    setGradeMsg('');

    const recordsToSend = studentMarkRecords.map(r => ({
      student_id: r.student_id,
      marks_obtained: parseFloat(r.marks_obtained || 0),
      remarks: r.remarks
    }));

    const res = await fetch(`/api/exams/${gradingExam.id}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ marks_records: recordsToSend })
    });
    const resData = await res.json();
    if (res.ok) {
      setGradeMsg('✓ All student marks saved and published successfully!');
      fetchExams();
    } else {
      setGradeMsg(`✗ ${resData.error || 'Failed to save student marks'}`);
    }
    setSavingMarks(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0 }}>📝 Offline Examinations, Syllabus & Growth Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>
            {user.role === 'student'
              ? 'View offline examination dates, syllabus, question pattern, and check your evaluated marks.'
              : 'Publish offline exam schedules, syllabus details, enter student marks online, and track class growth analytics.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('schedule')}
            className="glow-button"
            style={{ background: activeTab === 'schedule' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', boxShadow: 'none' }}
          >
            📅 Exam Schedule & Syllabus
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className="glow-button"
            style={{ background: activeTab === 'analytics' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', boxShadow: 'none' }}
          >
            📈 Growth Analytics Graphs
          </button>
        </div>
      </div>

      {/* SCHEDULE & SYLLABUS TAB */}
      {activeTab === 'schedule' && (
        <div>
          {(user.role === 'faculty' || user.role === 'admin') && (
            <div style={{ marginBottom: '25px' }}>
              <button
                onClick={() => setShowScheduleForm(!showScheduleForm)}
                className="glow-button"
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                {showScheduleForm ? 'Cancel' : '➕ Schedule Offline Exam & Publish Syllabus'}
              </button>
            </div>
          )}

          {showScheduleForm && (
            <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px' }}>
              <h3>Schedule New Offline Course Examination</h3>
              <form onSubmit={handleScheduleExam} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Select Subject Course</label>
                  <select className="glass-input" value={courseId} onChange={e => setCourseId(e.target.value)} required>
                    <option value="">Choose Course</option>
                    {courses.map((c, i) => <option key={i} value={c.id}>{c.code} - {c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Exam Title</label>
                  <input type="text" className="glass-input" placeholder="e.g. Mid-Term Examination 2026" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Exam Date & Time</label>
                  <input type="datetime-local" className="glass-input" value={examDate} onChange={e => setExamDate(e.target.value)} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Duration (Mins)</label>
                    <input type="number" className="glass-input" value={duration} onChange={e => setDuration(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Total Marks</label>
                    <input type="number" className="glass-input" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} required />
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Detailed Syllabus Topics</label>
                  <textarea className="glass-input" placeholder="List units, topics, and chapters included in this exam..." value={syllabus} onChange={e => setSyllabus(e.target.value)} rows="3" required />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Exam Pattern Breakdown</label>
                  <textarea className="glass-input" placeholder="e.g. Section A: 20 MCQs (40 marks), Section B: 4 Short Answer (40 marks)..." value={examPattern} onChange={e => setExamPattern(e.target.value)} rows="3" required />
                </div>

                <button type="submit" className="glow-button" style={{ gridColumn: 'span 2' }}>
                  Publish Offline Exam Schedule & Syllabus
                </button>
              </form>
            </div>
          )}

          {/* Exams List Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '25px' }}>
            {exams.map((ex, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge badge-info">{ex.course_code}</span>
                    <span className={`badge ${ex.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      OFFLINE EXAM ({ex.status ? ex.status.toUpperCase() : 'SCHEDULED'})
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{ex.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px' }}>
                    Instructor: {ex.instructor_first_name ? `Prof. ${ex.instructor_first_name} ${ex.instructor_last_name}` : 'Faculty'}
                  </p>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 15px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '15px', border: '1px solid var(--border-glass)' }}>
                    <div>📅 <strong>Date:</strong> {new Date(ex.exam_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(ex.exam_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ marginTop: '4px' }}>⏱️ <strong>Duration:</strong> {ex.duration_minutes} Mins | 💯 <strong>Total:</strong> {ex.total_marks} Marks</div>
                  </div>

                  {ex.syllabus && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>📖 Syllabus:</strong>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginTop: '4px' }}>{ex.syllabus}</p>
                    </div>
                  )}

                  {ex.exam_pattern && (
                    <div style={{ marginBottom: '15px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--warning)' }}>🧩 Exam Pattern:</strong>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginTop: '4px' }}>{ex.exam_pattern}</p>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '15px', marginTop: '10px' }}>
                  {user.role === 'student' ? (
                    <div>
                      {ex.student_marks !== null && ex.student_marks !== undefined ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.9rem' }}>My Score: <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{ex.student_marks} / {ex.total_marks}</strong></span>
                          <span className="badge badge-success">{ex.student_remarks || 'Evaluated'}</span>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--warning)', fontSize: '0.85rem' }}>
                          ⏳ Offline Exam Scheduled (Marks pending faculty evaluation)
                        </div>
                      )}
                    </div>
                  ) : (
                    ex.lock_status?.is_locked ? (
                      <div style={{ textAlign: 'center' }}>
                        <button
                          disabled
                          className="glass-panel"
                          style={{ width: '100%', padding: '10px', fontSize: '0.82rem', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', opacity: 0.85, cursor: 'not-allowed' }}
                        >
                          🔒 Marks Entry Locked (8-Hr Post-Exam Buffer)
                        </button>
                        <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '6px' }}>
                          {ex.lock_status.message}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenGrading(ex)}
                        className="glow-button"
                        style={{ width: '100%', padding: '10px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                      >
                        📝 Enter Student Offline Exam Marks
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
            {exams.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No scheduled offline examinations found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* FACULTY GRADE MARKS TAB */}
      {activeTab === 'grade_marks' && gradingExam && (
        <div className="glass-panel" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <span className="badge badge-info">{gradingExam.course_code}</span>
              <h3 style={{ margin: '5px 0 0 0' }}>Grade Marks: {gradingExam.title}</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Enter evaluated marks out of {gradingExam.total_marks} for enrolled students.</p>
            </div>

            <button onClick={() => setActiveTab('schedule')} className="glow-button" style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'none' }}>
              ← Back to Schedule
            </button>
          </div>

          {gradeMsg && (
            <div style={{ padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', background: gradeMsg.includes('✓') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: gradeMsg.includes('✓') ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
              {gradeMsg}
            </div>
          )}

          <table className="glass-table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Email</th>
                <th>Marks Obtained (out of {gradingExam.total_marks})</th>
                <th>Remarks / Grade Feedback</th>
              </tr>
            </thead>
            <tbody>
              {studentMarkRecords.map((s, idx) => (
                <tr key={idx}>
                  <td><strong>{s.roll_number}</strong></td>
                  <td>{s.name}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.email}</td>
                  <td>
                    <input
                      type="number"
                      step="0.5"
                      max={gradingExam.total_marks}
                      className="glass-input"
                      style={{ width: '130px', padding: '6px 12px' }}
                      value={s.marks_obtained}
                      onChange={e => {
                        const updated = [...studentMarkRecords];
                        updated[idx].marks_obtained = e.target.value;
                        setStudentMarkRecords(updated);
                      }}
                      placeholder="0.0"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ padding: '6px 12px' }}
                      value={s.remarks}
                      onChange={e => {
                        const updated = [...studentMarkRecords];
                        updated[idx].remarks = e.target.value;
                        setStudentMarkRecords(updated);
                      }}
                      placeholder="Feedback remarks"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSaveMarks} className="glow-button" disabled={savingMarks} style={{ padding: '12px 30px' }}>
              {savingMarks ? 'Saving...' : '💾 Save & Publish Student Marks'}
            </button>
          </div>
        </div>
      )}

      {/* GROWTH ANALYTICS TAB WITH SVG GRAPHS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {user.role === 'student' ? (
            /* STUDENT PERSONAL GROWTH ANALYTICS */
            <div>
              <div className="metrics-grid">
                <div className="metric-card glass-panel">
                  <small style={{ color: 'var(--text-secondary)' }}>Overall Academic Average</small>
                  <div className="metric-value" style={{ color: 'var(--success)' }}>{studentGrowth?.overall_average || 0}%</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Across {studentGrowth?.total_exams_taken || 0} evaluated tests</p>
                </div>

                <div className="metric-card glass-panel">
                  <small style={{ color: 'var(--text-secondary)' }}>Highest Personal Score</small>
                  <div className="metric-value" style={{ color: 'var(--primary)' }}>{studentGrowth?.highest_percentage || 0}%</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Personal peak test achievement</p>
                </div>

                <div className="metric-card glass-panel">
                  <small style={{ color: 'var(--text-secondary)' }}>Performance Standing</small>
                  <div className="metric-value">
                    {(studentGrowth?.overall_average || 0) >= 80 ? (
                      <span style={{ color: 'var(--success)' }}>Excellent (A Grade)</span>
                    ) : (
                      <span style={{ color: 'var(--warning)' }}>Steady Progress</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Continuous learning trajectory</p>
                </div>
              </div>

              {/* Student Score Trend SVG Graph */}
              <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
                <h3>📈 Personal Marks Growth Line Trend</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '25px' }}>
                  Track your percentage score progression over past examinations.
                </p>

                {studentGrowth?.trend && studentGrowth.trend.length > 0 ? (
                  <div style={{ overflowX: 'auto', padding: '10px 0' }}>
                    <svg width="100%" height="220" viewBox="0 0 700 220" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '20px' }}>
                      {/* Grid Lines */}
                      {[0, 25, 50, 75, 100].map((val, i) => (
                        <g key={i}>
                          <line x1="50" y1={180 - (val * 1.5)} x2="680" y2={180 - (val * 1.5)} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                          <text x="25" y={184 - (val * 1.5)} fill="#94a3b8" fontSize="10">{val}%</text>
                        </g>
                      ))}

                      {/* Polyline Path */}
                      <polyline
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                        points={studentGrowth.trend.map((t, idx) => {
                          const x = 80 + (idx * (580 / Math.max(1, studentGrowth.trend.length - 1)));
                          const y = 180 - (t.percentage * 1.5);
                          return `${x},${y}`;
                        }).join(' ')}
                      />

                      {/* Data Points */}
                      {studentGrowth.trend.map((t, idx) => {
                        const x = 80 + (idx * (580 / Math.max(1, studentGrowth.trend.length - 1)));
                        const y = 180 - (t.percentage * 1.5);

                        return (
                          <g key={idx}>
                            <circle cx={x} cy={y} r="6" fill="#8b5cf6" stroke="#fff" strokeWidth="2" />
                            <text x={x} y={y - 12} fill="#fff" fontSize="11" textAnchor="middle" fontWeight="bold">{t.percentage}%</text>
                            <text x={x} y="200" fill="#94a3b8" fontSize="10" textAnchor="middle">{t.course_code}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No exam mark trends recorded yet.</p>
                )}
              </div>

              {/* Subject Breakdown Bar Chart SVG */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3>📚 Subject-Wise Score Strength Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                  {studentGrowth?.subject_breakdown?.map((sb, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                      <strong style={{ color: 'var(--primary)' }}>{sb.course_code}</strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 12px 0' }}>{sb.course_name}</div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${sb.average_percentage}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: '5px' }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem' }}>
                        <span>Average:</span>
                        <strong style={{ color: 'var(--success)' }}>{sb.average_percentage}%</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* FACULTY OVERALL SUBJECT & CLASS GROWTH ANALYTICS */
            <div>
              <div className="metrics-grid">
                <div className="metric-card glass-panel">
                  <small style={{ color: 'var(--text-secondary)' }}>Overall Campus Class Average</small>
                  <div className="metric-value" style={{ color: 'var(--primary)' }}>{facultyAnalytics?.overall_average || 0}%</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Across all 5 academic courses</p>
                </div>

                <div className="metric-card glass-panel">
                  <small style={{ color: 'var(--text-secondary)' }}>Assigned Courses</small>
                  <div className="metric-value">{facultyAnalytics?.course_analytics?.length || 0}</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Active faculty classes</p>
                </div>

                <div className="metric-card glass-panel">
                  <small style={{ color: 'var(--text-secondary)' }}>Total Evaluated Students</small>
                  <div className="metric-value" style={{ color: 'var(--success)' }}>75</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>15 students per course</p>
                </div>
              </div>

              {/* Faculty Course Performance SVG Bar Chart */}
              <div className="glass-panel" style={{ padding: '30px' }}>
                <h3>📊 Subject-Wise Class Average & Growth Performance</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '25px' }}>
                  Comparing overall class score averages across courses (CS101 - CS105).
                </p>

                <div style={{ overflowX: 'auto', padding: '10px 0' }}>
                  <svg width="100%" height="240" viewBox="0 0 750 240" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '20px' }}>
                    {[0, 25, 50, 75, 100].map((val, i) => (
                      <g key={i}>
                        <line x1="50" y1={190 - (val * 1.6)} x2="720" y2={190 - (val * 1.6)} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                        <text x="25" y={194 - (val * 1.6)} fill="#94a3b8" fontSize="10">{val}%</text>
                      </g>
                    ))}

                    {facultyAnalytics?.course_analytics?.map((ca, idx) => {
                      const x = 90 + (idx * 130);
                      const barHeight = (ca.class_average * 1.6);
                      const y = 190 - barHeight;

                      return (
                        <g key={idx}>
                          <rect x={x} y={y} width="55" height={barHeight} fill="url(#barGrad)" rx="6" />
                          <text x={x + 27.5} y={y - 8} fill="#fff" fontSize="12" textAnchor="middle" fontWeight="bold">{ca.class_average}%</text>
                          <text x={x + 27.5} y="210" fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">{ca.course_code}</text>
                        </g>
                      );
                    })}

                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Course Breakdown Details Table */}
                <table className="glass-table" style={{ marginTop: '30px' }}>
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Faculty Professor</th>
                      <th>Class Avg Score</th>
                      <th>Highest Score</th>
                      <th>Lowest Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyAnalytics?.course_analytics?.map((ca, i) => (
                      <tr key={i}>
                        <td><strong>{ca.course_code}</strong></td>
                        <td>{ca.course_name}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{ca.instructor_name}</td>
                        <td><strong style={{ color: 'var(--success)' }}>{ca.class_average}%</strong></td>
                        <td><span className="badge badge-success">{ca.highest_score}%</span></td>
                        <td><span className="badge badge-warning">{ca.lowest_score}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ExamsAndPerformance;
