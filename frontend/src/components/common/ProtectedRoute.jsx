import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCurrentRole } from '../../services/auth'

function ProtectedRoute({ allowedRoles }) {
  const location = useLocation()

  // Read token from URL first, save to localStorage before role check
  const urlParams = new URLSearchParams(location.search)
  const urlToken = urlParams.get('token')

  if (urlToken) {

    // URL token always win - clear everything and start fresh
    const tokenVersion = localStorage.getItem('token_version')
    localStorage.clear()
    if (tokenVersion) {
      localStorage.setItem('token_version', tokenVersion)
    }
    
    localStorage.setItem('HackSmart_token', urlToken)
    // clear mock role so it doesn't override the real token
    localStorage.removeItem('HackSmart_mock_role')

    // Decode JWT payload to retrieve and cache the event_id
    const parts = urlToken.split('.')
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (payload.event_id) {
          localStorage.setItem('current_event_id', payload.event_id)
          localStorage.setItem('event_id', payload.event_id)
        }
      } catch (e) {
        console.error("Failed to parse event_id from JWT payload:", e)
      }
    }
  }

  // IMPORTANT
  const token = localStorage.getItem('HackSmart_token')
  const role = getCurrentRole()
  console.log('ProtectedRoute debug:', { token: !!token, role, allowedRoles })

  // No token = deny access
  if (!token) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ from: location.pathname, role: 'Unknown' }}
      />
    )
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname, role }} />
  }

  return <Outlet />
}

export default ProtectedRoute


