function ParticipantIntakePanel() {
  return (
    <section className="card">
      <h3>Participant Intake</h3>
      <div className="intake-grid">
        <label className="upload-dropzone">
          <span>Upload CSV</span>
          <strong>Drop participants.csv here</strong>
          <input type="file" accept=".csv" />
        </label>
        <form className="form-stack">
          <input placeholder="Participant name" />
          <input placeholder="Email address" />
          <input placeholder="Institution" />
          <input placeholder="Skills: Python, ML, React" />
          <button className="button" type="button">Add Participant</button>
        </form>
      </div>
    </section>
  )
}

export default ParticipantIntakePanel

