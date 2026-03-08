// src/api/authApi.js
import { API_BASE } from './api';

// ------------------------------------------------------------
// LOGIN USING DJANGO SESSION AUTH   (/api/login/)
// ------------------------------------------------------------
export async function loginWithSession(email, password) {
  const res = await fetch(`${API_BASE}/api/login/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return {
    ok: true,
    id: data.id,
    fullName: data.fullName,
    email: data.email,
    isAdmin: data.isAdmin,
    mustSetPassword: data.mustSetPassword ?? false,
  };
}

// ------------------------------------------------------------
// GET CURRENT LOGGED-IN USER FROM DJANGO SESSION  (/api/me/)
// ------------------------------------------------------------
export async function getSessionUser() {
  try {
    const res = await fetch(`${API_BASE}/api/me/`, {
      credentials: 'include',
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.ok || !data.user) return null;

    return data.user; // { id, email, fullName }
  } catch (err) {
    console.log('getSessionUser() failed:', err);
    return null;
  }
}

// ------------------------------------------------------------
// LOGOUT SESSION
// ------------------------------------------------------------
export async function logoutSession() {
  await fetch(`${API_BASE}/api/logout/`, {
    method: 'POST',
    credentials: 'include',
  });
}

// ------------------------------------------------------------
// REGISTER NEW USER
// ------------------------------------------------------------
export async function registerWithSession(fullName, email, password) {
  const res = await fetch(`${API_BASE}/api/register/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fullName, email, password }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Registration failed');

  return data;
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/api/password-reset/request/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Unable to send reset code.');
  }

  return data;
}
