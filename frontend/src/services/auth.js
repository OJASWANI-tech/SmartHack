// ðŸŽ¯ FIXED: Ensure both 'admin' and 'dynamic-committee' are explicitly valid
const VALID_ROLES = ['committee', 'participant', 'evaluator', 'dynamic-committee', 'admin']
const MOCK_ROLE_KEY = 'HackSmart_mock_role'
const TOKEN_KEY = 'HackSmart_token'

const TOKEN_VERSION = 'v2'  

export function checkTokenVersion() {
  const storedVersion = localStorage.getItem('token_version')
  if (storedVersion !== TOKEN_VERSION) {
    localStorage.removeItem('HackSmart_token')
    localStorage.removeItem('HackSmart_refresh_token')
    localStorage.removeItem('HackSmart_mock_role')
    localStorage.removeItem('committee_user')
    localStorage.setItem('token_version', TOKEN_VERSION)
  }
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getCurrentRole() {
  const mockRole = window.localStorage.getItem(MOCK_ROLE_KEY)
  if (mockRole) return mockRole

  const token = window.localStorage.getItem(TOKEN_KEY)
  if (token) {
    const payload = decodeJwtPayload(token)
    if (payload?.role) return payload.role  // just return whatever is in the JWT
  }

  return 'committee'
}

export function setMockRole(role) {
  if (VALID_ROLES.includes(role)) {
    window.localStorage.setItem(MOCK_ROLE_KEY, role)
  }
}

// ðŸŽ¯ FIXED: Forces admin layout permissions for your views when accessing the panel
export function getCommitteeRole() {
  // âœ… DB role from localStorage â€” "admin" or "member"
  const stored = localStorage.getItem('committee_user')
  if (stored) {
    try {
      const user = JSON.parse(stored)
      if (user.role) return user.role  // "admin" or "member"
    } catch {}
  }

  // Fallback to JWT role
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    const payload = decodeJwtPayload(token)
    if (payload?.role) return payload.role
  }

  return 'member'  // âœ… least privilege fallback
}

export { VALID_ROLES }
