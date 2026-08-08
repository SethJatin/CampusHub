import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

function Notes() {
  const { token, user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);

  // Filtering states
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');

  // Upload fields (Faculty/Admin)
  const [title, setTitle] = useState('');
  const [descr, setDescr] = useState('');
  const [courseId, setCourseId] = useState('');
  const [textNote, setTextNote] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const fetchNotes = () => {
    if (!token || !user) return;
    fetch('/api/notes', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setNotes(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (!token || !user) return;
    fetchNotes();
    const coursesEndpoint = user?.role === 'faculty' ? '/api/courses/my-courses' : '/api/courses/';
    fetch(coursesEndpoint, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, [user, token]);

  const isFacultyOrAdmin = user?.role === 'faculty' || user?.role === 'admin';

  // Unique faculty list for filter dropdown
  const facultyOptions = useMemo(() => {
    const map = new Map();
    notes.forEach(n => {
      if (n.uploaded_by_id) {
        const name = n.uploader_first_name
          ? `Prof. ${n.uploader_first_name || ''} ${n.uploader_last_name || ''}`.trim()
          : (n.uploader_username || `Faculty #${n.uploaded_by_id}`);
        map.set(String(n.uploaded_by_id), { id: String(n.uploaded_by_id), name });
      }
    });
    return Array.from(map.values());
  }, [notes]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!courseId || !title) {
      setError('Subject course and title are required.');
      return;
    }

    if (!textNote && !pdfFile) {
      setError('Please provide text notes or attach a PDF file.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('course_id', courseId);
      formData.append('title', title);
      formData.append('description', descr);
      formData.append('content', textNote);
      if (pdfFile) {
        formData.append('file', pdfFile);
      }

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setTitle('');
        setDescr('');
        setTextNote('');
        setPdfFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setSuccess('Study note uploaded successfully!');
        fetchNotes();
      } else {
        setError(data.error || 'Failed to upload study note');
      }
    } catch (err) {
      console.error(err);
      setError('Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesSubject = !selectedSubject || String(n.course_id) === String(selectedSubject);
    const matchesFaculty = !selectedFaculty || String(n.uploaded_by_id) === String(selectedFaculty);
    return matchesSubject && matchesFaculty;
  });

  return (
    <div>
      <h2>📁 Shared Study Materials</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
        {isFacultyOrAdmin
          ? 'Upload and share study notes, text lectures, and PDF resources with students.'
          : 'Browse, filter and view study notes uploaded by your course faculty.'}
      </p>

      <div style={{ display: isFacultyOrAdmin ? 'grid' : 'block', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Upload Form - Faculty & Admin Only */}
        {isFacultyOrAdmin && (
          <div className="glass-panel" style={{ padding: '25px', height: 'fit-content' }}>
            <h3>📤 Upload Study Note</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              Add lecture notes with text and/or attach a PDF document.
            </p>

            {error && <div style={{ color: 'var(--danger)', padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'var(--success)', padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem' }}>{success}</div>}

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Subject Course</label>
                <select className="glass-input" value={courseId} onChange={e => setCourseId(e.target.value)} required>
                  <option value="">Select subject course</option>
                  {courses.map((c, i) => <option key={i} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Note Title</label>
                <input type="text" className="glass-input" placeholder="e.g. Unit 3 - Machine Learning Basics" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Summary / Description</label>
                <input type="text" className="glass-input" placeholder="Brief overview of topic" value={descr} onChange={e => setDescr(e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Paste Text Notes</label>
                <textarea className="glass-input" placeholder="Paste notes body text here..." value={textNote} onChange={e => setTextNote(e.target.value)} rows="4" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>📄 Attach PDF Document (Optional)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  className="glass-input"
                  onChange={e => setPdfFile(e.target.files[0] || null)}
                />
              </div>

              <button type="submit" className="glow-button" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Notes'}
              </button>
            </form>
          </div>
        )}

        {/* Notes View Panel for Students & Faculty */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Shared Class Resources</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Showing {filteredNotes.length} of {notes.length} notes
            </span>
          </div>

          {/* Filter Bar for Subject and Faculty */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '25px', border: '1px solid var(--border-glass)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🔍 Filter by Subject</label>
              <select className="glass-input" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
                <option value="">All Subjects</option>
                {courses.map((c, i) => <option key={i} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>👨‍🏫 Filter by Faculty</label>
              <select className="glass-input" value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
                <option value="">All Faculty</option>
                {facultyOptions.map((f, i) => <option key={i} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {(selectedSubject || selectedFaculty) && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={() => { setSelectedSubject(''); setSelectedFaculty(''); }}
                  className="glass-panel"
                  style={{ padding: '8px 14px', fontSize: '0.8rem', cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ff6b6b', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px' }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Notes Cards List */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            {filteredNotes.map((n, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <h4>{n.title}</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {n.course_code && <span className="badge badge-info">{n.course_code}</span>}
                    {n.uploader_first_name && (
                      <span className="badge badge-warning">
                        Prof. {n.uploader_first_name} {n.uploader_last_name}
                      </span>
                    )}
                  </div>
                </div>

                {n.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>{n.description}</p>}

                {n.content && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', marginTop: '12px', borderRadius: '8px', fontSize: '0.9rem', whiteSpace: 'pre-wrap', borderLeft: '3px solid var(--primary)' }}>
                    {n.content}
                  </div>
                )}

                {n.file && (
                  <div style={{ marginTop: '14px' }}>
                    <a
                      href={`/media/${n.file}`}
                      target="_blank"
                      rel="noreferrer"
                      className="glow-button"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}
                    >
                      📄 View / Download PDF Note
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '20px', marginTop: '15px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <span>📅 Posted: {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'N/A'}</span>
                  {n.course_name && <span>📚 {n.course_name}</span>}
                </div>
              </div>
            ))}

            {filteredNotes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No study materials found matching selected filters.</p>
                {(selectedSubject || selectedFaculty) && (
                  <button onClick={() => { setSelectedSubject(''); setSelectedFaculty(''); }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Reset search filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notes;
