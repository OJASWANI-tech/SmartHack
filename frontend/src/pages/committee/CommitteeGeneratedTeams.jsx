import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import Skeleton from '../../components/common/Skeleton'
import { 
  getTeams, 
  approveSingleTeam, 
  rejectSingleTeam, 
  approveEntireStage,
  generateDbRationales
} from '../../services/committee'

function CommitteeGeneratedTeams() {
  const { eventId: urlEventId } = useParams()
  const navigate = useNavigate()
  
  const activeEventId = urlEventId || localStorage.getItem('current_event_id') || 'default_event'

  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [isFinalizing, setIsFinalizing] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadTeamsData() {
      try {
        setLoading(true)
        const data = await getTeams(activeEventId)
        if (isMounted) {
          setTeams(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error("Failed to load generated proposed teams roster:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadTeamsData()
    return () => { isMounted = false }
  }, [activeEventId])

  const handleApproveTeam = async (teamId) => {
    try {
      setProcessingId(teamId)
      await approveSingleTeam(activeEventId, teamId)
      
      setTeams(prev => prev.map(t => 
        t.id === teamId ? { ...t, approval_status: 'approved' } : t
      ))
    } catch (err) {
      alert(err.message || "Failed to update target team approval state.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectTeam = async (teamId) => {
    try {
      setProcessingId(teamId)
      await rejectSingleTeam(activeEventId, teamId)
      
      setTeams(prev => prev.map(t => 
        t.id === teamId ? { ...t, approval_status: 'rejected' } : t
      ))
    } catch (err) {
      alert(err.message || "Failed to reject target team structural state.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleFinalizeStage = async () => {
    const hasUnreviewed = teams.some(t => !t.approval_status || t.approval_status === 'proposed')
    
    if (hasUnreviewed) {
      const confirmPartial = window.confirm(
        "There are still unreviewed teams in this proposal list. Do you want to snapshot anyway?"
      )
      if (!confirmPartial) return
    }

    try {
      setIsFinalizing(true)
      await approveEntireStage(activeEventId)
      
      try {
        await generateDbRationales(activeEventId)
      } catch (aiErr) {
        // Safe console catch instead of throwing print modals
        console.warn("Celery background task kicked off but returned non-blocking trace setup status.")
      }

      alert("Stage finalized successfully! Moving to Announcements pipeline context.")
      navigate('/committee/dashboard')
    } catch (err) {
      alert(err.message || "Failed to finalize entire cohort stage payload.")
    } finally {
      setIsFinalizing(false)
    }
  }

  if (loading) {
    return (
      <CommitteeLayout>
        <div style={{ padding: '2rem' }}>
          <h2>Forming Cohort Matrix...</h2>
          <Skeleton rows={8} />
        </div>
      </CommitteeLayout>
    )
  }

  return (
    <CommitteeLayout>
      <div className="committee-generated-teams-view" style={{ padding: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Generated Proposal Formations</h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>Review balance calculations, skills matrix dispersion, and approve structures into production tables.</p>
          </div>
          <button 
            type="button" 
            className="ref-primary-button"
            disabled={isFinalizing}
            onClick={handleFinalizeStage}
            style={{ padding: '0.75rem 1.5rem', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isFinalizing ? 'Snapshotting Tables...' : 'Finalize List & Snapshot'}
          </button>
        </header>

        {teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}>
            <span style={{ fontSize: '2.5rem' }}>🎯</span>
            <h3>No Active Structures Proposed</h3>
            <p style={{ color: '#666' }}>Navigate back to Intake & Formation to execute the optimization matching engine.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {teams.map((team) => (
              <article 
                key={team.id} 
                className="team-proposal-card"
                style={{ 
                  background: '#fff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '10px', 
                  padding: '1.5rem', 
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a202c' }}>{team.name}</h3>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      background: team.approval_status === 'approved' ? '#def7ec' : team.approval_status === 'rejected' ? '#fde8e8' : '#feecdc',
                      color: team.approval_status === 'approved' ? '#03543f' : team.approval_status === 'rejected' ? '#9b1c1c' : '#b45309'
                    }}>
                      {team.approval_status || 'proposed'}
                    </span>
                  </div>

                  {team.challenge && (
                    <p style={{ fontSize: '0.85rem', margin: '0 0 1rem 0', color: '#4a5568' }}>
                      <strong>Track Focus:</strong> {team.challenge}
                    </p>
                  )}

                  <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#718096' }}>Assigned Members Roster</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#2d3748' }}>
                      {team.members?.map((m, idx) => (
                        <li key={m.id || idx} style={{ marginBottom: '0.25rem' }}>
                          {m.name || `${m.first_name} ${m.last_name || ''}`} <small style={{ color: '#718096' }}>({m.role || 'Contributor'})</small>
                        </li>
                      )) || <p style={{ color: '#a0aec0', margin: 0, fontSize: '0.85rem' }}>No roster metadata linked.</p>}
                    </ul>
                  </div>

                  {team.llm_rationale && (
                    <div style={{ background: '#f7fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', color: '#4a5568', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                      💡 {team.llm_rationale}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #edf2f7', paddingTop: '1.25rem' }}>
                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() => handleApproveTeam(team.id)}
                    style={{ flex: 1, padding: '0.5rem', background: '#31c770', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                  >
                    {processingId === team.id ? '...' : '✓ Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() => handleRejectTeam(team.id)}
                    style={{ flex: 1, padding: '0.5rem', background: '#f05252', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </CommitteeLayout>
  )
}

export default CommitteeGeneratedTeams