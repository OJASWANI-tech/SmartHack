function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{message}</span>
      {action}
    </div>
  )
}

export default EmptyState

