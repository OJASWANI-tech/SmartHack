// dynamicSports.js — client for the /api/dynamic/sports engine extension.
//
// Same thin, standalone fetch style as dynamicRuntime.js (isolated from the MVP
// axios client/interceptors). Sports-only: teams+roster, fixtures/bracket, and
// standings — the structured data the generic dynamic engine doesn't model.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function req(method, path, body) {
  const res = await fetch(`${BASE}/api/dynamic/sports${path}`, {
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

export const getSportsTeams = (eventId) => req("GET", `/event/${eventId}/teams`);
export const updateTeamRoster = (eventId, teamId, members) =>
  req("PUT", `/event/${eventId}/teams/${teamId}/roster`, { members });

// CSV provisioning — multipart, so this bypasses the json `req()` helper above.
async function uploadCsv(path, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/dynamic/sports${path}`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    throw new Error(typeof detail === "string" ? detail : `Upload failed (${res.status})`);
  }
  return data;
}

export const uploadTeamsCsv = (eventId, file) => uploadCsv(`/event/${eventId}/teams/upload-csv`, file);
export const uploadRefereesCsv = (eventId, file) => uploadCsv(`/event/${eventId}/referees/upload-csv`, file);
export const getReferees = (eventId) => req("GET", `/event/${eventId}/referees`);

export const getMatches = (eventId) => req("GET", `/event/${eventId}/matches`);
export const generateBracket = (eventId, format, teamIds) =>
  req("POST", `/event/${eventId}/matches/generate-bracket`, { format, team_ids: teamIds || null });
export const updateMatch = (eventId, matchId, payload) =>
  req("PUT", `/event/${eventId}/matches/${matchId}`, payload);

export const getStandings = (eventId) => req("GET", `/event/${eventId}/standings`);

// Reuses the existing open MVP broadcast feed — same data the committee already
// sends, no new backend route needed for "live announcements from the committee".
export async function getEventAnnouncements(eventId) {
  const res = await fetch(`${BASE}/api/v1/events/${eventId}/announcements`);
  if (!res.ok) return [];
  return res.json().catch(() => []);
}

// Local "which team am I" selection — the dynamic track has no participant login,
// so the captain picks their team once and it's remembered per-event.
const TEAM_KEY = (eventId) => `dynamic_sports_team_${eventId}`;
export const getSelectedTeamId = (eventId) => localStorage.getItem(TEAM_KEY(eventId)) || "";
export const setSelectedTeamId = (eventId, teamId) => localStorage.setItem(TEAM_KEY(eventId), teamId);
