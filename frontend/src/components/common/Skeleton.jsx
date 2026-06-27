function Skeleton({ rows = 3 }) {
  return (
    <div className="skeleton-list" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="skeleton-row" key={index}>
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

export default Skeleton

