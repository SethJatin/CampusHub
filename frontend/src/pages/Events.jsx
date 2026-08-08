import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function Events() {
  const { token, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('event'); // 'event' or 'announcement'

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('cultural');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venue, setVenue] = useState('');
  const [priority, setPriority] = useState('normal');
  const [posterFile, setPosterFile] = useState(null);

  const fetchEventsAndAnnouncements = () => {
    fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setEvents(Array.isArray(data) ? data : []));

    fetch('/api/announcements', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAnnouncements(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetchEventsAndAnnouncements();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (createType === 'event') {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate || startDate);
      formData.append('venue', venue);
      if (posterFile) {
        formData.append('banner', posterFile);
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        alert('Event published successfully with poster!');
        setShowCreateModal(false);
        setTitle(''); setDescription(''); setStartDate(''); setEndDate(''); setVenue(''); setPosterFile(null);
        fetchEventsAndAnnouncements();
      }
    } else {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title, content: description, priority, start_date: startDate || new Date().toISOString(), end_date: endDate || null
        })
      });
      if (res.ok) {
        alert('Announcement published successfully!');
        setShowCreateModal(false);
        setTitle(''); setDescription(''); setStartDate(''); setEndDate('');
        fetchEventsAndAnnouncements();
      }
    }
  };

  const handleRegister = async (eventId) => {
    const res = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      alert('Registered for event check-in successfully!');
    } else {
      const data = await res.json();
      alert(data.error || 'Registration failed');
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Remove this announcement?')) return;
    const res = await fetch(`/api/announcements/${announcementId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchEventsAndAnnouncements();
    }
  };

  // Filter out announcements for completed events
  const activeAnnouncements = announcements.filter(a => !a.end_date || new Date(a.end_date) >= new Date());

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>📢 Campus Events & Special Announcements</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>
            Discover upcoming exclusive campus celebrations, competitions, and official university notices.
          </p>
        </div>

        {(user?.role === 'faculty' || user?.role === 'admin') && (
          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            className="glow-button"
            style={{ padding: '10px 18px', fontSize: '0.9rem' }}
          >
            {showCreateModal ? 'Cancel' : '➕ Publish Event / Notice'}
          </button>
        )}
      </div>

      {/* Creation Panel for Faculty / Admin */}
      {showCreateModal && (
        <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px' }}>
          <h3>Publish New Campus Entry</h3>
          <div style={{ display: 'flex', gap: '15px', margin: '15px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="radio" value="event" checked={createType === 'event'} onChange={() => setCreateType('event')} />
              <span>Campus Event</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="radio" value="announcement" checked={createType === 'announcement'} onChange={() => setCreateType('announcement')} />
              <span>Official Notice / Announcement</span>
            </label>
          </div>

          <form onSubmit={handleCreateSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input type="text" className="glass-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />

            {createType === 'event' ? (
              <select className="glass-input" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="cultural">Cultural</option>
                <option value="academic">Academic / Tech</option>
                <option value="sports">Sports</option>
                <option value="general">General</option>
              </select>
            ) : (
              <select className="glass-input" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="normal">Priority: Normal</option>
                <option value="high">Priority: High</option>
                <option value="urgent">Priority: Urgent</option>
              </select>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Start Date & Time</label>
              <input type="datetime-local" className="glass-input" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Completion / Expiry End Date</label>
              <input type="datetime-local" className="glass-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>

            {createType === 'event' && (
              <>
                <input type="text" className="glass-input" placeholder="Venue Location (e.g. Main Auditorium)" value={venue} onChange={e => setVenue(e.target.value)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Upload Event Poster Image</label>
                  <input type="file" accept="image/*" className="glass-input" style={{ padding: '8px' }} onChange={e => setPosterFile(e.target.files[0])} />
                </div>
              </>
            )}

            <textarea className="glass-input" style={{ gridColumn: 'span 2', minHeight: '80px' }} placeholder={createType === 'event' ? 'Event Details & Highlights' : 'Announcement Notice Content'} value={description} onChange={e => setDescription(e.target.value)} required />

            <button type="submit" className="glow-button" style={{ gridColumn: 'span 2' }}>
              Submit & Publish {createType === 'event' ? 'Event' : 'Announcement'}
            </button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '30px' }}>
        {/* Events List with Posters */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3>🌟 Upcoming Exclusive Campus Events</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '20px' }}>
            {events.map((e, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                {e.banner && (
                  <div style={{ width: '100%', maxHeight: '240px', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={`/media/${e.banner}`}
                      alt={e.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '50px', background: '#2563eb', color: '#ffffff', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'capitalize', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.5)' }}>
                        {e.category || 'Event'}
                      </span>
                    </div>
                  </div>
                )}
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ fontSize: '1.25rem', margin: 0 }}>{e.title}</h4>
                    {!e.banner && (
                      <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '50px', background: '#2563eb', color: '#ffffff', fontWeight: 'bold', fontSize: '0.78rem', textTransform: 'capitalize', boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)' }}>
                        {e.category || 'Event'}
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{e.description}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '15px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>📅 {new Date(e.start_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>⏰ {new Date(e.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>📍 {e.venue || 'Main Auditorium'}</span>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <small style={{ color: 'var(--primary)' }}>Max Capacity: {e.max_participants || 500} Seats</small>
                    <button onClick={() => handleRegister(e.id)} className="glow-button" style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: '8px' }}>
                      Reserve Ticket / Register
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No scheduled events found.</p>}
          </div>
        </div>

        {/* Announcements List */}
        <div className="glass-panel" style={{ padding: '30px', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>📢 Announcements Log</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Auto-cleaned after event completion
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
            {activeAnnouncements.map((a, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', borderLeft: a.priority === 'urgent' ? '4px solid #ef4444' : a.priority === 'high' ? '4px solid #f59e0b' : '4px solid #3b82f6', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className={`badge ${a.priority === 'urgent' ? 'badge-danger' : a.priority === 'high' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.7rem' }}>
                    {a.priority ? a.priority.toUpperCase() : 'NOTICE'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Today'}</small>
                    {(user?.role === 'faculty' || user?.role === 'admin') && (
                      <button
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.75rem' }}
                        title="Dismiss announcement"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>{a.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>{a.content}</p>
                {a.end_date && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--warning)' }}>
                    ⏳ Active until event end: {new Date(a.end_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
            {activeAnnouncements.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No active announcements posted.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Events;
