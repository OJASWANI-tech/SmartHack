/**
 * Participant Portal API Service
 * All calls to the backend endpoints for the participant portal.
 * Every call reads event_id and participant_id from localStorage.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function verifyToken() {
  const token = localStorage.getItem('HackSmart_token')
  if (!token) throw new Error('no_token')
  
  const res = await fetch(`${BASE}/tokens/verify?token=${token}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'invalid_token' }))
    throw new Error(err.detail)
  }
  return res.json()
}

function decodeToken() {
  try {
    const token = localStorage.getItem('HackSmart_token')
    if (!token) return {}
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload
  } catch {
    return {}
  }
}

function getIds() {
  const payload = decodeToken()
  return {
    // fall back to localStorage for backward compatibility
    eventId: payload.event_id || localStorage.getItem('current_event_id') || localStorage.getItem('event_id'),
    participantId: payload.participant_id || localStorage.getItem('participant_id'),
    email: payload.sub,
    teamId: payload.team_id,
    token: localStorage.getItem('HackSmart_token'),
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem('HackSmart_token')
  const res = await fetch(`${BASE}${path}`, {
    headers: { 
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// GET /api/v1/participant_dashboard
export async function fetchDashboard() {
  const { eventId, participantId } = getIds()
  return request(`/api/v1/participant_dashboard?event_id=${eventId}&participant_id=${participantId}`)
}

// GET /api/v1/journey
export async function fetchJourney() {
  const { eventId, participantId } = getIds()
  return request(`/api/v1/journey?event_id=${eventId}&participant_id=${participantId}`)
}

// GET /api/v1/announcements
export async function fetchAnnouncements() {
  const { eventId, participantId } = getIds()
  return request(`/api/v1/announcements?event_id=${eventId}&participant_id=${participantId}`)
}

// GET /api/v1/submissions
export async function fetchSubmissions() {
  const { eventId, participantId } = getIds()
  return request(`/api/v1/submissions?event_id=${eventId}&participant_id=${participantId}`)
}

// GET /api/v1/participant_results
export async function fetchResults() {
  const { eventId, participantId } = getIds()
  return request(`/api/v1/participant_results?event_id=${eventId}&participant_id=${participantId}`)
}

// POST /api/v1/submissions/upload
export async function uploadSubmission({ stageId, pptUrl, demoVideoUrl, notes }) {
  const { eventId, participantId } = getIds()
  return request('/api/v1/submissions/upload', {
    method: 'POST',
    body: JSON.stringify({
      event_id: eventId,
      stage_id: stageId,
      participant_id: participantId,
      ppt_url: pptUrl,
      demo_video_url: demoVideoUrl,
      notes,
    }),
  })
}

// PUT /api/v1/submissions/github
export async function updateGithubUrl(githubUrl) {
  const { participantId } = getIds()
  return request('/api/v1/submissions/github', {
    method: 'PUT',
    body: JSON.stringify({ participant_id: participantId, github_url: githubUrl }),
  })
}

// POST /api/v1/ask-ai
export async function askAI(question) {
  const { eventId, participantId } = getIds()
  return request('/api/v1/ask-ai', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId, participant_id: participantId, question }),
  })
}

