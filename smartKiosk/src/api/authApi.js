// src/api/authApi.js

const BASE_URL = 'http://127.0.0.1:8000'; // Django backend URL

// ------- Session-based login (for kiosk) -------
export async function loginWithSession(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // important: send/receive cookies
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data.user; // { id, email, fullName, ... }
}

// ------- Registration (for kiosk) -------
export async function registerWithSession(email, password, fullName) {
  const res = await fetch(`${BASE_URL}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, fullName }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  return data.user;
}

// ------- JWT login (for mobile later) -------
export async function loginWithJwt(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/jwt/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || 'JWT login failed');
  }

  return data; // { access, refresh }
}

// ------- Get current user via session cookie (for kiosk/dashboard) -------
export async function getSessionUser() {
  const res = await fetch(`${BASE_URL}/api/auth/me/`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    // 401/403 means "not logged in"
    return null;
  }

  const data = await res.json();
  return data.user || null; // { id, email, fullName, ... } or null
}

// ------- Logout session (for kiosk) -------
export async function logoutSession() {
  // We don't really care about the response body; just fire and forget
  await fetch(`${BASE_URL}/api/auth/logout/`, {
    method: 'POST',
    credentials: 'include',
  });
}
