import EmptyState from '../common/EmptyState'
import TeamCard from './TeamCard'

const defaultTeams = [
  { name: 'Signal Sprint', challenge: 'Low-power smart logistics monitor', status: 'assigned' },
  { name: 'Circuit Breakers', challenge: 'Real-time energy anomaly detection', status: 'active' },
]

function TeamInfo({ teams = defaultTeams, readOnly = false }) {
  return (
    <section className="card">
      <h3>{readOnly ? 'My Team' : 'Teams'}</h3>
      {teams.length === 0 ? (
        <EmptyState title="No teams yet" message="Teams will appear after committee approval." />
      ) : (
        teams.map((team) => <TeamCard key={team.name} team={team} />)
      )}
    </section>
  )
}

export default TeamInfo

