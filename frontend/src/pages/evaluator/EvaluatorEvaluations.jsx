import React, { useState, useEffect } from 'react'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import { getAssignments } from '../../services/evaluator'
import { useNavigate } from 'react-router-dom'

export default function EvaluatorEvaluations() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const data = await getAssignments()
        setAssignments(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const pending = assignments.filter(a => a.status === 'pending' || a.scoring_status === 'pending')

  return (
    <EvaluatorLayout statusItems={[{ label: 'Pending Scorecards', value: pending.length }]} pageTitle="Active Score Cards" pageSubtitle="Select an assigned team to submit or edit their grading rubric.">
      <div className="committee-reference-dashboard">

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
              animation: 'shimmer 1.4s infinite'
            }}></div>
          </div>
        ) : (
          <section className="ref-card" style={{ padding: '20px' }}>
            <div className="ref-section-title">
              <h3>Assigned Scorecards</h3>
            </div>
            {pending.length === 0 ? (
              <div style={{ padding: '32px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                🎉 All assigned scorecards have been submitted successfully!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {pending.map((item) => (
                  <div key={item.assignment_id || item.id} style={{
                    padding: '16px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: 'bold' }}>{item.team_name}</h4>
                        <span className="badge" style={{ fontSize: '10px' }}>
                          {item.compatibility_score ? `${Math.round(item.compatibility_score)}% match` : 'Assigned'}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>{item.challenge || item.project_title}</p>
                    </div>
                    <div>
                      <button
                        onClick={() => navigate(`/evaluator/workspace/${item.team_id}`)}
                        className="ref-primary-button"
                        style={{ background: 'var(--accent-color)', color: '#101927', boxShadow: 'none' }}
                      >
                        Open Rubric
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </EvaluatorLayout>
  )
}
