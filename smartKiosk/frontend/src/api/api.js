// api.js — single place for all HTTP calls.
// Uses Authorization: Bearer header (no cookies) so it works on iPhone Safari.

export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// ─── Token storage ───────────────────────────────────────────────────────────
const ACCESS_KEY = "kiosk_access";
const REFRESH_KEY = "kiosk_refresh";

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export function setTokens(access, refresh) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ─── Refresh access token (called automatically on 401) ──────────────────────
async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token available");

  const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error("Session expired");
  }

  const data = await res.json();
  setTokens(data.access, null); // only update access; refresh stays the same
  return data.access;
}

// ─── Main fetch wrapper ───────────────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const buildHeaders = (token) => ({
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  });

  let token = getAccessToken();
  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(token),
  });

  // ── Auto-refresh on 401 ──────────────────────────────────────────────────
  if (res.status === 401 && getRefreshToken()) {
    try {
      token = await refreshAccessToken();
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: buildHeaders(token),
      });
    } catch {
      clearTokens();
      // Notify the app so it can redirect to login
      window.dispatchEvent(new Event("auth:logout"));
      throw new Error("Session expired. Please log in again.");
    }
  }

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  const data =
    text && contentType.includes("application/json") ? JSON.parse(text) : {};

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
