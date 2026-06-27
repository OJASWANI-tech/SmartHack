function StatusStrip({ items }) {
  return (
    <section className="em-status-strip">
      {items.map((item) => (
        <article key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  )
}

export default StatusStrip
