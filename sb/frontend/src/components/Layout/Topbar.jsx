/**
 * Topbar — Page title + profile completion warning
 */
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/matches':   'AI Skill Matches',
  '/requests':  'Barter Requests',
  '/sessions':  'Sessions',
  '/profile':   'My Profile',
  '/chat':      'Messages',
};

const Topbar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const title = PAGE_TITLES[pathname] ||
    (pathname.startsWith('/chat/') ? 'Chat' : 'SkillBarter');

  const isProfileComplete =
    user?.name &&
    user?.skillsOffered?.length > 0 &&
    user?.skillsWanted?.length  > 0;

  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-spacer" />
      {!isProfileComplete && (
        <Link to="/profile" className="topbar-profile-completion">
          ⚠ Add your skills to appear in matches →
        </Link>
      )}
    </div>
  );
};

export default Topbar;
