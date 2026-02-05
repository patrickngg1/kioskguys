// api.js (THE ONLY PLACE fetch() IS USED)

export const API_BASE = import.meta.env.VITE_API_URL.replace(/\/$/, "");

async function parseJsonSafe(res) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    console.error("Non-JSON response:", text.slice(0, 200));
    throw new Error(
      `Expected JSON but got ${contentType || "unknown"} (status ${res.status})`
    );
  }

  return JSON.parse(text);
} 

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}
