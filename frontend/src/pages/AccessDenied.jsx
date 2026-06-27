import { Link, useLocation } from 'react-router-dom'
import { getCommitteeRole, getCurrentRole } from '../services/auth' // ⚡ FIXED: Added correct relative path

function AccessDenied() {
  const location = useLocation()
  
  // Extract the real identity vs the routed role context
  const trueBackendRole = getCommitteeRole() 
  const activeRoutingRole = location.state?.role || getCurrentRole() || 'Unknown'
  const from = location.state?.from || 'this page'

  // Determine a safe redirection target path based on active access configurations
  let safePortalRoute = '/login'
  if (activeRoutingRole === 'dynamic-committee' || trueBackendRole === 'admin') {
    safePortalRoute = '/dynamic-test/dashboard'
  } else if (activeRoutingRole === 'committee') {
    safePortalRoute = '/committee/dashboard'
  } else if (activeRoutingRole === 'participant') {
    safePortalRoute = '/participant/dashboard'
  } else if (activeRoutingRole === 'evaluator') {
    safePortalRoute = '/evaluator/dashboard'
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          borderRadius: '12px',
          background: '#1e293b',
          color: 'white',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        }}
      >
        <h2 style={{ color: '#f87171', marginBottom: '16px' }}>
          🚫 Access Denied
        </h2>

        <p style={{ color: '#94a3b8', marginBottom: '10px' }}>
          You do not have permission to access this page.
        </p>

        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
          Current Identity: <strong style={{ color: '#fff', textTransform: 'uppercase' }}>{trueBackendRole}</strong>
          <br />
          Router Scope Token: <strong style={{ color: '#a5b4fc' }}>{activeRoutingRole}</strong>
          <br />
          Requested Route: <strong style={{ color: '#f87171' }}>{from}</strong>
        </p>

        <Link
          to={safePortalRoute}
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            borderRadius: '8px',
            background: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
        >
          Return to Portal
        </Link>
      </div>
    </div>
  )
}

export default AccessDenied