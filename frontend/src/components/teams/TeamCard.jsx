function TeamCard({ team }) {
  return (
    <div className="team-row">
      <div className="team-copy">
        <strong>{team.name}</strong>
        <span>{team.challenge}</span>
      </div>
      <span className="badge">{team.status}</span>
    </div>
  )
}

export default TeamCard

