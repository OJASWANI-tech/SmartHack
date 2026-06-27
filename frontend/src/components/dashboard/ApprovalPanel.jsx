const approvals = [
  { action: 'Team formation review', stage: 'Team Formation', decision: 'pending' },
  { action: 'Results release', stage: 'Results', decision: 'pending' },
]

function ApprovalPanel() {
  return (
    <section className="card">
      <h3>Approvals</h3>
      {approvals.map((approval) => (
        <div className="stage-row" key={approval.action}>
          <div className="stage-copy">
            <strong>{approval.action}</strong>
            <span>{approval.stage}</span>
          </div>
          <span className="badge warn">{approval.decision}</span>
        </div>
      ))}
    </section>
  )
}

export default ApprovalPanel

