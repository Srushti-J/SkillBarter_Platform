/**
 * Requests Page — Real-time accept/reject + schedule session
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { requestService, sessionService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AvatarCircle } from '../components/Layout/Sidebar';

const Requests = () => {
  const { clearRequestBadge, socket } = useAuth();
  const [requests,  setRequests]  = useState({ sent: [], received: [] });
  const [loading,   setLoading]   = useState(true);
  const [scheduling, setScheduling] = useState(null);
  const [schedForm, setSchedForm]   = useState({ sessionDate: '', duration: 60 });
  const [schedSaving, setSchedSaving] = useState(false);

  /* Load all requests */
  const loadRequests = useCallback(() => {
    requestService.getAll()
      .then((res) => setRequests(res.data || { sent: [], received: [] }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRequests();
    clearRequestBadge();
  }, [loadRequests, clearRequestBadge]);

  /* Real-time: incoming new request → refresh list */
  useEffect(() => {
    if (!socket) return;
    const handler = () => loadRequests();
    socket.on('new_request', handler);
    socket.on('request_status_changed', handler);
    return () => {
      socket.off('new_request', handler);
      socket.off('request_status_changed', handler);
    };
  }, [socket, loadRequests]);

  /* Accept or reject a request */
  const updateStatus = async (id, status) => {
    try {
      const res = await requestService.updateStatus(id, status);
      setRequests((prev) => ({
        ...prev,
        received: prev.received.map((r) =>
          r._id === id ? { ...r, requestStatus: res.data.requestStatus } : r
        ),
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  /* Schedule a session after accepting */
  const scheduleSession = async () => {
    if (!schedForm.sessionDate) return;
    setSchedSaving(true);
    try {
      await sessionService.schedule({
        user2:       scheduling.senderId?._id,
        skillName:   scheduling.skillRequested,
        sessionDate: schedForm.sessionDate,
        duration:    schedForm.duration,
      });
      alert('✅ Session scheduled!');
      setScheduling(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Schedule failed');
    } finally {
      setSchedSaving(false);
    }
  };

  const statusBadge = (status) => {
    if (status === 'pending')  return <span className="badge badge-pending">Pending</span>;
    if (status === 'accepted') return <span className="badge badge-accepted">✓ Accepted</span>;
    return <span className="badge badge-rejected">✕ Rejected</span>;
  };

  /* Single request card */
  const RequestCard = ({ req, isReceived }) => {
    const other    = isReceived ? req.senderId   : req.receiverId;
    const isPending = req.requestStatus === 'pending';
    const isAccepted = req.requestStatus === 'accepted';

    return (
      <div className="request-card">
        <div className="request-card-inner">
          <AvatarCircle user={other} size={38} />

          <div className="request-info">
            <div className="request-name">{other?.name || 'Unknown user'}</div>
            <div className="request-skills">
              <span className="skill-tag skill-tag-offered">{req.skillOffered}</span>
              <span style={{ color: 'var(--text3)' }}>↔</span>
              <span className="skill-tag skill-tag-wanted">{req.skillRequested}</span>
            </div>
            {req.message && (
              <div style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', marginTop: 4 }}>
                "{req.message}"
              </div>
            )}
            <div className="request-date">
              {new Date(req.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end', flexShrink: 0 }}>
            {statusBadge(req.requestStatus)}

            {/* Receiver actions on pending */}
            {isReceived && isPending && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-success" onClick={() => updateStatus(req._id, 'accepted')}>
                  ✓ Accept
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => updateStatus(req._id, 'rejected')}>
                  ✕ Reject
                </button>
              </div>
            )}

            {/* After acceptance: schedule + chat */}
            {isReceived && isAccepted && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-primary" onClick={() => setScheduling(req)}>
                  📅 Schedule
                </button>
                <Link to={`/chat/${other?._id}`} className="btn btn-sm btn-ghost">
                  💬 Chat
                </Link>
              </div>
            )}

            {/* Sender: chat button after acceptance */}
            {!isReceived && isAccepted && (
              <Link to={`/chat/${other?._id}`} className="btn btn-sm btn-ghost">
                💬 Chat
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-spinner">Loading requests…</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>⚡ Barter Requests</h1>
        <p>Accept requests to unlock chat and schedule skill sessions.</p>
      </div>

      <div className="requests-tabs">
        <div className="requests-section">
          <h3>📥 Received ({requests.received.length})</h3>
          {requests.received.length === 0
            ? <div className="empty-state">No requests received yet. Get matched and let others find you!</div>
            : requests.received.map((r) => <RequestCard key={r._id} req={r} isReceived />)
          }
        </div>

        <div className="requests-section">
          <h3>📤 Sent ({requests.sent.length})</h3>
          {requests.sent.length === 0
            ? <div className="empty-state">You haven't sent any requests yet. Find partners in AI Matches!</div>
            : requests.sent.map((r) => <RequestCard key={r._id} req={r} isReceived={false} />)
          }
        </div>
      </div>

      {/* ── Schedule Session Modal ── */}
      {scheduling && (
        <div className="modal-overlay" onClick={() => setScheduling(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>📅 Schedule Session</h2>
            <p style={{ color: 'var(--text2)', marginBottom: 20 }}>
              With <strong style={{ color: '#fff' }}>{scheduling.senderId?.name}</strong> · Skill: <strong style={{ color: 'var(--violet)' }}>{scheduling.skillRequested}</strong>
            </p>

            <div className="form-group">
              <label>Date & Time</label>
              <input
                type="datetime-local"
                value={schedForm.sessionDate}
                onChange={(e) => setSchedForm({ ...schedForm, sessionDate: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                value={schedForm.duration}
                min={15} max={180} step={15}
                onChange={(e) => setSchedForm({ ...schedForm, duration: Number(e.target.value) })}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setScheduling(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={scheduleSession}
                disabled={!schedForm.sessionDate || schedSaving}
              >
                {schedSaving ? 'Saving…' : '📅 Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
