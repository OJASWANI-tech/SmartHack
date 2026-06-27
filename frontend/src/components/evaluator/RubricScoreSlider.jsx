import React from 'react'

export default function RubricScoreSlider({ criteria, value, onChange }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{criteria.name}</label>
        <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent-color)' }}>{value} / {criteria.max}</span>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>{criteria.hint} (Weight: {criteria.weight}x)</p>
      <input
        type="range"
        min="0"
        max={criteria.max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          width: '100%',
          height: '6px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '999px',
          outline: 'none',
          accentColor: 'var(--accent-color)',
          cursor: 'pointer'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>
        <span>0</span>
        <span>{Math.round(criteria.max / 2)}</span>
        <span>{criteria.max}</span>
      </div>
    </div>
  )
}
