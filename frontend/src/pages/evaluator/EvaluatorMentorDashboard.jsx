import StatusStrip from '../../components/common/StatusStrip'
import EvalSummaryCard from '../../components/dashboard/EvalSummaryCard'
import MentorSummaryCard from '../../components/dashboard/MentorSummaryCard'
import { announcements, schedule } from '../../components/evaluation/evaluatorMentorMockData'

function statusClass(status) {
  return status === 'done' ? 'success' : status === 'active' ? 'info' : ''
}

function Dashboard() {
  return (
    <div className="committee-reference-dashboard em-page">
      <StatusStrip
        items={[
          { label: 'Role', value: 'Evaluator & Mentor' },
          { label: 'Teams Assigned', value: '8' },
          { label: 'Evaluated', value: '5/8' },
          { label: 'Sessions Today', value: '2' },
        ]}
      />

      <div className="em-two-col">
        <EvalSummaryCard />
        <MentorSummaryCard />
      </div>

      <div className="em-two-col">
        <section className="ref-card em-card">
          <div className="ref-section-title">
            <h3>Today's Schedule</h3>
          </div>
          <div className="em-list">
            {schedule.map((item) => (
              <div className="em-schedule-row" key={`${item.time}-${item.team}`}>
                <span className="badge">{item.time}</span>
                <strong>{item.team}</strong>
                <small>{item.duration} min</small>
                <span className={`badge ${statusClass(item.status)}`}>{item.status}</span>
                {item.status !== 'done' ? (
                  <a href={`https://${item.link}`} target="_blank" rel="noreferrer">Join</a>
                ) : <span />}
              </div>
            ))}
          </div>
        </section>

        <section className="ref-card em-card">
          <div className="ref-section-title">
            <h3>Announcements</h3>
            <button type="button">View All →</button>
          </div>
          <div className="em-list">
            {announcements.slice(0, 2).map((item) => (
              <article className="em-announcement-row" key={item.id}>
                <span className="badge warn">{item.tag}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.time}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
