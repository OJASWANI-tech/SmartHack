import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ParticipantLayout from '../../components/layout/ParticipantLayout'
import MascotEmptyState from '../../components/common/MascotEmptyState'
import { fetchDashboard, fetchAnnouncements, verifyToken } from '../../api/participant'

// Static fallback stages – shown when backend is unavailable
const FALLBACK_STAGES = [
  { label: 'Registration', status: 'complete' },
  { label: 'Team Formation', status: 'complete' },
  { label: 'Approvals', status: 'complete' },
  { label: 'Build Phase', status: 'active' },
  { label: 'Evaluation', status: 'upcoming' },
  { label: 'Results', status: 'upcoming' },
]

const AVAILABLE_TRACKS = [
  "Artificial Intelligence & Machine Learning",
  "FinTech & Decentralized Payments",
  "CyberSecurity & Zero-Trust Architecture",
  "HealthTech & Digital Patient Care",
  "Web3 & Blockchain Infrastructure"
]

function Skeleton({ width = '100%', height = '16px', radius = '6px' }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-color) 50%, var(--bg-secondary) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

function MiniMetric({ icon, label, value, sub, loading }) {
  return (
    <article className="ref-mini-card">
      <span className="ref-icon">{icon}</span>
      <div>
        {loading ? <Skeleton width="80px" height="20px" /> : <strong>{value}</strong>}
        <p>{label}</p>
        {loading ? <Skeleton width="110px" height="12px" style={{ marginTop: 4 }} /> : <small>{sub}</small>}
      </div>
    </article>
  )
}

function SectionTitle({ title, action, to }) {
  return (
    <div className="ref-section-title">
      <h3>{title}</h3>
      {action && to && (
        <Link to={to} style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: '700' }}>
          {action}
        </Link>
      )}
    </div>
  )
}

