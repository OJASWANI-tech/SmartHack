import React from 'react'

function PageHeader({ title, subtitle, statusItems = [] }) {
  if (!title) return null
  return (
    <div className="page-header-inline">
      <div className="page-heading">
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        {statusItems && statusItems.length > 0 && (
          <div className="status-badges">
            {statusItems.map((s) => (
              <span key={s.label} className={s.tone === 'warn' ? 'badge warn' : 'badge'}>{s.label}: {s.value}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageHeader
