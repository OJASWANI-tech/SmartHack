function CriteriaScoreRow({ criterion, value = '', onChange, disabled = false }) {
  return (
    <div className="em-criteria-row">
      <label htmlFor={`score-${criterion.id}`}>{criterion.label}</label>
      <input
        id={`score-${criterion.id}`}
        type="number"
        min="0"
        max={criterion.max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(criterion, event.target.value)}
      />
      <span className="badge">/{criterion.max}</span>
      <span className="badge">{criterion.weight}</span>
    </div>
  )
}

export default CriteriaScoreRow
