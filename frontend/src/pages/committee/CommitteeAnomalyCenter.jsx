import React, { useState, useEffect } from 'react'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import { getScoreAnomalies, resolveScoreAnomaly, requestRescoreFromEvaluators, getAIDivergenceSummary } from '../../services/anomaly'

export default function CommitteeAnomalyCenter() {
  const [anomalies, setAnomalies] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [selectedAnomaly, setSelectedAnomaly] = useState(null)
  const [aiReport, setAiReport] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolutionAction, setResolutionAction] = useState('override_average')

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getScoreAnomalies()
      setAnomalies(data)
      if (data.length > 0) {
        setSelectedAnomaly(data[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedAnomaly) {
      setReportLoading(true)
      getAIDivergenceSummary(selectedAnomaly.team_id)
        .then(res => {
          setAiReport(res.divergence_summary || res)
        })
        .catch(err => console.error(err))
        .finally(() => setReportLoading(false))
    } else {
      setAiReport('')
    }
  }, [selectedAnomaly])

  const getResolutionActionLabel = (action) => {
    switch (action) {
      case 'override_average':
        return 'Override with Panel Average';
      case 'accepted':
      case 'accept_divergence':
        return 'Accepted Explicit Divergence';
      case 'request_rescore':
        return 'Requested Rescore from Evaluators';
      default:
        return action ? action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault()
    if (!selectedAnomaly) return
    setResolving(true)
    try {
      await resolveScoreAnomaly(selectedAnomaly.id, resolutionAction, resolutionNote)
      setResolutionNote('')
      await loadData()
    } catch (e) {
      console.error(e)
    } finally {
      setResolving(false)
    }
  }

  const handleRequestRescore = async () => {
    if (!selectedAnomaly) return
    setResolving(true)
    try {
      await requestRescoreFromEvaluators(selectedAnomaly.id)
      await loadData()
    } catch (e) {
      console.error(e)
    } finally {
      setResolving(false)
    }
  }

  const severityColor = (sev) => {
    if (sev === 'high') return '#f87171'
    if (sev === 'medium') return '#fbbf24'
    return '#38bdf8'
  }

  return (
    <CommitteeLayout pageTitle="Score Anomaly & Governance Center" pageSubtitle="Monitor statistical divergence, resolve evaluator bias, and track semantic discrepancies.">
      <div className="committee-reference-dashboard">

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <div className="spinner" style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
              animation: 'shimmer 1.4s infinite'
            }}></div>
          </div>
        ) : anomalies.length === 0 ? (
          <div style={{ padding: '48px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            🎉 No score anomalies or statistical discrepancies detected in this phase.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px', alignItems: 'start' }}>
            {/* Left: Anomalies List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Detected Discrepancies</h3>
              {anomalies.map(an => (
                <div 
                  key={an.id} 
                  onClick={() => setSelectedAnomaly(an)}
                  style={{
                    padding: '16px',
                    background: selectedAnomaly?.id === an.id ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                    border: `1px solid ${selectedAnomaly?.id === an.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 160ms ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{an.team_name}</strong>
                    <span className="badge" style={{
                      background: `rgba(${an.severity === 'high' ? '239, 68, 68' : '251, 191, 36'}, 0.1)`,
                      color: severityColor(an.severity),
                      border: 'none',
                      fontSize: '10px'
                    }}>
                      {an.severity.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Divergence: <strong style={{ color: 'var(--text-primary)' }}>{an.divergence_score?.toFixed(2)}</strong></span>
                    <span style={{ textTransform: 'capitalize' }}>Status: {an.resolution_status}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Selected Anomaly Details & AI Review */}
            {selectedAnomaly && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <section className="ref-card" style={{ padding: '24px' }}>
                  <div className="ref-section-title" style={{ marginBottom: '12px' }}>
                    <h3>Reviewing Flag: {selectedAnomaly.team_name}</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                    <div>
                      <small style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>AI Discrepancy Observation</small>
                      <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        {selectedAnomaly.ai_reasoning}
                      </p>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

                    {/* AI audit report */}
                    <div>
                      <small style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>AI Divergence Audit Report</small>
                      {reportLoading ? (
                        <div style={{ padding: '16px', textAlign: 'center' }}>
                          <div className="spinner" style={{ width: '20px', height: '20px', margin: 'auto', borderRadius: '50%', border: '2px solid var(--accent-color)', borderTopColor: 'transparent', animation: 'shimmer 1.4s infinite' }}></div>
                        </div>
                      ) : (
                        <div style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '16px',
                          lineHeight: '1.5',
                          fontSize: '13px',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-line'
                        }}>
                          {aiReport}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Resolution action cards */}
                <section className="ref-card" style={{ padding: '24px' }}>
                  <div className="ref-section-title" style={{ marginBottom: '16px' }}>
                    <h3>Resolve Discrepancy</h3>
                  </div>

                  {selectedAnomaly.resolution_status !== 'resolved' && selectedAnomaly.resolution_status !== 'escalated' ? (
                    <form onSubmit={handleResolve} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>Resolution Action</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {[
                            { id: 'override_average', label: 'Use Panel Average' },
                            { id: 'accept_divergence', label: 'Accept Divergence' },
                            { id: 'request_rescore', label: 'Ask Re-evaluation' }
                          ].map(action => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() => {
                                setResolutionAction(action.id)
                                if (action.id === 'request_rescore') {
                                  handleRequestRescore()
                                }
                              }}
                              style={{
                                padding: '10px 8px',
                                background: resolutionAction === action.id ? 'var(--accent-color)' : 'var(--bg-primary)',
                                color: resolutionAction === action.id ? '#101927' : 'var(--text-primary)',
                                border: `1px solid ${resolutionAction === action.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 120ms ease'
                              }}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {resolutionAction !== 'request_rescore' && (
                        <>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>Resolution/Committee Notes</label>
                            <textarea
                              value={resolutionNote}
                              onChange={e => setResolutionNote(e.target.value)}
                              required
                              rows="3"
                              placeholder="State rationale (e.g. divergence is acceptable due to valid differences in domain priorities, or database failure justified standard penalization)..."
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '13px',
                                lineHeight: '1.4',
                                resize: 'none'
                              }}
                            ></textarea>
                          </div>
                          <button
                            type="submit"
                            disabled={resolving || !resolutionNote.trim()}
                            className="ref-primary-button"
                            style={{
                              background: 'var(--accent-color)',
                              color: '#101927',
                              width: '100%',
                              textAlign: 'center',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            {resolving ? 'Applying...' : 'Apply Resolution'}
                          </button>
                        </>
                      )}
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="badge" style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        textAlign: 'center', 
                        display: 'block',
                        background: selectedAnomaly.resolution_status === 'resolved' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                        color: selectedAnomaly.resolution_status === 'resolved' ? '#4ade80' : '#fbbf24',
                        width: '100%'
                      }}>
                        🎯 Policy Locked. Action Variant: {selectedAnomaly.resolution_status.toUpperCase()}
                      </div>
                      
                      <div style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        <div>
                          <span style={{ 
                            display: 'block', 
                            fontSize: '10px', 
                            textTransform: 'uppercase', 
                            fontWeight: '700', 
                            color: 'var(--text-secondary)', 
                            marginBottom: '4px',
                            letterSpacing: '0.05em'
                          }}>
                            Resolution Technique
                          </span>
                          <span style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: 'var(--accent-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            ⚙️ {getResolutionActionLabel(selectedAnomaly.resolution_action)}
                          </span>
                        </div>
                        
                        {selectedAnomaly.committee_note && (
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                            <span style={{ 
                              display: 'block', 
                              fontSize: '10px', 
                              textTransform: 'uppercase', 
                              fontWeight: '700', 
                              color: 'var(--text-secondary)', 
                              marginBottom: '4px',
                              letterSpacing: '0.05em'
                            }}>
                              Committee Justification Note
                            </span>
                            <p style={{ 
                              margin: 0, 
                              fontSize: '12px', 
                              color: 'var(--text-secondary)', 
                              lineHeight: '1.5',
                              fontStyle: 'italic',
                              background: 'var(--bg-secondary)',
                              padding: '10px',
                              borderRadius: '6px',
                              borderLeft: '3px solid var(--accent-color)'
                            }}>
                              "{selectedAnomaly.committee_note}"
                            </p>
                          </div>
                        )}

                        {selectedAnomaly.resolved_at && (
                          <div style={{ 
                            borderTop: '1px solid var(--border-color)', 
                            paddingTop: '8px', 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            fontSize: '11px', 
                            color: 'var(--text-secondary)' 
                          }}>
                            <span>Resolution Timestamp</span>
                            <span>{new Date(selectedAnomaly.resolved_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )}
      </div>
    </CommitteeLayout>
  )
}
