import { useState, useEffect, useMemo, useCallback } from 'react'
import CommitteeLayout from '../../components/layout/CommitteeLayout'

export default function CommitteeGrievances() {
  const [grievances, setGrievances] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  
  // Modals / Action States
  const [selectedGrievance, setSelectedGrievance] = useState(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const eventId = localStorage.getItem('current_event_id') || 'default_event'
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000)
  }

  const getGrievanceData = useCallback(async () => {
    const res = await fetch(`${apiBase}/api/v1/events/${eventId}/grievances`)
    if (!res.ok) throw new Error('Failed to fetch grievances')
    return res.json()
  }, [eventId, apiBase])

  const markAsClicked = useCallback(async () => {
    try {
      await fetch(`${apiBase}/api/v1/events/${eventId}/grievances/mark-clicked`, {
        method: 'POST'
      })
      window.dispatchEvent(new CustomEvent('HackSmart-grievances-updated'))
    } catch (e) {
      console.error('Failed to mark grievances as clicked:', e)
    }
  }, [eventId, apiBase])

  const fetchGrievances = async () => {
    try {
      setLoading(true)
      const data = await getGrievanceData()
      setGrievances(data)
      await markAsClicked()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await getGrievanceData()
        if (active) {
          setGrievances(data)
          await markAsClicked()
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    load()
    return () => { active = false }
  }, [getGrievanceData, markAsClicked])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = grievances.length
    const pending = grievances.filter(g => g.status === 'pending').length
    const resolved = grievances.filter(g => g.status === 'resolved').length
    const high = grievances.filter(g => g.severity === 'high' && g.status === 'pending').length
    return { total, pending, resolved, high }
  }, [grievances])

  // Filtered list
  const filteredGrievances = useMemo(() => {
    return grievances.filter(g => {
      const matchStatus = statusFilter === 'all' || g.status === statusFilter
      const matchSeverity = severityFilter === 'all' || g.severity === severityFilter
      return matchStatus && matchSeverity
    })
  }, [grievances, statusFilter, severityFilter])

  // Handles standard resolution actions
  const handleResolveAction = async (grievance, action) => {
    const note = resolutionNote || `Executed action: ${action.replace(/_/g, ' ')}`
    try {
      const res = await fetch(`${apiBase}/api/v1/events/${eventId}/grievances/${grievance.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note
        })
      })

      if (res.ok) {
        showToast(`Grievance resolved successfully with action: ${action.replace(/_/g, ' ')}.`, 'success')
        setSelectedGrievance(null)
        setResolutionNote('')
        setShowEmailForm(false)
        fetchGrievances()
      } else {
        showToast('Failed to execute resolution.', 'error')
      }
    } catch (e) {
      console.error(e)
      showToast('Connection error.', 'error')
    }
  }

  // Opens email drafter
  const openEmailDrafter = (grievance) => {
    setSelectedGrievance(grievance)
    setShowEmailForm(true)
    
    if (grievance.category === 'mentor_issue') {
      setEmailSubject(`[Action Required] Mentorship Concerns reported by Team ${grievance.team_name}`)
      setEmailBody(
        `Dear Mentor,\n\n` +
        `We have received complaints regarding your availability and engagement for Team ${grievance.team_name}.\n` +
        `Please connect with them immediately to resolve their issues and organize your scheduled sync sessions.\n\n` +
        `Best,\n` +
        `HackSmart Organizing Committee`
      )
    } else if (grievance.category === 'team_conflict') {
      setEmailSubject(`[Action Required] Team Conflict warning - Team ${grievance.team_name}`)
      setEmailBody(
        `Dear Mentor,\n\n` +
        `We have received reports of internal conflict and work distribution disputes in Team ${grievance.team_name}.\n` +
        `As their assigned mentor, please organize a mediation meeting as soon as possible to help them align and divide tasks fairly.\n\n` +
        `Best,\n` +
        `HackSmart Organizing Committee`
      )
    } else {
      setEmailSubject(`[Support Query] Team ${grievance.team_name} Grievance Update`)
      setEmailBody(
        `Dear Team,\n\n` +
        `Our platform supervisors have received your query: "${grievance.detail}". We are reviewing the logs and will assist shortly.\n\n` +
        `Best,\n` +
        `HackSmart Organizing Committee`
      )
    }
  }

  // Sends email
  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      showToast('Subject and body are required.', 'error')
      return
    }

    try {
      const res = await fetch(`${apiBase}/api/v1/events/${eventId}/grievances/${selectedGrievance.id}/email-mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          body: emailBody
        })
      })

      if (res.ok) {
        showToast('Warning email dispatched and logged successfully.', 'success')
        setShowEmailForm(false)
        // Auto resolve the ticket since notification has been sent
        handleResolveAction(selectedGrievance, 'resolve')
      } else {
        const err = await res.json()
        showToast(err.detail || 'Failed to dispatch email.', 'error')
      }
    } catch (e) {
      console.error(e)
      showToast('Connection error.', 'error')
    }
  }

  const getCategoryBadge = (cat) => {
    if (cat === 'mentor_issue') {
      return <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>Mentorship Concern</span>
    }
    if (cat === 'team_conflict') {
      return <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>Team Conflict</span>
    }
    return <span className="badge" style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' }}>General Query</span>
  }

  const getSeverityBadge = (sev) => {
    if (sev === 'high') {
      return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>ðŸ”´ High Severity</span>
    }
    if (sev === 'medium') {
      return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>ðŸŸ¡ Medium</span>
    }
    return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>ðŸŸ¢ Low</span>
  }

  const getStatusBadge = (stat) => {
    if (stat === 'pending') {
      return <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', textTransform: 'uppercase', fontSize: '9px' }}>Pending</span>
    }
    if (stat === 'resolved') {
      return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', textTransform: 'uppercase', fontSize: '9px' }}>Resolved</span>
    }
    return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', textTransform: 'uppercase', fontSize: '9px' }}>Rejected</span>
  }

  return (
    <CommitteeLayout pageTitle="Grievance Resolution Hub" pageSubtitle="Mediate team conflicts, swap inactive mentors, and dispatch official communications.">
      <div className="committee-reference-dashboard" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {toast.show && (
          <div className="pipeline-toast" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 'bold',
            fontSize: '13px',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <style>{`
              @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
            {toast.message}
          </div>
        )}

        {/* Analytics strip */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <article className="ref-mini-card">
            <span className="ref-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>ðŸ“¥</span>
            <div>
              <strong>{stats.total}</strong>
              <p>Total Filed</p>
              <small>All support tickets</small>
            </div>
          </article>
          <article className="ref-mini-card">
            <span className="ref-icon" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>âŒ›</span>
            <div>
              <strong>{stats.pending}</strong>
              <p>Pending Tickets</p>
              <small>Awaiting resolution</small>
            </div>
          </article>
          <article className="ref-mini-card">
            <span className="ref-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>ðŸ”´</span>
            <div>
              <strong>{stats.high}</strong>
              <p>High Severity</p>
              <small>Active warnings</small>
            </div>
          </article>
          <article className="ref-mini-card">
            <span className="ref-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>âœ…</span>
            <div>
              <strong>{stats.resolved}</strong>
              <p>Resolved Tickets</p>
              <small>System resolved</small>
            </div>
          </article>
        </section>

        {/* Filters */}
        <section className="committee-card" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', padding: '12px 16px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>FILTERS:</span>
          
          <select 
            className="committee-select" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', fontSize: '12.5px' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select 
            className="committee-select" 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ width: 'auto', fontSize: '12.5px' }}
          >
            <option value="all">All Severities</option>
            <option value="high">High Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="low">Low Severity</option>
          </select>
        </section>

        {/* Modal Drafters */}
        {showEmailForm && selectedGrievance && (
          <section className="ref-card" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--accent-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: 'var(--accent-color)', textTransform: 'uppercase' }}>
                ðŸ“§ Compose warning message to team mentor
              </h4>
              <button 
                onClick={() => setShowEmailForm(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}
              >
                âœ•
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>Subject</label>
                <input 
                  type="text" 
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>Message Body</label>
                <textarea 
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows="5"
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.45', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button 
                  onClick={handleSendEmail}
                  className="committee-btn committee-btn-success"
                  style={{ padding: '6px 16px', fontSize: '12px' }}
                >
                  Send Warnings & Resolve
                </button>
                <button 
                  onClick={() => setShowEmailForm(false)}
                  className="committee-btn committee-btn-outline"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Main List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <div className="spinner" style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
              animation: 'shimmer 1.4s infinite'
            }}></div>
          </div>
        ) : filteredGrievances.length === 0 ? (
          <div style={{ padding: '48px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No matching grievances found. Roster health is perfect!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredGrievances.map(g => (
              <article key={g.id} className="committee-card" style={{ padding: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'stretch' }}>
                
                {/* Left Block: Details */}
                <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {getCategoryBadge(g.category)}
                    {getSeverityBadge(g.severity)}
                    {getStatusBadge(g.status)}
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginLeft: 'auto' }}>
                      {new Date(g.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                      Team: <span style={{ color: 'var(--accent-color)' }}>{g.team_name}</span>
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Submitted by: <strong style={{ color: 'var(--text-primary)' }}>{g.participant_name}</strong>
                    </span>
                  </div>

                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', lineHeight: '1.45', color: 'var(--text-secondary)', padding: '10px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                    {g.detail}
                  </p>

                  {g.resolution_note && (
                    <div style={{ marginTop: '6px', padding: '10px', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--status-success)', borderRadius: '0 6px 6px 0' }}>
                      <strong style={{ display: 'block', fontSize: '10px', color: 'var(--status-success)', textTransform: 'uppercase', marginBottom: '2px' }}>Resolution Notes</strong>
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{g.resolution_note}</p>
                    </div>
                  )}
                </div>

                {/* Right Block: AI Copilot Assistant */}
                {g.status === 'pending' && (
                  <div style={{
                    flex: '1 1 360px',
                    maxWidth: '420px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    {/* AI Copilot Draft Card */}
                    <div style={{
                      background: 'rgba(139, 92, 246, 0.04)',
                      border: '1px dashed rgba(139, 92, 246, 0.25)',
                      borderRadius: '6px',
                      padding: '10px 12px'
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--status-purple)', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        âœ¦ AI COPILOT SUGGESTED RESPONSE
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{g.ai_drafted_reply}"
                      </p>
                    </div>

                    {/* Resolution Note Field */}
                    <div>
                      <input 
                        type="text" 
                        placeholder="Type resolution notes here (optional)..."
                        onChange={(e) => setResolutionNote(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Copilot Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleResolveAction(g, 'resolve')}
                          className="committee-btn committee-btn-success"
                          style={{ flex: 1, padding: '6px 0', fontSize: '11px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                        >
                          Resolve Ticket
                        </button>
                        
                        <button
                          onClick={() => openEmailDrafter(g)}
                          className="committee-btn committee-btn-primary"
                          style={{ flex: 1, padding: '6px 0', fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)' }}
                        >
                          ðŸ“§ Email Mentor
                        </button>
                      </div>

                      {g.category === 'mentor_issue' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleResolveAction(g, 'swap_mentor')}
                            className="committee-btn"
                            style={{ flex: 1, padding: '6px 0', fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)' }}
                          >
                            ðŸ”„ Swap Mentor
                          </button>
                          <button
                            onClick={() => handleResolveAction(g, 'remove_mentor')}
                            className="committee-btn"
                            style={{ flex: 1, padding: '6px 0', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
                          >
                            ðŸš« Remove Mentor
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleResolveAction(g, 'reject')}
                        className="committee-btn committee-btn-outline"
                        style={{ padding: '6px 0', fontSize: '11px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                      >
                        Dismiss / Reject Request
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

      </div>
    </CommitteeLayout>
  )
}