function ParticipantDashboard() {
  const [dash, setDash] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Track Selection State
  const [isUpdatingTrack, setIsUpdatingTrack] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState("")

  useEffect(() => {
    async function load() {
      try {
        await verifyToken()

        const [d, a] = await Promise.all([fetchDashboard(), fetchAnnouncements()])
        setDash(d)
        setAnnouncements((a || []).slice(0, 3))
        
        // Pre-fill the dropdown if they already chose a track
        if (d?.team?.challenge && d.team.challenge !== "Pending Selection") {
          setSelectedTrack(d.team.challenge)
        }
      } catch (e) {
        if (e.message === 'link_revoked' || e.message === 'link_expired' || e.message === 'token_not_issued') {
          localStorage.clear()
          window.location.href = '/link-expired'
          return
        }
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleTrackUpdate = async () => {
    if (!selectedTrack) return alert("Please select a track first.");
    
    // Extract teamId safely
    const teamId = dash?.team?.id || dash?.team?.team_id;
    
    // AGGRESSIVE SEARCH: Look in team, then profile, then root, then local storage
    const eventId = dash?.team?.event_id || 
                    dash?.profile?.event_id || 
                    dash?.event_id || 
                    localStorage.getItem('current_event_id') || 
                    localStorage.getItem('event_id');

    if (!teamId || !eventId) {
        return alert(`Missing context to update track. TeamID: ${teamId}, EventID: ${eventId}`);
    }

    setIsUpdatingTrack(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/events/${eventId}/teams/${teamId}/track`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ challenge: selectedTrack })
      });

      if (!response.ok) {
        throw new Error("Failed to update team track");
      }

      // Optimistically update the UI to reflect the change immediately
      setDash(prev => ({
        ...prev,
        team: { ...prev.team, challenge: selectedTrack }
      }));
      
    } catch (err) {
      
      alert("Error updating track. Please try again.");
    } finally {
      setIsUpdatingTrack(false);
    }
  }

  const profile = dash?.profile || {}
  const team = dash?.team || {}
  const stage = dash?.current_stage || {}
  const stages = (dash?.stages && dash.stages.length > 0) ? dash.stages : FALLBACK_STAGES

  const stageTone = (s) => {
    if (s.status === 'completed') return 'green'
    if (s.status === 'active') return 'purple'
    return ''
  }

  // Determine if the team still needs to pick a track
  const isPendingTrack = team.challenge === "Pending Selection" || !team.challenge;

  return (
    <ParticipantLayout pageTitle="Home Dashboard" pageSubtitle={loading ? 'Loading your hackathon overview...' : `Welcome back, ${profile.name?.split(' ')[0] || 'Participant'}! Real-time overview of your hackathon progression`} headerActions={(
      <Link to="/participant/submissions" className="ref-primary-button" style={{ display: 'inline-flex', alignItems: 'center' }}>
        Submit Project
      </Link>
    )}>
      <div className="committee-reference-dashboard">

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', marginBottom: '20px', fontSize: '13px', lineHeight: '1.4' }}>
            ⚠️ Could not load data: {error}. 
            {error.toLowerCase().includes("not found") && (
              <span style={{ marginLeft: '6px' }}>
                Since the database was recently re-seeded, please <Link to="/login" style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 'bold' }}>return to the Login Page</Link> and re-select your portal role card to load the fresh identifiers into your browser's local storage.
              </span>
            )}
          </div>
        )}

        {/* Event Workflow Progress */}
        <section className="ref-card workflow-card" style={{ marginBottom: '20px' }}>
          <SectionTitle title="Event Workflow Progress" />
          {loading ? (
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} width="80px" height="60px" radius="8px" />)}
            </div>
          ) : (
            <div className="workflow-track" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
              {stages.map((s, index) => (
                <div className="workflow-step" key={s.label}>
                  <span className={`workflow-dot ${stageTone(s)}`}>
                    {s.status === 'completed' ? '✓' : s.status === 'active' ? '●' : index + 1}
                  </span>
                  <strong style={{ fontSize: '10px' }}>{s.label}</strong>
                  <small style={{ textTransform: 'capitalize' }}>{s.status === 'upcoming' ? 'Upcoming' : s.status}</small>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Mini Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <MiniMetric loading={loading} icon="⚡" label="Active Stage" value={stage.name || '—'} sub={`Stage ${stage.number || '—'} of ${stage.total_stages || '—'}`} />
          <MiniMetric loading={loading} icon="👥" label="My Team" value={team.team_name || '—'} sub={`${team.members?.length || '—'} members active`} />
          <MiniMetric loading={loading} icon="🎯" label="Submission Status"
            value={dash?.submissions_due > 0 ? 'Pending' : 'Submitted'}
            sub={`${dash?.submissions_due || 0} submission(s) due`} />
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Build Phase Hero Card */}
            <section className="ref-card" style={{ padding: '24px' }}>
              <span className="badge" style={{ display: 'inline-block', marginBottom: '12px', background: 'rgba(184, 153, 235, 0.2)', color: '#b899eb', border: '1px solid rgba(184, 153, 235, 0.3)' }}>
                {loading ? '...' : `${stage.name || 'Active Stage'}`}
              </span>
              
              <h3 style={{ fontSize: '20px', margin: '0 0 10px 0', fontWeight: '800' }}>
                {loading ? <Skeleton width="260px" height="24px" /> : (isPendingTrack ? '⚠️ Challenge Track Not Selected' : team.challenge)}
              </h3>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                Your team has been formed and approved. Collaborate with teammates to build your solution, prepare slides, and submit deliverables before the deadline.
              </p>
              
              {/* 🎯 NEW: FROZEN TRACK SELECTOR LOGIC */}
              {team.team_name && (
                <div style={{ 
                  background: isPendingTrack ? 'var(--bg-secondary)' : 'rgba(22, 163, 74, 0.1)', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  border: isPendingTrack ? '1px dashed var(--status-warning)' : '1px solid var(--status-success)',
                  marginBottom: '20px'
                }}>
                  {isPendingTrack ? (
                    // SHOW DROPDOWN IF NO TRACK IS SELECTED YET
                    <>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                        ⚠️ Action Required: Choose Your Team's Challenge Track
                      </label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <select 
                          value={selectedTrack} 
                          onChange={(e) => setSelectedTrack(e.target.value)}
                          style={{
                            flex: 1, padding: '10px', borderRadius: '6px', 
                            background: 'var(--bg-primary)', color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)', fontSize: '13px'
                          }}
                        >
                          <option value="" disabled>-- Select a Track --</option>
                          {AVAILABLE_TRACKS.map(track => (
                            <option key={track} value={track}>{track}</option>
                          ))}
                        </select>
                        <button 
                          onClick={handleTrackUpdate}
                          disabled={isUpdatingTrack || !selectedTrack}
                          className="ref-primary-button" 
                          style={{ 
                            opacity: (isUpdatingTrack || !selectedTrack) ? 0.5 : 1,
                            cursor: (isUpdatingTrack || !selectedTrack) ? 'not-allowed' : 'pointer',
                            background: 'var(--accent-color)', color: 'var(--text-on-accent)'
                          }}
                        >
                          {isUpdatingTrack ? 'Saving...' : 'Lock Track'}
                        </button>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Note: Once you lock in your track, it cannot be changed.
                      </p>
                    </>
                  ) : (
                    // 🔒 SHOW LOCKED STATE IF A TRACK IS ALREADY SELECTED
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>🔒</span>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--status-success)', marginBottom: '4px' }}>
                          Challenge Track Locked
                        </label>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{team.challenge}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to="/participant/my-team" className="ref-primary-button" style={{ background: '#7dbbff', color: '#1e293b' }}>
                  View Teammates
                </Link>
                <Link to="/participant/event-journey" className="ref-primary-button" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  View Full Timeline
                </Link>
              </div>
            </section>

            {/* Quick Portal Links */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <SectionTitle title="Quick Portal Links" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
                {[
                  { label: 'Event Journey', to: '/participant/event-journey', desc: 'Track stages', icon: '🗺️' },
                  { label: team.team_name || 'My Team', to: '/participant/my-team', desc: 'Teammates & Mentor', icon: '👥' },
                  { label: 'Project Submission', to: '/participant/submissions', desc: 'Upload deliverables', icon: '📤' },
                ].map((item) => (
                  <Link key={item.label} to={item.to} className="quick-action-card"
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'left', transition: 'all 160ms ease' }}>
                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-primary)' }}>{item.label}</strong>
                      <small style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{item.desc}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Recent Announcements */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <section className="ref-card" style={{ padding: '20px' }}>
              <SectionTitle title="Recent Announcements" action="View All" to="/participant/announcements" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {loading ? (
                  [1, 2].map(i => <Skeleton key={i} height="70px" radius="8px" />)
                ) : announcements.length > 0 ? announcements.map((ann, idx) => (
                  <article key={idx} style={{ padding: '12px', borderLeft: `3px solid ${ann.type === 'urgent' ? '#f87171' : 'var(--accent-color)'}`, background: 'var(--bg-primary)', borderRadius: '0 8px 8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="badge" style={{ fontSize: '8px', padding: '2px 6px', background: ann.type === 'urgent' ? 'rgba(239,68,68,0.15)' : undefined, color: ann.type === 'urgent' ? '#f87171' : undefined }}>
                        {ann.type === 'urgent' ? 'Urgent' : 'Info'}
                      </span>
                      <small style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>{new Date(ann.created_at).toLocaleDateString()}</small>
                    </div>
                    <h4 style={{ fontSize: '12px', margin: '4px 0', fontWeight: '700' }}>{ann.title}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{ann.message}</p>
                  </article>
                )) : (
                  <MascotEmptyState message="No announcements yet." size={76} />
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </ParticipantLayout>
  )
}

export default ParticipantDashboard