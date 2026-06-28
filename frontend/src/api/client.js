import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
})

// When the config-agent chatbot commits a new event, check if it's a sports
// tournament and, if so, drop the committee straight into the dynamic sports
// portal (/dynamic-test/*) instead of leaving them on the generic dashboard.
api.interceptors.response.use(async (response) => {
  const isCommitCall = response.config?.method === 'post' && response.config?.url?.includes('/config-agent/commit')
  const eventId = response.data?.event_id

  if (isCommitCall && eventId) {
    try {
      const { data: eventData } = await api.get(`/api/v1/events/${eventId}`)
      const rawType = String(eventData?.event_type || '').toLowerCase()
      if (rawType.includes('sport')) {
        localStorage.setItem('current_event_id', eventId)
        localStorage.setItem('event_id', eventId)
        localStorage.setItem('HackSmart_mock_role', 'dynamic-committee')
        window.location.assign('/dynamic-test/dynamic-dashboard')
      }
    } catch (err) {
      console.error('Sports portal redirect check failed:', err)
    }
  }

  return response
})

export async function getHealth() {
  const { data } = await api.get('/health')
  return data
}

export async function getDashboardSummary() {
  const { data } = await api.get('/dashboard/summary')
  return data
}

export async function getParticipants() {
  const { data } = await api.get('/participants')
  return data
}

export async function getTeams() {
  const { data } = await api.get('/teams')
  return data
}

export async function getApprovals() {
  const { data } = await api.get('/approvals')
  return data
}

export default api


