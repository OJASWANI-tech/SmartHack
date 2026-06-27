function MetricsGrid({ metrics }) {
  return (
    <section className="metric-grid">
      {metrics.map((metric) => (
        <div className="card metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </section>
  )
}

export default MetricsGrid

