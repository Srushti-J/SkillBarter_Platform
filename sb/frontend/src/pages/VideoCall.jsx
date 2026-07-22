/**
 * VideoCall.jsx
 * ==============
 * Complete WebRTC peer-to-peer video calling.
 *
 * HOW IT WORKS:
 *   - The server (Socket.io) only relays signaling messages (SDP + ICE).
 *   - Real audio/video travels directly peer-to-peer — the server never sees it.
 *
 * CALL FLOW:
 *   Caller:
 *     1. getUserMedia → create RTCPeerConnection
 *     2. createOffer  → setLocalDescription
 *     3. emit 'video:call' with offer
 *     4. Receive 'video:answered' → setRemoteDescription
 *
 *   Callee:
 *     1. Receive 'video:incoming' → show ringing UI
 *     2. Accept → getUserMedia → create RTCPeerConnection
 *     3. setRemoteDescription(offer)
 *     4. createAnswer → setLocalDescription
 *     5. emit 'video:answer'
 *
 *   Both sides:
 *     - Exchange ICE candidates via 'video:ice'
 *     - When remote track arrives → show in remoteVideoRef
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/api';

/* Public STUN servers — enough for same-network or standard NAT.
   Add TURN server credentials here for production deployments. */
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

/* Call states */
const STATE = {
  IDLE:      'idle',        // page loaded, not in a call
  CALLING:   'calling',     // we placed a call, waiting for answer
  INCOMING:  'incoming',    // someone is calling us
  CONNECTED: 'connected',   // call is live
  ENDED:     'ended',       // call finished
};

