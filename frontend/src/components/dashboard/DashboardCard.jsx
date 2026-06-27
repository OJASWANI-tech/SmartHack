function DashboardCard({ label, value, detail, tone = 'default' }) {
  return (
    <article className={`dashboard-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

export default DashboardCard

