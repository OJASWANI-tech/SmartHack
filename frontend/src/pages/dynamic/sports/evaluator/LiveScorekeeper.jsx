import { useEffect, useRef, useState } from 'react'
import { updateMatch } from '../../../../api/dynamicSports'

function formatClock(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const EVENT_PRESETS = ['Foul', 'Yellow Card', 'Red Card', 'Timeout', 'Substitution']

/*
 * LiveScorekeeper — the active scoring console for a single live match.
 * Every increment and logged event pushes immediately via PUT
 * /api/dynamic/sports/event/{id}/matches/{id}, so the Participant Dashboard's
 * 15s poll picks up score changes in near real time even before finalize.
 */
export default function LiveScorekeeper({ eventId, match, onBack, onFinalize }) {
  const [scoreA, setScoreA] = useState(match.team_a_score ?? 0)
  const [scoreB, setScoreB] = useState(match.team_b_score ?? 0)
  const [eventLog, setEventLog] = useState(match.event_log || [])
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmFinalize, setConfirmFinalize] = useState(false)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!running) return
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [running])

  async function pushScore(nextA, nextB) {
    setSaving(true)
    setError(null)
    try {
      await updateMatch(eventId, match.id, { team_a_score: nextA, team_b_score: nextB })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function increment(side, delta) {
    if (side === 'a') {
      const next = Math.max(0, scoreA + delta)
      setScoreA(next)
      pushScore(next, scoreB)
    } else {
      const next = Math.max(0, scoreB + delta)
      setScoreB(next)
      pushScore(scoreA, next)
    }
  }

  async function logEvent(side, label) {
    const entry = { ts: new Date().toISOString(), team: side === 'a' ? match.team_a?.name : match.team_b?.name, label }
    setEventLog((prev) => [entry, ...prev])
    try {
      await updateMatch(eventId, match.id, { append_event: entry })
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleFinalize() {
    if (!confirmFinalize) { setConfirmFinalize(true); return }
    setSaving(true)
    setError(null)
    try {
      await updateMatch(eventId, match.id, { status: 'completed', team_a_score: scoreA, team_b_score: scoreB })
      onFinalize()
    } catch (e) {
      setError(e.message)
      setSaving(false)
      setConfirmFinalize(false)
    }
  }

  return (
    <section className="ref-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <button onClick={onBack} style={{ fontSize: 11, color: 'var(--accent-color)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}>
            ← Back to queue
          </button>
          <h3 style={{ margin: 0, fontSize: 16 }}>{match.round_name || `Round ${match.round_number}`} · Live Scorekeeper</h3>
          <small style={{ color: 'var(--text-secondary)' }}>{match.venue || 'Venue TBD'}</small>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color: 'var(--accent-color)' }}>{formatClock(elapsed)}</span>
          <button onClick={() => setRunning((r) => !r)} className="ref-primary-button" style={{ padding: '6px 14px', fontSize: 12 }}>
            {running ? 'Pause' : 'Start'}
          </button>
          <button onClick={() => { setRunning(false); setElapsed(0) }} style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, marginBottom: 16 }}>⚠️ {error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {[{ side: 'a', team: match.team_a, score: scoreA }, { side: 'b', team: match.team_b, score: scoreB }].map(({ side, team, score }) => (
          <div key={side} style={{ padding: 16, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: 14, marginBottom: 8 }}>{team?.name || 'TBD'}</strong>
            <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent-color)', marginBottom: 12 }}>{score}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              {[1, 2, 3].map((d) => (
                <button key={d} onClick={() => increment(side, d)} disabled={saving} className="ref-primary-button" style={{ padding: '6px 12px', fontSize: 13 }}>
                  +{d}
                </button>
              ))}
              <button onClick={() => increment(side, -1)} disabled={saving || score === 0} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                −1
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
              {EVENT_PRESETS.map((p) => (
                <button key={p} onClick={() => logEvent(side, p)} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        <button
          onClick={handleFinalize}
          disabled={saving}
          className="ref-primary-button"
          style={{
            padding: '14px 16px', fontSize: 14, fontWeight: 800,
            background: confirmFinalize ? 'var(--status-danger)' : 'var(--status-success)',
            color: '#fff', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : confirmFinalize ? 'Click again to confirm — this locks the score' : 'End & Finalize Match'}
        </button>

        <div style={{ borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: 12, maxHeight: 220, overflowY: 'auto' }}>
          <strong style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Event Log</strong>
          {eventLog.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>No events logged yet.</p>
          ) : eventLog.map((e, i) => (
            <div key={i} style={{ fontSize: 11, marginBottom: 6, color: 'var(--text-primary)' }}>
              <strong>{e.team}</strong> — {e.label}
              <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 9 }}>{new Date(e.ts).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
