import { useState } from 'react'
import StatusStrip from '../../components/common/StatusStrip'
import { schedule } from '../../components/evaluation/evaluatorMentorMockData'

function statusClass(status) {
  if (status === 'done') return 'success'
  if (status === 'active') return 'info'
  return ''
}

function ScheduleRow({ item }) {
  return (
    <div className={`em-timeline-row ${item.status}`}>
      <span className="badge">{item.time}</span>
      <strong>{item.team}</strong>
      <span className="badge">{item.duration} min</span>
      <span className="committee-nav-icon">V</span>
      <span className={`badge ${statusClass(item.status)}`}>{item.status}</span>
      {item.status !== 'done' ? <a href={`https://${item.link}`} target="_blank" rel="noreferrer">Join →</a> : <span />}
    </div>
  )
}

function Schedule() {
  const [notes, setNotes] = useState('')
  const completed = schedule.filter((item) => item.status === 'done').length
  const upcoming = schedule.length - completed

  return (
    <div className="committee-reference-dashboard em-page">
      <StatusStrip items={[{ label: "Today's Slots", value: schedule.length }, { label: 'Completed', value: completed }, { label: 'Upcoming', value: upcoming }, { label: 'Date', value: 'Aug 14' }]} />
      <section className="ref-card em-card">
        <div className="ref-section-title"><h3>Today's Schedule</h3></div>
        <div className="em-list">{schedule.map((item) => <ScheduleRow item={item} key={`${item.time}-${item.team}`} />)}</div>
      </section>
      <div className="em-two-col">
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Full Schedule</h3></div>
          <span className="nav-group-label em-date-label">Aug 14</span>
          <div className="em-list">{schedule.map((item) => <ScheduleRow item={item} key={`full-${item.time}-${item.team}`} />)}</div>
        </section>
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Session Notes</h3></div>
          <textarea rows="5" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Quick notes for today's sessions..." />
          <button className="ref-outline-button em-link-button" type="button">Save Notes</button>
        </section>
      </div>
    </div>
  )
}

export default Schedule
