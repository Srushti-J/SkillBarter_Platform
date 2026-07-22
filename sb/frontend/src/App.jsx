/**
 * App.jsx — Root component with all routes including Video Call
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar    from './components/Layout/Sidebar';
import Topbar     from './components/Layout/Topbar';
import Login      from './pages/Login';
import Register   from './pages/Register';
import Dashboard  from './pages/Dashboard';
import Matches    from './pages/Matches';
import Requests   from './pages/Requests';
import Sessions   from './pages/Sessions';
import Profile    from './pages/Profile';
import Chat       from './pages/Chat';
import VideoCall  from './pages/VideoCall';
import './styles/global.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
};

/* Normal shell: sidebar + topbar */
const AppShell = ({ children }) => (
  <div className="app-wrapper">
    <Sidebar />
    <div className="main-content">
      <Topbar />
      {children}
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected with sidebar */}
          <Route path="/dashboard" element={<ProtectedRoute><AppShell><Dashboard /></AppShell></ProtectedRoute>} />
          <Route path="/matches"   element={<ProtectedRoute><AppShell><Matches /></AppShell></ProtectedRoute>} />
          <Route path="/requests"  element={<ProtectedRoute><AppShell><Requests /></AppShell></ProtectedRoute>} />
          <Route path="/sessions"  element={<ProtectedRoute><AppShell><Sessions /></AppShell></ProtectedRoute>} />
          <Route path="/profile"   element={<ProtectedRoute><AppShell><Profile /></AppShell></ProtectedRoute>} />
          <Route path="/chat"      element={<ProtectedRoute><AppShell><Chat /></AppShell></ProtectedRoute>} />
          <Route path="/chat/:userId" element={<ProtectedRoute><AppShell><Chat /></AppShell></ProtectedRoute>} />

          {/* Video call — full screen, no sidebar */}
          <Route path="/call/:userId" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
