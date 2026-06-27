const stages = ['Intake', 'Teams', 'Approval', 'Evaluation', 'Results']

function StageProgress({ current = 3 }) {
  return (
    <section className="card">
      <h3>Event Stage Progress</h3>
      <div className="stage-progress">
        {stages.map((stage, index) => (
          <div className={index <= current ? 'stage-pill complete' : 'stage-pill'} key={stage}>
            <span>{index + 1}</span>
            <strong>{stage}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export default StageProgress

