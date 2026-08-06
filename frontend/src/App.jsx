import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';

// ==========================================
// AUTHENTICATION CONTENT & STATE
// ==========================================
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUser();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/accounts/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (e) {
      console.error(e);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected Route Guard
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading application...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

// ==========================================
// VIEWS & SCREENS
// ==========================================

// 1. LOGIN SCREEN
function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetch('/accounts/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.access, data.user);
        navigate('/dashboard');
      } else if (res.status === 403 && data.unverified) {
        // Redirection to verification
        setMessage(data.error);
        setTimeout(() => navigate('/verify', { state: { email } }), 2000);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection refused. Is backend running?');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>🎓 CampusHub</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px' }}>Sign in to continue</p>

        {error && <div style={{ color: 'var(--danger)', padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</div>}
        {message && <div style={{ color: 'var(--warning)', padding: '10px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Email Address</label>
            <input type="email" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@college.edu" required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Password</label>
            <input type="password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="glow-button" style={{ width: '100%', marginTop: '10px' }}>Sign In</button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '0.9rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Don't have an account?</p>
          <div style={{ marginTop: '10px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. REGISTER SCREEN
function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [department, setDepartment] = useState('');

  // student profile spec
  const [rollNumber, setRollNumber] = useState('');
  // faculty profile spec
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = {
        email,
        username,
        password,
        password_confirm: password,
        first_name: firstName,
        last_name: lastName,
        role,
      };

      const res = await fetch('/accounts/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok) {
        setMessage('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        const backendMessage = data?.error || data?.detail || data?.message || 'Registration failed';
        setError(backendMessage);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Connection failed. Check that the backend is running on port 8000.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel" style={{ maxWidth: '640px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>🎓 Register</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px' }}>Create your CampusHub Account</p>

        {error && <div style={{ color: 'var(--danger)', padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}
        {message && <div style={{ color: 'var(--success)', padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', marginBottom: '20px' }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Account Role</label>
              <select className="glass-input" value={role} onChange={e => setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Username</label>
              <input type="text" className="glass-input" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Email Address</label>
              <input type="email" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Password</label>
              <input type="password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>First Name</label>
              <input type="text" className="glass-input" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Last Name</label>
              <input type="text" className="glass-input" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '15px' }}>Academic details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Department</label>
                <input type="text" className="glass-input" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science" />
              </div>
              {role === 'student' ? (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Roll Number</label>
                  <input type="text" className="glass-input" value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="e.g. STU10291" required />
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Employee ID</label>
                    <input type="text" className="glass-input" value={employeeId} onChange={e => setEmployeeId(e.target.value)} required />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Designation</label>
                    <input type="text" className="glass-input" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Professor, Assistant Professor" />
                  </div>
                </>
              )}
            </div>
          </div>

          <button type="submit" className="glow-button" style={{ width: '100%' }}>Register Account</button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Back to login</Link>
        </div>
      </div>
    </div>
  );
}

// 3. OTP VERIFICATION
function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (location.state && location.state.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/accounts/api/verify-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        // Automatically Log In user
        setTimeout(() => {
          login(data.access, data.user);
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection failed.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel">
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>✉ Email Verification</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px' }}>Enter the 6-digit OTP sent to your mailbox.</p>

        {error && <div style={{ color: 'var(--danger)', padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '20px' }}>{error}</div>}
        {success && <div style={{ color: 'var(--success)', padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', marginBottom: '20px' }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Verification Email</label>
            <input type="email" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>6-Digit OTP</label>
            <input type="text" className="glass-input" value={code} onChange={e => setCode(e.target.value)} placeholder="000000" maxLength="6" style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }} required />
          </div>
          <button type="submit" className="glow-button" style={{ width: '100%' }}>Verify & Login</button>
        </form>
      </div>
    </div>
  );
}

// 4. MAIN LAYOUT
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
        <h2 style={{ color: '#fff', marginBottom: '40px', fontSize: '1.6rem' }}>🎓 CampusHub</h2>

        <div style={{ marginBottom: '30px', padding: '15px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)' }}>
          <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user?.first_name} {user?.last_name}</p>
          <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : user?.role === 'faculty' ? 'badge-warning' : 'badge-info'}`} style={{ marginTop: '5px', textTransform: 'capitalize' }}>
            {user?.role}
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>🏠 Dashboard</Link>
          <Link to="/courses" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>📚 Courses</Link>
          <Link to="/attendance" style={{ color: '#fff', textDecoration: 'none', padding: '12px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}>📊 Attendance</Link>
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

// 5. DASHBOARD INDEX
function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'faculty') return <FacultyDashboard />;
  return <StudentDashboard />;
}

// 5a. STUDENT DASHBOARD
function StudentDashboard() {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [percentData, setPercentData] = useState({ percentage: 0, total_classes: 0, classes_attended: 0 });
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(data));

    fetch(`/api/attendance/percentage/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPercentData(data));

    fetch('/api/announcements', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAnnouncements(data.slice(0, 4)));
  }, []);

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
    </div>
  );
}

// 5b. FACULTY DASHBOARD
function FacultyDashboard() {
  const { user, token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(data));

    fetch('/api/announcements', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAnnouncements(data.slice(0, 4)));
  }, []);

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
    </div>
  );
}

// 5c. ADMIN DASHBOARD
function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState({ students: 0, faculty: 0, users: 0 });

  useEffect(() => {
    // Admin dashboard fetch logic
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
    </div>
  );
}

// 6. COURSES VIEW
function Courses() {
  const { token, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [descr, setDescr] = useState('');
  const [dept, setDept] = useState('');
  const [sem, setSem] = useState(1);

  const fetchCourses = () => {
    fetch('/api/courses/', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(data));

    fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setMyCourses(data));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

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
    const res = await fetch('/api/courses/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ course_id: courseId })
    });
    if (res.ok) {
      alert('Enrollment requested details!');
      fetchCourses();
    }
  };

  return (
    <div>
      <h2>📚 Class Courses Management</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Register course curriculum structure and request class enrollment.</p>

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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, i) => {
              const enrolled = myCourses.some(mc => mc.id === c.id);
              return (
                <tr key={i}>
                  <td>{c.code}</td>
                  <td>{c.name}</td>
                  <td>{c.department}</td>
                  <td>Sem {c.semester}</td>
                  <td>
                    {user.role === 'student' ? (
                      enrolled ? <span className="badge badge-success">Enrolled</span> :
                        <button onClick={() => handleEnroll(c.id)} className="glow-button" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}>Enroll</button>
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

// 7. ATTENDANCE VIEW
function Attendance() {
  const { token, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Student specific parameters
  const [studentPercentage, setStudentPercentage] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);

  useEffect(() => {
    if (user.role === 'faculty') {
      fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setCourses(data));
    } else if (user.role === 'student') {
      fetch(`/api/attendance/percentage/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setStudentPercentage(data));

      fetch(`/api/attendance/student/${user.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setStudentHistory(data));
    }
  }, []);

  const handleFetchStudents = async (courseId) => {
    setSelectedCourse(courseId);
    // Fetch class students
    const res = await fetch(`/api/attendance/class/${courseId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setAttendanceRecords(data);
    }
  };

  const handleMarkAttendance = async (studentId, statusValue) => {
    await fetch(`/api/attendance/mark/${selectedCourse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        date: attendanceDate,
        attendance_records: [{ student_id: studentId, status: statusValue }]
      })
    });
    handleFetchStudents(selectedCourse);
  };

  return (
    <div>
      <h2>📊 Class Attendance Registry</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Mark, audit and evaluate class session presence reports.</p>

      {user.role === 'faculty' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '30px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3>My Classes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {courses.map((c, i) => (
                <button key={i} onClick={() => handleFetchStudents(c.id)} className="glow-button" style={{ background: selectedCourse === c.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)', boxShadow: 'none' }}>
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '30px' }}>
            <h3>Registry Log</h3>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '10px', marginBottom: '20px' }}>
              <label>Select Date</label>
              <input type="date" className="glass-input" style={{ width: '200px' }} value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
            </div>

            {selectedCourse ? (
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((r, i) => (
                    <tr key={i}>
                      <td>{r.first_name} {r.last_name}</td>
                      <td>{r.email}</td>
                      <td>
                        <span className={`badge ${r.status === 'present' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span>
                      </td>
                      <td>
                        <button onClick={() => handleMarkAttendance(r.student_id, 'present')} className="glow-button" style={{ padding: '5px 10px', fontSize: '0.8rem', marginRight: '10px', background: 'var(--success)', boxShadow: 'none' }}>Present</button>
                        <button onClick={() => handleMarkAttendance(r.student_id, 'absent')} className="glow-button" style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--danger)', boxShadow: 'none' }}>Absent</button>
                      </td>
                    </tr>
                  ))}
                  {attendanceRecords.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No attending student records fetched. Click class to load.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : <p style={{ color: 'var(--text-secondary)' }}>Please choose an assigned class to load register log.</p>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3>Summary Stat</h3>
            {studentPercentage && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--success)' }}>{studentPercentage.percentage}%</div>
                <p>Overall Attendance Rate</p>
                <div style={{ marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <p>Attended: {studentPercentage.classes_attended}</p>
                  <p>Total Classes: {studentPercentage.total_classes}</p>
                </div>
              </div>
            )}
          </div>
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h3>Attendance Log History</h3>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Course Code</th>
                  <th>Course Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {studentHistory.map((h, i) => (
                  <tr key={i}>
                    <td>{new Date(h.date).toLocaleDateString()}</td>
                    <td>{h.course_code}</td>
                    <td>{h.course_name}</td>
                    <td>
                      <span className={`badge ${h.status === 'present' ? 'badge-success' : 'badge-danger'}`}>{h.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 8. ASSIGNMENTS VIEW
function Assignments() {
  const { token, user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);

  // Create fields
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [descr, setDescr] = useState('');
  const [due, setDue] = useState('');
  const [marks, setMarks] = useState(100);

  const fetchAssignments = () => {
    fetch('/api/assignments', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAssignments(data));
  };

  useEffect(() => {
    fetchAssignments();
    if (user.role === 'faculty') {
      fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setCourses(data));
    }
  }, []);

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

  const handleSubmitAssign = async (assignId) => {
    const content = prompt("Enter submission links or write solution text:");
    if (!content) return;

    const res = await fetch(`/api/assignments/${assignId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ content })
    });
    if (res.ok) {
      alert('Homework submitted successfully!');
      fetchAssignments();
    }
  };

  return (
    <div>
      <h2>📝 Course Assignments</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Issue homework assignments and upload completed student submissions.</p>

      {user.role === 'faculty' && (
        <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px' }}>
          <h3>Post Homework Task</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <select className="glass-input" value={courseId} onChange={e => setCourseId(e.target.value)} required>
              <option value="">Choose Course</option>
              {courses.map((c, i) => <option key={i} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
            <input type="text" className="glass-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
            <input type="datetime-local" className="glass-input" value={due} onChange={e => setDue(e.target.value)} required />
            <input type="number" className="glass-input" placeholder="Total Marks" value={marks} onChange={e => setMarks(e.target.value)} />
            <textarea className="glass-input" style={{ gridColumn: 'span 2' }} placeholder="Task Guidelines" value={descr} onChange={e => setDescr(e.target.value)} />
            <button type="submit" className="glow-button" style={{ gridColumn: 'span 2' }}>Publish Assignment</button>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '30px' }}>
        <h3>Published Assignments</h3>
        <table className="glass-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Task description</th>
              <th>Due Date</th>
              <th>Max Marks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, i) => (
              <tr key={i}>
                <td>{a.title}</td>
                <td>{a.description}</td>
                <td>{new Date(a.due_date).toLocaleString()}</td>
                <td>{a.total_marks} pts</td>
                <td>
                  {user.role === 'student' ? (
                    <button onClick={() => handleSubmitAssign(a.id)} className="glow-button" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}>Submit</button>
                  ) : <span className="badge badge-info">Author Active</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 9. EVENTS VIEW
function Events() {
  const { token, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetch('/api/events', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setEvents(data));

    fetch('/api/announcements', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAnnouncements(data));
  }, []);

  const handleRegister = async (eventId) => {
    const res = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      alert('Registered for event check-in successfully!');
    }
  };

  return (
    <div>
      <h2>📢 Campus Events & Notices</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Browse cultural festivals, seminars, workshops, and notifications.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3>Scheduled Seminars & Events</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            {events.map((e, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h4>{e.title}</h4>
                <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>{e.description}</p>
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: 'var(--primary)' }}>📍 {e.badge || e.venue || 'Main Seminar Hall'}</small>
                  <button onClick={() => handleRegister(e.id)} className="glow-button" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}>Reserve Space</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3>Admin Announcements Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            {announcements.map((a, idx) => (
              <div key={idx} style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
                <span className={`badge ${a.priority === 'urgent' ? 'badge-danger' : a.priority === 'high' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.7rem', float: 'right' }}>
                  {a.priority.toUpperCase()}
                </span>
                <h4>{a.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 10. STUDY NOTES VIEW
function Notes() {
  const { token, user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);

  // Create fields
  const [title, setTitle] = useState('');
  const [descr, setDescr] = useState('');
  const [courseId, setCourseId] = useState('');
  const [textNote, setTextNote] = useState('');

  const fetchNotes = () => {
    fetch('/api/notes', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setNotes(data));
  };

  useEffect(() => {
    fetchNotes();
    fetch('/api/courses/', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(data));
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, description: descr, course_id: courseId, content: textNote })
    });
    if (res.ok) {
      setTitle(''); setDescr(''); setTextNote('');
      fetchNotes();
    }
  };

  return (
    <div>
      <h2>📁 Shared Study Materials</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Upload cheat sheets, previous semester questions, and study notes.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        <div className="glass-panel" style={{ padding: '25px' }}>
          <h3>Submit study notes</h3>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            <select className="glass-input" value={courseId} onChange={e => setCourseId(e.target.value)} required>
              <option value="">Select subject course</option>
              {courses.map((c, i) => <option key={i} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
            <input type="text" className="glass-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
            <input type="text" className="glass-input" placeholder="Description summary" value={descr} onChange={e => setDescr(e.target.value)} />
            <textarea className="glass-input" placeholder="Paste notes body text here" value={textNote} onChange={e => setTextNote(e.target.value)} rows="5" />
            <button type="submit" className="glow-button">Public share notes</button>
          </form>
        </div>

        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3>Shared Class resources</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '15px' }}>
            {notes.map((n, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h4>{n.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '5px' }}>{n.description}</p>
                {n.content && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', marginTop: '10px', borderRadius: '6px', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                    {n.content}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px', color: 'var(--primary)', fontSize: '0.85rem' }}>
                  <span>👁 {n.views || 0} views</span>
                  <span>⬇ {n.downloads || 0} downloads</span>
                </div>
              </div>
            ))}
            {notes.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No study materials found.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// CORE APP ROUTER CONFIG
// ==========================================
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<VerifyOtp />} />

          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardLayout><Dashboard /></DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/courses" element={
            <PrivateRoute>
              <DashboardLayout><Courses /></DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/attendance" element={
            <PrivateRoute>
              <DashboardLayout><Attendance /></DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/assignments" element={
            <PrivateRoute>
              <DashboardLayout><Assignments /></DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/events" element={
            <PrivateRoute>
              <DashboardLayout><Events /></DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="/notes" element={
            <PrivateRoute>
              <DashboardLayout><Notes /></DashboardLayout>
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
