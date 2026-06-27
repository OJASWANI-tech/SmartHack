const stages = [
  { id: 'intake', name: 'Intake', status: 'Open', comms: 'No automated comms' },
  { id: 'team_formation', name: 'Team Formation', status: 'Approval', comms: 'team_assignment_email' },
  { id: 'challenge_assignment', name: 'Challenge Assignment', status: 'Ready', comms: 'welcome_challenge_email' },
  { id: 'evaluation', name: 'Evaluation', status: 'Ready', comms: 'judge_invite_email' },
  { id: 'results', name: 'Results', status: 'Approval', comms: 'results_email, progression_invite_email' },
]

function PipelineView({ readonly = false }) {
  return (
    <section className="card">
      <h3>{readonly ? 'Event Progress' : 'Pipeline'}</h3>
      <div className="pipeline">
        {stages.map((stage) => (
          <div className="stage-row" key={stage.id}>
            <div className="stage-copy">
              <strong>{stage.name}</strong>
              <span>{stage.comms}</span>
            </div>
            <span className={stage.status === 'Approval' ? 'badge warn' : 'badge'}>{stage.status}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default PipelineView

