import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, PrivateRoute } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardLayout from './components/DashboardLayout';

import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UserProfile from './pages/UserProfile';
import Courses from './pages/Courses';
import Attendance from './pages/Attendance';
import ExamsAndPerformance from './pages/ExamsAndPerformance';
import Assignments from './pages/Assignments';
import Events from './pages/Events';
import Notes from './pages/Notes';

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
