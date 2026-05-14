// js/api.js — API client wrapper matched to the FastAPI backend

const BASE_URL = 'http://localhost:8000';

import { getToken, removeToken, saveToken } from './session.js';
import { showToast } from './toast.js';

/**
 * Core fetch wrapper. Attaches Bearer token, handles errors.
 */
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  // Only set Content-Type to JSON when not sending form data
  if (!(options.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    removeToken();
    window.location.hash = '#/login';
    showToast('Session expired. Please log in again.', 'error');
    throw new Error('Unauthorized');
  }

  if (res.status === 204) return null; // No content

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.detail || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────
export async function apiRegister(username, email, password) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

/**
 * Login uses OAuth2PasswordRequestForm → must be x-www-form-urlencoded.
 * Backend field is 'username' but accepts the email value.
 */
export async function apiLogin(email, password) {
  const body = new URLSearchParams();
  body.set('username', email); // Backend uses username field for email
  body.set('password', password);

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Login failed');
  }

  const data = await res.json();
  saveToken(data.access_token);
  return data;
}

export async function apiGetMe() {
  return request('/api/auth/me');
}

// ── Posts ─────────────────────────────────────────────────────
export async function apiGetPosts(page = 1, size = 10) {
  return request(`/api/posts?page=${page}&size=${size}`);
}

export async function apiGetPost(id) {
  return request(`/api/posts/${id}`);
}

export async function apiCreatePost(title, content) {
  return request('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  });
}

export async function apiUpdatePost(id, title, content) {
  return request(`/api/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content }),
  });
}

export async function apiDeletePost(id) {
  return request(`/api/posts/${id}`, { method: 'DELETE' });
}

// ── Comments ──────────────────────────────────────────────────
export async function apiGetComments(postId, page = 1, size = 20) {
  return request(`/api/posts/${postId}/comments?page=${page}&size=${size}`);
}

export async function apiCreateComment(postId, content, parentId = null) {
  const body = { content };
  if (parentId !== null) body.parent_id = parentId;
  return request(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiUpdateComment(id, content) {
  return request(`/api/comments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function apiDeleteComment(id) {
  return request(`/api/comments/${id}`, { method: 'DELETE' });
}

// ── Users (Admin) ─────────────────────────────────────────────
export async function apiGetUsers(page = 1, size = 20) {
  return request(`/api/users?page=${page}&size=${size}`);
}

export async function apiDeleteUser(id) {
  return request(`/api/users/${id}`, { method: 'DELETE' });
}

export async function apiUpdateUserRole(id, role) {
  return request(`/api/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

// ── Health ────────────────────────────────────────────────────
export async function apiGetHealth() {
  return request('/api/health');
}
