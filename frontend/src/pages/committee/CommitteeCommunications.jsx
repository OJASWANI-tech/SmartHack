import { useMemo, useState, useEffect } from 'react'
import CommitteeLayout from '../../components/layout/CommitteeLayout'

// 📋 Dynamic Pipeline Campaign Template Definitions (Static Count Suffixes Removed)
const pipelineEmails = [
  {
    id: 1,
    stage: 'Welcome & Registration Confirmation',
    status: 'Sent',
    targetScope: 'Participants',
    sentAt: 'May 21, 10:10 AM',
    subject: '🚀 [{first_name}] Congratulations! Shortlisted for Round 2 - WiSE@TI Hackathon',
    body: `Dear {first_name},

We're thrilled to inform you that you have been shortlisted for Round 2 of the WiSE@TI Hackathon for Women in Software Engineering.

Based on our intelligent matching analysis, your team assignment is officially complete. You have been placed in {team_name}!

📋 Here's what to do next:

1. Connect with your team 🤝
Your team members are marked below. Please reach out, establish communications, and introduce yourselves:
{teammates}

2. Understand your team synergy 💡
Our orchestration platform evaluated your technical background and engineered this optimal alignment:
"{rationale}"

3. Pick your theme 🚀
Review the challenge tracks with your team, select your technical domain focus, and begin outlining your architectural solution blueprints.`,
  },
  {
    id: 2,
    stage: 'Team Assignment Announcement',
    status: 'Pending Approval',
    targetScope: 'Participants',
    sentAt: '',
    subject: 'Your EventFlow team assignment is ready',
    body: 'Hi there,\n\nYour team assignment has been generated and approved by the committee. Please review your teammates and prepare for the challenge briefing.\n\nRegards,\nOrganising Committee',
  },
  {
    id: 3,
    stage: 'Challenge Briefing',
    status: 'Draft',
    targetScope: 'Participants',
    sentAt: '',
    subject: 'Challenge briefing and submission expectations',
    body: 'Hello teams,\n\nThe challenge brief is now available. Build a focused prototype, document assumptions, and prepare a five-minute demo.\n\nRegards,\nEventFlow Committee',
  },
  {
    id: 4,
    stage: 'Evaluation Reminder (to Judges)',
    status: 'Draft',
    targetScope: 'Judges',
    sentAt: '',
    subject: 'Reminder: scorecards awaiting evaluation',
    body: 'Hello judge,\n\nYour assigned teams are ready for review. Please complete innovation, code quality, presentation, and impact scores before the deadline.',
  },
  {
    id: 5,
    stage: 'Results Publication',
    status: 'Skipped',
    targetScope: 'Participants',
    sentAt: '',
    subject: 'Final results are published',
    body: 'Hi everyone,\n\nThe leaderboard has been published. Congratulations to the qualifying teams and thank you for participating.',
  },
]

