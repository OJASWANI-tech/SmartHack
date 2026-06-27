import React from 'react'
import { Link } from 'react-router-dom'

export default function AIInsightPanel({ insights, teamId }) {
  if (!insights || insights.length === 0) return null

  return (
    <section className="ref-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(184, 153, 235, 0.05) 0%, rgba(125, 187, 255, 0.05) 100%)' }}>
      <div className="ref-section-title" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span style={{ fontSize: '16px' }}>✨</span>
          AI Assistant Insights
        </h3>
        {teamId && (
          <Link to={`/evaluator/ai-summary/${teamId}`} style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: '700', textDecoration: 'none' }}>
            Open Report ➔
          </Link>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {insights.map((insight, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '13px', lineHeight: '1.4', color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--accent-color)' }}>•</span>
            <span>{insight}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
