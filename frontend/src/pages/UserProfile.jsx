import React, { useState, useEffect } from 'react';
import { useAuth, getProfilePic } from '../context/AuthContext';

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

export default UserProfile;