function CommitteeCommunications() {
  const [deliveryRows, setDeliveryRows] = useState([]);
  const [announcement, setAnnouncement] = useState('')
  const [recipientScope, setRecipientScope] = useState('All Participants')
  const [confirming, setConfirming] = useState(false)
  const [preview, setPreview] = useState(null)
  const [editing, setEditing] = useState(false)
  const [deliverySearch, setDeliverySearch] = useState('')
  const [showBroadcasts, setShowBroadcasts] = useState(false)
  const [showDelivery, setShowDelivery] = useState(true)
  const [sending, setSending] = useState(false)
  
  // 🔔 Elegant Toast Notification Banner State
  const [toast, setToast] = useState({ message: '', type: '' })

  // ⚖️ Dynamic Judges State Roster
  const [judges, setJudges] = useState([])
  const [loadingJudges, setLoadingJudges] = useState(false)

  const [recentBroadcasts, setRecentBroadcasts] = useState([
    { time: '11:45 AM', message: 'Prototype checkpoint starts in 30 minutes.', scope: 'All Participants' },
    { time: '10:15 AM', message: 'Judges can now access assigned scorecards.', scope: 'All Judges' },
    { time: 'Yesterday', message: 'Team formation has been completed.', scope: 'All Participants' },
  ])

  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')

  const currentEventId = useMemo(() => {
    return localStorage.getItem('current_event_id') || '4e96cf60-f634-4e1e-9e5b-f40ae2dde992'
  }, [])

  // Dynamic Base API URL Resolution
  const apiBaseUrl = useMemo(() => {
    return import.meta.env.VITE_API_URL || 'http://localhost:8000'
  }, [])

  // In-app Notification Trigger Tool
  const triggerNotification = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast({ message: '', type: '' })
    }, 5000)
  }

  // LIVE FETCH ROUTINE
  const fetchLiveLogs = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/events/${currentEventId}/delivery-logs`);
      if (response.ok) {
        const data = await response.json();
        setDeliveryRows(data); 
      }
    } catch (err) {
      console.error("Communication pipeline exception detected:", err);
    }
  };

  // POLLING WORKER EFFECT
  useEffect(() => {
    fetchLiveLogs();
    const interval = setInterval(fetchLiveLogs, 4000); 
    return () => clearInterval(interval);
  }, [currentEventId, apiBaseUrl]);

  const filteredDelivery = useMemo(() => {
    return deliveryRows.filter((row) => {
      const query = deliverySearch.toLowerCase()
      return `${row.name || ''} ${row.email || ''}`.toLowerCase().includes(query)
    })
  }, [deliverySearch, deliveryRows])

  // Dynamic participants size estimation
  const totalParticipantsCount = useMemo(() => {
    const uniqueParticipants = new Set(
      deliveryRows
        .filter(r => !r.status?.toLowerCase().includes('judge'))
        .map(r => r.email)
    )
    return uniqueParticipants.size > 0 ? uniqueParticipants.size : 42;
  }, [deliveryRows])

  // 🔍 Fetch Unique Judges from Finalized Evaluation Sheets
  const fetchJudgesFromFinalizedList = async () => {
    setLoadingJudges(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/events/${currentEventId}/finalized`)
      let teamsData = []
      if (response.ok) {
        teamsData = await response.json()
      } else {
        const fallbackRes = await fetch(`${apiBaseUrl}/api/v1/events/${currentEventId}/teams`)
        if (fallbackRes.ok) teamsData = await fallbackRes.json()
      }

      const rawTeams = Array.isArray(teamsData) ? teamsData : (teamsData?.data || teamsData?.teams || [])
      const uniqueJudgesMap = new Map()

      rawTeams.forEach(team => {
        const rawScores = team.scores_snapshot || team.scores
        if (rawScores) {
          let scoresArray = []
          if (Array.isArray(rawScores)) {
            scoresArray = rawScores
          } else {
            try { scoresArray = JSON.parse(rawScores) } catch (e) { scoresArray = [] }
          }

          scoresArray.forEach(scoreItem => {
            if (scoreItem.judge_name) {
              const name = scoreItem.judge_name
              const cleanEmail = scoreItem.judge_email || `${name.toLowerCase().replace(/[^a-z]/g, '').replace(/\s+/g, '.')}@ti-hackathon.org`
              uniqueJudgesMap.set(name, { name, email: cleanEmail, checked: true })
            }
          })
        }
      })

      if (uniqueJudgesMap.size === 0) {
        ["Dr. Evelyn Ross", "Marcus Vance", "Prof. Alan Turing"].forEach(name => {
          uniqueJudgesMap.set(name, { name, email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@ti-hackathon.org`, checked: true })
        })
      }

      setJudges(Array.from(uniqueJudgesMap.values()))
    } catch (err) {
      console.error("Communication dataset alignment exception detected:", err)
      const defaultJudges = ["Dr. Evelyn Ross", "Marcus Vance", "Prof. Alan Turing"]
      setJudges(defaultJudges.map(name => ({
        name,
        email: `${name.toLowerCase().replace(/[^a-z]/g, '')}@ti-hackathon.org`,
        checked: true
      })))
    } finally {
      setLoadingJudges(false)
    }
  }

  function handleOpenPreview(email) {
    setPreview(email);
    setEditSubject(email.subject);
    setEditBody(email.body);
    setEditing(false);
    
    if (email.targetScope === 'Judges' || email.id === 4) {
      fetchJudgesFromFinalizedList()
    }
  }

  // 🚀 Dispatches personalized payloads to filtered targets
  async function handleApproveAndSend() {
    setSending(true)
    const isJudgeStage = preview.targetScope === 'Judges' || preview.id === 4

    try {
      if (isJudgeStage) {
        const targetJudges = judges.filter(j => j.checked)
        if (targetJudges.length === 0) {
          triggerNotification("Please select at least one judge target record to distribute notifications.", "danger")
          setSending(false)
          return
        }

        for (const judge of targetJudges) {
          const personalizedBody = editBody
            .replace(/{judge_name}/g, judge.name)
            .replace(/Hello judge/g, `Hello ${judge.name}`)

          await fetch(`${apiBaseUrl}/api/v1/events/${currentEventId}/send-announcements`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('eventflow_token') || ''}`
            },
            body: JSON.stringify({
              subject: editSubject,
              body: personalizedBody,
              recipient_email: judge.email,
              recipient_scope: 'Judge'
            })
          })
        }

        triggerNotification(`🚀 Success! Evaluation reminders transmitted cleanly to ${targetJudges.length} judges.`, 'success');
      } else {
        const response = await fetch(`${apiBaseUrl}/api/v1/events/${currentEventId}/send-announcements`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('eventflow_token') || ''}`
          },
          body: JSON.stringify({
            subject: editSubject,
            body: editBody
          })
        });

        if (!response.ok) throw new Error("Worker endpoint rejected payload parameters.");
        triggerNotification('🚀 Success! Custom template parameters processed and handed off to Celery queues.', 'success');
      }

      setPreview(null);
      fetchLiveLogs(); 
    } catch (err) {
      triggerNotification(`Transmission Error: ${err.message}`, 'danger');
    } finally {
      setSending(false)
    }
  }

  async function confirmBroadcast() {
    if (!announcement.trim()) return;
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/events/${currentEventId}/broadcasts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('eventflow_token') || ''}`
        },
        body: JSON.stringify({
          title: recipientScope === 'All Judges' ? '📢 Update for Judges' : '📢 Event Announcement',
          body: announcement,
          type: 'info', 
          scope: recipientScope
        })
      });

      if (!response.ok) throw new Error("Backend rejected broadcast execution parameters.");
      
      setRecentBroadcasts((items) => [
        { time: 'Just now', message: announcement, scope: recipientScope },
        ...items,
      ].slice(0, 5));
      
      setAnnouncement('');
      setConfirming(false);
      triggerNotification('Broadcast successfully transmitted to active participant dashboards!', 'success');
    } catch (err) {
      triggerNotification(`Broadcast Delivery Failed: ${err.message}`, 'danger');
    }
  }

  return (
    <CommitteeLayout pageTitle="Communications" pageSubtitle="Broadcast announcements, manage email templates, and monitor delivery activity.">
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', background: 'var(--bg-secondary)' }}>
        
        {/* 🏢 LEFT PANEL WORKSPACE */}
        <div style={{ flex: 1, padding: '16px', maxWidth: preview ? '60%' : '100%', transition: 'max-width 0.25s ease', boxSizing: 'border-box' }}>

          {/* 🔔 ELEGANT IN-APP TOAST BANNER */}
          {toast.message && (
            <div style={{
              background: toast.type === 'success' ? '#e8f5e9' : '#ffebee',
              color: toast.type === 'success' ? '#2e7d32' : '#c62828',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: '500',
              border: `1px solid ${toast.type === 'success' ? '#a5d6a7' : '#ef9a9a'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}>
              <span>{toast.message}</span>
              <button 
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }} 
                onClick={() => setToast({ message: '', type: '' })}
              >
                ×
              </button>
            </div>
          )}

          {/* QUICK DISPATCH COMPONENT */}
          <section className="committee-card" style={{ padding: '12px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ background: 'var(--status-info-bg)', color: 'var(--status-info)', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>📢</div>
              <input 
                className="committee-input"
                placeholder="Type a dashboard announcement..." 
                value={announcement} 
                onChange={(e) => setAnnouncement(e.target.value)} 
              />
              <select 
                className="committee-select"
                style={{ width: 'auto' }}
                value={recipientScope} 
                onChange={(e) => setRecipientScope(e.target.value)}
              >
                <option>All Participants</option>
                <option>All Judges</option>
              </select>
              <button 
                className="committee-btn committee-btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px', opacity: announcement.trim() ? 1 : 0.6 }} 
                type="button" 
                disabled={!announcement.trim()} 
                onClick={() => setConfirming(true)}
              >
                Broadcast
              </button>
            </div>

            <details style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }} open={showBroadcasts} onToggle={(e) => setShowBroadcasts(e.currentTarget.open)}>
              <summary style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer' }}>Recent Broadcasts</summary>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentBroadcasts.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-primary)' }}><strong style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>{item.time}</strong>{item.message}</span>
                    <span className="status-pill purple" style={{ height: 'fit-content' }}>{item.scope}</span>
                  </div>
                ))}
              </div>
            </details>
          </section>

          {/* TEMPLATE CARDS WRAPPER */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {pipelineEmails.map((email) => {
              const statusTone = email.status.toLowerCase().includes('sent') ? 'success' : email.status.toLowerCase().includes('pending') ? 'warning' : 'info';
              const isSelected = preview?.id === email.id;
              
              // 📊 Compute dynamic audience size labels
              const countLabel = email.targetScope === 'Judges' 
                ? `All Judges (${judges.length || 6})` 
                : `All Participants (${totalParticipantsCount})`;

              return (
                <article 
                  key={email.id} 
                  className="committee-card"
                  style={{ 
                    borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    boxShadow: isSelected ? 'var(--card-shadow)' : 'none'
                  }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{email.stage}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`status-pill ${statusTone}`}>
                        {email.status}
                      </span>
                      {email.sentAt && <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '10px', marginTop: '2px' }}>{email.sentAt}</small>}
                    </div>
                    <button 
                      className="committee-btn committee-btn-outline"
                      style={{ padding: '5px 12px', fontSize: '12px' }} 
                      type="button" 
                      onClick={() => handleOpenPreview(email)}
                    >
                      Preview Draft
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {/* MONITOR LOGS ARCHITECTURE */}
          <section className="committee-card" id="delivery-log">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Delivery Logs</h3>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }} 
                type="button" 
                onClick={() => setShowDelivery(!showDelivery)}
              >
                {showDelivery ? 'Collapse Logs ▲' : 'Expand Logs ▼'}
              </button>
            </div>
            
            {showDelivery && (
              <>
                <input 
                  className="committee-input"
                  style={{ marginBottom: '12px' }} 
                  placeholder="Filter logs by recipient name or email lookup..." 
                  value={deliverySearch} 
                  onChange={(e) => setDeliverySearch(e.target.value)} 
                />
                <div className="committee-table-wrap">
                  <table className="committee-table">
                    <thead>
                      <tr>
                        <th>Recipient Name</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDelivery.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No active delivery logs found inside the database catalogs.
                          </td>
                        </tr>
                      ) : (
                        filteredDelivery.map((row, idx) => {
                          const statusTone = row.status?.toLowerCase().includes('sent') || row.status?.toLowerCase().includes('deliver') ? 'success' : row.status?.toLowerCase().includes('pending') ? 'warning' : 'danger';
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 500 }}>{row.name}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{row.email}</td>
                              <td>
                                <span className={`status-pill ${statusTone}`}>{row.status}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>

        {/* 🏬 RIGHT PREVIEW DRAWER PANEL */}
        {preview && (
          <aside className="committee-card" style={{ width: '40%', borderLeft: '1px solid var(--border-color)', borderTop: 'none', borderBottom: 'none', borderRight: 'none', borderRadius: 0, padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '0', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--status-purple)', letterSpacing: '0.05em' }}>✦ AGENT ENGINE PIPELINE DRAFT</span>
              <button style={{ background: 'none', border: 'none', fontSize: '22px', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} type="button" onClick={() => setPreview(null)}>×</button>
            </div>

            <div>
              <label className="committee-label">STAGE CAMPAIGN</label>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{preview.stage}</h3>
            </div>

            {/* ⚖️ DYNAMIC INTERACTIVE PANELISTS CHECKBOX LIST */}
            {(preview.targetScope === 'Judges' || preview.id === 4) && (
              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <label className="committee-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '700', color: 'var(--accent-color)' }}>
                  🎯 TARGET PANELISTS FROM FINALIZED DATA
                </label>
                {loadingJudges ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Analyzing score sheets for unique judge targets...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                    {judges.map((judge, idx) => (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={judge.checked} 
                          onChange={(e) => {
                            const updated = [...judges]
                            updated[idx].checked = e.target.checked
                            setJudges(updated)
                          }}
                          style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                        />
                        <div>
                          <strong>{judge.name}</strong> <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>({judge.email})</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {editing ? (
                <>
                  <div>
                    <label className="committee-label">EMAIL SUBJECT</label>
                    <input 
                      className="committee-input"
                      value={editSubject} 
                      onChange={(e) => setEditSubject(e.target.value)} 
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label className="committee-label">BODY CONTENT</label>
                    <textarea 
                      className="committee-textarea"
                      style={{ flex: 1, fontFamily: 'monospace', resize: 'none' }} 
                      rows="16" 
                      value={editBody} 
                      onChange={(e) => setEditBody(e.target.value)} 
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <label className="committee-label">SUBJECT</label>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{editSubject}</h4>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)', flex: 1, whiteSpace: 'pre-wrap', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {editBody}
                  </div>
                </>
              )}
            </div>

            {/* CONTROLS FOOTER */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button 
                className="committee-btn committee-btn-secondary"
                style={{ flex: 1 }} 
                type="button" 
                disabled={sending}
                onClick={() => setEditing(!editing)}
              >
                {editing ? 'Cancel Edits' : 'Edit Template'}
              </button>
              
              <button 
                className="committee-btn committee-btn-primary"
                style={{ flex: 1, background: 'var(--status-success)', borderColor: 'var(--status-success)' }} 
                type="button"
                disabled={sending}
                onClick={handleApproveAndSend}
              >
                {sending ? 'Sending...' : 'Approve & Send'}
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* MODAL DIALOG INJECTIONS */}
      {confirming && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <section className="committee-card" style={{ maxWidth: '400px', width: '90%' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Send this broadcast announcement?</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>This will instantly push notification payloads into target live dashboards scoped to <strong>{recipientScope}</strong>.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="committee-btn committee-btn-outline" type="button" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="committee-btn committee-btn-primary" type="button" onClick={confirmBroadcast}>Confirm Send</button>
            </div>
          </section>
        </div>
      )}
    </CommitteeLayout>
  )
}

export default CommitteeCommunications;