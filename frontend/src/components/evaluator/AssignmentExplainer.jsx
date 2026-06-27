import React from 'react'

export default function AssignmentExplainer({ rationale, score }) {
  if (!rationale) return null

  return (
    <div style={{
      padding: '12px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '6px',
      fontSize: '13px',
      marginTop: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ color: 'var(--accent-color)', fontWeight: '700' }}>AI Allocation Rationale</span>
        {score && (
          <span className="badge" style={{ fontSize: '10px' }}>
            Match: {Math.round(score)}%
          </span>
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>{rationale}</p>
    </div>
  )
}
