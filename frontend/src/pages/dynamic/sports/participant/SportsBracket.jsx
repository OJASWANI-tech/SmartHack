import SportsPortalLayout from '../SportsPortalLayout'
import TeamPicker from '../TeamPicker'
import { useSportsPortal } from '../useSportsPortal'

const STATUS_STYLE = {
  scheduled: { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', label: 'Scheduled' },
  live: { bg: 'var(--status-warning-bg)', color: 'var(--status-warning)', label: 'Live Now' },
  completed: { bg: 'var(--status-success-bg)', color: 'var(--status-success)', label: 'Completed' },
}

function MatchCard({ match, myTeamId }) {
  const status = STATUS_STYLE[match.status] || STATUS_STYLE.scheduled
  const aIsMine = match.team_a?.id === myTeamId
  const bIsMine = match.team_b?.id === myTeamId

  return (
    <article className="ref-card" style={{ padding: 14, minWidth: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
          {match.round_name || `Round ${match.round_number}`} · M{match.match_number}
        </span>
        <span className="badge" style={{ background: status.bg, color: status.color, fontSize: 9 }}>{status.label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: aIsMine ? 800 : 500, color: aIsMine ? 'var(--accent-color)' : 'var(--text-primary)' }}>
          <span>{match.team_a?.name || 'TBD'}</span>
          <span>{match.team_a_score ?? '–'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bIsMine ? 800 : 500, color: bIsMine ? 'var(--accent-color)' : 'var(--text-primary)' }}>
          <span>{match.team_b?.name || 'TBD'}</span>
          <span>{match.team_b_score ?? '–'}</span>
        </div>
      </div>
      {(match.venue || match.scheduled_at) && (
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>
          {match.venue || 'Venue TBD'}{match.scheduled_at ? ` · ${new Date(match.scheduled_at).toLocaleString()}` : ''}
        </p>
      )}
    </article>
  )
}

export default function SportsBracket() {
  const { schema, teams, matches, selectedTeamId, selectTeam, myTeam, loading, err } = useSportsPortal()

  if (loading) {
    return <SportsPortalLayout pageTitle="Fixture Bracket & Schedule"><p style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading…</p></SportsPortalLayout>
  }
  if (err) {
    return (
      <SportsPortalLayout pageTitle="Fixture Bracket & Schedule">
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13 }}>⚠️ {err}</div>
      </SportsPortalLayout>
    )
  }

  const format = matches[0]?.bracket_format
  const rounds = [...new Set(matches.map((m) => m.round_number))].sort((a, b) => a - b)

  return (
    <SportsPortalLayout
      role="participant"
      eventName={schema?.event?.name}
      pageTitle="Fixture Bracket & Schedule"
      pageSubtitle={format === 'round_robin' ? 'Round robin schedule' : 'Single elimination bracket'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TeamPicker teams={teams} selectedTeamId={selectedTeamId} onSelect={selectTeam} />

        {matches.length === 0 ? (
          <section className="ref-card" style={{ padding: 20 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              Fixtures haven't been published yet. Check back once the committee generates the bracket.
            </p>
          </section>
        ) : format === 'round_robin' ? (
          <section className="ref-card" style={{ padding: 20, overflowX: 'auto' }}>
            <div className="ref-section-title"><h3>Round Robin Schedule</h3></div>
            <table style={{ width: '100%', fontSize: 13, marginTop: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 10px' }}>Match</th>
                  <th style={{ padding: '6px 10px' }}>Score</th>
                  <th style={{ padding: '6px 10px' }}>Venue</th>
                  <th style={{ padding: '6px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => {
                  const status = STATUS_STYLE[m.status] || STATUS_STYLE.scheduled
                  const mine = m.team_a?.id === myTeam?.id || m.team_b?.id === myTeam?.id
                  return (
                    <tr key={m.id} style={{ borderTop: '1px solid var(--border-color)', fontWeight: mine ? 800 : 400 }}>
                      <td style={{ padding: '8px 10px' }}>{m.team_a?.name || 'TBD'} vs {m.team_b?.name || 'TBD'}</td>
                      <td style={{ padding: '8px 10px' }}>{m.team_a_score ?? '–'} : {m.team_b_score ?? '–'}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{m.venue || '—'}</td>
                      <td style={{ padding: '8px 10px' }}><span className="badge" style={{ background: status.bg, color: status.color, fontSize: 9 }}>{status.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        ) : (
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {rounds.map((roundNum) => {
              const roundMatches = matches.filter((m) => m.round_number === roundNum)
              return (
                <div key={roundNum} style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 240 }}>
                  <h4 style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', margin: 0 }}>
                    {roundMatches[0]?.round_name || `Round ${roundNum}`}
                  </h4>
                  {roundMatches.map((m) => <MatchCard key={m.id} match={m} myTeamId={myTeam?.id} />)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </SportsPortalLayout>
  )
}
