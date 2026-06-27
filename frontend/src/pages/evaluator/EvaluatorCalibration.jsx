import React, { useState, useEffect } from 'react'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import { getBiasCalibration } from '../../services/evaluator'

export default function EvaluatorCalibration() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await getBiasCalibration()
        setData(res)
      } catch (e) {
        
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const judgeAvg = data?.judge_average ?? 0
  const globalAvg = data?.global_average ?? 0
  const deviation = data?.deviation ?? 0

  let statusLabel = 'Balanced Grader'
  let statusTone = 'var(--status-success)'
  let statusDesc = 'Excellent! Your scoring matches the panel average within normal statistical bounds. Continue applying the rubrics objectively.'

  if (deviation > 0.5) {
    statusLabel = 'Lenient Grader'
    statusTone = 'var(--status-warning)'
    statusDesc = 'You are scoring slightly higher than the peer average. Remember to verify deep technical complexity and check for recycled boilerplates before awarding high points.'
  } else if (deviation < -0.5) {
    statusLabel = 'Critical Grader'
    statusTone = '#60a5fa'
    statusDesc = 'You are scoring slightly lower than the peer average. Remember to award full marks for working features even if the project lacks premium visual polish.'
  }

  // Calculate percentages for simple dashboard progress bars (max rating = 10)
  const judgePercent = Math.min(100, Math.max(0, (judgeAvg / 10) * 100))
  const globalPercent = Math.min(100, Math.max(0, (globalAvg / 10) * 100))

  return (
    <EvaluatorLayout pageTitle="Bias & Calibration Analytics" pageSubtitle="Compare your personal scoring patterns with the global panel averages to ensure fair, aligned evaluations.">
      <div className="committee-reference-dashboard" style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
              animation: 'shimmer 1.4s infinite'
            }}></div>
          </div>
        ) : data?.has_graded === false ? (
          <div style={{
            padding: '48px 32px',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            border: '1px dashed var(--border-color)',
            borderRadius: '12px',
            maxWidth: '600px',
            margin: '40px auto',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{ fontSize: '56px', marginBottom: '20px' }}>⚖️</div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '20px', fontWeight: 'bold' }}>
              No Calibration Metrics Available
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
              Calibration insights are generated dynamically once you submit score cards for your assigned teams. 
              Please navigate to your workspace queue to complete evaluations.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Grid: Severity & Quick Tips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'stretch' }}>
              
              {/* Severity Alignment Card */}
              <section className="ref-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="ref-section-title" style={{ marginBottom: '20px' }}>
                    <h3>Your Severity Alignment</h3>
                  </div>

                  <div style={{
                    padding: '20px',
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${deviation > 0.5 ? 'var(--status-warning)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      fontSize: '28px',
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'var(--bg-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${statusTone}`
                    }}>
                      ⚖️
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 'bold', color: statusTone }}>
                        {statusLabel} ({deviation >= 0 ? `+${deviation.toFixed(2)}` : deviation.toFixed(2)})
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.45', color: 'var(--text-secondary)' }}>
                        {statusDesc}
                      </p>
                    </div>
                  </div>

                  {/* Progress Indicators */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>Your Average Score</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{judgeAvg.toFixed(2)} / 10.00</strong>
                      </div>
                      <div style={{ height: '10px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div style={{ width: `${judgePercent}%`, height: '100%', background: 'var(--accent-color)', borderRadius: '999px' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        <span>Event Global Average</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{globalAvg.toFixed(2)} / 10.00</strong>
                      </div>
                      <div style={{ height: '10px', background: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div style={{ width: `${globalPercent}%`, height: '100%', background: '#64748b', borderRadius: '999px' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Calibration Scale */}
                <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Visual Calibration Spectrum
                  </span>
                  <div style={{ position: 'relative', height: '12px', background: 'linear-gradient(to right, #60a5fa 0%, #10b981 50%, #f59e0b 100%)', borderRadius: '8px', marginBottom: '20px' }}>
                    {/* Balanced Center Guide Line */}
                    <div style={{ position: 'absolute', left: '50%', top: '-4px', bottom: '-4px', width: '2px', background: '#fff', opacity: 0.8 }}></div>
                    
                    {/* Dynamic Pointer Needle */}
                    {(() => {
                      const devVal = Number(deviation);
                      // Map deviation range [-1.5, +1.5] into percentage [5%, 95%]
                      const percentage = Math.min(95, Math.max(5, ((devVal + 1.5) / 3.0) * 100));
                      return (
                        <div style={{
                          position: 'absolute',
                          left: `${percentage}%`,
                          top: '-10px',
                          width: '16px',
                          height: '32px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          transform: 'translateX(-50%)',
                          zIndex: 2
                        }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-primary)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>▼</div>
                          <div style={{ width: '4px', height: '14px', background: '#ffffff', border: '1px solid #1e293b', borderRadius: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                        </div>
                      )
                    })()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    <span>◀ Critical Grader (-1.5)</span>
                    <span>Balanced (0.0)</span>
                    <span>Lenient Grader (+1.5) ▶</span>
                  </div>
                </div>
              </section>

              {/* Quick Calibration Guidelines */}
              <section className="ref-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="ref-section-title" style={{ marginBottom: '16px' }}>
                    <h3>Quick Calibration Tips</h3>
                  </div>
                  <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Calibration ensures a level playing field for all hackathon teams. Follow these rules of thumb to reduce cognitive grading bias:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '18px', lineHeight: '1', marginTop: '2px' }}>⚓</div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>Avoid Anchoring</strong>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          Don't let the first project you review establish a strict benchmark. Treat each submission independently using the Guidelines rubric.
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '18px', lineHeight: '1', marginTop: '2px' }}>🛡️</div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>Isolate Parameters</strong>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          Do not give high marks for code execution just because a presentation was highly polished. Score execution, UX, and innovation separately.
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '18px', lineHeight: '1', marginTop: '2px' }}>⚖️</div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>Check Deviations</strong>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          If your scores deviate by more than 1.5 points from your peers, a Blind Calibration banner will appear in your workspace to prompt a re-check.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.45',
                  marginTop: '20px'
                }}>
                  <strong style={{ color: 'var(--text-primary)' }}>💡 Peer Review Protocol:</strong> Scores remain completely blind and confidential from other judges during evaluation slots.
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </EvaluatorLayout>
  )
}
