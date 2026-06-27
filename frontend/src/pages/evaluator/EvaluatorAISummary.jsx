import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import { getAssignmentDetail } from '../../services/evaluator'

export default function EvaluatorAISummary() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await getAssignmentDetail(teamId)
        setData(res)
      } catch (e) {
        
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [teamId])

  if (loading) {
    return (
      <EvaluatorLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <div className="spinner" style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
            animation: 'shimmer 1.4s infinite'
          }}></div>
        </div>
      </EvaluatorLayout>
    )
  }

  if (!data || !data.team) {
    return (
      <EvaluatorLayout>
        <div className="committee-reference-dashboard">
          <div style={{ padding: '24px', border: '1px dashed var(--status-danger)', borderRadius: '8px', color: 'var(--status-danger)', textAlign: 'center' }}>
            Team or assignment details not found.
          </div>
        </div>
      </EvaluatorLayout>
    )
  }

  const { team, submission, ai_summary, rubric } = data

  return (
    <EvaluatorLayout pageTitle="AI Project Insight" pageSubtitle={`Deconstruct technical depth and project scope for ${team.name} via AI summary parsing.`} headerActions={(
      <button 
        onClick={() => navigate(`/evaluator/workspace/${team.id}`)} 
        className="ref-primary-button"
        style={{ background: 'var(--accent-color)', color: '#101927' }}
      >
        Back to Rubric
      </button>
    )}>
      <div className="committee-reference-dashboard">

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* AI Summary Content */}
            <section className="ref-card" style={{ padding: '24px' }}>
              <div className="ref-section-title">
                <h3>Parsed README & Submission Summary</h3>
              </div>
              <div style={{ marginTop: '16px', lineHeight: '1.6', fontSize: '14px', color: 'var(--text-primary)' }}>
                {ai_summary ? (
                  <p style={{ whiteSpace: 'pre-line' }}>{ai_summary.summary_text || ai_summary}</p>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No cached AI summary. Submit PPT and video first to generate insights.</p>
                )}
              </div>
            </section>

            {/* Submission Completeness Check */}
            <section className="ref-card" style={{ padding: '24px' }}>
              <div className="ref-section-title">
                <h3>Deliverable Completeness Review</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '16px' }}>
                {[
                  { label: 'Pitch Slides', present: !!submission?.ppt_url, icon: '📄' },
                  { label: 'Source Repository', present: !!submission?.github_url, icon: '💻' },
                  { label: 'Video Walkthrough', present: !!submission?.demo_video_url, icon: '🎥' }
                ].map(item => (
                  <div key={item.label} style={{
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ fontSize: '20px' }}>{item.icon}</div>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.label}</strong>
                    <span className="badge" style={{
                      alignSelf: 'flex-start',
                      fontSize: '10px',
                      background: item.present ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: item.present ? '#4ade80' : '#f87171',
                      border: 'none'
                    }}>
                      {item.present ? 'Available' : 'Missing'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Rubric Evaluation Hints */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title" style={{ marginBottom: '12px' }}>
                <h3>Rubric Assessment Hints</h3>
              </div>
              <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                <li><strong>Innovation:</strong> Look for integration of unique APIs, modern custom algorithms, and high impact design.</li>
                <li><strong>Execution:</strong> Check GitHub repo commits, test coverage structure, and local dockerization capability.</li>
                <li><strong>Presentation:</strong> Verify slides address target audience persona, problem identification, and business scaling map.</li>
                <li><strong>Scalability:</strong> Analyze schema files, database choices (NoSQL vs SQL), and caching architecture.</li>
              </ul>
            </section>

            {/* Team Context */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title" style={{ marginBottom: '12px' }}>
                <h3>Team Profile</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div>
                  <small style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Selected Domain</small>
                  <strong>{team.challenge || 'General Track'}</strong>
                </div>
                <div>
                  <small style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Institution</small>
                  <strong>{team.members?.[0]?.institution || 'TI Partner Institution'}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </EvaluatorLayout>
  )
}
