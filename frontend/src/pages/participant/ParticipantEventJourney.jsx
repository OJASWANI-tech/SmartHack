import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ParticipantLayout from '../../components/layout/ParticipantLayout'
import { fetchJourney } from '../../api/participant'

function Skeleton({ width = '100%', height = '16px', radius = '6px' }) {
  return <div style={{ width, height, borderRadius: radius, background: 'linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-color) 50%, var(--bg-secondary) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
}

const STATUS_TONE = { complete: 'green', active: 'purple', awaiting_approval: 'blue', pending: 'muted' }
const STATUS_COLOR = { complete: '#4ade80', active: '#b899eb', awaiting_approval: '#7dbbff', pending: 'var(--text-secondary)' }

const FALLBACK_STAGES = [
  { id: '1', name: 'Registration', description: 'Participant intake and registration validation', status: 'completed', started_at: '2026-05-20T10:00:00Z', completed_at: '2026-05-21T18:00:00Z' },
  { id: '2', name: 'Team Formation', description: 'Algorithmically match and form teams', status: 'completed', started_at: '2026-05-21T10:00:00Z', completed_at: '2026-05-22T18:00:00Z' },
  { id: '3', name: 'Approvals', description: 'Review and approve formed teams', status: 'completed', started_at: '2026-05-22T10:00:00Z', completed_at: '2026-05-23T18:00:00Z' },
  { id: '4', name: 'Build Phase', description: 'Develop your project prototype and codebase', status: 'active', started_at: '2026-05-23T10:00:00Z', completed_at: null },
  { id: '5', name: 'Evaluation', description: 'Submit slides and present to evaluator panel', status: 'upcoming', started_at: null, completed_at: null },
  { id: '6', name: 'Results', description: 'Review consolidated ratings and winners announcements', status: 'upcoming', started_at: null, completed_at: null }
]

function ParticipantEventJourney() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchJourney()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const stages = (data?.stages && data.stages.length > 0) ? data.stages : FALLBACK_STAGES
  const currentIdx = (data?.stages && data.stages.length > 0) ? (data?.current_stage_index || 0) : 4
  const total = (data?.stages && data.stages.length > 0) ? (data?.total_stages || 0) : FALLBACK_STAGES.length
  const completed = stages.filter(s => s.status === 'completed').length
  const activeStage = stages.find(s => s.status === 'active')
  const eventCurrentStage = (data?.stages && data.stages.length > 0) ? (data?.event_current_stage || '—') : 'Build Phase'

  return (
    <ParticipantLayout pageTitle="Event Journey" pageSubtitle="Track your team's lifecycle and current standing in the hackathon pipeline">
      <div className="committee-reference-dashboard">

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', marginBottom: '20px', fontSize: '13px', lineHeight: '1.4' }}>
            ⚠️ Could not load database stages: {error}.
            {error.toLowerCase().includes("not found") && (
              <span style={{ marginLeft: '6px' }}>
                Since the database was recently re-seeded, please <Link to="/login" style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 'bold' }}>return to the Login Page</Link> and re-select your portal role card to load the fresh identifiers into your browser's local storage.
              </span>
            )}
          </div>
        )}

        {/* Milestone Stats */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <article className="ref-mini-card">
            <span className="ref-icon" style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}>✓</span>
            <div>
              {loading ? <Skeleton width="60px" height="20px" /> : <strong>{completed} / {total}</strong>}
              <p>Milestones Passed</p>
            </div>
          </article>
          <article className="ref-mini-card">
            <span className="ref-icon" style={{ background: 'rgba(184, 153, 235, 0.1)', color: '#b899eb' }}>⚡</span>
            <div>
              {loading ? <Skeleton width="100px" height="20px" /> : <strong>{activeStage?.name || '—'}</strong>}
              <p>Current Standing</p>
              {!loading && <small>Stage {currentIdx} of {total}</small>}
            </div>
          </article>
          <article className="ref-mini-card">
            <span className="ref-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>⏱</span>
            <div>
              <strong>{eventCurrentStage}</strong>
              <p>Event Current Stage</p>
            </div>
          </article>
        </section>

        {/* Vertical Timeline */}
        <section className="ref-card" style={{ padding: '24px' }}>
          <div className="ref-section-title"><h3>Event Pipeline Timeline</h3></div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px', paddingLeft: '32px' }}>
              {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} height="56px" radius="8px" />)}
            </div>
          ) : (
            <div className="journey-timeline" style={{ position: 'relative', paddingLeft: '32px', marginTop: '20px' }}>
              <div style={{ position: 'absolute', left: '15px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border-color)', zIndex: 0 }} />
              {stages.map((stage) => {
                const tone = STATUS_TONE[stage.status] || 'muted'
                const color = STATUS_COLOR[stage.status] || 'var(--text-secondary)'
                return (
                  <div key={stage.id} className={`timeline-node ${stage.status}`} style={{ position: 'relative', marginBottom: '28px', zIndex: 1 }}>
                    <span style={{ position: 'absolute', left: '-26px', top: '2px', width: '18px', height: '18px', borderRadius: '999px', border: '3px solid var(--bg-secondary)', background: color, boxShadow: stage.status === 'active' ? `0 0 10px ${color}` : 'none' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: stage.status === 'active' ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                          {stage.name}
                          {stage.status === 'active' && <span className="badge" style={{ marginLeft: '8px', background: 'rgba(184, 153, 235, 0.15)', color: '#b899eb', border: '1px solid rgba(184, 153, 235, 0.3)', fontSize: '9px', padding: '2px 6px' }}>You are here</span>}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{stage.description}</p>
                        {stage.score != null && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#4ade80', fontWeight: '700' }}>Score: {stage.score}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {stage.started_at && <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)' }}>{new Date(stage.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                        <small style={{ fontSize: '9px', color, textTransform: 'capitalize' }}>{stage.status.replace('_', ' ')}</small>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </ParticipantLayout>
  )
}

export default ParticipantEventJourney
