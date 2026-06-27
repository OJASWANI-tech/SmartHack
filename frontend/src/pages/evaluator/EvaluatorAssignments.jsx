import React, { useState, useEffect } from 'react'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import { getAssignments } from '../../services/evaluator'
import { useNavigate } from 'react-router-dom'
import AssignmentExplainer from '../../components/evaluator/AssignmentExplainer'

export default function EvaluatorAssignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const data = await getAssignments()
        setAssignments(data)
      } catch (e) {
       
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const pending = assignments.filter(a => a.scoring_status === 'pending' || a.scoring_status === 'rescore_requested')
  const completed = assignments.filter(a => a.scoring_status === 'completed')

  return (
    <EvaluatorLayout pageTitle="My Assignments" pageSubtitle="Teams allocated to you for evaluation based on your expertise.">
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Pending Evaluation
                  <span className="badge" style={{ background: 'rgba(184, 153, 235, 0.2)', color: '#b899eb', border: '1px solid rgba(184, 153, 235, 0.3)' }}>
                    {pending.length}
                  </span>
                </h3>
              </div>

              {pending.length === 0 ? (
                <div style={{ padding: '32px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No pending assignments at the moment.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                  {pending.map(assignment => {
                    const isRescore = assignment.scoring_status === 'rescore_requested';
                    return (
                      <div key={assignment.assignment_id} style={{
                        padding: '16px',
                        background: isRescore ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-primary)',
                        border: isRescore ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
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
                            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: 'bold' }}>{assignment.team_name}</h4>
                            <span className={`badge ${isRescore ? 'badge-red' : ''}`} style={{ fontSize: '10px' }}>
                              {isRescore ? 'Rescore Requested' : assignment.challenge}
                            </span>
                            {isRescore && (
                              <span className="badge" style={{ fontSize: '10px' }}>
                                {assignment.challenge}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            {assignment.tech_stack?.map(tag => (
                              <span key={tag} className="badge" style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 8px' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <AssignmentExplainer rationale={assignment.reasoning} score={assignment.compatibility_score} />
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <button 
                            onClick={() => navigate(`/evaluator/workspace/${assignment.team_id}`)}
                            className="ref-primary-button"
                            style={{ 
                              background: isRescore ? '#f87171' : '#7dbbff', 
                              color: '#101927', 
                              boxShadow: 'none',
                              fontWeight: 'bold'
                            }}
                          >
                            {isRescore ? 'Rescore Team' : 'Evaluate Team'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Completed Evaluations
                  <span className="badge">
                    {completed.length}
                  </span>
                </h3>
              </div>

              {completed.length === 0 ? (
                <div style={{ padding: '32px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  You haven't completed any evaluations yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', opacity: 0.85 }}>
                  {completed.map(assignment => (
                    <div key={assignment.assignment_id} style={{
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
                          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '14px', fontWeight: 'bold' }}>{assignment.team_name}</h4>
                          <span className="badge" style={{ fontSize: '10px' }}>
                            {assignment.challenge}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {assignment.tech_stack?.map(tag => (
                            <span key={tag} className="badge" style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 8px' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <small style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px' }}>Score Given</small>
                        <strong style={{ fontSize: '18px', color: 'var(--status-success)', fontFamily: 'monospace' }}>{assignment.submitted_score || '-'}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </EvaluatorLayout>
  )
}
