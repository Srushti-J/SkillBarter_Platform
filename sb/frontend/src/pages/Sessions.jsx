/**
 * Sessions Page — View and manage learning sessions
 */
import React, { useEffect, useState } from 'react';
import { sessionService, reviewService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AvatarCircle } from '../components/Layout/Sidebar';

const Sessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [reviewing, setReviewing] = useState(null);   // session being reviewed
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    sessionService.getAll()
      .then((res) => setSessions(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await sessionService.updateStatus(id, status);
      setSessions((prev) =>
        prev.map((s) => s._id === id ? { ...s, sessionStatus: status } : s)
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const submitReview = async () => {
    const partner = reviewing.user1?._id === user._id ? reviewing.user2 : reviewing.user1;
    setSubmitting(true);
    try {
      await reviewService.submit({
        reviewedUserId: partner._id,
        sessionId:      reviewing._id,
        rating:         reviewForm.rating,
        comment:        reviewForm.comment,
      });
      alert('✅ Review submitted! Thank you.');
      setReviewing(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Review failed');
    } finally {
      setSubmitting(false);
    }
  };

  const upcoming  = sessions.filter((s) => s.sessionStatus === 'scheduled');
  const completed = sessions.filter((s) => s.sessionStatus === 'completed');
  const cancelled = sessions.filter((s) => s.sessionStatus === 'cancelled');

  const SessionCard = ({ s }) => {
    const partner = s.user1?._id === user?._id ? s.user2 : s.user1;
    const date    = new Date(s.sessionDate);
    const isOwner = s.user1?._id === user?._id;

    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
        {/* Date block */}
        <div style={{ minWidth: 48, textAlign: 'center', background: 'var(--surface)', borderRadius: 10, padding: '8px 6px', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{date.getDate()}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>
            {date.toLocaleString('default', { month: 'short' })}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{s.skillName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <AvatarCircle user={partner} size={22} />
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>
              with {partner?.name || 'Partner'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {s.duration} min
          </div>
          {s.notes && (
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, fontStyle: 'italic' }}>📝 {s.notes}</div>
          )}
        </div>

        {/* Status + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end', flexShrink: 0 }}>
          <span className={`badge badge-${s.sessionStatus}`}>
            {s.sessionStatus === 'scheduled' ? '📅 Scheduled' :
             s.sessionStatus === 'completed' ? '✅ Completed' : '✕ Cancelled'}
          </span>

          {s.sessionStatus === 'scheduled' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-success" onClick={() => updateStatus(s._id, 'completed')}>
                Mark Complete
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => updateStatus(s._id, 'cancelled')}>
                Cancel
              </button>
            </div>
          )}

          {s.sessionStatus === 'completed' && (
            <button className="btn btn-sm btn-ghost" onClick={() => {
              setReviewing(s);
              setReviewForm({ rating: 5, comment: '' });
            }}>
              ⭐ Write Review
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-spinner">Loading sessions…</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📅 Sessions</h1>
        <p>Your scheduled and completed skill exchange sessions.</p>
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No sessions yet</div>
          <p>Accept a barter request and schedule a session with your partner.</p>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="card" style={{ marginBottom: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--violet)' }}>
                📅 Upcoming ({upcoming.length})
              </div>
              {upcoming.map((s) => <SessionCard key={s._id} s={s} />)}
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="card" style={{ marginBottom: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--green)' }}>
                ✅ Completed ({completed.length})
              </div>
              {completed.map((s) => <SessionCard key={s._id} s={s} />)}
            </div>
          )}

          {/* Cancelled */}
          {cancelled.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: 'var(--text3)' }}>
                ✕ Cancelled ({cancelled.length})
              </div>
              {cancelled.map((s) => <SessionCard key={s._id} s={s} />)}
            </div>
          )}
        </>
      )}

      {/* ── Review Modal ── */}
      {reviewing && (
        <div className="modal-overlay" onClick={() => setReviewing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>⭐ Write a Review</h2>
            <p style={{ color: 'var(--text2)', marginBottom: 20 }}>
              Rate your session: <strong style={{ color: '#fff' }}>{reviewing.skillName}</strong>
            </p>

            {/* Star rating */}
            <div className="form-group">
              <label>Rating</label>
              <div style={{ display: 'flex', gap: 8, fontSize: 32 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    style={{ cursor: 'pointer', color: star <= reviewForm.rating ? 'var(--orange)' : 'var(--text3)' }}
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  >★</span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Comment (optional)</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                placeholder="Share your experience…"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setReviewing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitReview} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Review ⭐'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;
