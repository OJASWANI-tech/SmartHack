import { useState } from 'react'
import SportsPortalLayout from '../SportsPortalLayout'
import { useSportsPortal } from '../useSportsPortal'
import { updateMatch } from '../../../../api/dynamicSports'
import LiveScorekeeper from './LiveScorekeeper'

/*
 * SportsEvaluatorQueue — Referee / Scorekeeper Dashboard. "Upcoming" matches
 * get a Start Match action (status -> live); clicking a live match opens the
 * LiveScorekeeper inline. Finalizing there completes the match, which the
 * backend uses to advance the bracket — the Participant Dashboard's poll
 * picks up the new score/standings within 15s with no extra wiring here.
 */
const GROUPS = [
  { key: 'live', label: 'Live Now', empty: 'No matches in progress.' },
  { key: 'scheduled', label: 'Upcoming', empty: 'No upcoming matches scheduled.' },
  { key: 'completed', label: 'Completed', empty: 'No completed matches yet.' },
]

export default function SportsEvaluatorQueue() {
  const { eventId, schema, matches, loading, err, refresh } = useSportsPortal({ withTeamContext: false })
  const [activeMatchId, setActiveMatchId] = useState(null)
  const [startingId, setStartingId] = useState(null)

  if (loading) {
    return <SportsPortalLayout role="evaluator" pageTitle="Match Queue"><p style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading…</p></SportsPortalLayout>
  }
  if (err) {
    return (
      <SportsPortalLayout role="evaluator" pageTitle="Match Queue">
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13 }}>⚠️ {err}</div>
      </SportsPortalLayout>
    )
  }

  const activeMatch = matches.find((m) => m.id === activeMatchId) || null

  async function handleStartMatch(matchId) {
    setStartingId(matchId)
    try {
      await updateMatch(eventId, matchId, { status: 'live' })
      await refresh()
      setActiveMatchId(matchId)
    } catch (e) {
      console.error(e)
    } finally {
      setStartingId(null)
    }
  }

  async function handleFinalize() {
    setActiveMatchId(null)
    await refresh()
  }

  if (activeMatch) {
    return (
      <SportsPortalLayout role="evaluator" eventName={schema?.event?.name} pageTitle="Live Scorekeeper" pageSubtitle="Scores push live as you record them">
        <LiveScorekeeper eventId={eventId} match={activeMatch} onBack={() => setActiveMatchId(null)} onFinalize={handleFinalize} />
      </SportsPortalLayout>
    )
  }

  return (
    <SportsPortalLayout
      role="evaluator"
      eventName={schema?.event?.name}
      pageTitle="Match Queue Workspace"
      pageSubtitle="Start a match to open the live scorekeeper console"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {matches.length === 0 && (
          <section className="ref-card" style={{ padding: 20 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              No fixtures yet — ask the committee to generate the bracket from Event Initialization.
            </p>
          </section>
        )}
        {GROUPS.map((g) => {
          const list = matches.filter((m) => m.status === g.key)
          if (!list.length) return null
          return (
            <section key={g.key} className="ref-card" style={{ padding: 20 }}>
              <div className="ref-section-title"><h3>{g.label} ({list.length})</h3></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
                {list.map((m) => (
                  <article key={m.id} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <small style={{ color: 'var(--text-secondary)', fontSize: 10, textTransform: 'uppercase' }}>{m.round_name || `Round ${m.round_number}`}</small>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: '4px 0' }}>{m.team_a?.name || 'TBD'} vs {m.team_b?.name || 'TBD'}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                      {m.venue || 'Venue TBD'}{m.scheduled_at ? ` · ${new Date(m.scheduled_at).toLocaleString()}` : ''}
                    </p>
                    {g.key === 'completed' && (
                      <p style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>{m.team_a_score ?? '–'} : {m.team_b_score ?? '–'}</p>
                    )}
                    {g.key === 'live' && (
                      <p style={{ fontSize: 12, marginTop: 6, fontWeight: 700, color: 'var(--accent-color)' }}>{m.team_a_score ?? 0} : {m.team_b_score ?? 0}</p>
                    )}
                    {g.key === 'scheduled' && (m.team_a && m.team_b) && (
                      <button
                        onClick={() => handleStartMatch(m.id)}
                        disabled={startingId === m.id}
                        className="ref-primary-button"
                        style={{ marginTop: 10, width: '100%', padding: '6px 10px', fontSize: 12 }}
                      >
                        {startingId === m.id ? 'Starting…' : 'Start Match'}
                      </button>
                    )}
                    {g.key === 'live' && (
                      <button
                        onClick={() => setActiveMatchId(m.id)}
                        className="ref-primary-button"
                        style={{ marginTop: 10, width: '100%', padding: '6px 10px', fontSize: 12 }}
                      >
                        Open Scorekeeper
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </SportsPortalLayout>
  )
}
