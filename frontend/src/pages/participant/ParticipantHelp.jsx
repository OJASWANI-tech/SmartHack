import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticipantLayout from '../../components/layout/ParticipantLayout'

export default function ParticipantHelp() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('mentor_issue')
  const [detail, setDetail] = useState('')
  const [grievances, setGrievances] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const eventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id')
  
  const getParticipantId = () => {
    try {
      const token = localStorage.getItem('HackSmart_token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        if (payload.participant_id) return payload.participant_id
      }
    } catch (e) {
      console.error(e)
    }
    return localStorage.getItem('participant_id')
  }

  const participantId = getParticipantId()
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000)
  }

  const getGrievanceData = useCallback(async () => {
    const res = await fetch(`${apiBase}/api/v1/events/${eventId}/grievances`)
    if (!res.ok) throw new Error('Failed to fetch grievances')
    const data = await res.json()
    return data.filter(g => g.participant_id === participantId)
  }, [eventId, participantId, apiBase])

  const fetchGrievances = async () => {
    try {
      const filtered = await getGrievanceData()
      setGrievances(filtered)
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
        const filtered = await getGrievanceData()
        if (active) {
          setGrievances(filtered)
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
  }, [getGrievanceData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!detail.trim()) {
      showToast('Please provide details for the grievance.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${apiBase}/api/v1/events/${eventId}/grievances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          category,
          detail
        })
      })

      if (res.ok) {
        const resData = await res.json()
        showToast(`Grievance submitted successfully! AI flagged severity: ${resData.severity}.`, 'success')
        setDetail('')
        setLoading(true)
        fetchGrievances()
      } else {
        const err = await res.json()
        showToast(err.detail || 'Failed to submit grievance.', 'error')
      }
    } catch (errVal) {
      console.error(errVal)
      showToast('Connection error. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReopen = async (grievanceId) => {
    try {
      const res = await fetch(`${apiBase}/api/v1/events/${eventId}/grievances/${grievanceId}/reopen`, {
        method: 'POST'
      })
      if (res.ok) {
        showToast('Grievance ticket reopened.', 'success')
        setLoading(true)
        fetchGrievances()
      } else {
        showToast('Failed to reopen ticket.', 'error')
      }
    } catch (errVal) {
      console.error(errVal)
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
      return <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', textTransform: 'uppercase', fontSize: '9.5px' }}>Pending</span>
    }
    if (stat === 'resolved') {
      return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', textTransform: 'uppercase', fontSize: '9.5px' }}>Resolved</span>
    }
    return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', textTransform: 'uppercase', fontSize: '9.5px' }}>Rejected</span>
  }

  return (
    <ParticipantLayout pageTitle="Support Console" pageSubtitle="Raise grievances regarding mentors, teammate conflicts, or platform issues.">
      <div className="committee-reference-dashboard" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Submission Form */}
          <section className="ref-card" style={{ padding: '24px', minWidth: '0' }}>
            <div className="ref-section-title" style={{ marginBottom: '16px' }}>
              <h3>Submit a Grievance</h3>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="mentor_issue">Mentorship Concern (e.g. mentor absent / unresponsive)</option>
                  <option value="team_conflict">Teammate Conflict (e.g. member not contributing)</option>
                  <option value="other">Platform Query / Other Concerns</option>
                </select>
              </div>

              {category === 'other' && (
                <div style={{
                  padding: '14px',
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px dashed rgba(139, 92, 246, 0.3)',
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '-4px',
                  animation: 'fadeIn 0.25s ease-out'
                }}>
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(-5px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.45' }}>
                    ðŸ’¡ <strong>Get Instant Answers!</strong> For platform queries, schedules, room assignments, or rules, our AI assistant can answer you instantly.
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/participant/assistant')}
                    className="ref-primary-button"
                    style={{
                      alignSelf: 'flex-start',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      color: '#a78bfa',
                      padding: '6px 14px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)'
                      e.currentTarget.style.color = '#c084fc'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'
                      e.currentTarget.style.color = '#a78bfa'
                    }}
                  >
                    ðŸ¤– Chat with Ask AI
                  </button>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>Issue Details</label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Explain your issue in detail. If this is a mentor issue, please specify what session was missed. AI will auto-evaluate severity."
                  rows="6"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    lineHeight: '1.45',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="ref-primary-button"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#a78bfa',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s ease',
                  marginTop: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'
                  e.currentTarget.style.color = '#c084fc'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
                  e.currentTarget.style.color = '#a78bfa'
                }}
              >
                {submitting ? 'Submitting...' : 'ðŸš€ Submit Grievance'}
              </button>
            </form>
          </section>

          {/* Grievance Logs */}
          <section className="ref-card" style={{ padding: '24px', minHeight: '400px', minWidth: '0' }}>
            <div className="ref-section-title" style={{ marginBottom: '16px' }}>
              <h3>Grievance Submission Log</h3>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                <div className="spinner" style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
                  animation: 'shimmer 1.4s infinite'
                }}></div>
              </div>
            ) : grievances.length === 0 ? (
              <div style={{ padding: '40px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No past grievances filed. Your tickets are clean!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {grievances.map(g => (
                  <article key={g.id} style={{
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {getCategoryBadge(g.category)}
                        {getSeverityBadge(g.severity)}
                      </div>
                      {getStatusBadge(g.status)}
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.45', color: 'var(--text-primary)', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {g.detail}
                    </p>

                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      Filed: {new Date(g.created_at).toLocaleString()}
                    </div>

                    {g.resolution_note && (
                      <div style={{
                        padding: '12px',
                        background: 'var(--bg-primary)',
                        borderLeft: '3px solid var(--accent-color)',
                        borderRadius: '0 6px 6px 0',
                        fontSize: '12.5px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase' }}>Resolution Action</strong>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.4', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{g.resolution_note}</p>
                        
                        {g.status === 'resolved' && (
                          <button
                            onClick={() => handleReopen(g.id)}
                            style={{
                              alignSelf: 'flex-start',
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: 'var(--accent-color)',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontSize: '11px',
                              textDecoration: 'underline',
                              marginTop: '4px'
                            }}
                          >
                            ðŸ”“ Reopen Grievance
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </ParticipantLayout>
  )
}

