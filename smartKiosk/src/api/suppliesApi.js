// src/api/suppliesApi.js
import axios from 'axios';

export async function submitSupplyRequest(payload) {
  try {
    const res = await axios.post('/api/supplies/request/', payload, {
      withCredentials: true, // include Django session cookie
    });
    return res.data;
  } catch (error) {
    console.error('Supply request API error:', error);
    return { ok: false, error };
  }
}
