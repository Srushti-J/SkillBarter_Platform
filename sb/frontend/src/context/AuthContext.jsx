/**
 * AuthContext — Global auth state + Socket.io connection
 *
 * This is the SINGLE socket connection for the whole app.
 * It's created when the user logs in and destroyed on logout.
 * Components can subscribe to socket events via the context.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'skillbarter_user';

export const AuthProvider = ({ children }) => {
  const [user,     setUser]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const socketRef  = useRef(null);

  // ── Notification badges (shown on nav) ─────────────────────────────────────
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [newMessageCount, setNewMessageCount] = useState(0);

  // ── Online users list ───────────────────────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState([]);

  // ── Connect socket after login ──────────────────────────────────────────────
  const connectSocket = useCallback((userId) => {
    if (socketRef.current) return; // already connected

    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      // Join own userId room so we receive targeted events
      socket.emit('user_online', userId);
    });

    // Real-time: someone sent us a barter request
    socket.on('new_request', () => {
      setNewRequestCount((n) => n + 1);
    });

    // Real-time: our request was accepted/rejected
    socket.on('request_status_changed', (request) => {
      if (request.requestStatus === 'accepted') {
        // Could show a toast — for now we just refresh badge
        setNewRequestCount((n) => Math.max(n - 1, 0));
      }
    });

    // Real-time: we received a message
    socket.on('receive_message', () => {
      setNewMessageCount((n) => n + 1);
    });

    // Online users list updated
    socket.on('online_users', (userIds) => {
      setOnlineUsers(userIds);
    });

    socketRef.current = socket;
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // ── Load user from localStorage on app start ────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Set default header for axios
        api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
        connectSocket(parsed._id);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, [connectSocket]);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    connectSocket(userData._id);
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    delete api.defaults.headers.common['Authorization'];
    disconnectSocket();
    setOnlineUsers([]);
    setNewRequestCount(0);
    setNewMessageCount(0);
  };

  // ── Update user in context (after profile save) ─────────────────────────────
  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // ── Clear notification badges ───────────────────────────────────────────────
  const clearRequestBadge = () => setNewRequestCount(0);
  const clearMessageBadge = () => setNewMessageCount(0);

  const isOnline = (userId) => onlineUsers.includes(userId?.toString());

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, updateUser,
      socket: socketRef.current,
      onlineUsers, isOnline,
      newRequestCount, newMessageCount,
      clearRequestBadge, clearMessageBadge,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
