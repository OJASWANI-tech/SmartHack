import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import Skeleton from '../../components/common/Skeleton'
import { 
  getFinalizedTeams,
  assignMentorToTeam,
  finalizeMentorAllocations 
} from '../../services/committee'
import axios from 'axios' 
import { getCommitteeRole } from '../../services/auth'

function CommitteeAssignMentors() {
  const { eventId: urlEventId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const activeEventId = urlEventId || localStorage.getItem('current_event_id') || 'default_event'

  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [isLocking, setIsLocking] = useState(false)
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const [uniqueMentorsPool, setUniqueMentorsPool] = useState([])

  // Add this line near the top of your component (after the state declarations)
 // ðŸŽ¯ FIXED: Button displays if the user is an admin, a sandbox member, OR a standard committee account
const isAdmin = 
  getCommitteeRole() === 'admin' || 
  localStorage.getItem('HackSmart_mock_role') === 'dynamic-committee' ||
  getCommitteeRole() === 'committee';
  // ðŸ”” Elegant In-App Toast Notification Banner State (Replaces native window.alert)
  const [toast, setToast] = useState({ message: '', type: '' })

  // ðŸ“‹ Modal confirmation state for unassigned layouts
  const [confirmModal, setConfirmModal] = useState({ show: false, unassignedCount: 0 })

  // Context-aware notification trigger
  const triggerNotification = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast({ message: '', type: '' })
    }, 5000)
  }

  const loadAllocationData = async () => {
    try {
      setLoading(true)
      const teamsData = await getFinalizedTeams(activeEventId)
      
      const initializedTeams = Array.isArray(teamsData) ? teamsData.map(t => {
        let parsedMembers = t.members || t.members_snapshot || [];
        
        if (typeof parsedMembers === 'string') {
          try {
            parsedMembers = JSON.parse(parsedMembers);
          } catch (e) {
            console.error("Failed to parse team members:", e);
            parsedMembers = [];
          }
        }
        
        return { ...t, members: parsedMembers };
      }) : []
      
      setTeams(initializedTeams)

      const pool = []
      const seenEmails = new Set()
      
      initializedTeams.forEach(t => {
        if (t.mentor_email && !seenEmails.has(t.mentor_email)) {
          seenEmails.add(t.mentor_email)
          pool.push({
            name: t.mentor_name,
            company: t.mentor_company,
            email: t.mentor_email
          })
        }
      })
      setUniqueMentorsPool(pool)
    } catch (err) {
      console.error("Failed to load mentor allocation datasets:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllocationData()
  }, [activeEventId])

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      setUploadingCsv(true)
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      
      await axios.post(`${baseUrl}/api/v1/events/${activeEventId}/upload-mentors-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      triggerNotification("ðŸš€ Successfully parsed CSV and distributed mentors evenly across approved structures!", "success")
      await loadAllocationData()
    } catch (err) {
      const errorMessage = err.response?.data?.detail || "Failed to process mentor allocation matrix upload."
      triggerNotification(errorMessage, "danger")
    } finally {
      setUploadingCsv(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleMentorChange = async (teamId, mentorEmail) => {
    try {
      setSavingId(teamId)
      
      const selectedMentor = uniqueMentorsPool.find(m => m.email === mentorEmail) || {
        name: null,
        company: null,
        email: null
      }

      const payload = {
        mentor_name: selectedMentor.name,
        mentor_company: selectedMentor.company,
        mentor_email: selectedMentor.email
      }

      await assignMentorToTeam(activeEventId, teamId, payload)
      
      setTeams(prev => prev.map(team => 
        team.id === teamId 
          ? { 
              ...team, 
              mentor_name: payload.mentor_name,
              mentor_company: payload.mentor_company,
              mentor_email: payload.mentor_email
            } 
          : team
      ))
      triggerNotification("Mentor allocation preference updated.", "success")
    } catch (err) {
      const errMsg = err.message || "Could not update mentor assignment configuration."
      triggerNotification(errMsg, "danger")
    } finally {
      setSavingId(null)
    }
  }

  const handleLockAllocations = async () => {
    const unassignedCount = teams.filter(t => !t.mentor_email).length
    
    if (unassignedCount > 0) {
      setConfirmModal({ show: true, unassignedCount })
      return
    }

    executeLockPipeline()
  }

  const executeLockPipeline = async () => {
    setConfirmModal({ show: false, unassignedCount: 0 })
    try {
      setIsLocking(true)
      await finalizeMentorAllocations(activeEventId)
      triggerNotification("ðŸ† Mentor allocations locked successfully! Redirecting dashboard...", "success")
      setTimeout(() => {
        navigate('/committee/dashboard')
      }, 1500)
    } catch (err) {
      const errMsg = err.message || "Failed to commit final mentor alignment matrices."
      triggerNotification(errMsg, "danger")
    } finally {
      setIsLocking(false)
    }
  }

  if (loading) {
    return (
      <CommitteeLayout 
        statusItems={[{ label: 'Setup', value: 'Mentors' }]}
        pageTitle="Assign Mentors to Finalized Teams"
      >
        <div style={{ padding: '2rem', color: '#f8fafc' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '500', marginBottom: '1.5rem' }}>Mapping Mentorship Matrix...</h2>
          <Skeleton rows={6} />
        </div>
      </CommitteeLayout>
    )
  }

  return (
    <CommitteeLayout 
      statusItems={[{ label: 'Stage', value: 'Mentor Assignment' }]}
      pageTitle="Assign Mentors to Finalized Teams"
    >
      {/* Dynamic CSS Inject for Card Loading Keyframes and Interactivity */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animated-mentor-card {
          animation: fadeInUp 0.4s ease forwards;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .animated-mentor-card:hover {
          transform: translateY(-4px);
          border-color: #4f46e5 !important;
          box-shadow: 0 10px 20px -10px rgba(79, 70, 229, 0.3) !important;
        }
        .btn-secondary-custom {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }
        .btn-secondary-custom:hover {
          background: var(--bg-muted);
          color: var(--text-primary);
          border-color: var(--accent-color);
        }
        .btn-primary-custom {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff;
          border: none;
          transition: all 0.2s ease;
        }
        .btn-primary-custom:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }
      `}</style>

      <div className="committee-mentor-assignment-view" style={{ padding: '1.5rem', color: 'var(--text-primary)' }}>
        
        {/* ðŸ”” ELEGANT TOAST BANNER CONTAINER */}
        {toast.message && (
          <div style={{
            background: toast.type === 'success' ? '#e8f5e9' : '#ffebee',
            color: toast.type === 'success' ? '#2e7d32' : '#c62828',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '13px',
            fontWeight: '500',
            border: `1px solid ${toast.type === 'success' ? '#a5d6a7' : '#ef9a9a'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            animation: 'fadeInUp 0.25s ease'
          }}>
            <span>{toast.message}</span>
            <button 
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }} 
              onClick={() => setToast({ message: '', type: '' })}
            >
              Ã—
            </button>
          </div>
        )}

        {/* Page Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Upload a pool of mentors to automatically divide them across formations, or manage overrides below.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            
          {isAdmin && (
            <>
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                onChange={handleCsvUpload} 
                style={{ display: 'none' }} 
              />
              
              <button
                type="button"
                className="btn-secondary-custom"
                disabled={uploadingCsv}
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  padding: '0.5rem 0.85rem', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: '500',
                  fontSize: '0.85rem'
                }}
              >
                {uploadingCsv ? 'Distributing Mentors...' : 'ðŸ“¤ Upload Mentors CSV'}
              </button>
            </>
          )}

            <button 
              type="button" 
              className="btn-primary-custom"
              disabled={isLocking || teams.length === 0}
              onClick={handleLockAllocations}
              style={{ 
                padding: '0.5rem 1.1rem', 
                borderRadius: '6px', 
                cursor: isLocking ? 'not-allowed' : 'pointer', 
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            >
              {isLocking ? 'Freezing Roster...' : 'Lock Allocation & Complete'}
            </button>
          </div>
        </header>

        {/* Empty State Guard */}
        {teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1e293b', borderRadius: '8px', border: '1px dashed #334155' }}>
            <span style={{ fontSize: '2.5rem' }}>ðŸ‘¥</span>
            <h3 style={{ margin: '1rem 0 0.5rem 0', color: '#f8fafc' }}>No Finalized Teams Found</h3>
            <p style={{ color: '#94a3b8' }}>Please finalize the team generation step before attempting to allocate mentors.</p>
          </div>
        ) : (
          /* Allocation Board/Grid with scaled down box size standard */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {teams.map((team, index) => (
              <article 
                key={team.id}
                className="animated-mentor-card"
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '1.15rem', 
                  boxShadow: 'var(--card-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  animationDelay: `${index * 40}ms`
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{team.name}</h3>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      background: team.mentor_email ? 'rgba(52, 211, 153, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: team.mentor_email ? '#34d399' : '#fbbf24',
                      border: `1px solid ${team.mentor_email ? 'rgba(52, 211, 153, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                    }}>
                      {team.mentor_email ? 'Assigned' : 'Unassigned'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Focus:</strong> {team.challenge || 'General Track'}
                  </p>

                  {team.mentor_email && (
                    <div style={{ background: 'var(--bg-card)', padding: '0.6rem 0.85rem', borderRadius: '6px', marginBottom: '1rem', borderLeft: '3px solid var(--primary)', fontSize: '0.8rem' }}>
                      ðŸ‘¨â€ðŸ« <strong style={{ color: 'var(--text-primary)' }}>{team.mentor_name}</strong> <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({team.mentor_company})</span>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.15rem', marginLeft: '1.4rem' }}>{team.mentor_email}</div>
                    </div>
                  )}

                  <div style={{ marginBottom: '1.25rem' }}>
                    <small style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7 sugar' }}>Team Members</small>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {team.members && team.members.length > 0 ? (
                        team.members.map((m, idx) => (
                          <span 
                            key={m.email || idx} 
                            style={{ fontSize: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '0.15rem 0.45rem', borderRadius: '10px', color: 'var(--text-primary)' }}
                          >
                            {m.name} {m.domain ? `(${m.domain})` : ''}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>Empty roster</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mentor Allocation Selector Form Block */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <label htmlFor={`mentor-select-${team.id}`} style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Reassign / Swap Mentor {savingId === team.id && <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>(Saving...)</span>}
                  </label>
                  <select
                    id={`mentor-select-${team.id}`}
                    disabled={savingId === team.id}
                    value={team.mentor_email || ''}
                    onChange={(e) => handleMentorChange(team.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- No Mentor Assigned --</option>
                    {uniqueMentorsPool.map((mentor) => (
                      <option key={mentor.email} value={mentor.email}>
                        {mentor.name} ({mentor.company})
                      </option>
                    ))}
                  </select>
                </div>

              </article>
            ))}
          </div>
        )}
      </div>

      {/* ðŸ“¥ IN-APP MODAL INJECTION (Replaces disruptive window.confirm popup) */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <section style={{ maxWidth: '440px', width: '90%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>âš ï¸ Incomplete Mentor Allocation</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              There are still <strong>{confirmModal.unassignedCount} teams</strong> without an assigned mentor. Do you want to proceed with freezing the configuration matrices anyway?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary-custom" 
                type="button" 
                onClick={() => setConfirmModal({ show: false, unassignedCount: 0 })}
                style={{ padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
              >
                Go Back
              </button>
              <button 
                className="btn-primary-custom" 
                type="button" 
                onClick={executeLockPipeline}
                style={{ padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
              >
                Confirm & Lock
              </button>
            </div>
          </section>
        </div>
      )}
    </CommitteeLayout>
  )
}

export default CommitteeAssignMentors;
