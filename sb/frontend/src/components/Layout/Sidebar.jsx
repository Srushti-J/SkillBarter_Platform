/**
 * Sidebar — Navigation with real-time notification badges
 */
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/* Avatar helper: shows profile image or initials */
const AvatarCircle = ({ user, size = 36 }) => {
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const imgSrc = user?.profileImage
    ? (user.profileImage.startsWith('/uploads')
        ? `${process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000'}${user.profileImage}`
        : user.profileImage)
    : null;

  return imgSrc ? (
    <img src={imgSrc} alt={user.name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover',
               border: '2px solid rgba(124,110,250,0.3)' }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%',
                  background: 'var(--violet-bg)', color: 'var(--violet)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: size * 0.38,
                  border: '2px solid rgba(124,110,250,0.3)', flexShrink: 0 }}>
      {initials}
    </div>
  );
};

export { AvatarCircle };

const Sidebar = () => {
  const { user, logout, newRequestCount, newMessageCount,
          clearRequestBadge, clearMessageBadge } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/matches',   icon: '🤖', label: 'AI Matches' },
    {
      to: '/requests', icon: '⚡', label: 'Requests',
      badge: newRequestCount, onClick: clearRequestBadge,
    },
    { to: '/sessions',  icon: '📅', label: 'Sessions' },
    {
      to: '/chat', icon: '💬', label: 'Chat',
      badge: newMessageCount, onClick: clearMessageBadge,
    },
    { to: '/profile',   icon: '👤', label: 'Profile' },
  ];

  const isProfileComplete =
    user?.name &&
    user?.skillsOffered?.length > 0 &&
    user?.skillsWanted?.length  > 0;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <div>
          <div className="sidebar-logo-name">SkillBarter</div>
          <div className="sidebar-logo-tag">Trade skills, not money</div>
        </div>
      </div>

      {/* Profile incomplete warning */}
      {!isProfileComplete && (
        <div style={{ padding: '10px 14px' }}>
          <NavLink to="/profile" style={{
            display: 'block', background: 'rgba(245,166,35,0.08)',
            border: '1px solid rgba(245,166,35,0.2)', borderRadius: 9,
            padding: '9px 12px', textDecoration: 'none',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', marginBottom: 2 }}>
              ⚠ Complete Your Profile
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              Add skills to appear in matches
            </div>
          </NavLink>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={item.onClick}
          >
            <span className="nav-link-icon">{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge > 0 && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card at bottom */}
      <div className="sidebar-user">
        <div className="sidebar-user-inner" onClick={() => navigate('/profile')}>
          <AvatarCircle user={user} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.name || 'User'}
            </div>
            <div className="sidebar-user-status">● Online</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            style={{ background: 'none', border: 'none', color: 'var(--text3)',
                     cursor: 'pointer', fontSize: 16, padding: 4 }}
            title="Log out">⏻</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
