// authApi.js
import { apiFetch } from "./api";

// LOGIN
export function loginWithSession(email, password) {
  return apiFetch("/api/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// REGISTER
export function registerWithSession(fullName, email, password) {
  return apiFetch("/api/register/", {
    method: "POST",
    body: JSON.stringify({ fullName, email, password }),
  });
}

// CURRENT USER
export function getSessionUser() {
  return apiFetch("/api/me/");
}

// LOGOUT
export function logoutSession() {
  return apiFetch("/api/logout/", { method: "POST" });
}
