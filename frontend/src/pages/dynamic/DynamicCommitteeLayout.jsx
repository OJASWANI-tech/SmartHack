import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// Unified icon dictionary matching the Case Competition workspace guidelines
const STAGE_ICON_MAP = {
  dashboard: 'ðŸ“Š',
  intake: 'ðŸ“¥',
  teams: 'ðŸ—‚ï¸',
  mentor: 'â±ï¸',
  alert: 'ðŸš¨',
  results: 'ðŸ†',
  config: 'âš™ï¸',
  judge: 'âš–ï¸',
  live: 'ðŸ“¡',
  gavel: 'âš–ï¸',
  medical: 'ðŸ©º',
  waiver: 'ðŸ“„',
}

export default function DynamicCommitteeSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [stages, setStages] = useState([])
  const [eventName, setEventName] = useState('Syncing Workflow...')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    async function streamStageConfig() {
      const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id')
      
      if (!currentEventId) {
        setEventName('No Active Event')
        setIsLoading(false)
        return
      }

      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const res = await fetch(`${baseURL}/api/v1/events/${currentEventId}`)
        
        if (res.ok) {
          const data = await res.json()
          setEventName(data.name || 'Case Workspace')
          
          let parsedConfig = data.stage_config
          if (typeof parsedConfig === 'string') {
            try {
              parsedConfig = JSON.parse(parsedConfig)
            } catch (e) {
              parsedConfig = {}
            }
          }

          if (parsedConfig && Array.isArray(parsedConfig.stages)) {
            const ordered = [...parsedConfig.stages].sort(
              (a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)
            )
            setStages(ordered)
          } else {
            setStages([])
          }
        } else {
          setHasError(true)
        }
      } catch (err) {
        console.error("Failed connecting to stage_config API endpoint:", err)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    streamStageConfig()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('HackSmart_token')
    localStorage.removeItem('HackSmart_mock_role')
    localStorage.removeItem('committee_user')
    navigate('/', { replace: true })
  }

  return (
    <aside style={styles.sidebar}>
      {/* Profile Branding Header */}
      <div style={styles.brandBox}>
        <span style={styles.portalHeading}>COMMITTEE PORTAL</span>
        <div style={styles.profileBox}>
          <div style={styles.profileBadge}>T1</div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={styles.profileName}>ADMIN</span>
            <span style={styles.activeEventLabel} title={eventName}>
              â— {eventName}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Navigation Pipeline Container */}
      <nav style={styles.navBlock}>
        {isLoading ? (
          <div style={styles.loader}>Parsing stage matrix...</div>
        ) : hasError ? (
          <div style={styles.errorAlert}>âš ï¸ Config sync failed.</div>
        ) : stages.length === 0 ? (
          <div style={styles.loader}>No stages found in config.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={styles.sectionHeading}>PIPELINE</span>
            {stages.map((stage) => {
              // Ensure path format matches internal Router definitions exactly
              const dynamicTargetRoute = `/dynamic-test/${stage.stage_id}`
              const isSelected = location.pathname === dynamicTargetRoute

              return (
                <Link
                  key={stage.stage_id}
                  to={dynamicTargetRoute}
                  style={{
                    ...styles.menuLink,
                    ...(isSelected ? styles.menuLinkActive : {}),
                  }}
                >
                  <span style={styles.iconSlot}>
                    {STAGE_ICON_MAP[stage.icon] || 'ðŸ“‹'}
                  </span>
                  <span style={styles.linkLabel}>{stage.display_name}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Footer Exit Actions */}
      <div style={styles.footerArea}>
        <button onClick={handleLogout} style={styles.exitBtn}>
          Leave Workspace
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: '260px', // Comfortably widened to completely clear all label truncation
    flexShrink: 0,
    height: '100vh',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif',
    position: 'sticky',
    top: 0,
  },
  brandBox: {
    padding: '22px 18px 16px 18px',
    borderBottom: '1px solid var(--border-color)',
  },
  portalHeading: {
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '1.5px',
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: '12px',
    textTransform: 'uppercase',
    opacity: 0.7
  },
  profileBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  profileBadge: {
    width: '34px',
    height: '34px',
    background: 'var(--accent-bg, rgba(99, 102, 241, 0.1))',
    border: '1px solid var(--border-color)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--accent-color)',
    flexShrink: 0
  },
  profileName: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  activeEventLabel: {
    fontSize: '10px',
    color: '#10b981',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    fontWeight: '600',
    marginTop: '2px',
    maxWidth: '180px',
  },
  navBlock: {
    flexGrow: 1,
    padding: '20px 14px',
    overflowY: 'auto',
  },
  sectionHeading: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: 800,
    letterSpacing: '1.2px',
    paddingLeft: '8px',
    marginBottom: '10px',
    textTransform: 'uppercase',
    opacity: 0.6
  },
  menuLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    gap: '10px',
    transition: 'all 150ms ease',
    marginBottom: '2px',
  },
  menuLinkActive: {
    background: 'var(--accent-bg, rgba(99, 102, 241, 0.1))',
    color: 'var(--accent-color, #a5b4fc)',
    border: '1px solid var(--border-color)',
  },
  iconSlot: {
    fontSize: '14px',
    flexShrink: 0,
  },
  linkLabel: {
    flexGrow: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  loader: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    paddingTop: '24px',
    fontStyle: 'italic',
  },
  errorAlert: {
    color: '#f43f5e',
    fontSize: '12px',
    padding: '10px',
    background: 'rgba(244, 63, 94, 0.03)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  footerArea: {
    padding: '14px',
    borderTop: '1px solid var(--border-color)',
  },
  exitBtn: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 150ms ease',
  },
}
