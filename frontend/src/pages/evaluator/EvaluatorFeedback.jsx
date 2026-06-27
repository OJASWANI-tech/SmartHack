import React, { useState } from 'react'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import { structureFeedback } from '../../services/evaluator'

export default function EvaluatorFeedback() {
  const [rawNotes, setRawNotes] = useState('')
  const [criteriaScores, setCriteriaScores] = useState({
    Innovation: 5,
    Execution: 5,
    Presentation: 5
  })
  const [structured, setStructured] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleStructure = async () => {
    setLoading(true)
    try {
      const res = await structureFeedback(rawNotes, criteriaScores)
      setStructured(res.structured || res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <EvaluatorLayout pageTitle="AI Feedback Sandbox" pageSubtitle={"Draft and test structured criteria remarks here. To grade an assigned team, go to the Evaluation Queue and click Evaluate."}>
      <div className="committee-reference-dashboard">

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Input Panel */}
          <section className="ref-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Raw Judge Notes</label>
              <textarea
                value={rawNotes}
                onChange={e => setRawNotes(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  resize: 'vertical',
                  minHeight: '120px'
                }}
                rows="6"
                placeholder="e.g. they built a good backend but presentation was rushed. docker script had issues. nice websocket implementation."
              ></textarea>
            </div>

            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Approximate Category Scores</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.keys(criteriaScores).map(key => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>{key}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-color)' }}>{criteriaScores[key]}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={criteriaScores[key]}
                      onChange={e => setCriteriaScores(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
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
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleStructure}
              disabled={loading || !rawNotes.trim()}
              className="ref-primary-button"
              style={{
                width: '100%',
                background: 'var(--accent-color)',
                color: '#101927',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'none'
              }}
            >
              {loading ? (
                <div className="spinner" style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--accent-color)', animation: 'spin 1s linear infinite' }}></div>
              ) : (
                'Generate Structured Feedback'
              )}
            </button>
          </section>

          {/* Results Panel */}
          <section className="ref-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '380px' }}>
            <div className="ref-section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3>Structured Results</h3>
            </div>
            
            {structured ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(structured).map(([category, feedbackText]) => (
                  <div key={category} style={{
                    padding: '12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px'
                  }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-color)', textTransform: 'uppercase' }}>{category}</h4>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: 'var(--text-primary)' }}>
                      {typeof feedbackText === 'object' ? (feedbackText.feedback || feedbackText.text || JSON.stringify(feedbackText)) : feedbackText}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                textAlign: 'center',
                padding: '24px'
              }}>
                Enter raw notes and click generate to build structured feedback panel.
              </div>
            )}
          </section>
        </div>
      </div>
    </EvaluatorLayout>
  )
}
