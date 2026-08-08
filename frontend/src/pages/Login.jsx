import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Forgot password state
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetMethod, setResetMethod] = useState('email'); // 'email' or 'sentence'
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSentence, setForgotSentence] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

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

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setError('Please enter your email address or username');
      return;
    }
    setError('');
    setMessage('');
    setLoadingOtp(true);
    try {
      const res = await fetch('/accounts/api/forgot-password/send-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setMessage(data.message || 'OTP sent to your email address!');
      } else {
        setError(data.error || 'Failed to send OTP email');
      }
    } catch (err) {
      setError('Failed to reach server to dispatch OTP.');
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword.trim()) {
      setError('OTP code and new password are required');
      return;
    }
    setError('');
    setMessage('');
    setLoadingVerify(true);
    try {
      const res = await fetch('/accounts/api/forgot-password/verify-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier,
          otp: otpCode,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Password reset successful! Redirecting...');
        setTimeout(() => {
          setIsForgotMode(false);
          setEmail(forgotIdentifier);
          setPassword('');
          setOtpSent(false);
          setOtpCode('');
          setMessage('Password updated! Log in with your new password.');
        }, 1500);
      } else {
        setError(data.error || 'OTP verification failed');
      }
    } catch (err) {
      setError('Failed to reach server for OTP verification.');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleForgotSubmitSentence = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetch('/accounts/api/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier,
          security_sentence: forgotSentence,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Password reset successful! You can now log in.');
        setTimeout(() => {
          setIsForgotMode(false);
          setEmail(forgotIdentifier);
          setPassword('');
          setMessage('Password updated! Enter your new password to sign in.');
        }, 1500);
      } else {
        setError(data.error || 'Password reset failed');
      }
    } catch (err) {
      setError('Failed to reach server during password recovery.');
    }
  };

  const resetForgotState = () => {
    setIsForgotMode(false);
    setError('');
    setMessage('');
    setOtpSent(false);
    setOtpCode('');
    setForgotSentence('');
    setNewPassword('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel" style={{ maxWidth: '500px' }}>
        {!isForgotMode ? (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>🎓 CampusHub</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '30px' }}>Sign in to continue</p>

            {error && <div style={{ color: 'var(--danger)', padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</div>}
            {message && <div style={{ color: 'var(--success)', padding: '10px 14px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{message}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Email Address or Username</label>
                <input type="text" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@college.edu" required />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.9rem', margin: 0 }}>Password</label>
                  <button type="button" onClick={() => { setIsForgotMode(true); setError(''); setMessage(''); setForgotIdentifier(email); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Forgot Password?
                  </button>
                </div>
                <input type="password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="glow-button" style={{ width: '100%', marginTop: '20px' }}>Sign In</button>
            </form>

            <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '0.9rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Don't have an account?</p>
              <div style={{ marginTop: '10px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Register here</Link>
                <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Back to Home</Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>🔑 Reset Password</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>Select your preferred recovery method</p>

            {/* Method selector tabs */}
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => { setResetMethod('email'); setError(''); setMessage(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: resetMethod === 'email' ? 'var(--primary)' : 'transparent',
                  color: resetMethod === 'email' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                ✉️ Email OTP
              </button>
              <button
                type="button"
                onClick={() => { setResetMethod('sentence'); setError(''); setMessage(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: resetMethod === 'sentence' ? 'var(--primary)' : 'transparent',
                  color: resetMethod === 'sentence' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                💬 Secret Sentence
              </button>
            </div>

            {error && <div style={{ color: 'var(--danger)', padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</div>}
            {message && <div style={{ color: 'var(--success)', padding: '10px 14px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{message}</div>}

            {resetMethod === 'email' ? (
              <div>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp}>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Email Address or Username</label>
                      <input
                        type="text"
                        className="glass-input"
                        value={forgotIdentifier}
                        onChange={e => setForgotIdentifier(e.target.value)}
                        placeholder="johndoe or name@college.edu"
                        required
                      />
                      <small style={{ color: 'var(--text-secondary)', marginTop: '6px', display: 'block', fontSize: '0.8rem' }}>
                        A 6-digit OTP code will be sent to your registered Gmail / Email address.
                      </small>
                    </div>

                    <button
                      type="submit"
                      className="glow-button"
                      disabled={loadingOtp}
                      style={{ width: '100%', marginTop: '10px', opacity: loadingOtp ? 0.7 : 1 }}
                    >
                      {loadingOtp ? 'Sending OTP to Gmail...' : '📩 Send OTP via Email'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.9rem', margin: 0 }}>Email Address / Username</label>
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setMessage(''); setError(''); }}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Change
                        </button>
                      </div>
                      <input
                        type="text"
                        className="glass-input"
                        value={forgotIdentifier}
                        disabled
                        style={{ opacity: 0.7 }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>🔢 Enter 6-Digit OTP</label>
                      <input
                        type="text"
                        className="glass-input"
                        maxLength="6"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="123456"
                        style={{ letterSpacing: '4px', fontSize: '1.2rem', textAlign: 'center', fontWeight: 'bold' }}
                        required
                      />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>New Password</label>
                      <input
                        type="password"
                        className="glass-input"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="•••••••• (min 6 chars)"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="glow-button"
                      disabled={loadingVerify}
                      style={{ width: '100%', opacity: loadingVerify ? 0.7 : 1 }}
                    >
                      {loadingVerify ? 'Verifying...' : '✅ Verify OTP & Reset Password'}
                    </button>

                    <div style={{ marginTop: '14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loadingOtp}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Resend OTP Code
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleForgotSubmitSentence}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Email Address or Username</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={forgotIdentifier}
                    onChange={e => setForgotIdentifier(e.target.value)}
                    placeholder="johndoe or name@college.edu"
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>🔑 Unique Security Secret Sentence</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={forgotSentence}
                    onChange={e => setForgotSentence(e.target.value)}
                    placeholder="Enter the exact secret sentence set during registration"
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>New Password</label>
                  <input
                    type="password"
                    className="glass-input"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="•••••••• (min 6 chars)"
                    required
                  />
                </div>

                <button type="submit" className="glow-button" style={{ width: '100%', marginTop: '10px' }}>Verify & Change Password</button>
              </form>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={resetForgotState}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
              >
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
