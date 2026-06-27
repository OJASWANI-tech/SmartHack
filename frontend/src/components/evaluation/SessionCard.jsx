function SessionCard({ session }) {
  return (
    <article className="em-session-row">
      <strong>{session?.team}</strong>
      <span>{session?.date} · {session?.time}</span>
      <small className="badge">{session?.duration} min</small>
      <div>
        <button className="ref-outline-button inline-button" type="button">Reschedule</button>
        <button className="ref-outline-button inline-button" type="button">Cancel</button>
      </div>
    </article>
  )
}

export default SessionCard
