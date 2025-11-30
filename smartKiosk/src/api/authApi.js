// src/api/authApi.js
// ------------------------------------------------------------
// FINAL VERSION — FIXED FOR DJANGO SESSION AUTH + ROOM RESERVATION
// ------------------------------------------------------------

const BASE_URL = '';

// ------------------------------------------------------------
// LOGIN USING DJANGO SESSION AUTH   (/api/login/)
// ------------------------------------------------------------
export async function loginWithSession(email, password) {
  const res = await fetch(`/api/login/`, {
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

  // ⭐ RETURN FULL LOGIN PAYLOAD (critical)
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
    const res = await fetch(`${BASE_URL}/api/me/`, {
      credentials: 'include', // SEND COOKIE
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
  await fetch(`${BASE_URL}/api/logout/`, {
    method: 'POST',
    credentials: 'include', // remove session cookie
  });
}

// ------------------------------------------------------------
// OPTIONAL — REGISTER NEW USER (if you create /register/ later)
// ------------------------------------------------------------
export async function registerWithSession(fullName, email, password) {
  const res = await fetch(`${BASE_URL}/api/register/`, {
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
  const res = await fetch(`${BASE_URL}/api/password-reset/request/`, {
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
