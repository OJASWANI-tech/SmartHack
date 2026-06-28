import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import PortalLayout from '../../components/layout/PortalLayout'

// âš¡ ROOT ROUTE WRAPPER â€” mirrors the Committee Portal's shared shell (PortalLayout)
// so the Dynamic Sandbox Track gets the same glass sidebar, theme toggle, and topbar.
export default function DynamicTestLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [stages, setStages] = useState([])
  const [eventName, setEventName] = useState('Synchronizing Workflow...')
  const [eventSubtitle, setEventSubtitle] = useState('SANDBOX TRACK') // Dynamic subtitle state
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [eventType, setEventType] = useState('CASE COMPETITION')

  useEffect(() => {
    async function streamStageConfig() {
      let currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id')
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

      if (!currentEventId) {
        try {
          const listRes = await fetch(`${baseURL}/api/v1/events`)
          if (listRes.ok) {
            const events = await listRes.json()
            if (events && events.length > 0) {
              currentEventId = events[0].id
              localStorage.setItem('current_event_id', currentEventId)
              localStorage.setItem('event_id', currentEventId)
            }
          }
        } catch (e) {
          console.error('Failed to list events for fallback', e)
        }
      }

      if (!currentEventId) {
        setEventName('No Target Event Found')
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch(`${baseURL}/api/v1/events/${currentEventId}`)

        if (res.ok) {
          const data = await res.json()
          setEventName(data.name || 'Sandbox Console')
          
          // --- DYNAMIC SUBTITLE UPDATE BASED ON DB ARCHETYPE ---
          const rawType = (data.event_type || '').toLowerCase()
          if (rawType === 'hackathon') {
            setEventSubtitle('HACKATHON RUNTIME')
          } else if (rawType.includes('coding')) {
            setEventSubtitle('CODING CONTEST')
          } else if (rawType.includes('case')) {
            setEventSubtitle('CASE COMPETITION')
          } else if (rawType.includes('debate')) {
            setEventSubtitle('DEBATE TOURNAMENT')
          } else if (rawType.includes('sport')) {
            setEventSubtitle('SPORTS TOURNAMENT')
          } else {
            setEventSubtitle('SANDBOX TRACK')
          }

          let parsedConfig = data.stage_config
          if (typeof parsedConfig === 'string') {
            try {
              parsedConfig = JSON.parse(parsedConfig)
            } catch (e) {
              parsedConfig = {}
            }
          }

          if (parsedConfig && Array.isArray(parsedConfig.stages)) {
            const chronologicallyOrdered = [...parsedConfig.stages].sort(
              (a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)
            )
            setStages(chronologicallyOrdered)
          } else {
            setStages([])
          }
        } else {
          setHasError(true)
        }
      } catch (err) {
        console.error('Failed connecting to stage_config API endpoint:', err)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    streamStageConfig()
  }, [location.pathname])

  const navItems = useMemo(() => {
    if (isLoading) return [{ type: 'group', label: 'Syncing pipelineâ€¦' }]
    if (hasError) return [{ type: 'group', label: 'Stage sync failed' }]
    if (stages.length === 0) return [{ type: 'group', label: 'No stages configured' }]

    const items = []
    stages.forEach((stage) => {
      if (stage.stage_id === 'results' && eventSubtitle === 'CODING CONTEST') {
        items.push({
          to: `/dynamic-test/leaderboard`,
          label: 'Leaderboard',
          icon: 'leaderboard',
        })
        items.push({
          to: `/dynamic-test/submissions`,
          label: 'Submission Portal',
          icon: 'submissions',
        })
        items.push({
          to: `/dynamic-test/results`,
          label: 'Results',
          icon: 'results',
        })
      } else {
        items.push({
          to: `/dynamic-test/${stage.stage_id}`,
          label: stage.display_name,
          icon: stage.icon,
        })
      }
    })

    const tail = []
    if (eventSubtitle === 'SPORTS TOURNAMENT') {
      // Sports events don't (yet) carry a dedicated stage_id for this tool â€”
      // surface it unconditionally so it stays reachable regardless of pipeline.
      tail.push({ type: 'group', label: 'SPORTS TOOLS' })
      tail.push({ to: '/dynamic-test/event-initialization', label: 'Event Initialization', icon: 'intake' })
      tail.push({ to: '/dynamic-test/communication-hub', label: 'Communication Hub', icon: 'comms' })
    }

    return [
      { type: 'group', label: 'ACTIVE PIPELINE' },
      ...items,
      ...tail,
    ]
  }, [isLoading, hasError, stages, eventSubtitle])

  const handleLogout = () => {
    localStorage.removeItem('HackSmart_token')
    localStorage.removeItem('HackSmart_refresh_token')
    localStorage.removeItem('HackSmart_mock_role')
    localStorage.removeItem('committee_user')
    navigate('/login', { replace: true })
  }

  return (
    <PortalLayout
      title={eventName}
      eyebrow="Dynamic Sandbox Track"
      subtitle={eventSubtitle} // <-- Now changes dynamically based on the active event!
      navItems={navItems}
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
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'
          }}
        >
          ðŸšª <span className="nav-label">Leave Workspace</span>
        </button>
      }
    >
      <Outlet />
    </PortalLayout>
  )
}
