import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import PortalLayout from './PortalLayout'
import { participantNavItems } from '../../navigation'
import { fetchAnnouncements } from '../../api/participant'

function ParticipantLayout({ children, notifications = [], statusItems = [], pageTitle, pageSubtitle, headerActions }) {
  const [hasUnread, setHasUnread] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // 1. If the participant is looking directly at the announcements, hide the red dot
    if (location.pathname.includes('/announcements')) {
      setHasUnread(false)
      return
    }

    // 2. Check the server count against the locally seen count
    const checkAnnouncementsCount = async () => {
      try {
        const data = await fetchAnnouncements()
        const currentServerCount = data?.length || 0
        const localSeenCount = parseInt(localStorage.getItem('seen_announcements_count') || '0', 10)

        if (currentServerCount > localSeenCount) {
          setHasUnread(true)
        }
      } catch (err) {
      
      }
    }

    checkAnnouncementsCount()
  }, [location.pathname])

  // 3. Dynamically inject the red dot directly into the Announcements nav item configuration
  const updatedNavItems = participantNavItems.map(item => {
    if (item.path?.includes('/announcements') || item.label === 'Announcements') {
      return {
        ...item,
        label: (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', width: '100%' }}>
            {item.label}
            {hasUnread && (
              <span 
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  display: 'inline-block',
                  boxShadow: '0 0 8px #ef4444',
                  marginLeft: 'auto' // Cleanly pushes the notification dot to the far-right edge of the button row
                }} 
              />
            )}
          </span>
        )
      }
    }
    return item
  })

  return (
    <PortalLayout
      title="TI Hackathon 2026"
      eyebrow="Participant Portal"
      navItems={updatedNavItems} // 🔥 Uses the updated navigation items configuration array
      notifications={notifications}
      statusItems={statusItems}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      headerActions={headerActions}
    >
      {children}
    </PortalLayout>
  )
}

export default ParticipantLayout