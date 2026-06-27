function LeaderboardTable({ rows }) {
  return (
    <section className="card table-card">
      <h3>Leaderboard</h3>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Innovation</th>
              <th>Technical</th>
              <th>Presentation</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.team}>
                <td>{row.rank}</td>
                <td><strong>{row.team}</strong></td>
                <td>{row.innovation}</td>
                <td>{row.technical}</td>
                <td>{row.presentation}</td>
                <td><span className="badge">{row.total}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default LeaderboardTable
