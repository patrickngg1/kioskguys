// authApi.js
import { apiFetch, setTokens, clearTokens } from "./api";

// LOGIN — stores access + refresh tokens in localStorage after success
export async function loginWithSession(email, password) {
  const data = await apiFetch("/api/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  // Persist tokens so every subsequent apiFetch sends Authorization: Bearer
  if (data.access && data.refresh) {
    setTokens(data.access, data.refresh);
  }
  return data;
}

// REGISTER
export function registerWithSession(fullName, email, password) {
  return apiFetch("/api/register/", {
    method: "POST",
    body: JSON.stringify({ fullName, email, password }),
  });
}

// PASSWORD RESET REQUEST
export async function requestPasswordReset(email) {
  return apiFetch("/api/password-reset/request/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// CURRENT USER — Authorization header sent automatically by apiFetch
export function getSessionUser() {
  return apiFetch("/api/me/");
}

// LOGOUT — clear tokens first so no retry loop, then tell server
export async function logoutSession() {
  clearTokens();
  try {
    await apiFetch("/api/logout/", { method: "POST" });
  } catch {
    // tokens already cleared; ignore any backend error
  }
}
