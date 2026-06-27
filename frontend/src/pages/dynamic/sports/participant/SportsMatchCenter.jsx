import SportsPortalLayout from '../SportsPortalLayout'
import TeamPicker from '../TeamPicker'
import { useSportsPortal } from '../useSportsPortal'

/*
 * Match Dispute/Submission Center — next build phase. For now this tab shows
 * the team's active/upcoming matches read-only so the nav structure described
 * in the brief is complete; score-sheet upload and referee disputes land next.
 */
export default function SportsMatchCenter() {
  const { schema, teams, matches, selectedTeamId, selectTeam, myTeam, loading, err } = useSportsPortal()

  if (loading) {
    return <SportsPortalLayout pageTitle="Match Center"><p style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading…</p></SportsPortalLayout>
  }
  if (err) {
    return (
      <SportsPortalLayout pageTitle="Match Center">
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13 }}>⚠️ {err}</div>
      </SportsPortalLayout>
    )
  }

  const myMatches = myTeam ? matches.filter((m) => m.team_a?.id === myTeam.id || m.team_b?.id === myTeam.id) : []
  const active = myMatches.find((m) => m.status === 'live')

  return (
    <SportsPortalLayout
      role="participant"
      eventName={schema?.event?.name}
      pageTitle="Match Dispute / Submission Center"
      pageSubtitle="Score sheet uploads and result challenges — coming in the next build"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TeamPicker teams={teams} selectedTeamId={selectedTeamId} onSelect={selectTeam} />

        {myTeam && (
          <section className="ref-card" style={{ padding: 20 }}>
            <div className="ref-section-title"><h3>Your Active Match</h3></div>
            {active ? (
              <p style={{ fontSize: 14, marginTop: 12 }}>
                <strong>{active.team_a?.name}</strong> vs <strong>{active.team_b?.name}</strong> — {active.venue || 'venue TBD'}
              </p>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 12 }}>No live match right now.</p>
            )}
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
              Score sheet upload, media submission, and referee-result challenges will appear here once the dispute
              workflow ships. Until then, reported scores are visible on the{' '}
              <a href="/dynamic/sports/participant/bracket" style={{ color: 'var(--accent-color)', fontWeight: 700 }}>Fixture Bracket</a> tab.
            </p>
          </section>
        )}
      </div>
    </SportsPortalLayout>
  )
}
