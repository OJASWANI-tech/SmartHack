const items = [
  { actor: 'System', action: 'Seeded MVP configuration' },
  { actor: 'Committee', action: 'Opened intake stage' },
  { actor: 'Worker', action: 'Email simulation enabled' },
]

function ActivityLog() {
  return (
    <section className="card">
      <h3>Activity</h3>
      {items.map((item) => (
        <div className="log-row" key={`${item.actor}-${item.action}`}>
          <strong>{item.actor}</strong>
          <span>{item.action}</span>
        </div>
      ))}
    </section>
  )
}

export default ActivityLog