export default function VideoCall() {
  const { userId: calleeId } = useParams();   // person we want to call
  const { user, socket }    = useAuth();
  const navigate            = useNavigate();

  /* ── state ── */
  const [callState,   setCallState]   = useState(STATE.IDLE);
  const [partner,     setPartner]     = useState(null);
  const [incomingData, setIncomingData] = useState(null); // { from, fromName, offer }
  const [isMuted,     setIsMuted]     = useState(false);
  const [isCamOff,    setIsCamOff]    = useState(false);
  const [isSharing,   setIsSharing]   = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [callerId,    setCallerId]    = useState(null); // who called us

  /* ── refs ── */
  const localVideoRef    = useRef(null);
  const remoteVideoRef   = useRef(null);
  const peerRef          = useRef(null);   // RTCPeerConnection
  const localStreamRef   = useRef(null);   // our camera/mic stream
  const screenStreamRef  = useRef(null);   // screen-share stream
  const timerRef         = useRef(null);
  const iceCandidateQueue= useRef([]);     // ICE candidates queued before remote desc

  /* ── Load partner profile ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (calleeId) {
      profileService.getProfile(calleeId)
        .then(r => setPartner(r.data))
        .catch(() => setErrorMsg('Could not load partner profile.'));
    }
  }, [calleeId]);

  /* ── Call duration timer ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (callState === STATE.CONNECTED) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* ── Get camera + microphone ─────────────────────────────────────────────── */
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera/microphone permission denied. Allow access in your browser and try again.'
        : err.name === 'NotFoundError'
        ? 'No camera or microphone found on this device.'
        : `Could not access media: ${err.message}`;
      setErrorMsg(msg);
      throw err;
    }
  }, []);

  /* ── Create RTCPeerConnection ─────────────────────────────────────────────── */
  const createPeer = useCallback((stream, targetId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    /* Add our local tracks */
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    /* Remote track arrives → show in remote video */
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
      setCallState(STATE.CONNECTED);
    };

    /* Send our ICE candidates to the remote peer */
    pc.onicecandidate = (e) => {
      if (e.candidate && targetId && socket) {
        socket.emit('video:ice', { to: targetId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('PeerConnection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCall(false);
      }
    };

    peerRef.current = pc;
    return pc;
  }, [socket]); // eslint-disable-line

  /* ── Drain ICE candidate queue ────────────────────────────────────────────── */
  const drainIceCandidates = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc) return;
    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift();
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    }
  }, []);

  /* ── End / cleanup call ───────────────────────────────────────────────────── */
  const endCall = useCallback((notifyPeer = true) => {
    const target = callerId || calleeId;

    if (notifyPeer && target && socket) {
      socket.emit('video:end', { to: target });
    }

    /* Stop all tracks */
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());

    /* Close peer connection */
    peerRef.current?.close();
    peerRef.current       = null;
    localStreamRef.current  = null;
    screenStreamRef.current = null;
    iceCandidateQueue.current = [];

    /* Clear video elements */
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setCallState(STATE.ENDED);
    setIsSharing(false);
  }, [callerId, calleeId, socket]);

  /* ── Socket.io event listeners ────────────────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    /* Someone is calling us */
    const onIncoming = ({ from, fromName, offer }) => {
      console.log('Incoming call from', fromName);
      setCallerId(from);
      setIncomingData({ from, fromName, offer });
      setCallState(STATE.INCOMING);
      // If partner info not loaded yet, set a placeholder name
      if (!partner) setPartner({ name: fromName, _id: from });
    };

    /* Our call was answered */
    const onAnswered = async ({ answer }) => {
      try {
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        await drainIceCandidates();
      } catch (err) {
        console.error('setRemoteDescription error:', err);
      }
    };

    /* ICE candidate from remote peer */
    const onIce = async ({ candidate }) => {
      const pc = peerRef.current;
      if (!pc) return;
      if (pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      } else {
        // Queue until remote description is set
        iceCandidateQueue.current.push(candidate);
      }
    };

    /* Remote peer hung up */
    const onEnded   = () => endCall(false);

    /* Our call was rejected */
    const onRejected = () => {
      setCallState(STATE.ENDED);
      setErrorMsg(`${partner?.name || 'User'} rejected the call.`);
    };

    socket.on('video:incoming', onIncoming);
    socket.on('video:answered', onAnswered);
    socket.on('video:ice',      onIce);
    socket.on('video:ended',    onEnded);
    socket.on('video:rejected', onRejected);

    return () => {
      socket.off('video:incoming', onIncoming);
      socket.off('video:answered', onAnswered);
      socket.off('video:ice',      onIce);
      socket.off('video:ended',    onEnded);
      socket.off('video:rejected', onRejected);
    };
  }, [socket, partner, endCall, drainIceCandidates]);

  /* ── Cleanup on unmount ───────────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      peerRef.current?.close();
    };
  }, []);

  /* ════════════════════════════════════════════════════════════════════════════
     ACTION HANDLERS
  ═══════════════════════════════════════════════════════════════════════════ */

  /* Start a call to calleeId */
  const startCall = async () => {
    setErrorMsg('');
    try {
      const stream = await getLocalStream();
      const pc     = createPeer(stream, calleeId);

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);

      socket.emit('video:call', {
        to:       calleeId,
        from:     user._id,
        fromName: user.name,
        offer,
      });

      setCallState(STATE.CALLING);
    } catch (err) {
      console.error('startCall error:', err);
      // errorMsg already set by getLocalStream
    }
  };

  /* Accept an incoming call */
  const acceptCall = async () => {
    setErrorMsg('');
    try {
      const stream = await getLocalStream();
      const pc     = createPeer(stream, incomingData.from);

      await pc.setRemoteDescription(new RTCSessionDescription(incomingData.offer));
      await drainIceCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('video:answer', { to: incomingData.from, answer });
      setCallState(STATE.CONNECTED);
    } catch (err) {
      console.error('acceptCall error:', err);
    }
  };

  /* Reject an incoming call */
  const rejectCall = () => {
    socket.emit('video:reject', { to: incomingData.from });
    setCallState(STATE.IDLE);
    setIncomingData(null);
  };

  /* Toggle microphone */
  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(m => !m);
  };

  /* Toggle camera */
  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isCamOff; });
    setIsCamOff(c => !c);
  };

  /* Toggle screen share */
  const toggleScreenShare = async () => {
    if (!isSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = peerRef.current?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

        screenTrack.addEventListener('ended', () => {
          /* User closed the share picker */
          toggleScreenShare();
        }, { once: true });

        setIsSharing(true);
      } catch (err) {
        console.error('Screen share error:', err);
      }
    } else {
      /* Stop sharing — restore camera */
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      const sender   = peerRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender && camTrack) await sender.replaceTrack(camTrack);

      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;

      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setIsSharing(false);
    }
  };

  /* ════════════════════════════════════════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════════════════════════════════════ */

  const displayName = partner?.name || 'Partner';
  const initials    = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getStatusText = () => {
    switch (callState) {
      case STATE.CALLING:   return 'Calling…';
      case STATE.CONNECTED: return `🟢 ${fmt(elapsed)}`;
      case STATE.ENDED:     return 'Call ended';
      default:              return 'Ready to call';
    }
  };

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div style={styles.page}>

      {/* ── Incoming call overlay ── */}
      {callState === STATE.INCOMING && (
        <div style={styles.incomingOverlay}>
          <div style={styles.incomingCard}>
            <div style={styles.incomingRings}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ ...styles.ring, animationDelay: `${i * 0.3}s` }} />
              ))}
              <div style={styles.incomingAvatar}>{initials}</div>
            </div>
            <div style={styles.incomingLabel}>Incoming video call</div>
            <div style={styles.incomingName}>{incomingData?.fromName || displayName}</div>
            <div style={styles.incomingActions}>
              <button style={styles.rejectBtn} onClick={rejectCall} title="Reject">
                📵
              </button>
              <button style={styles.acceptBtn} onClick={acceptCall} title="Accept">
                📞
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main call UI ── */}
      <div style={styles.callContainer}>

        {/* Remote video (full size) */}
        <div style={styles.remoteVideo}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              ...styles.videoEl,
              display: callState === STATE.CONNECTED ? 'block' : 'none',
            }}
          />

          {/* Placeholder / ringing animation when not connected */}
          {callState !== STATE.CONNECTED && (
            <div style={styles.placeholder}>
              {callState === STATE.CALLING && (
                <div style={styles.callingRings}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ ...styles.callingRing, animationDelay: `${i * 0.4}s` }} />
                  ))}
                </div>
              )}
              <div style={styles.placeholderAvatar}>{initials}</div>
              <div style={styles.placeholderName}>{displayName}</div>
              <div style={styles.placeholderStatus}>{getStatusText()}</div>
            </div>
          )}

          {/* Call duration badge */}
          {callState === STATE.CONNECTED && (
            <div style={styles.durationBadge}>{fmt(elapsed)}</div>
          )}

          {/* Local video PiP (picture-in-picture) */}
          <div style={styles.pipContainer}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                ...styles.pipVideo,
                display: isCamOff ? 'none' : 'block',
              }}
            />
            {isCamOff && (
              <div style={styles.pipPlaceholder}>📷</div>
            )}
            <div style={styles.pipLabel}>You {isSharing ? '(screen)' : ''}</div>
          </div>
        </div>

        {/* ── Controls bar ── */}
        <div style={styles.controls}>

          {/* Start call button (only shown when idle) */}
          {callState === STATE.IDLE && calleeId && (
            <button style={styles.startBtn} onClick={startCall}>
              📹 Start Video Call
            </button>
          )}

          {/* In-call controls */}
          {(callState === STATE.CALLING || callState === STATE.CONNECTED) && (
            <>
              <CtrlButton
                icon={isMuted ? '🔇' : '🎙'}
                label={isMuted ? 'Unmute' : 'Mute'}
                active={isMuted}
                onClick={toggleMute}
              />
              <CtrlButton
                icon={isCamOff ? '📷' : '📹'}
                label={isCamOff ? 'Camera On' : 'Camera Off'}
                active={isCamOff}
                onClick={toggleCam}
              />
              {callState === STATE.CONNECTED && (
                <CtrlButton
                  icon="🖥"
                  label={isSharing ? 'Stop Share' : 'Share Screen'}
                  active={isSharing}
                  onClick={toggleScreenShare}
                />
              )}
              <button style={styles.endBtn} onClick={() => endCall(true)} title="End call">
                📵
              </button>
            </>
          )}

          {/* Back button */}
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={styles.errorBox}>{errorMsg}</div>
        )}

        {/* Call ended screen */}
        {callState === STATE.ENDED && (
          <div style={styles.endedBox}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>📞</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: '#fff' }}>
              Call ended {elapsed > 0 ? `· ${fmt(elapsed)}` : ''}
            </div>
            <button style={styles.startBtn} onClick={() => { setCallState(STATE.IDLE); setElapsed(0); setErrorMsg(''); }}>
              Call again
            </button>
          </div>
        )}
      </div>

      <style>{ringAnimation}</style>
    </div>
  );
}

