const API_BASE = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
}
