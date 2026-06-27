import EmptyState from '../common/EmptyState'

function ParticipantRoster({ participants, search, onSearchChange, filter, onFilterChange }) {
  const filtered = participants.filter((participant) => {
    const query = search.toLowerCase()
    const matchesSearch = [participant.name, participant.email, participant.institution, participant.skills.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(query)
    const matchesFilter = filter === 'all' || participant.experience === filter
    return matchesSearch && matchesFilter
  })

  return (
    <section className="card table-card">
      <div className="section-toolbar">
        <h3>Participant Roster</h3>
        <div className="table-controls">
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search roster" />
          <select value={filter} onChange={(event) => onFilterChange(event.target.value)}>
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No participants found" message="Try a different search or filter." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Institution</th>
                <th>Skills</th>
                <th>Experience</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((participant) => (
                <tr key={participant.email}>
                  <td>
                    <strong>{participant.name}</strong>
                    <span>{participant.email}</span>
                  </td>
                  <td>{participant.institution}</td>
                  <td>{participant.skills.join(', ')}</td>
                  <td>{participant.experience}</td>
                  <td><span className="badge">{participant.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default ParticipantRoster

