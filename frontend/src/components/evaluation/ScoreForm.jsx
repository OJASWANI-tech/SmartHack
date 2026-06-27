function ScoreForm() {
  return (
    <section className="card">
      <h3>Score Submission</h3>
      <div className="score-grid">
        <label>
          Innovation
          <input type="number" min="0" max="10" defaultValue="8" />
        </label>
        <label>
          Technical Execution
          <input type="number" min="0" max="10" defaultValue="7" />
        </label>
        <label>
          Presentation
          <input type="number" min="0" max="10" defaultValue="8" />
        </label>
      </div>
      <div className="form-stack">
        <textarea rows="4" placeholder="Evaluation notes" />
        <button className="button" type="button">Submit Score</button>
      </div>
    </section>
  )
}

export default ScoreForm

