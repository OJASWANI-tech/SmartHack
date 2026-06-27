import { Link } from 'react-router-dom'
import { menteeTeams, schedule } from '../evaluation/evaluatorMentorMockData'

function MentorSummaryCard() {
  const nextSession = schedule.find((item) => item.status === 'active') || schedule.find((item) => item.status === 'upcoming')

  return (
    <section className="ref-card em-card">
      <div className="ref-section-title">
        <h3>Mentor Summary</h3>
      </div>
      <div className="em-session-highlight">
        <span>Next Session</span>
        <strong>{nextSession.team}</strong>
        <small>{nextSession.time}</small>
        <a href={`https://${nextSession.link}`} target="_blank" rel="noreferrer">Join →</a>
      </div>
      <div className="em-metric-inline">
        <span>Active mentee teams</span>
        <strong>{menteeTeams.length}</strong>
      </div>
      <Link className="ref-outline-button em-link-button" to="/em/my-mentees">View Mentees →</Link>
    </section>
  )
}

export default MentorSummaryCard
