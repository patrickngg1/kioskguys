// src/api/api.js
// Central API utility — resolves the backend base URL from the environment.
//
// In development:  VITE_API_BASE_URL is not set, so API_BASE = '' and Vite's
//                  dev-server proxy forwards /api/* to http://127.0.0.1:8000.
// In production:   VITE_API_BASE_URL = https://kioskguys.onrender.com so every
//                  fetch goes directly to the live backend.

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
