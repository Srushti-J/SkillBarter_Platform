/**
 * Matches Page — AI-powered, real users only
 * No hardcoded data. Every match comes from MongoDB via the AI service.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchService, requestService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AvatarCircle } from '../components/Layout/Sidebar';

const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const Matches = () => {
  const { user, isOnline } = useAuth();
  const navigate = useNavigate();

  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [selected, setSelected] = useState(null);   // match chosen for request modal
  const [form,     setForm]     = useState({ skillOffered: '', skillRequested: '', message: '' });
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const isProfileComplete =
    user?.name &&
    user?.skillsOffered?.length > 0 &&
    user?.skillsWanted?.length  > 0;

  useEffect(() => {
    if (!isProfileComplete) { setLoading(false); return; }
    matchService.getMatches()
      .then((res) => setMatches(res.data.matches || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load matches'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const openModal = (match) => {
    setSelected(match);
    setSent(false);
    setForm({ skillOffered: user?.skillsOffered?.[0] || '', skillRequested: match.skillsOffered?.[0] || '', message: '' });
  };

  const sendRequest = async () => {
    if (!form.skillOffered || !form.skillRequested) return;
    setSending(true);
    try {
      await requestService.send({
        receiverId:     selected.id,
        skillOffered:   form.skillOffered,
        skillRequested: form.skillRequested,
        message:        form.message,
      });
      setSent(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  /* ── No profile ── */
  if (!isProfileComplete) {
    return (
      <div className="page-container">
        <div className="incomplete-banner">
          <span className="incomplete-banner-icon">🤖</span>
          <div className="incomplete-banner-text">
            <h4>Set up your profile to see matches</h4>
            <p>Add at least one skill you can teach and one skill you want to learn so our AI can find your perfect partners.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/profile')}>
            Go to Profile →
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading-spinner">🤖 AI is finding your best matches…</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🤖 AI Skill Matches</h1>
        <p>Real users matched by TF-IDF cosine similarity on your skill overlap.
          {matches.length > 0 && ` Found ${matches.length} partner${matches.length > 1 ? 's' : ''} for you.`}
        </p>
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(255,90,90,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {matches.length === 0 && !error && (
        <div className="empty-state-lg">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No matches found yet</div>
          <p style={{ color: 'var(--text3)', maxWidth: 400 }}>
            There are no other users with matching skills right now.
            Share SkillBarter with friends so they can join and you can match!
          </p>
        </div>
      )}

      <div className="matches-grid">
        {matches.map((m) => (
          <div key={m.id} className="match-card">
            {/* Header */}
            <div className="match-card-header">
              <div style={{ position: 'relative' }}>
                <AvatarCircle user={{ name: m.name, profileImage: m.profileImage }} size={46} />
                <div style={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 11, height: 11, borderRadius: '50%',
                  background: isOnline(m.id) ? 'var(--green)' : 'var(--text3)',
                  border: '2px solid var(--card)',
                }} title={isOnline(m.id) ? 'Online now' : m.lastSeen ? `Last seen ${new Date(m.lastSeen).toLocaleString()}` : 'Offline'} />
              </div>
              <div className="match-card-info">
                <h3>{m.name}</h3>
                <div className="reputation">⭐ {m.reputationScore?.toFixed(1) || '0.0'} · {m.reviewCount || 0} reviews</div>
                <div style={{ fontSize: 11, color: isOnline(m.id) ? 'var(--green)' : 'var(--text3)', marginTop: 2 }}>
                  {isOnline(m.id) ? '● Online now' : m.lastSeen ? `Last seen ${new Date(m.lastSeen).toLocaleDateString()}` : '○ Offline'}
                </div>
              </div>
              <div className="match-score-badge">
                {m.matchScore}%<br />
                <small>match</small>
              </div>
            </div>

            {/* Bio */}
            {m.bio && <p className="match-bio">{m.bio}</p>}

            {/* Skills */}
            <div className="skills-section">
              <div>
                <div className="skills-label">🎓 Can teach you</div>
                <div className="skill-tags">
                  {m.skillsOffered?.map((s) => (
                    <span key={s} className="skill-tag skill-tag-offered">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="skills-label">📚 Wants to learn</div>
                <div className="skill-tags">
                  {m.skillsWanted?.map((s) => (
                    <span key={s} className="skill-tag skill-tag-wanted">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Score breakdown */}
            <div className="match-scores-detail">
              <span>Overlap: {m.complementaryScore}%</span>
              {m.tfidfScore > 0 && <span>TF-IDF: {m.tfidfScore}%</span>}
            </div>

            {/* Actions */}
            <button className="btn btn-primary btn-full" onClick={() => openModal(m)}>
              ⚡ Request Barter
            </button>
          </div>
        ))}
      </div>

      {/* ── Barter Request Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <div className="modal-success">
                <div style={{ fontSize: 52 }}>✅</div>
                <h3>Request Sent!</h3>
                <p style={{ color: 'var(--text2)', marginBottom: 20 }}>
                  {selected.name} will be notified instantly via real-time notification.
                </p>
                <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
              </div>
            ) : (
              <>
                <h2>Request Barter with {selected.name}</h2>

                <div className="form-group">
                  <label>You will teach (pick from your skills)</label>
                  <select
                    value={form.skillOffered}
                    onChange={(e) => setForm({ ...form, skillOffered: e.target.value })}
                  >
                    <option value="">— Select a skill you offer —</option>
                    {user?.skillsOffered?.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>You want to learn from {selected.name}</label>
                  <select
                    value={form.skillRequested}
                    onChange={(e) => setForm({ ...form, skillRequested: e.target.value })}
                  >
                    <option value="">— Select a skill to request —</option>
                    {selected.skillsOffered?.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Personal message (optional)</label>
                  <textarea
                    placeholder="Introduce yourself or explain why you'd be a great barter partner…"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    onClick={sendRequest}
                    disabled={!form.skillOffered || !form.skillRequested || sending}
                  >
                    {sending ? 'Sending…' : 'Send Request ⚡'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;
