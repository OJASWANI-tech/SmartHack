const leaders = [
  { name: 'Signal Sprint', score: 91.4 },
  { name: 'Circuit Breakers', score: 88.9 },
  { name: 'Data Diodes', score: 86.7 },
]

function Leaderboard() {
  return (
    <section className="card">
      <h3>Leaderboard</h3>
      {leaders.map((team, index) => (
        <div className="leaderboard-row" key={team.name}>
          <strong>{index + 1}. {team.name}</strong>
          <span>{team.score}</span>
        </div>
      ))}
    </section>
  )
}

export default Leaderboard

