import StatusStrip from '../../components/common/StatusStrip'
import { sessionRequests, sessions } from '../../components/evaluation/evaluatorMentorMockData'
import SessionCard from '../../components/evaluation/SessionCard'

const weekdays = [
  { day: 'Mon', session: sessions[0] },
  { day: 'Tue', session: null },
  { day: 'Wed', session: sessions[1] },
  { day: 'Thu', session: sessions[2] },
  { day: 'Fri', session: null },
]

function Sessions() {
  const upcomingSessions = sessions.filter((session) => session.status === 'upcoming')

  return (
    <div className="committee-reference-dashboard em-page">
      <StatusStrip items={[{ label: 'This Week', value: 6 }, { label: 'Upcoming', value: upcomingSessions.length }, { label: 'Pending Requests', value: sessionRequests.length }]} />
      <div className="em-sheet-grid">
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>This Week</h3><span className="badge">Aug 12-18</span></div>
          <div className="em-week-list">
            {weekdays.map((row) => (
              <div className="em-week-row" key={row.day}>
                <span>{row.day}</span>
                {row.session ? (
                  <div className={`em-week-block ${row.session.status}`}>
                    <strong>{row.session.team}</strong>
                    <small>{row.session.time}</small>
                  </div>
                ) : (
                  <div className="em-empty-slot"><button type="button">+ Book</button></div>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Upcoming Sessions</h3></div>
          <div className="em-list">{upcomingSessions.map((session) => <SessionCard session={session} key={session.id} />)}</div>
          <button className="ref-outline-button em-link-button" type="button">+ Schedule New Session</button>
        </section>
      </div>
      <section className="ref-card em-card">
        <div className="ref-section-title"><h3>Session Requests</h3></div>
        {sessionRequests.length > 0 ? (
          <div className="em-list">
            {sessionRequests.map((request) => (
              <div className="em-request-row" key={request.team}>
                <strong>{request.team}</strong>
                <span>{request.requestedDate} · {request.requestedTime}</span>
                <div>
                  <button className="ref-outline-button inline-button" type="button">Confirm</button>
                  <button className="ref-outline-button inline-button" type="button">Suggest Different Time</button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="em-empty-text">No pending requests</p>}
      </section>
    </div>
  )
}

export default Sessions
