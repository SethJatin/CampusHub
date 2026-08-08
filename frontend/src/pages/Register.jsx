import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
  const [securitySentence, setSecuritySentence] = useState('');

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

    if (!password || password.trim() === '') {
      setError('Password is required and cannot be empty!');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long!');
      return;
    }
    if (!securitySentence || securitySentence.trim() === '') {
      setError('Security secret sentence is required and cannot be empty!');
      return;
    }

    try {
      const payload = {
        email,
        username,
        password,
        password_confirm: password,
        first_name: firstName,
        last_name: lastName,
        role,
        security_sentence: securitySentence,
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>🔑 Unique Security Secret Sentence (For Password Recovery)</label>
            <input type="text" className="glass-input" value={securitySentence} onChange={e => setSecuritySentence(e.target.value)} placeholder="e.g. My childhood pet name was Rex" required />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>Save this sentence! You will need to enter this exact phrase to recover/change your password if forgotten.</span>
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

export default Register;
