import { useState } from 'react'
import { menteeTeams, resources, sessions, teamNotes } from '../../components/evaluation/evaluatorMentorMockData'

function resourceIcon(type) {
  if (type === 'pdf') return 'PDF'
  if (type === 'link') return 'L'
  return 'DOC'
}

function ResourcesNotes() {
  const [selectedTeam, setSelectedTeam] = useState(menteeTeams[0].name)
  const [notes, setNotes] = useState(teamNotes)
  const [saved, setSaved] = useState({})
  const [expanded, setExpanded] = useState('')

  function saveNotes() {
    setSaved((current) => ({ ...current, [selectedTeam]: new Date() }))
  }

  return (
    <div className="committee-reference-dashboard em-page">
      <div className="em-two-col">
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Shared Resources</h3><button type="button">+ Add Resource</button></div>
          <div className="em-list">
            {resources.map((resource) => (
              <div className="em-resource-row" key={resource.title}>
                <span className="committee-nav-icon">{resourceIcon(resource.type)}</span>
                <strong>{resource.title}</strong>
                <span className="badge">Shared with: {resource.sharedWith === 'all' ? 'all' : `${resource.sharedWith.length} teams`}</span>
                <a href={resource.link}>View →</a>
              </div>
            ))}
          </div>
        </section>
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Team Notes</h3></div>
          <label className="em-field">
            <span>Team</span>
            <select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)}>
              {menteeTeams.map((team) => <option value={team.name} key={team.id}>{team.name}</option>)}
            </select>
          </label>
          <textarea rows="7" value={notes[selectedTeam] || ''} onChange={(event) => setNotes((current) => ({ ...current, [selectedTeam]: event.target.value }))} />
          {saved[selectedTeam] && <p className="em-muted">Last saved {saved[selectedTeam].toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
          <button className="ref-outline-button em-link-button" type="button" onClick={saveNotes}>Save Notes</button>
        </section>
      </div>
      <section className="ref-card em-card">
        <div className="ref-section-title"><h3>Session History</h3></div>
        <div className="em-list">
          {sessions.map((session) => (
            <div className="em-history-row" key={session.id}>
              <div className="em-history-summary">
                <span className="em-avatar">{session.team.replace('Team ', '').slice(0, 2).toUpperCase()}</span>
                <strong>Session with {session.team} · {session.date}</strong>
                <p>{session.notes || 'No notes recorded yet.'}</p>
                <button className="ref-outline-button inline-button" type="button" onClick={() => setExpanded((current) => current === session.id ? '' : session.id)}>
                  {expanded === session.id ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {expanded === session.id && <p className="em-expanded-note">{session.notes || 'No notes recorded yet.'}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ResourcesNotes
