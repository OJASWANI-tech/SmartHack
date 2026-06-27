import { useNavigate } from 'react-router-dom'

function MenteeCard({ team }) {
  const navigate = useNavigate()
  const initials = team.name.replace('Team ', '').slice(0, 2).toUpperCase()
  const memberNames = team.members.map((member) => member.name).join(', ')
  const skillTags = [...new Set(team.members.flatMap((member) => member.skills))].slice(0, 6)

  return (
    <article className="ref-card em-card em-mentee-card">
      <header>
        <span className="em-avatar">{initials}</span>
        <div>
          <h3>{team.name}</h3>
          <small>{team.id}</small>
        </div>
        <span className="badge">{team.domain}</span>
      </header>
      <div className="em-member-row">
        <div className="em-avatar-stack">
          {team.members.slice(0, 4).map((member) => (
            <span key={member.name}>{member.initials}</span>
          ))}
        </div>
        <p>{memberNames}</p>
      </div>
      <div className="em-skill-row">
        {skillTags.map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}
      </div>
      <div className="em-info-list">
        <span>Submission <strong>{team.submission}{team.submissionVersion ? ` ${team.submissionVersion}` : ''}</strong></span>
        <span>Last session <strong>{team.lastSession}</strong></span>
        <span>Next session <strong>{team.nextSession}</strong></span>
      </div>
      <div className="em-score-note">
        {team.scoreVisible ? (
          <div className="progress-bar"><i style={{ width: '78%' }} /></div>
        ) : (
          <em>Score visible after results release</em>
        )}
      </div>
      <div className="em-button-row">
        <button className="ref-outline-button inline-button" type="button">View Team</button>
        <button className="ref-primary-button em-primary-compact" type="button" onClick={() => navigate('/em/sessions')}>Schedule Session</button>
      </div>
    </article>
  )
}

export default MenteeCard
