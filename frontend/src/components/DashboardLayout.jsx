import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getProfilePic } from '../context/AuthContext';

function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      <div className="sidebar">
        <h2 style={{ color: '#fff', marginBottom: '40px', fontSize: '1.6rem', cursor: 'pointer' }} onClick={() => navigate('/')}>🎓 CampusHub</h2>

        <div
          onClick={() => navigate('/profile')}
          className="glass-panel"
          style={{ marginBottom: '30px', padding: '12px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
        >
          <img
            src={getProfilePic(user?.profile_image)}
            alt="User Avatar"
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover', background: '#1e293b' }}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <p style={{ fontWeight: '600', fontSize: '0.92rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.first_name} {user?.last_name}</p>
            <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : user?.role === 'faculty' ? 'badge-warning' : 'badge-info'}`} style={{ marginTop: '2px', textTransform: 'capitalize', fontSize: '0.7rem', padding: '2px 8px' }}>
              {user?.role}
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>🌐 Public Home</Link>
          <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>🏠 Dashboard</Link>
          <Link to="/profile" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>👤 My Profile</Link>
          <Link to="/courses" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>📚 Courses</Link>
          <Link to="/attendance" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>📊 Attendance</Link>
          <Link to="/exams" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>📝 Exams & Marks</Link>
          <Link to="/assignments" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>📝 Assignments</Link>
          <Link to="/events" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>📢 Events</Link>
          <Link to="/notes" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>📁 Study Notes</Link>
        </nav>

        <button onClick={handleLogout} className="glass-panel" style={{ width: '100%', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)', color: '#ff6b6b', padding: '12px', borderRadius: '10px', fontWeight: 'bold' }}>🚪 Logout</button>
      </div>
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default DashboardLayout;
