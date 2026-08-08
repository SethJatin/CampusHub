import React, { createContext, useContext, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const DEFAULT_THEME_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233b82f6"/><stop offset="100%" stop-color="%236366f1"/></linearGradient></defs><circle cx="64" cy="64" r="64" fill="url(%23g)"/><path fill="%23ffffff" opacity="0.92" d="M64 28a20 20 0 1 0 0 40 20 20 0 0 0 0-40zM32 98c0-17.7 14.3-30 32-30s32 12.3 32 30c0 2.2-1.8 4-4 4H36c-2.2 0-4-1.8-4-4z"/></svg>`;

export function getProfilePic(imagePath) {
  if (imagePath && (imagePath.startsWith('data:image') || imagePath.startsWith('http'))) {
    return imagePath;
  }
  return DEFAULT_THEME_AVATAR;
}

export function AuthProvider({ children }) {
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

export function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading application...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

export default AuthContext;
