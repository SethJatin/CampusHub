import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';

// ==========================================
// AUTHENTICATION CONTENT & STATE
// ==========================================
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const DEFAULT_THEME_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%236366f1"/></linearGradient></defs><circle cx="64" cy="64" r="64" fill="url(%23g)"/><path fill="%23ffffff" opacity="0.92" d="M64 28a20 20 0 1 0 0 40 20 20 0 0 0 0-40zM32 98c0-17.7 14.3-30 32-30s32 12.3 32 30c0 2.2-1.8 4-4 4H36c-2.2 0-4-1.8-4-4z"/></svg>`;

export function getProfilePic(imagePath) {
  if (imagePath && (imagePath.startsWith('data:image') || imagePath.startsWith('http'))) {
    return imagePath;
  }
  return DEFAULT_THEME_AVATAR;
}

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

  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
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

// 0. HOME PAGE LANDING COMPONENT
function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated-in');
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.15
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const elements = document.querySelectorAll('.animate-on-scroll, .scale-on-scroll');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Navbar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 50px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span style={{ fontSize: '1.8rem' }}>🎓</span>
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CampusHub
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Smart Academic Ecosystem</span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '25px', alignItems: 'center', fontSize: '0.95rem' }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}>Home</Link>
          <Link to="/events" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Events</Link>
          <Link to="/courses" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Courses</Link>
          <Link to="/notes" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Study Notes</Link>
          <Link to="/assignments" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Assignments</Link>
          <Link to="/attendance" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Attendance</Link>
        </nav>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {user ? (
            <Link to="/dashboard" className="glow-button" style={{ padding: '10px 22px', fontSize: '0.9rem', textDecoration: 'none' }}>
              Go to Dashboard ({user.first_name}) →
            </Link>
          ) : (
            <>
              <Link to="/login" style={{ color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.9rem' }}>
                Sign In
              </Link>
              <Link to="/register" className="glow-button" style={{ padding: '10px 20px', fontSize: '0.9rem', textDecoration: 'none' }}>
                Register Account
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '80px 50px 60px 50px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }} className="animate-on-scroll">
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '25px' }}>
          ✨ NEXT-GENERATION CAMPUS MANAGEMENT SYSTEM
        </div>

        <h1 style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: '1.2', marginBottom: '20px', background: 'linear-gradient(135deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Empowering Academic Excellence & Smart Campus Collaboration
        </h1>

        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto 40px auto', lineHeight: '1.6' }}>
          CampusHub unifies real-time live attendance tracking, subject enrollment, PDF study notes sharing, online assignment submissions, and event celebrations into one powerful, glassmorphic platform.
        </p>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={user ? "/dashboard" : "/login"} className="glow-button" style={{ padding: '14px 32px', fontSize: '1.05rem', textDecoration: 'none' }}>
            🚀 {user ? "Open Campus Dashboard" : "Sign In to Access Portal"}
          </Link>
          <Link to="/events" className="glass-panel" style={{ padding: '14px 28px', fontSize: '1.05rem', textDecoration: 'none', color: '#fff', border: '1px solid var(--border-glass)' }}>
            🎉 Explore Campus Events & Notices
          </Link>
        </div>
      </section>

      {/* Platform Live Stats Bar */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)', padding: '30px 50px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px', textAlign: 'center' }}>
          <div className="scale-on-scroll" style={{ transitionDelay: '0ms' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>5</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Assigned Faculty Professors</div>
          </div>
          <div className="scale-on-scroll" style={{ transitionDelay: '150ms' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>5</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Core Academic Courses</div>
          </div>
          <div className="scale-on-scroll" style={{ transitionDelay: '300ms' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>75</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Active Enrolled Students</div>
          </div>
          <div className="scale-on-scroll" style={{ transitionDelay: '450ms' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ec4899' }}>375+</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Tracked Class Session Logs</div>
          </div>
        </div>
      </section>

      {/* Key Feature Cards Grid */}
      <section style={{ padding: '70px 50px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }} className="animate-on-scroll">
          <h2 style={{ fontSize: '2.2rem', marginBottom: '12px' }}>Comprehensive Academic Modules</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            Everything students, faculty, and administrators need to succeed.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
          {/* Card 1: Attendance */}
          <div className="glass-panel feature-card-animated scale-on-scroll" style={{ padding: '30px', borderRadius: '16px', transitionDelay: '0ms' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📊</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Real-Time Live Attendance</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Faculty can initiate real-time live classes with 60-minute edit time limits. Students view overall rates, subject-wise percentages, and 5-day session history.
            </p>
            <Link to="/attendance" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
              View Attendance Module →
            </Link>
          </div>

          {/* Card 2: Courses & Classes */}
          <div className="glass-panel feature-card-animated scale-on-scroll" style={{ padding: '30px', borderRadius: '16px', transitionDelay: '100ms' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📚</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Course & Faculty Roster</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Explore core subjects (CS101 - CS105), assigned faculty professors, room schedules, and 15-student class enrollments.
            </p>
            <Link to="/courses" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Browse Courses →
            </Link>
          </div>

          {/* Card 3: Study Notes */}
          <div className="glass-panel feature-card-animated scale-on-scroll" style={{ padding: '30px', borderRadius: '16px', transitionDelay: '200ms' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📁</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Study Notes & PDF Uploads</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Faculty can upload PDF lecture notes and text summaries. Students can quickly search and filter notes by subject or faculty instructor.
            </p>
            <Link to="/notes" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Access Study Notes →
            </Link>
          </div>

          {/* Card 4: Assignments */}
          <div className="glass-panel feature-card-animated scale-on-scroll" style={{ padding: '30px', borderRadius: '16px', transitionDelay: '300ms' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📝</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Homework & Assignments</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Faculty post homework instructions with due dates and total points. Students submit homework online with automatic status tracking.
            </p>
            <Link to="/assignments" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Check Assignments →
            </Link>
          </div>

          {/* Card 5: Events */}
          <div className="glass-panel feature-card-animated scale-on-scroll" style={{ padding: '30px', borderRadius: '16px', transitionDelay: '400ms' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📢</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Events & Poster Banners</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Stay updated with Independence Day Celebrations, Tech Hackathons, and SPANDAN Cultural Gala with rich graphic posters and automatic event completion removal.
            </p>
            <Link to="/events" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Browse Campus Events →
            </Link>
          </div>

          {/* Card 6: Role Security */}
          <div className="glass-panel feature-card-animated scale-on-scroll" style={{ padding: '30px', borderRadius: '16px', transitionDelay: '500ms' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>🛡️</div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Role-Based Access Portals</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Tailored interfaces for Students (performance tracking), Faculty (live class management & PDF uploads), and Admins (system oversight).
            </p>
            <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Portal Login →
            </Link>
          </div>
        </div>
      </section>

      {/* Role Navigation Banner */}
      <section style={{ padding: '50px', background: 'rgba(15,23,42,0.8)', borderTop: '1px solid var(--border-glass)' }} className="animate-on-scroll">
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Ready to Get Started?</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
            Access your personalized student or faculty dashboard now.
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/login')} className="glow-button" style={{ padding: '12px 28px' }}>
              👨‍🎓 Student Sign In
            </button>
            <button onClick={() => navigate('/login')} className="glow-button" style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              👨‍🏫 Faculty Sign In
            </button>
            <button onClick={() => navigate('/login')} className="glow-button" style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              🔑 Admin Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '30px 50px', borderTop: '1px solid var(--border-glass)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }} className="animate-on-scroll">
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span>Powered by React & Vite</span>
          <span>•</span>
          <span>Express & Django APIs</span>
          <span>•</span>
          <span>SQLite Database</span>
        </div>
        <p>© 2026 CampusHub Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}

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
            <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Back to Home</Link>
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
      setError('Network error during registration');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel" style={{ maxWidth: '600px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>🎓 Create Account</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '25px' }}>Register to join CampusHub</p>

        {error && <div style={{ color: 'var(--danger)', padding: '10px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</div>}
        {message && <div style={{ color: 'var(--success)', padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Account Role</label>
            <select className="glass-input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="student">Student Account</option>
              <option value="faculty">Faculty Account</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>First Name</label>
              <input type="text" className="glass-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Last Name</label>
              <input type="text" className="glass-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Username</label>
            <input type="text" className="glass-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="johndoe" required />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Email Address</label>
            <input type="email" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@campushub.edu" required />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Password</label>
            <input type="password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          <button type="submit" className="glow-button" style={{ width: '100%' }}>Register Account</button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Back to login</Link>
          <span style={{ margin: '0 10px', color: 'var(--text-secondary)' }}>•</span>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Back to Home</Link>
        </div>
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

// User-Friendly Academic Health & Support Indicator (Student)
function AIStudentRiskWidget({ userId, token }) {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !token) return;
    fetch(`/api/ml/student-risk/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setRiskData(data))
      .catch(() => setRiskData(null))
      .finally(() => setLoading(false));
  }, [userId, token]);

  if (loading) return <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', marginTop: '30px' }}>Loading Academic Support Summary...</div>;
  if (!riskData) return null;

  const isHigh = riskData.predicted_risk_level === 'High Risk';
  const isMod = riskData.predicted_risk_level === 'Moderate Risk';

  const statusLabel = isHigh ? 'Immediate Action Required' : isMod ? 'Attention Needed' : 'On Track';
  const levelColor = isHigh ? 'var(--danger)' : isMod ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="glass-panel" style={{ padding: '25px', marginTop: '30px', borderLeft: `6px solid ${levelColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          📊 Academic Health & Support Indicator
        </h3>
        <span className="badge" style={{ background: levelColor, color: '#fff', fontSize: '0.85rem', padding: '6px 14px' }}>
          {statusLabel}
        </span>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
        {riskData.recommendation}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Class Attendance Rate</small>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginTop: '4px', color: riskData.attendance_percentage < 75 ? 'var(--danger)' : 'var(--success)' }}>
            {riskData.attendance_percentage}%
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Average Exam Performance</small>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginTop: '4px', color: riskData.avg_exam_score < 50 ? 'var(--danger)' : '#38bdf8' }}>
            {riskData.avg_exam_score}%
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <small style={{ color: 'var(--text-secondary)' }}>Assignment Completion</small>
          <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginTop: '4px', color: '#a855f7' }}>
            {riskData.avg_assignment_score}%
          </div>
        </div>
      </div>
    </div>
  );
}

// User-Friendly Academic Progress & Early Support Panel (Faculty / Admin)
function AIRiskAnalysisPanel({ token }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/ml/risk-analysis', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAnalysis(data))
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', marginTop: '30px' }}>Loading Academic Performance Overview...</div>;
  if (!analysis) return null;

  const imp = analysis.feature_importances || {};

  return (
    <div style={{ marginTop: '35px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🎯 Academic Early Support & Performance Summary</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>
          Real-time summary of student attendance, course participation, and academic standing across all classes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        {/* Primary Factors */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <h3 style={{ marginBottom: '15px' }}>💡 Primary Performance Factors</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(imp).map(([key, val]) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')} Impact</span>
                  <strong>{(val * 100).toFixed(0)}%</strong>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${val * 100}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High Risk Roster Table */}
        <div className="glass-panel" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>📢 Students Requiring Academic Attention</h3>
            <span className="badge badge-danger">
              {analysis.high_risk_count + analysis.moderate_risk_count} Students
            </span>
          </div>
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>Attendance</th>
                  <th>Academic Standing</th>
                </tr>
              </thead>
              <tbody>
                {(analysis.students || [])
                  .filter(s => s.predicted_risk_level !== 'Safe')
                  .map((s, i) => (
                    <tr key={i}>
                      <td>{s.roll_number}</td>
                      <td><strong>{s.first_name} {s.last_name}</strong></td>
                      <td>{s.department}</td>
                      <td style={{ color: s.attendance_percentage < 75 ? 'var(--danger)' : 'var(--success)' }}>
                        {s.attendance_percentage}%
                      </td>
                      <td>
                        <span className={`badge ${s.predicted_risk_level === 'High Risk' ? 'badge-danger' : 'badge-warning'}`}>
                          {s.predicted_risk_level === 'High Risk' ? 'Immediate Support Needed' : 'Attention Advised'}
                        </span>
                      </td>
                    </tr>
                  ))}
                {(analysis.students || []).filter(s => s.predicted_risk_level !== 'Safe').length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      All students are currently in good academic standing!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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

      {/* AI Risk Assessment Widget */}
      <AIStudentRiskWidget userId={user?.id} token={token} />
    </div>
  );
}

// 5b. FACULTY DASHBOARD
function FacultyDashboard() {
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

      {/* AI Model Benchmarks & Risk Radar Panel */}
      <AIRiskAnalysisPanel token={token} />
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

      {/* AI Model Benchmarks & Risk Radar Panel */}
      <AIRiskAnalysisPanel token={token} />
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
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));

    fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setMyCourses(Array.isArray(data) ? data : []))
      .catch(() => setMyCourses([]));
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
  }, []);

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
      .then(data => setAssignments(Array.isArray(data) ? data : []))
      .catch(() => setAssignments([]));
  };

  useEffect(() => {
    fetchAssignments();
    if (user.role === 'faculty') {
      fetch('/api/courses/my-courses', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setCourses(Array.isArray(data) ? data : []))
        .catch(() => setCourses([]));
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

// 8b. EXAMS, SYLLABUS & PERFORMANCE ANALYTICS VIEW (OFFLINE EXAM MANAGEMENT)
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
  }, []);

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
                      OFFLINE EXAM ({ex.status.toUpperCase()})
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

      {/* ONLINE EXAM TEST SIMULATOR TAB */}
      {activeTab === 'take_exam' && takingExam && (
        <div className="glass-panel" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px', marginBottom: '20px' }}>
            <div>
              <span className="badge badge-info">{takingExam.course_code}</span>
              <h3 style={{ margin: '8px 0 0 0' }}>{takingExam.title}</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--warning)' }}>⏱️ {Math.floor(timeRemaining / 60)}m {timeRemaining % 60}s</span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total: {takingExam.total_marks} Marks</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {takingExam.questions.map((q, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <h5 style={{ fontSize: '1rem', marginBottom: '12px' }}>Q{idx + 1}. {q.question_text} <span style={{ float: 'right', color: 'var(--primary)', fontSize: '0.8rem' }}>({q.marks} pts)</span></h5>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const optText = q[`option_${opt.toLowerCase()}`];
                    if (!optText) return null;
                    const isSelected = studentAnswers[q.id] === opt;

                    return (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.02)', border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-glass)', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={opt}
                          checked={isSelected}
                          onChange={() => setStudentAnswers({ ...studentAnswers, [q.id]: opt })}
                        />
                        <span style={{ fontSize: '0.9rem' }}><strong>({opt})</strong> {optText}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {takingExam.questions.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No online objective questions attached to this exam. Please submit write-up confirmation.</p>
            )}
          </div>

          <div style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setTakingExam(null); setActiveTab('schedule'); }} className="glass-panel" style={{ padding: '10px 20px', cursor: 'pointer', background: 'none', border: '1px solid var(--border-glass)', color: '#fff' }}>
              Cancel
            </button>
            <button onClick={handleSubmitExamAnswers} className="glow-button" style={{ padding: '10px 25px' }}>
              Submit Exam Answers Now
            </button>
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
                  {studentGrowth?.subject_breakdown.map((sb, idx) => (
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
                  <div className="metric-value">{facultyAnalytics?.course_analytics.length || 0}</div>
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

                    {facultyAnalytics?.course_analytics.map((ca, idx) => {
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
                    {facultyAnalytics?.course_analytics.map((ca, i) => (
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

// 9. EVENTS VIEW
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
                      <span className="badge badge-info" style={{ textTransform: 'capitalize', fontSize: '0.75rem', backdropFilter: 'blur(8px)', background: 'rgba(59,130,246,0.8)' }}>
                        {e.category || 'Event'}
                      </span>
                    </div>
                  </div>
                )}
                <div style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{e.title}</h4>
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

// 10. STUDY NOTES VIEW
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
    fetch('/api/notes', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setNotes(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchNotes();
    fetch('/api/courses/', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  const isFacultyOrAdmin = user?.role === 'faculty' || user?.role === 'admin';

  // Unique faculty list for filter dropdown
  const facultyOptions = React.useMemo(() => {
    const map = new Map();
    notes.forEach(n => {
      if (n.uploaded_by_id) {
        const name = n.uploader_first_name || n.uploader_last_name
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

// 10. USER PROFILE VIEW
function UserProfile() {
  const { token, user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [editMsg, setEditMsg] = useState('');
  const [editing, setEditing] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/accounts/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        if (data.user) {
          setFirstName(data.user.first_name || '');
          setLastName(data.user.last_name || '');
          setPhone(data.user.phone || '');
          setAddress(data.user.address || '');
          setBio(data.user.bio || '');
          setProfileImage(data.user.profile_image || '');
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Please select an image file under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setEditMsg('');
    try {
      const res = await fetch('/accounts/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          address,
          bio,
          profile_image: profileImage
        })
      });
      if (res.ok) {
        setEditMsg('✓ Profile updated successfully!');
        updateUser({ first_name: firstName, last_name: lastName, profile_image: profileImage });
        setEditing(false);
        fetchProfile();
      } else {
        const errData = await res.json();
        setEditMsg(`✗ ${errData.error || 'Failed to update profile'}`);
      }
    } catch (err) {
      setEditMsg('✗ Network error updating profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg('');
    if (newPassword !== confirmPassword) {
      setPassMsg('✗ New password and confirm password do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg('✗ New password must be at least 6 characters long');
      return;
    }

    setChangingPass(true);
    try {
      const res = await fetch('/accounts/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPassMsg('✓ Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMsg(`✗ ${data.error || 'Failed to change password'}`);
      }
    } catch (err) {
      setPassMsg('✗ Network error changing password');
    } finally {
      setChangingPass(false);
    }
  };

  if (loading) return <div style={{ padding: '30px', textAlign: 'center' }}>Loading user profile...</div>;

  const u = profileData?.user || user;
  const p = profileData?.profile || {};

  const avatarUrl = getProfilePic(profileImage);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0 }}>👤 User Profile</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0' }}>
            View and manage your personal account settings, profile picture, and security credentials.
          </p>
        </div>

        <button
          onClick={() => setEditing(!editing)}
          className="glow-button"
          style={{ background: editing ? 'rgba(255,255,255,0.1)' : 'var(--primary)', boxShadow: 'none' }}
        >
          {editing ? '✖️ Close Edit' : '✏️ Edit Profile'}
        </button>
      </div>

      {editMsg && (
        <div style={{ padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', background: editMsg.includes('✓') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: editMsg.includes('✓') ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
          {editMsg}
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px', display: 'flex', gap: '25px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <img
            src={avatarUrl}
            alt="Profile Avatar"
            style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', background: '#1e293b' }}
          />
          {editing && (
            <label style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--primary)', padding: '6px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.8rem' }} title="Change Profile Picture">
              📷
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontSize: '1.6rem', margin: 0 }}>{u.first_name} {u.last_name}</h3>
            <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'faculty' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'uppercase' }}>
              {u.role}
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 12px 0', fontSize: '0.95rem' }}>📧 {u.email}</p>

          <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            {u.role === 'student' && p.roll_number && <span>🆔 Roll No: <strong>{p.roll_number}</strong></span>}
            {u.role === 'faculty' && p.employee_id && <span>🆔 Employee ID: <strong>{p.employee_id}</strong></span>}
            {p.department && <span>🏛️ Department: <strong>{p.department}</strong></span>}
            <span>📅 Registered User</span>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE FORM */}
      {editing ? (
        <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Edit Account Details</h3>
          <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>First Name</label>
              <input type="text" className="glass-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Last Name</label>
              <input type="text" className="glass-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Phone Number</label>
              <input type="text" className="glass-input" placeholder="+91 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Upload Profile Picture File</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="glass-input" style={{ padding: '8px 12px' }} />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Address</label>
              <input type="text" className="glass-input" placeholder="Residential address..." value={address} onChange={e => setAddress(e.target.value)} />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Bio / About Me</label>
              <textarea className="glass-input" placeholder="Short personal bio..." value={bio} onChange={e => setBio(e.target.value)} rows="3" />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setEditing(false)} className="glass-panel" style={{ padding: '10px 20px', cursor: 'pointer', background: 'none', border: '1px solid var(--border-glass)', color: '#fff' }}>
                Cancel
              </button>
              <button type="submit" className="glow-button" style={{ padding: '10px 25px' }}>
                💾 Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* READ-ONLY PROFILE OVERVIEW */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '30px' }}>
          <div className="glass-panel" style={{ padding: '25px' }}>
            <h4 style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>📋 Account Overview</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Full Name:</span> <strong>{u.first_name} {u.last_name}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Email Address:</span> <strong>{u.email}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Account Role:</span> <strong style={{ textTransform: 'capitalize' }}>{u.role}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Phone Number:</span> <strong>{u.phone || 'Not provided'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Address:</span> <strong>{u.address || 'Not provided'}</strong></div>
              {u.bio && <div><span style={{ color: 'var(--text-secondary)' }}>Bio:</span> <p style={{ marginTop: '4px', fontStyle: 'italic' }}>{u.bio}</p></div>}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '25px' }}>
            <h4 style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>🎓 Academic Credentials</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              {u.role === 'student' && (
                <>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Roll Number:</span> <strong>{p.roll_number || 'STU2026'}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Enrollment No:</span> <strong>{p.enrollment_number || 'ENR2026'}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Department:</span> <strong>{p.department || 'Computer Science & Engineering'}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Current Year / Sem:</span> <strong>Year {p.year || 1}, Semester {p.semester || 1}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Academic CGPA:</span> <strong style={{ color: 'var(--success)' }}>{p.cgpa || '8.5 / 10.0'}</strong></div>
                </>
              )}

              {u.role === 'faculty' && (
                <>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Employee ID:</span> <strong>{p.employee_id || 'FAC2026'}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Department:</span> <strong>{p.department || 'Computer Science & Engineering'}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Designation:</span> <strong>{p.designation || 'Assistant Professor'}</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Assigned Courses:</span> <strong>5 Core CS Subjects</strong></div>
                </>
              )}

              {u.role === 'admin' && (
                <>
                  <div><span style={{ color: 'var(--text-secondary)' }}>System Role:</span> <strong>Head System Administrator</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Permissions:</span> <strong style={{ color: 'var(--danger)' }}>Full Administrative Control</strong></div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>Superuser Status:</span> <strong>Active</strong></div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD CARD */}
      <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>🔐 Change Account Password</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Update your account password securely. Make sure your new password is at least 6 characters long.
        </p>

        {passMsg && (
          <div style={{ padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', background: passMsg.includes('✓') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: passMsg.includes('✓') ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
            {passMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Current Password</label>
            <input type="password" className="glass-input" placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>New Password</label>
            <input type="password" className="glass-input" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>Confirm New Password</label>
            <input type="password" className="glass-input" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>

          <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" className="glow-button" disabled={changingPass} style={{ padding: '10px 25px', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              {changingPass ? 'Updating Password...' : '🔐 Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: '#fff', padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '40px', textAlign: 'center', borderRadius: '16px' }}>
            <span style={{ fontSize: '3rem' }}>⚠️</span>
            <h2 style={{ margin: '15px 0 10px 0' }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()} className="glow-button" style={{ padding: '10px 20px' }}>
                🔄 Refresh Page
              </button>
              <button onClick={() => { window.location.href = '/'; }} className="glass-panel" style={{ padding: '10px 20px', cursor: 'pointer' }}>
                🏠 Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// CORE APP ROUTER CONFIG
// ==========================================
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard" element={
              <PrivateRoute>
                <DashboardLayout><Dashboard /></DashboardLayout>
              </PrivateRoute>
            } />

            <Route path="/profile" element={
              <PrivateRoute>
                <DashboardLayout><UserProfile /></DashboardLayout>
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

            <Route path="/exams" element={
              <PrivateRoute>
                <DashboardLayout><ExamsAndPerformance /></DashboardLayout>
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
