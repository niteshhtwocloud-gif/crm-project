import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, authChecked } = useAuth();
  const location = useLocation();

  // While a saved token is still being verified we render a neutral splash.
  // Without this the dashboard mounts for a moment (the user blob was read
  // straight out of localStorage) and only then redirects to /login.
  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6f8fc',
          color: '#64748b',
          fontSize: 14
        }}
      >
        Checking your session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
