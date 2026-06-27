import { Link } from 'react-router-dom'
import { assignedTeams } from '../evaluation/evaluatorMentorMockData'

function EvalSummaryCard() {
  const pendingTeams = assignedTeams.filter((team) => team.evalStatus === 'Pending')
  const evaluatedCount = 5
  const totalCount = 8

  return (
    <section className="ref-card em-card">
      <div className="ref-section-title">
        <h3>Evaluation Progress</h3>
      </div>
      <div className="overall-progress em-progress">
        <span>{evaluatedCount} of {totalCount} evaluated</span>
        <strong>{Math.round((evaluatedCount / totalCount) * 100)}%</strong>
        <div className="progress-bar">
          <i style={{ width: `${(evaluatedCount / totalCount) * 100}%` }} />
        </div>
      </div>
      <div className="em-list">
        {pendingTeams.map((team) => (
          <div className="em-list-row" key={team.id}>
            <strong>{team.name}</strong>
            <span className="badge">{team.domain}</span>
          </div>
        ))}
      </div>
      <Link className="ref-outline-button em-link-button" to="/em/evaluation-sheet">Continue Evaluating →</Link>
    </section>
  )
}

export default EvalSummaryCard
