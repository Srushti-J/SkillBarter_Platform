/**
 * Dashboard — Real data only, no hardcoded users
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionService, requestService, matchService } from '../services/api';
import { AvatarCircle } from '../components/Layout/Sidebar';

const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const Dashboard = () => {
  const { user, isOnline } = useAuth();
  const navigate = useNavigate();

  const [sessions,  setSessions]  = useState([]);
  const [requests,  setRequests]  = useState({ sent: [], received: [] });
  const [matches,   setMatches]   = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      sessionService.getAll(),
      requestService.getAll(),
      matchService.getMatches().catch(() => ({ data: { matches: [] } })),
    ])
      .then(([sRes, rRes, mRes]) => {
        setSessions(sRes.data || []);
        setRequests(rRes.data || { sent: [], received: [] });
        setMatches((mRes.data?.matches || []).slice(0, 3));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isComplete =
    user?.name &&
    user?.skillsOffered?.length > 0 &&
    user?.skillsWanted?.length  > 0;

  const upcoming     = sessions.filter((s) => s.sessionStatus === 'scheduled').slice(0, 3);
  const pendingCount = requests.received?.filter((r) => r.requestStatus === 'pending').length || 0;
  const completedCount = sessions.filter((s) => s.sessionStatus === 'completed').length;

  if (loading) return <div className="loading-spinner">Loading dashboard…</div>;

  return (
    <div className="page-container">

      {/* Profile Incomplete Banner */}
      {!isComplete && (
        <div className="incomplete-banner">
          <span className="incomplete-banner-icon">👤</span>
          <div className="incomplete-banner-text">
            <h4>Complete your profile to appear in matches</h4>
            <p>Add at least one skill you can teach and one skill you want to learn.</p>
          </div>
          <Link to="/profile" className="btn btn-primary btn-sm">Complete Profile →</Link>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{user?.skillsOffered?.length || 0}</div>
          <div className="stat-label">Skills Offered</div>
          <div className="stat-change">You can teach</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{user?.skillsWanted?.length || 0}</div>
          <div className="stat-label">Skills Wanted</div>
          <div className="stat-change">You want to learn</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">Sessions Done</div>
          <div className="stat-change">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--orange)' }}>
            {user?.reputationScore?.toFixed(1) || '0.0'}
          </div>
          <div className="stat-label">Reputation</div>
          <div className="stat-change">{user?.reviewCount || 0} reviews</div>
        </div>
      </div>

      <div className="dashboard-grid">

        {/* Upcoming Sessions */}
        <div className="card">
          <div className="dashboard-section-title">
            📅 Upcoming Sessions
            <Link to="/sessions" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--violet)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state">
              No sessions scheduled yet.
              <br />
              <Link to="/requests" style={{ color: 'var(--violet)' }}>Accept a request to schedule one →</Link>
            </div>
          ) : upcoming.map((s) => {
            const partner = s.user1?._id === user?._id ? s.user2 : s.user1;
            return (
              <div className="session-item" key={s._id}>
                <div className="session-date">
                  <div className="session-date-day">
                    {new Date(s.sessionDate).getDate()}
                  </div>
                  <div className="session-date-mon">
                    {new Date(s.sessionDate).toLocaleString('default', { month: 'short' })}
                  </div>
                </div>
                <div className="session-info">
                  <div className="session-skill">{s.skillName}</div>
                  <div className="session-partner">
                    with {partner?.name || 'Partner'} · {s.duration} min
                  </div>
                </div>
                <span className="badge badge-scheduled">Scheduled</span>
              </div>
            );
          })}
        </div>

        {/* Pending Requests */}
        <div className="card">
          <div className="dashboard-section-title">
            ⚡ Pending Requests
            <Link to="/requests" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--violet)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {pendingCount === 0 ? (
            <div className="empty-state">No pending requests.</div>
          ) : (
            requests.received
              .filter((r) => r.requestStatus === 'pending')
              .slice(0, 3)
              .map((r) => (
                <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <AvatarCircle user={r.senderId} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.senderId?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                      Offers <span style={{ color: 'var(--violet)' }}>{r.skillOffered}</span> ↔ wants <span style={{ color: 'var(--green)' }}>{r.skillRequested}</span>
                    </div>
                  </div>
                  <Link to="/requests" className="btn btn-sm btn-primary">Review</Link>
                </div>
              ))
          )}
        </div>

        {/* Top AI Matches */}
        <div className="card">
          <div className="dashboard-section-title">
            🤖 Top Matches
            <Link to="/matches" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--violet)', textDecoration: 'none' }}>
              See all →
            </Link>
          </div>
          {!isComplete ? (
            <div className="empty-state">
              Add skills to your profile to see matches.
            </div>
          ) : matches.length === 0 ? (
            <div className="empty-state">
              No matches yet. Invite friends to join!
            </div>
          ) : matches.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => navigate('/matches')}>
              <div style={{ position: 'relative' }}>
                <AvatarCircle user={{ name: m.name, profileImage: m.profileImage }} size={36} />
                {isOnline(m.id) && (
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--card)' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Teaches: {m.skillsOffered?.slice(0, 2).join(', ')}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>{m.matchScore}%</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>match</div>
              </div>
            </div>
          ))}
        </div>

        {/* My Skills Summary */}
        <div className="card">
          <div className="dashboard-section-title">🎓 My Skills</div>
          <div style={{ marginBottom: 16 }}>
            <div className="skills-label" style={{ marginBottom: 8 }}>I can teach</div>
            <div className="skill-tags">
              {user?.skillsOffered?.length > 0
                ? user.skillsOffered.map((s) => (
                    <span key={s} className="skill-tag skill-tag-offered">{s}</span>
                  ))
                : <span style={{ color: 'var(--text3)', fontSize: 13 }}>None added yet</span>}
            </div>
          </div>
          <div>
            <div className="skills-label" style={{ marginBottom: 8 }}>I want to learn</div>
            <div className="skill-tags">
              {user?.skillsWanted?.length > 0
                ? user.skillsWanted.map((s) => (
                    <span key={s} className="skill-tag skill-tag-wanted">{s}</span>
                  ))
                : <span style={{ color: 'var(--text3)', fontSize: 13 }}>None added yet</span>}
            </div>
          </div>
          <Link to="/profile" className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>
            ✏ Edit Skills
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
