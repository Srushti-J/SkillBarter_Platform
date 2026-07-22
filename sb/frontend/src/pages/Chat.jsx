/**
 * Chat Page — with Video Call button
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AvatarCircle } from '../components/Layout/Sidebar';

const Chat = () => {
  const { userId: urlUserId } = useParams();
  const { user, socket, isOnline, clearMessageBadge } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeId,  setActiveId]  = useState(urlUserId || null);
  const [partner,   setPartner]   = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [newMsg,    setNewMsg]    = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [chatError,   setChatError]   = useState('');
  const [incomingCall, setIncomingCall] = useState(null); // { from, fromName }

  const messagesEndRef   = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadConversations = useCallback(() => {
    chatService.getConversations()
      .then(res => setConversations(res.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadConversations();
    clearMessageBadge();
  }, [loadConversations, clearMessageBadge]);

  useEffect(() => {
    if (!activeId) return;
    setChatError('');
    setLoadingMsgs(true);
    chatService.getMessages(activeId)
      .then(res => {
        setMessages(res.data || []);
        const conv = conversations.find(c => c.partner._id === activeId);
        if (conv) setPartner(conv.partner);
      })
      .catch(err => {
        setChatError(err.response?.data?.message || 'Cannot open this chat');
        setMessages([]);
      })
      .finally(() => setLoadingMsgs(false));
  }, [activeId]); // eslint-disable-line

  /* Socket listeners */
  useEffect(() => {
    if (!socket) return;

    const onMessage = msg => {
      if (msg.senderId?.toString() === activeId || msg.senderId === activeId) {
        setMessages(prev => [...prev, msg]);
      }
      loadConversations();
    };
    const onTypingStart = () => setIsTyping(true);
    const onTypingStop  = () => setIsTyping(false);

    /* Incoming video call notification while in chat */
    const onVideoIncoming = ({ from, fromName }) => {
      setIncomingCall({ from, fromName });
    };
    const onVideoEnded   = () => setIncomingCall(null);
    const onVideoRejected= () => setIncomingCall(null);

    socket.on('receive_message', onMessage);
    socket.on('typing_start',    onTypingStart);
    socket.on('typing_stop',     onTypingStop);
    socket.on('video:incoming',  onVideoIncoming);
    socket.on('video:ended',     onVideoEnded);
    socket.on('video:rejected',  onVideoRejected);

    return () => {
      socket.off('receive_message', onMessage);
      socket.off('typing_start',    onTypingStart);
      socket.off('typing_stop',     onTypingStop);
      socket.off('video:incoming',  onVideoIncoming);
      socket.off('video:ended',     onVideoEnded);
      socket.off('video:rejected',  onVideoRejected);
    };
  }, [socket, activeId, loadConversations]);

  const handleSend = async () => {
    const text = newMsg.trim();
    if (!text || !activeId) return;

    const tempMsg = {
      _id: `temp_${Date.now()}`,
      senderId: user._id,
      receiverId: activeId,
      message: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMsg('');
    socket?.emit('typing_stop', { receiverId: activeId });

    try {
      await chatService.sendMessage({ receiverId: activeId, message: text });
      loadConversations();
    } catch (err) {
      setMessages(prev => prev.filter(m => m._id !== tempMsg._id));
      setNewMsg(text);
      alert(err.response?.data?.message || 'Message failed');
    }
  };

  const handleInputChange = e => {
    setNewMsg(e.target.value);
    if (!activeId || !socket) return;
    socket.emit('typing_start', { receiverId: activeId, senderName: user.name });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { receiverId: activeId });
    }, 2000);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const openConversation = conv => {
    setActiveId(conv.partner._id);
    setPartner(conv.partner);
    navigate(`/chat/${conv.partner._id}`);
    setIsTyping(false);
  };

  const formatLastSeen = lastSeen => {
    if (!lastSeen) return 'Offline';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(lastSeen).toLocaleDateString();
  };

  return (
    <div className="chat-layout">

      {/* ── Incoming call banner ── */}
      {incomingCall && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          zIndex: 500, background: '#141422', border: '1px solid rgba(46,204,143,0.4)',
          borderRadius: 14, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <span style={{ fontSize: 26 }}>📹</span>
          <div>
            <div style={{ fontWeight: 700, color: '#fff' }}>
              {incomingCall.fromName} is calling…
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Video call</div>
          </div>
          <button
            onClick={() => navigate(`/call/${incomingCall.from}`)}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#2ECC8F', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >Accept</button>
          <button
            onClick={() => { socket?.emit('video:reject', { to: incomingCall.from }); setIncomingCall(null); }}
            style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#F43F5E', fontWeight: 700, cursor: 'pointer' }}
          >Reject</button>
        </div>
      )}

      {/* ── Conversations sidebar ── */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">💬 Messages</div>
        <div className="conversation-list">
          {conversations.length === 0 && (
            <div className="empty-state" style={{ padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <p>No conversations yet.</p>
              <p style={{ marginTop: 6 }}>Accept a barter request to start chatting!</p>
            </div>
          )}
          {conversations.map(conv => (
            <div
              key={conv.partner._id}
              className={`conversation-item${activeId === conv.partner._id ? ' active' : ''}`}
              onClick={() => openConversation(conv)}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <AvatarCircle user={conv.partner} size={38} />
                <div style={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 10, height: 10, borderRadius: '50%',
                  background: isOnline(conv.partner._id) ? 'var(--green)' : 'var(--text3)',
                  border: '2px solid var(--bg2)',
                }} />
              </div>
              <div className="conversation-info">
                <div className="conversation-name">{conv.partner.name}</div>
                <div className="conversation-last">{conv.lastMessage || 'Start chatting!'}</div>
              </div>
              {conv.unreadCount > 0 && (
                <div className="unread-badge">{conv.unreadCount}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      {!activeId ? (
        <div className="chat-empty-state">
          <span>💬</span>
          <p style={{ fontWeight: 600, color: 'var(--text2)' }}>Select a conversation</p>
          <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', maxWidth: 260 }}>
            Chat is available after a barter request is accepted.
          </p>
        </div>
      ) : (
        <div className="chat-area">
          {/* Header */}
          <div className="chat-header">
            <div style={{ position: 'relative' }}>
              <AvatarCircle user={partner} size={38} />
              <div style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 10, height: 10, borderRadius: '50%',
                background: isOnline(activeId) ? 'var(--green)' : 'var(--text3)',
                border: '2px solid var(--bg2)',
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="chat-partner-name">{partner?.name || 'Loading…'}</div>
              <div className={isOnline(activeId) ? 'chat-partner-status' : 'chat-partner-offline'}>
                {isOnline(activeId) ? '● Online now' : `Last seen ${formatLastSeen(partner?.lastSeen)}`}
              </div>
            </div>
            {/* Video call button */}
            <button
              onClick={() => navigate(`/call/${activeId}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 9,
                background: 'rgba(46,204,143,0.12)',
                border: '1px solid rgba(46,204,143,0.25)',
                color: 'var(--green)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(46,204,143,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(46,204,143,0.12)'}
            >
              📹 Video Call
            </button>
          </div>

          {chatError && (
            <div style={{ padding: '14px 20px', background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13 }}>
              ⛔ {chatError}
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages">
            {loadingMsgs && <div className="loading-spinner">Loading…</div>}
            {!loadingMsgs && messages.length === 0 && !chatError && (
              <div style={{ textAlign: 'center', color: 'var(--text3)', marginTop: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                <p>Say hello!</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.senderId?.toString() === user._id?.toString() ||
                            msg.senderId === user._id;
              const showTime = i === 0 ||
                new Date(msg.createdAt) - new Date(messages[i - 1]?.createdAt) > 5 * 60 * 1000;
              return (
                <React.Fragment key={msg._id || i}>
                  {showTime && (
                    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', margin: '8px 0' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div className={`message-row${isOwn ? ' message-own' : ' message-other'}`}>
                    {!isOwn && <AvatarCircle user={partner} size={26} />}
                    <div className={`message-bubble${isOwn ? ' bubble-own' : ' bubble-other'}`}
                      style={{ marginLeft: isOwn ? 0 : 8 }}>
                      <div className="message-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            {isTyping && (
              <div className="message-row message-other">
                <AvatarCircle user={partner} size={26} />
                <div className="message-bubble bubble-other" style={{ marginLeft: 8 }}>
                  <div className="typing-dots"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {!chatError && (
            <div className="chat-input-area">
              <textarea
                className="chat-input"
                rows={1}
                value={newMsg}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
              />
              <button className="btn btn-primary" onClick={handleSend} disabled={!newMsg.trim()} style={{ flexShrink: 0 }}>
                Send ➤
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;
