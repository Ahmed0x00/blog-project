// js/session.js — JWT session management

const TOKEN_KEY = 'blog_token';

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = parseJwtPayload(token);
    if (!payload || !payload.exp) return false;
    return Date.now() / 1000 < payload.exp;
  } catch {
    return false;
  }
}

export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = parseJwtPayload(token);
    if (!payload) return null;
    return {
      id:   parseInt(payload.sub),
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function getUserRole() {
  const user = getCurrentUser();
  return user ? user.role : null;
}

function parseJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(json);
}
