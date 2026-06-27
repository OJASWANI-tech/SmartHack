import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PortalLayout from './PortalLayout'
import { committeeNavItems, dynamicCommitteeNavItems } from '../../navigation'
import { getCommitteeRole } from '../../services/auth'
import committeeService from '../../services/committee'

function CommitteeLayout({ children, notifications = [], statusItems = [], pageTitle, pageSubtitle, headerActions }) {
  const committeeRole = getCommitteeRole() // Resolves to 'admin' or 'committee'
  const navigate = useNavigate()
  const location = useLocation()
  
  const [eventTitle, setEventTitle] = useState("TI Hackathon 2026")
  const isDynamicTrack = location.pathname.startsWith('/dynamic-test')

  // 🔐 FILTER SIDEBAR ENTRIES BASED ON ACCOUNT ROLE PRIVILEGES
  const baseNavItems = isDynamicTrack ? dynamicCommitteeNavItems : committeeNavItems
  
  const navItems = (() => {
    const filtered = []
    let pendingGroup = null

    for (const item of baseNavItems) {
      if (item.type === 'group') {
        pendingGroup = item  // hold it, don't add yet
      } else {
        if (item.adminOnly && committeeRole !== 'admin') continue  // skip
        if (pendingGroup) {
          filtered.push(pendingGroup)  // only add group header if there's a visible item under it
          pendingGroup = null
        }
        filtered.push(item)
      }
    }
    return filtered
  })()

  useEffect(() => {
    const activeEventId = localStorage.getItem('current_event_id')
    if (!activeEventId) return

    committeeService.getEventDetails(activeEventId)
      .then(data => {
        if (data && data.name) {
          setEventTitle(data.name)
        }
      })
      .catch(err => console.warn("Could not synchronize event details metadata:", err))
  }, [location.pathname])

  const handleLogout = () => {
    const isAdmin = getCommitteeRole() === 'admin'
    localStorage.removeItem('eventflow_token')
    localStorage.removeItem('eventflow_refresh_token')
    localStorage.removeItem('eventflow_mock_role')
    if (isAdmin) {
      localStorage.removeItem('current_event_id')
      localStorage.removeItem('event_id')
    }
    navigate('/login')
  }

  return (
    <PortalLayout
      title={eventTitle}
      eyebrow={isDynamicTrack ? "Dynamic Sandbox Track" : "Committee Portal"}
      subtitle={committeeRole === 'admin' ? 'ADMIN' : 'COMMITTEE MEMBER'} // Cleaned label
      navItems={navItems}
      notifications={notifications}
      statusItems={statusItems}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      headerActions={headerActions}
      sidebarFooter={
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '0.6rem 1rem',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '500',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'
          }}
        >
          🚪 <span className="nav-label">Logout</span>
        </button>
      }
    >
      {children}
    </PortalLayout>
  )
}

export default CommitteeLayout