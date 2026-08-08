import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AssignmentRemindersWidget from '../components/AssignmentRemindersWidget';

function Assignments() {
  const { token, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [facultySubmissions, setFacultySubmissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedAssignForGrade, setSelectedAssignForGrade] = useState('');

  // Homework creation fields (Faculty)
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [descr, setDescr] = useState('');
  const [due, setDue] = useState('');
  const [marks, setMarks] = useState(100);

  // Homework submission fields (Student)
  const [submittingAssign, setSubmittingAssign] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submittingLoader, setSubmittingLoader] = useState(false);
  const [subMsg, setSubMsg] = useState('');

  // Faculty grading state
  const [gradingState, setGradingState] = useState({});

  const fetchAssignments = () => {
    if (!token || !user) return;

    fetch('/api/assignments', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAssignments(Array.isArray(data) ? data : []))
      .catch(() => setAssignments([]));

    fetch('/api/submissions', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        if (user?.role === 'student') setMySubmissions(list);
        else setFacultySubmissions(list);
      })
      .catch(() => {
        setMySubmissions([]);
        setFacultySubmissions([]);
      });
  };

  useEffect(() => {
    if (!token || !user) return;
    fetchAssignments();
    if (user.role === 'faculty') {
      fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setCourses(Array.isArray(data) ? data : []))
        .catch(() => setCourses([]));
    }
  }, [token, user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ course_id: courseId, title, description: descr, due_date: due, total_marks: parseInt(marks) })
    });
    if (res.ok) {
      setTitle(''); setDescr(''); setDue('');
      fetchAssignments();
    }
  };

  const handleOpenSubmitModal = (assign) => {
    setSubmittingAssign(assign);
    setSubmissionText('');
    setSubmissionFile(null);
    setSubMsg('');
  };

  const handleStudentUpload = async (e) => {
    e.preventDefault();
    if (!submittingAssign) return;
    setSubmittingLoader(true);
    setSubMsg('');

    const formData = new FormData();
    formData.append('content', submissionText);
    if (submissionFile) {
      formData.append('submission', submissionFile);
    }

    try {
      const res = await fetch(`/api/assignments/${submittingAssign.id}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: `Server error (${res.status} ${res.statusText})` };
      }
      if (res.ok) {
        setSubMsg('✓ Completed assignment uploaded successfully!');
        setTimeout(() => {
          setSubmittingAssign(null);
          fetchAssignments();
        }, 1500);
      } else {
        setSubMsg(`✗ ${data.error || 'Failed to upload submission'}`);
      }
    } catch (err) {
      setSubMsg('✗ Network error during file upload');
    } finally {
      setSubmittingLoader(false);
    }
  };

  const handleGradeChange = (subId, field, val) => {
    setGradingState(prev => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [field]: val
      }
    }));
  };

  const handleSaveGrade = async (sub) => {
    const state = gradingState[sub.id] || {};
    const marksObtained = state.marks_obtained !== undefined ? state.marks_obtained : sub.marks_obtained || 0;
    const grade = state.grade !== undefined ? state.grade : sub.grade || 'A';
    const feedback = state.feedback !== undefined ? state.feedback : sub.feedback || '';

    try {
      const res = await fetch(`/api/submissions/${sub.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          marks_obtained: parseFloat(marksObtained),
          grade,
          feedback
        })
      });
      if (res.ok) {
        alert('Points awarded and remarks saved successfully!');
        fetchAssignments();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Failed to grade submission'}`);
      }
    } catch (err) {
      alert('Error updating submission evaluation');
    }
  };

  // Filter faculty submissions by selected assignment if specified
  const filteredFacultySubmissions = selectedAssignForGrade
    ? facultySubmissions.filter(s => String(s.assignment_id) === String(selectedAssignForGrade))
    : facultySubmissions;

  return (
    <div>
      <h2>📝 Course Assignments & Evaluation</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>
        Manage homework tasks, upload completed student assignments, award evaluation points, and provide faculty feedback.
      </p>

      {/* Student 24h Reminder */}
      {user.role === 'student' && <AssignmentRemindersWidget token={token} />}

      {/* Faculty Post Homework Form */}
      {user.role === 'faculty' && (
        <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px' }}>
          <h3>Post New Homework Assignment</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <select className="glass-input" value={courseId} onChange={e => setCourseId(e.target.value)} required>
              <option value="">Choose Course</option>
              {courses.map((c, i) => <option key={i} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
            <input type="text" className="glass-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
            <input type="datetime-local" className="glass-input" value={due} onChange={e => setDue(e.target.value)} required />
            <input type="number" className="glass-input" placeholder="Total Marks" value={marks} onChange={e => setMarks(e.target.value)} />
            <textarea className="glass-input" style={{ gridColumn: 'span 2' }} placeholder="Task Description & Submission Guidelines" value={descr} onChange={e => setDescr(e.target.value)} />
            <button type="submit" className="glow-button" style={{ gridColumn: 'span 2' }}>Publish Assignment</button>
          </form>
        </div>
      )}

      {/* Student Upload Completed Assignment Modal */}
      {submittingAssign && (
        <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>📤 Upload Completed Assignment: {submittingAssign.title}</h3>
            <button onClick={() => setSubmittingAssign(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '15px' }}>
            Due Date: <strong>{new Date(submittingAssign.due_date).toLocaleString()}</strong> | Max Marks: <strong>{submittingAssign.total_marks} pts</strong>
          </p>

          {subMsg && <div style={{ marginBottom: '15px', color: subMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>{subMsg}</div>}

          <form onSubmit={handleStudentUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Select Completed File Attachment (PDF, Document, Code Zip)</label>
              <input type="file" className="glass-input" onChange={e => setSubmissionFile(e.target.files[0])} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Solution Text / Code Repository Link / Notes</label>
              <textarea className="glass-input" rows="4" placeholder="Type solution notes or paste submission repository URL here..." value={submissionText} onChange={e => setSubmissionText(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={submittingLoader} className="glow-button">
                {submittingLoader ? 'Uploading...' : 'Confirm & Submit Completed Assignment'}
              </button>
              <button type="button" onClick={() => setSubmittingAssign(null)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Published Assignments List */}
      <div className="glass-panel" style={{ padding: '30px', marginBottom: '35px' }}>
        <h3>Published Assignments (Active Before Submission Date)</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          * Assignments are automatically removed from this table once their submission deadline has passed.
        </p>

        <table className="glass-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Assignment Title</th>
              <th>Task description</th>
              <th>Submission Deadline</th>
              <th>Max Points</th>
              <th>Status / Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, i) => {
              const mySub = mySubmissions.find(s => Number(s.assignment_id) === Number(a.id));
              return (
                <tr key={i}>
                  <td><strong style={{ color: 'var(--primary)' }}>{a.course_code}</strong></td>
                  <td><strong>{a.title}</strong></td>
                  <td>{a.description || 'N/A'}</td>
                  <td style={{ color: new Date(a.due_date) - new Date() < 86400000 ? '#f87171' : 'inherit' }}>
                    {new Date(a.due_date).toLocaleString()}
                  </td>
                  <td>{a.total_marks} pts</td>
                  <td>
                    {user.role === 'student' ? (
                      mySub ? (
                        <span className={`badge ${mySub.status === 'graded' ? 'badge-success' : 'badge-warning'}`}>
                          {mySub.status === 'graded' ? '✅ Graded' : '⏳ Submitted'}
                        </span>
                      ) : (
                        <button onClick={() => handleOpenSubmitModal(a)} className="glow-button" style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px' }}>
                          Upload Solution
                        </button>
                      )
                    ) : (
                      <span className="badge badge-info">Instructor Active</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {assignments.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '25px' }}>
                  No active assignments currently pending. All past assignments have completed or reached deadline.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Student View Evaluated Marks & Remarks */}
      {user.role === 'student' && (
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3>My Completed Submissions, Awarded Points & Faculty Remarks</h3>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Assignment Title</th>
                <th>Submitted Date</th>
                <th>Submission Content</th>
                <th>Awarded Points</th>
                <th>Grade</th>
                <th>Faculty Remarks</th>
              </tr>
            </thead>
            <tbody>
              {mySubmissions.map((s, i) => (
                <tr key={i}>
                  <td><strong>{s.assignment_title || `Assignment #${s.assignment_id}`}</strong></td>
                  <td>{new Date(s.submitted_at).toLocaleString()}</td>
                  <td>
                    {s.attachment ? (
                      <a href={`/media/${s.attachment}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>📎 View Attachment</a>
                    ) : s.content ? (
                      <span style={{ fontSize: '0.85rem' }}>{s.content}</span>
                    ) : 'Submitted'}
                  </td>
                  <td>
                    {s.status === 'graded' ? (
                      <strong style={{ color: 'var(--success)', fontSize: '1.05rem' }}>{s.marks_obtained} / {s.total_marks} pts</strong>
                    ) : (
                      <span style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>Pending Review</span>
                    )}
                  </td>
                  <td>
                    {s.status === 'graded' ? (
                      <span className="badge badge-success">{s.grade || 'A'}</span>
                    ) : (
                      <span className="badge badge-secondary">-</span>
                    )}
                  </td>
                  <td>
                    {s.status === 'graded' ? (
                      <span style={{ fontStyle: 'italic', color: '#e2e8f0' }}>"{s.feedback || 'Evaluated'}"</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Faculty review pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {mySubmissions.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '25px' }}>
                    No completed homework submissions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Faculty Review & Grade Student Submissions */}
      {(user.role === 'faculty' || user.role === 'admin') && (
        <div className="glass-panel" style={{ padding: '30px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h3 style={{ margin: 0 }}>Review Student Submissions, Award Points & Provide Remarks</h3>
            <select
              className="glass-input"
              style={{ width: 'auto', minWidth: '220px' }}
              value={selectedAssignForGrade}
              onChange={e => setSelectedAssignForGrade(e.target.value)}
            >
              <option value="">Filter by Assignment (All)</option>
              {assignments.map((a, i) => (
                <option key={i} value={a.id}>[{a.course_code}] {a.title}</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="glass-table" style={{ width: '100%', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>Student Details</th>
                  <th>Assignment</th>
                  <th>Submitted File / Work</th>
                  <th>Submitted Date</th>
                  <th>Award Points</th>
                  <th>Grade</th>
                  <th>Faculty Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFacultySubmissions.map((s, i) => {
                  const currentVal = gradingState[s.id] || {};
                  const marksVal = currentVal.marks_obtained !== undefined ? currentVal.marks_obtained : (s.marks_obtained !== null ? s.marks_obtained : '');
                  const gradeVal = currentVal.grade !== undefined ? currentVal.grade : s.grade || 'A';
                  const feedbackVal = currentVal.feedback !== undefined ? currentVal.feedback : s.feedback || '';

                  return (
                    <tr key={i}>
                      <td>
                        <strong>{s.first_name} {s.last_name}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Roll: {s.roll_number || 'N/A'}</div>
                      </td>
                      <td><strong>{s.assignment_title}</strong> ({s.total_marks} pts max)</td>
                      <td>
                        {s.attachment ? (
                          <a href={`/media/${s.attachment}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                            📄 Download Work
                          </a>
                        ) : null}
                        {s.content && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.content}</div>}
                      </td>
                      <td>{new Date(s.submitted_at).toLocaleString()}</td>
                      <td>
                        <input
                          type="number"
                          className="glass-input"
                          style={{ width: '80px', padding: '4px 8px' }}
                          placeholder="Points"
                          value={marksVal}
                          onChange={e => handleGradeChange(s.id, 'marks_obtained', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="glass-input"
                          style={{ width: '70px', padding: '4px' }}
                          value={gradeVal}
                          onChange={e => handleGradeChange(s.id, 'grade', e.target.value)}
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="F">F</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="glass-input"
                          style={{ width: '180px', padding: '4px 8px' }}
                          placeholder="Faculty remarks..."
                          value={feedbackVal}
                          onChange={e => handleGradeChange(s.id, 'feedback', e.target.value)}
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => handleSaveGrade(s)}
                          className="glow-button"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '6px', background: s.status === 'graded' ? 'rgba(16, 185, 129, 0.2)' : 'var(--primary)' }}
                        >
                          {s.status === 'graded' ? 'Update Grade' : 'Award Points'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredFacultySubmissions.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '25px' }}>
                      No student submissions available for evaluation.
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

export default Assignments;
