// src/api/suppliesApi.js
import { API_BASE } from './api';

export async function submitSupplyRequest(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/supplies/request/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error('Supply request API error:', error);
    return { ok: false, error };
  }
}
