function ApprovalQueue({ approvals }) {
  return (
    <section className="card">
      <h3>Approval Queue</h3>
      {approvals.map((approval) => (
        <div className="team-row" key={`${approval.type}-${approval.item}`}>
          <div className="team-copy">
            <strong>{approval.item}</strong>
            <span>{approval.type} - {approval.owner}</span>
          </div>
          <span className={approval.status === 'blocked' ? 'badge warn' : 'badge'}>{approval.status}</span>
        </div>
      ))}
    </section>
  )
}

export default ApprovalQueue