/* ── Small control button ── */
function CtrlButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.ctrlBtn,
        background: active ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${active ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.15)'}`,
        color: active ? '#F43F5E' : 'rgba(255,255,255,0.8)',
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 11 }}>{label}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════════════ */
const styles = {
  page: {
    minHeight: '100vh',
    background: '#07070E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'Inter, sans-serif',
  },
  callContainer: {
    width: '100%',
    maxWidth: 900,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  remoteVideo: {
    width: '100%',
    aspectRatio: '16/9',
    background: '#0D0D1A',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(124,110,250,0.2)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  videoEl: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderAvatar: {
    width: 90, height: 90, borderRadius: '50%',
    background: 'rgba(124,110,250,0.2)',
    border: '3px solid rgba(124,110,250,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, fontWeight: 800, color: '#9B8FFF',
    position: 'relative', zIndex: 1,
  },
  placeholderName: { fontSize: 22, fontWeight: 700, color: '#fff', zIndex: 1 },
  placeholderStatus: { fontSize: 14, color: 'rgba(255,255,255,0.5)', zIndex: 1 },

  callingRings: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  callingRing: {
    position: 'absolute',
    borderRadius: '50%',
    border: '2px solid rgba(124,110,250,0.2)',
    animation: 'pulseRing 2s ease-out infinite',
  },

  durationBadge: {
    position: 'absolute', top: 14, left: 14,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
    borderRadius: 8, padding: '5px 12px',
    color: '#2ECC8F', fontSize: 13, fontWeight: 700,
  },

  pipContainer: {
    position: 'absolute', bottom: 14, right: 14,
    width: 160, height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.2)',
    background: '#1A1A28',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  pipVideo: {
    width: '100%', height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // mirror local video
  },
  pipPlaceholder: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, background: '#1A1A28',
  },
  pipLabel: {
    position: 'absolute', bottom: 4, left: 0, right: 0,
    textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.6)',
    background: 'rgba(0,0,0,0.4)',
    padding: '2px 0',
  },

  controls: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 12, flexWrap: 'wrap',
  },
  ctrlBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '12px 18px', borderRadius: 12,
    cursor: 'pointer', transition: 'all 0.15s',
    minWidth: 68,
  },
  startBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 28px', borderRadius: 12,
    background: '#2ECC8F', border: 'none',
    color: '#fff', fontWeight: 700, fontSize: 15,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(46,204,143,0.4)',
    transition: 'all 0.15s',
    fontFamily: 'Inter, sans-serif',
  },
  endBtn: {
    width: 58, height: 58, borderRadius: '50%',
    background: '#F43F5E', border: 'none',
    fontSize: 22, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(244,63,94,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 0.15s',
  },
  backBtn: {
    padding: '12px 20px', borderRadius: 12,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 600, fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  },
  errorBox: {
    padding: '12px 18px',
    background: 'rgba(244,63,94,0.12)',
    border: '1px solid rgba(244,63,94,0.3)',
    borderRadius: 10,
    color: '#F43F5E', fontSize: 13, textAlign: 'center',
  },
  endedBox: {
    textAlign: 'center', padding: '20px 0',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },

  /* Incoming call overlay */
  incomingOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999,
  },
  incomingCard: {
    background: '#141422',
    border: '1px solid rgba(124,110,250,0.25)',
    borderRadius: 22, padding: '40px 48px',
    textAlign: 'center',
    boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
  },
  incomingRings: {
    position: 'relative', width: 96, height: 96,
    margin: '0 auto 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: '50%',
    border: '2px solid rgba(46,204,143,0.35)',
    animation: 'pulseRing 1.6s ease-out infinite',
  },
  incomingAvatar: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'rgba(46,204,143,0.15)',
    border: '3px solid #2ECC8F',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontWeight: 800, color: '#2ECC8F',
    position: 'relative', zIndex: 1,
  },
  incomingLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
  incomingName:  { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 28 },
  incomingActions: { display: 'flex', gap: 24, justifyContent: 'center' },
  rejectBtn: {
    width: 60, height: 60, borderRadius: '50%',
    background: '#F43F5E', border: 'none', fontSize: 22,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(244,63,94,0.4)',
  },
  acceptBtn: {
    width: 60, height: 60, borderRadius: '50%',
    background: '#2ECC8F', border: 'none', fontSize: 22,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(46,204,143,0.4)',
  },
};

const ringAnimation = `
@keyframes pulseRing {
  0%   { width: 72px; height: 72px; opacity: 0.8; }
  100% { width: 200px; height: 200px; opacity: 0; }
}
`;
