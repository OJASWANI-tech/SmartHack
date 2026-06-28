import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    console.log('Full URL:', window.location.href)  // â† add this
    console.log('All params:', Object.fromEntries(params))  // â† add this
    const token = params.get('token')
    const refresh = params.get('refresh')
    const error = params.get('error')

    if (error) {
      navigate(`/login?error=${error}`)
      return
    }

    if (!token) {
      navigate('/login?error=google_auth_failed')
      return
    }

    // Decode JWT to get role info
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))

      // Store tokens exactly like your existing login does
      localStorage.setItem('HackSmart_token', token)
      if (refresh) localStorage.setItem('HackSmart_refresh_token', refresh)
      localStorage.setItem('HackSmart_mock_role', 'committee')
      localStorage.setItem('committee_user', JSON.stringify({
        id: payload.sub,
        email: payload.email,
        role: payload.committee_role || 'member'
      }))

      if (payload.event_id) {
        localStorage.setItem('current_event_id', payload.event_id)
        localStorage.setItem('event_id', payload.event_id)
      }

      // Route based on committee_role
      if (payload.committee_role === 'admin') {
        navigate('/login', { state: { googleAdmin: true }, replace: true })
        // Admin still needs to pick/create event, so send to setup
      } else {
        navigate('/committee/dashboard', { replace: true })
      }

    } catch {
      navigate('/login?error=token_decode_failed')
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#030712',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#94a3b8', fontSize: '15px', gap: '12px'
    }}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        border: '2px solid #6366f1', borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite'
      }} />
      Signing you in...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
