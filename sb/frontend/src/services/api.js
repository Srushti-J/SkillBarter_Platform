/**
 * API Service — Centralized Axios configuration
 * All HTTP calls go through this file.
 */

import axios from 'axios';

// Base instance — reads URL from .env
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Attach JWT token automatically on every request
api.interceptors.request.use((config) => {
  const userData = localStorage.getItem('skillbarter_user');
  if (userData) {
    const { token } = JSON.parse(userData);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/auth/me'),
};

// ─── PROFILE ──────────────────────────────────────────────────────────────────
export const profileService = {
  getProfile:       (id)   => api.get(`/profile/${id}`),
  updateProfile:    (data) => api.put('/profile', data),
  getCompleteness:  ()     => api.get('/profile/completeness'),
  // Upload image: data must be a FormData object
  uploadImage:      (formData) =>
    api.post('/profile/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ─── SKILLS ───────────────────────────────────────────────────────────────────
export const skillService = {
  addOffered:    (skill) => api.post('/skills/offer',   { skill }),
  removeOffered: (skill) => api.delete('/skills/offer', { data: { skill } }),
  addWanted:     (skill) => api.post('/skills/want',    { skill }),
  removeWanted:  (skill) => api.delete('/skills/want',  { data: { skill } }),
};

// ─── MATCHING ─────────────────────────────────────────────────────────────────
export const matchService = {
  getMatches: () => api.get('/match'),
};

// ─── REQUESTS ─────────────────────────────────────────────────────────────────
export const requestService = {
  send:         (data)        => api.post('/requests', data),
  getAll:       ()            => api.get('/requests'),
  updateStatus: (id, status)  => api.put(`/requests/${id}/status`, { status }),
};

// ─── CHAT ─────────────────────────────────────────────────────────────────────
export const chatService = {
  sendMessage:     (data)   => api.post('/chat', data),
  getMessages:     (userId) => api.get(`/chat/${userId}`),
  getConversations:()       => api.get('/chat/conversations'),
};

// ─── SESSIONS ─────────────────────────────────────────────────────────────────
export const sessionService = {
  schedule:     (data)         => api.post('/sessions', data),
  getAll:       ()             => api.get('/sessions'),
  updateStatus: (id, status)   => api.put(`/sessions/${id}/status`, { status }),
};

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
export const reviewService = {
  submit:     (data)   => api.post('/reviews', data),
  getForUser: (userId) => api.get(`/reviews/user/${userId}`),
};

// ─── USERS / ONLINE STATUS ────────────────────────────────────────────────────
export const userService = {
  getOnlineUsers: ()   => api.get('/users/online'),
  getUserStatus:  (id) => api.get(`/users/${id}/status`),
};

export default api;
