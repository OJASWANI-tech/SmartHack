import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { PortalIcon } from '../participant/ParticipantPortalKit'

// Shared portal shell keeps navigation, headers, status, and notification patterns consistent by role.
import PageHeader from './PageHeader'

function PortalLayout({ title, eyebrow, subtitle, navItems, children, notifications = [], statusItems = [], compact = false, variant = 'dark', headerActions, sidebarFooter, pageTitle, pageSubtitle }) {
  const [collapsed, setCollapsed] = useState(false)
  const isCommittee = eyebrow?.toLowerCase().includes('committee')
  const iconVariant = isCommittee ? 'committee' : 'participant'

  // ADDED: Check if we are currently in the dynamic track to hide the topbar
  const location = useLocation()
  const isDynamicTrack = location.pathname.startsWith('/dynamic-test')
  // The whole dynamic track (sandbox + dynamic participant/evaluator + sports)
  // is forced to dark theme so it keeps its original look under the global light theme.
  const isDynamicPortal = isDynamicTrack || location.pathname.startsWith('/dynamic/')

  const [unclickedCount, setUnclickedCount] = useState(0)
  const [pendingAnomaliesCount, setPendingAnomaliesCount] = useState(0)

  useEffect(() => {
    if (!isCommittee) return

    const eventId = localStorage.getItem('current_event_id') || 'default_event'
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'

    const fetchUnclicked = async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/events/${eventId}/grievances/unclicked-count`)
        if (res.ok) {
          const data = await res.json()
          setUnclickedCount(data.count || 0)
        }
      } catch (e) {
        console.error('Error fetching unclicked count:', e)
      }
    }

    const fetchAnomalies = async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/events/${eventId}/anomalies`)
        if (res.ok) {
          const data = await res.json()
          const active = (data || []).filter(an => ['pending', 'unresolved', 'escalated'].includes(an.resolution_status))
          setPendingAnomaliesCount(active.length)
        }
      } catch (e) {
        console.error('Error fetching anomalies count:', e)
      }
    }

    fetchUnclicked()
    fetchAnomalies()

    const handleUpdate = () => {
      fetchUnclicked()
    }
    const handleAnomaliesUpdate = () => {
      fetchAnomalies()
    }
    window.addEventListener('HackSmart-grievances-updated', handleUpdate)
    window.addEventListener('HackSmart-anomalies-updated', handleAnomaliesUpdate)

    const interval = setInterval(() => {
      fetchUnclicked()
      fetchAnomalies()
    }, 15000)

    return () => {
      window.removeEventListener('HackSmart-grievances-updated', handleUpdate)
      window.removeEventListener('HackSmart-anomalies-updated', handleAnomaliesUpdate)
      clearInterval(interval)
    }
  }, [isCommittee])

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    // Always default to 'dark' for HackSmart's futuristic enterprise style
    return saved || 'dark'
  })

  // Dynamic-track pages always render dark; everywhere else follows the user's theme.
  const appliedTheme = isDynamicPortal ? 'dark' : theme

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appliedTheme)
    // Never persist the forced-dark dynamic theme over the user's real preference.
    if (!isDynamicPortal) localStorage.setItem('theme', theme)
  }, [appliedTheme, isDynamicPortal, theme])

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail) {
        setTheme(e.detail)
      }
    }
    window.addEventListener('HackSmart-theme-change', handleThemeChange)
    return () => window.removeEventListener('HackSmart-theme-change', handleThemeChange)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      window.dispatchEvent(new CustomEvent('HackSmart-theme-change', { detail: next }))
      return next
    })
  }

  const isLightTheme = appliedTheme === 'light'

  return (
    <div className={`${compact ? 'app-shell app-shell-compact' : 'app-shell'} ${collapsed ? 'sidebar-collapsed' : ''} ${isLightTheme ? 'app-shell-light' : ''} ${variant === 'participant' ? 'app-shell-participant' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {subtitle && (
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '2px',
                fontWeight: '600',
                opacity: 0.7
              }}>{subtitle}</p>
            )}
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            item.type === 'group' ? (
              <span className="nav-group-label" key={item.label}>{item.label}</span>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                end
              >
                <PortalIcon name={item.icon || item.label.charAt(0).toLowerCase()} variant={iconVariant} />
                <span className="nav-label" style={{ display: 'flex', alignItems: 'center' }}>
                  {item.label}
                  {isCommittee && item.to === '/committee/grievances' && unclickedCount > 0 && (
                    <span 
                      className="grievance-notification-dot" 
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        marginLeft: '8px',
                        boxShadow: '0 0 8px #ef4444',
                        flexShrink: 0
                      }} 
                    />
                  )}
                  {isCommittee && item.to === '/committee/anomalies' && pendingAnomaliesCount > 0 && (
                    <span 
                      className="anomaly-notification-dot" 
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444',
                        marginLeft: '8px',
                        boxShadow: '0 0 8px #ef4444',
                        flexShrink: 0
                      }} 
                    />
                  )}
                </span>
              </NavLink>
            )
          ))}
        </nav>
        {sidebarFooter && (
          <div className="sidebar-footer">
            {sidebarFooter}
          </div>
        )}
      </aside>

      <main>
        {/* ADDED: Conditional rendering to hide topbar on the dynamic track */}
        {!isDynamicTrack && (
          <header className="topbar">
            <div className="topbar-left">
              <PageHeader title={pageTitle} subtitle={pageSubtitle} statusItems={statusItems} />
            </div>
            <div className="topbar-actions">
              {headerActions}
              {!isDynamicPortal && (
                <button
                  onClick={toggleTheme}
                  className="theme-toggle-top"
                  aria-label="Toggle Theme"
                  title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>{theme === 'light' ? 'ðŸŒ™' : 'â˜€ï¸'}</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', marginLeft: '4px' }}>{theme === 'light' ? 'Dark' : 'Light'}</span>
                </button>
              )}
            </div>
          </header>
        )}

        {notifications.length > 0 && (
          <section className="notification-bar">
            {notifications.map((item) => {
              const isRescore = item.includes('Rescore Requested');
              return (
                <span 
                  key={item} 
                  style={isRescore ? { color: 'var(--status-danger)', fontWeight: 'bold' } : undefined}
                >
                  {item}
                </span>
              );
            })}
          </section>
        )}
        {children}
      </main>
    </div>
  )
}

export default PortalLayout
