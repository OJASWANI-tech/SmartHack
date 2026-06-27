import StatusStrip from '../../components/common/StatusStrip'
import { menteeTeams, sessions } from '../../components/evaluation/evaluatorMentorMockData'
import MenteeCard from '../../components/evaluation/MenteeCard'

function MyMentees() {
  const completedSessions = sessions.filter((session) => session.status === 'completed')

  return (
    <div className="committee-reference-dashboard em-page">
      <StatusStrip items={[{ label: 'Active Teams', value: menteeTeams.length }, { label: 'Sessions This Week', value: 6 }, { label: 'Next Session', value: '3:00 PM Today' }]} />
      <div className="em-mentee-grid">
        {menteeTeams.map((team) => <MenteeCard team={team} key={team.id} />)}
      </div>
      <section className="ref-card em-card">
        <div className="ref-section-title"><h3>Recent Activity</h3></div>
        <div className="em-list">
          {completedSessions.map((session) => (
            <div className="em-activity-row" key={session.id}>
              <span className="em-avatar">{session.team.replace('Team ', '').slice(0, 2).toUpperCase()}</span>
              <p>Session with {session.team} · {session.duration} min · {session.date}</p>
              <a href="#" onClick={(event) => event.preventDefault()}>View Notes →</a>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default MyMentees
