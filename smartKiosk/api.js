export const API_BASE = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // keep if you use cookies
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  return res;
}
