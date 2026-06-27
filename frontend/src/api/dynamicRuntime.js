// dynamicRuntime.js — client for the /api/dynamic execution engine.
//
// Deliberately a thin standalone fetch wrapper (not the shared axios client) so
// the dynamic track stays isolated from the MVP interceptors/timeouts.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function req(method, path, body) {
  const res = await fetch(`${BASE}/api/dynamic${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : detail?.message
        ? [detail.message, ...(detail.errors || [])].join(" — ")
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// Reads the active event id the config-agent stashed on commit, or a URL param.
export function resolveEventId(paramId) {
  return (
    paramId ||
    localStorage.getItem("current_event_id") ||
    localStorage.getItem("event_id") ||
    ""
  );
}

export const getEventSchema = (eventId) => req("GET", `/event/${eventId}`);
export const submitEntry = (eventId, payload) => req("POST", `/event/${eventId}/submit`, payload);
export const listSubmissions = (eventId) => req("GET", `/event/${eventId}/submissions`);
export const evaluateSubmission = (eventId, payload) => req("POST", `/event/${eventId}/evaluate`, payload);
export const getResults = (eventId) => req("GET", `/event/${eventId}/results`);
