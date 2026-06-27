function TeamConfigForm() {
  return (
    <section className="card">
      <h3>Team Formation Rules</h3>
      <form className="config-form">
        <label>
          Team size
          <input type="number" min="2" max="6" defaultValue="3" />
        </label>
        <label className="toggle-row">
          <span>
            <strong>Skill balancing</strong>
            <small>Distribute Python, ML, React, backend, and mobile skills.</small>
          </span>
          <input type="checkbox" defaultChecked />
        </label>
        <label className="toggle-row">
          <span>
            <strong>Diversity balancing</strong>
            <small>Prioritize mixed institutions and backgrounds.</small>
          </span>
          <input type="checkbox" defaultChecked />
        </label>
        <label>
          Experience balancing
          <select defaultValue="mixed">
            <option value="mixed">Mixed beginner, intermediate, expert</option>
            <option value="equal">Equalize average experience</option>
            <option value="mentor">At least one expert per team</option>
          </select>
        </label>
        <label>
          Institution restriction
          <select defaultValue="max-one">
            <option value="max-one">Max 1 participant per institution</option>
            <option value="max-two">Max 2 participants per institution</option>
            <option value="none">No restriction</option>
          </select>
        </label>
        <button className="button" type="button">Save Configuration</button>
      </form>
    </section>
  )
}

export default TeamConfigForm

