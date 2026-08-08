import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    faculty_count: 5,
    course_count: 5,
    student_count: 75,
    session_logs_count: 375
  });

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.faculty_count === 'number') {
          setStats(data);
        }
      })
      .catch(err => console.error('Error fetching platform stats:', err));
  }, []);

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
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.faculty_count}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Assigned Faculty Professors</div>
          </div>
          <div className="scale-on-scroll" style={{ transitionDelay: '150ms' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.course_count}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Core Academic Courses</div>
          </div>
          <div className="scale-on-scroll" style={{ transitionDelay: '300ms' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--warning)' }}>{stats.student_count}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Active Enrolled Students</div>
          </div>
          <div className="scale-on-scroll" style={{ transitionDelay: '450ms' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ec4899' }}>{stats.session_logs_count}{typeof stats.session_logs_count === 'number' && stats.session_logs_count > 0 ? '+' : ''}</div>
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
              Tailored interfaces for Students (performance tracking) and Faculty (live class management & PDF uploads).
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
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '30px 50px', borderTop: '1px solid var(--border-glass)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }} className="animate-on-scroll">
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span>Powered by React & Vite</span>
          <span>•</span>
          <span>Django REST API</span>
          <span>•</span>
          <span>SQLite Database</span>
        </div>
        <p>© 2026 CampusHub Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default HomePage;
