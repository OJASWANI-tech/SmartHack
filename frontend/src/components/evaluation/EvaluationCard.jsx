function EvaluationCard({ evaluation }) {
  return (
    <div className="evaluation-card">
      <div>
        <strong>{evaluation.team}</strong>
        <span>{evaluation.challenge}</span>
      </div>
      <span className={evaluation.status === 'submitted' ? 'badge' : 'badge warn'}>{evaluation.status}</span>
    </div>
  )
}

export default EvaluationCard

