// suppliesApi.js — uses apiFetch so Authorization: Bearer is sent automatically
import { apiFetch } from "./api";

export async function submitSupplyRequest(payload) {
  try {
    return await apiFetch("/api/supplies/request/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Supply request API error:", error);
    return { ok: false, error };
  }
}
