import { Link } from 'react-router-dom'
import SportsPortalLayout from '../SportsPortalLayout'
import TeamPicker from '../TeamPicker'
import { useSportsPortal } from '../useSportsPortal'

function MiniMetric({ icon, label, value, sub }) {
  return (
    <article className="ref-mini-card">
      <span className="ref-icon">{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <small>{sub}</small>
      </div>
    </article>
  )
}

function matchLabel(m) {
  return `${m.team_a?.name || 'TBD'} vs ${m.team_b?.name || 'TBD'}`
}

export default function SportsOverview() {
  const { schema, teams, matches, standings, announcements, selectedTeamId, selectTeam, myTeam, loading, err } = useSportsPortal()

  if (loading) {
    return (
      <SportsPortalLayout pageTitle="Dashboard Overview" pageSubtitle="Loading tournament overview…">
        <p style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading…</p>
      </SportsPortalLayout>
    )
  }

  if (err) {
    return (
      <SportsPortalLayout pageTitle="Dashboard Overview">
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13 }}>
          ⚠️ {err}
        </div>
      </SportsPortalLayout>
    )
  }

  const eventName = schema?.event?.name
  const myMatches = myTeam
    ? matches.filter((m) => m.team_a?.id === myTeam.id || m.team_b?.id === myTeam.id)
    : []
  const nextMatch = myMatches.find((m) => m.status !== 'completed') || null
  const completedCount = matches.filter((m) => m.status === 'completed').length
  const progressPct = matches.length ? Math.round((completedCount / matches.length) * 100) : 0
  const myStanding = myTeam ? standings.find((s) => s.team_id === myTeam.id) : null

  return (
    <SportsPortalLayout
      role="participant"
      eventName={eventName}
      pageTitle="Dashboard Overview"
      pageSubtitle={myTeam ? `Welcome back, ${myTeam.name}` : 'Select your team to get started'}
      headerActions={
        <Link to="/dynamic/sports/participant/bracket" className="ref-primary-button">View Bracket</Link>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TeamPicker teams={teams} selectedTeamId={selectedTeamId} onSelect={selectTeam} />

        {myTeam && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <MiniMetric icon="🏆" label="Team Status" value={myTeam.approval_status === 'approved' ? 'Approved' : 'Pending'} sub={`${myTeam.members.length} athletes on roster`} />
              <MiniMetric icon="⏱️" label="Next Match" value={nextMatch ? matchLabel(nextMatch) : 'None scheduled'} sub={nextMatch?.round_name || (myMatches.length ? 'All matches complete' : 'Bracket not generated yet')} />
              <MiniMetric icon="📊" label="My Standing" value={myStanding ? `Rank #${myStanding.rank}` : '—'} sub={myStanding ? `${myStanding.wins}W – ${myStanding.losses}L` : 'No completed matches yet'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <section className="ref-card" style={{ padding: 20 }}>
                  <div className="ref-section-title"><h3>Tournament Progress</h3></div>
                  <div style={{ height: 10, borderRadius: 6, background: 'var(--bg-secondary)', overflow: 'hidden', marginTop: 12 }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--accent-color)', transition: 'width 300ms ease' }} />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                    {completedCount} of {matches.length} fixtures completed ({progressPct}%)
                  </p>
                </section>

                <section className="ref-card" style={{ padding: 20 }}>
                  <div className="ref-section-title">
                    <h3>Overall Standings</h3>
                    <Link to="/dynamic/sports/participant/bracket" style={{ fontSize: 11, color: 'var(--accent-color)', fontWeight: 700 }}>View bracket</Link>
                  </div>
                  {standings.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 12 }}>No completed matches yet.</p>
                  ) : (
                    <table style={{ width: '100%', fontSize: 13, marginTop: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>
                          <th style={{ padding: '4px 8px' }}>#</th>
                          <th style={{ padding: '4px 8px' }}>Team</th>
                          <th style={{ padding: '4px 8px' }}>W</th>
                          <th style={{ padding: '4px 8px' }}>L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.slice(0, 8).map((s) => (
                          <tr key={s.team_id} style={{ borderTop: '1px solid var(--border-color)', fontWeight: s.team_id === myTeam.id ? 800 : 400, color: s.team_id === myTeam.id ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                            <td style={{ padding: '6px 8px' }}>{s.rank}</td>
                            <td style={{ padding: '6px 8px' }}>{s.team_name}</td>
                            <td style={{ padding: '6px 8px' }}>{s.wins}</td>
                            <td style={{ padding: '6px 8px' }}>{s.losses}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              </div>

              <section className="ref-card" style={{ padding: 20 }}>
                <div className="ref-section-title"><h3>Live Announcements</h3></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  {announcements.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>No announcements yet.</p>
                  ) : announcements.slice(0, 6).map((ann) => (
                    <article key={ann.id} style={{ padding: 12, borderLeft: `3px solid ${ann.type === 'urgent' ? '#f87171' : 'var(--accent-color)'}`, background: 'var(--bg-primary)', borderRadius: '0 8px 8px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="badge" style={{ fontSize: 8, padding: '2px 6px' }}>{ann.type === 'urgent' ? 'Urgent' : 'Info'}</span>
                        <small style={{ color: 'var(--text-secondary)', fontSize: 9 }}>{new Date(ann.created_at).toLocaleDateString()}</small>
                      </div>
                      <h4 style={{ fontSize: 12, margin: '4px 0', fontWeight: 700 }}>{ann.title}</h4>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{ann.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </SportsPortalLayout>
  )
}
