function ProposedTeamCard({ team }) {
  return (
    <article className="team-proposal-card">
      <div className="team-proposal-header">
        <div>
          <h3>{team.name}</h3>
          <p>{team.challenge}</p>
        </div>
        <span className="badge warn">{team.status}</span>
      </div>
      <div className="member-grid">
        {team.members.map((member) => (
          <div className="member-card" key={member.name}>
            <strong>{member.name}</strong>
            <span>{member.institution}</span>
            <div className="tag-row">
              {member.skills.map((skill) => <em key={skill}>{skill}</em>)}
            </div>
          </div>
        ))}
      </div>
      <aside className="rationale-panel">
        <strong>LLM rationale</strong>
        <p>{team.rationale}</p>
      </aside>
      <div className="action-row">
        <button className="button" type="button">Approve</button>
        <button className="button secondary" type="button">Reject</button>
        <button className="button secondary" type="button">Regenerate</button>
        <button className="button secondary" type="button">Edit Team</button>
      </div>
    </article>
  )
}

export default ProposedTeamCard

