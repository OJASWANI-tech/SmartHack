import { useEffect, useState } from 'react'
import SportsPortalLayout from '../SportsPortalLayout'
import TeamPicker from '../TeamPicker'
import { useSportsPortal } from '../useSportsPortal'
import { updateTeamRoster } from '../../../../api/dynamicSports'

const STATUS_OPTIONS = ['active', 'injured', 'benched']

export default function SportsRoster() {
  const { schema, eventId, teams, selectedTeamId, selectTeam, myTeam, loading, err, refresh } = useSportsPortal()
  const [draft, setDraft] = useState([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (myTeam) setDraft(myTeam.members.map((m) => ({ ...m })))
  }, [myTeam?.id, myTeam?.members?.length])

  if (loading) {
    return <SportsPortalLayout pageTitle="My Roster"><p style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading…</p></SportsPortalLayout>
  }
  if (err) {
    return (
      <SportsPortalLayout pageTitle="My Roster">
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13 }}>⚠️ {err}</div>
      </SportsPortalLayout>
    )
  }

  function updateField(memberId, field, value) {
    setDraft((prev) => prev.map((m) => (m.id === memberId ? { ...m, [field]: value } : m)))
  }

  async function handleSave() {
    if (!myTeam) return
    setSaving(true)
    try {
      await updateTeamRoster(eventId, myTeam.id, draft.map((m) => ({
        id: m.id,
        position: m.position || null,
        jersey_number: m.jersey_number === '' || m.jersey_number === null ? null : Number(m.jersey_number),
        athlete_status: m.athlete_status,
      })))
      setToast('Roster saved.')
      await refresh()
    } catch (e) {
      setToast(e.message || 'Failed to save roster.')
    } finally {
      setSaving(false)
      setTimeout(() => setToast(''), 3000)
    }
  }

  return (
    <SportsPortalLayout
      role="participant"
      eventName={schema?.event?.name}
      pageTitle="My Roster"
      pageSubtitle="Manage lineup, positions, jersey numbers, and athlete status"
      headerActions={myTeam && (
        <button onClick={handleSave} disabled={saving} className="ref-primary-button" style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TeamPicker teams={teams} selectedTeamId={selectedTeamId} onSelect={selectTeam} />

        {toast && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--status-success-bg)', color: 'var(--status-success)', fontSize: 13, fontWeight: 600 }}>
            {toast}
          </div>
        )}

        {myTeam && (
          <section className="ref-card" style={{ padding: 20, overflowX: 'auto' }}>
            <div className="ref-section-title"><h3>{myTeam.name} — Athlete Lineup</h3></div>
            <table style={{ width: '100%', fontSize: 13, marginTop: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 10px' }}>Athlete</th>
                  <th style={{ padding: '6px 10px' }}>Position</th>
                  <th style={{ padding: '6px 10px' }}>Jersey #</th>
                  <th style={{ padding: '6px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {draft.map((m) => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <strong style={{ display: 'block' }}>{m.name}{m.is_leader ? ' (Captain)' : ''}</strong>
                      <small style={{ color: 'var(--text-secondary)' }}>{m.institution || '—'}</small>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        value={m.position || ''}
                        onChange={(e) => updateField(m.id, 'position', e.target.value)}
                        placeholder="e.g. Striker"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input
                        type="number"
                        value={m.jersey_number ?? ''}
                        onChange={(e) => updateField(m.id, 'jersey_number', e.target.value)}
                        placeholder="#"
                        style={{ width: 64, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <select
                        value={m.athlete_status || 'active'}
                        onChange={(e) => updateField(m.id, 'athlete_status', e.target.value)}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12, textTransform: 'capitalize' }}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </SportsPortalLayout>
  )
}
