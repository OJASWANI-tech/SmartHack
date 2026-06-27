import React, { useState, useEffect } from 'react'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import {
  runMatchingEngine,
  runOptimizer,
  runScheduler,
  getAssignments,
  getScheduleGrid,
  getOptimizationAnalytics,
  applyAssignmentOverride,
  getCompatibilityMatrix
} from '../../services/orchestration'

export default function CommitteeOrchestration() {
  const [loading, setLoading] = useState(false)
  const [matrix, setMatrix] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [schedule, setSchedule] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [activeTab, setActiveTab] = useState('matching') // matching | optimizer | scheduler
  const [overrideData, setOverrideData] = useState({ assignmentId: '', evaluatorId: '' })
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [evaluators, setEvaluators] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = async () => {
    try {
      const [assRes, schedRes, analyticsRes, compatRes] = await Promise.all([
        getAssignments(),
        getScheduleGrid(),
        getOptimizationAnalytics(),
        getCompatibilityMatrix()
      ])
      setAssignments(assRes)
      setSchedule(schedRes.schedules || schedRes)
      setAnalytics(analyticsRes)
      setMatrix(compatRes)

      // Fetch dynamic evaluators for the active event
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const eventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id') || ''
      const evResponse = await fetch(`${baseURL}/api/v1/events/${eventId}/evaluators`)
      if (evResponse.ok) {
        const evData = await evResponse.json()
        setEvaluators(evData || [])
      }
    } catch (e) {
     
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRunMatching = async () => {
    setActiveTab('matching')
    setLoading(true)
    try {
      await runMatchingEngine()
      const cleanMatrix = await getCompatibilityMatrix()
      setMatrix(cleanMatrix)
    } catch (e) {
    
    } finally {
      setLoading(false)
    }
  }

  const handleRunOptimizer = async () => {
    setActiveTab('optimizer')
    setLoading(true)
    try {
      await runOptimizer()
      await loadData()
    } catch (e) {
      
    } finally {
      setLoading(false)
    }
  }

  const handleRunScheduler = async () => {
    setActiveTab('scheduler')
    setLoading(true)
    try {
      await runScheduler()
      await loadData()
    } catch (e) {
     
    } finally {
      setLoading(false)
    }
  }

  const handleApplyOverride = async (e) => {
    e.preventDefault()
    if (!overrideData.assignmentId || !overrideData.evaluatorId) return

    const selectedAssignment = assignments.find(ass => ass.assignment_id === overrideData.assignmentId)
    if (!selectedAssignment) return

    setLoading(true)
    try {
      await applyAssignmentOverride(overrideData.assignmentId, overrideData.evaluatorId, selectedAssignment.team_id)
      await loadData()
      setOverrideData({ assignmentId: '', evaluatorId: '' })
      setSelectedTeamId('')
    } catch (e) {
     
    } finally {
      setLoading(false)
    }
  }

  const headerActions = (
    <div style={{ display: 'flex', gap: '10px' }}>
      <button 
        onClick={handleRunMatching} 
        disabled={loading}
        className="ref-primary-button" 
        style={activeTab === 'matching' 
          ? { background: 'var(--accent-color)', color: '#101927', fontWeight: 'bold' } 
          : { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }
        }
      >
        Calculate Matching
      </button>
      <button 
        onClick={handleRunOptimizer} 
        disabled={loading}
        className="ref-primary-button" 
        style={activeTab === 'optimizer' 
          ? { background: 'var(--accent-color)', color: '#101927', fontWeight: 'bold' } 
          : { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }
        }
      >
        Optimize Workloads
      </button>
      <button 
        onClick={handleRunScheduler} 
        disabled={loading}
        className="ref-primary-button" 
        style={activeTab === 'scheduler' 
          ? { background: 'var(--accent-color)', color: '#101927', fontWeight: 'bold' } 
          : { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }
        }
      >
        Create Timetable
      </button>
    </div>
  )

  return (
    <CommitteeLayout pageTitle="Smart Matchmaker" pageSubtitle="Match judges with teams based on expertise and schedule presentation timeslots without conflicts." headerActions={headerActions}>
      <div className="committee-reference-dashboard">

        {/* Analytics strip */}
        {analytics && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <article className="ref-mini-card">
              <span className="ref-icon">⚙️</span>
              <div>
                <strong>{analytics.total_assignments}</strong>
                <p>Total Assignments</p>
                <small>Matching allocations</small>
              </div>
            </article>
            <article className="ref-mini-card">
              <span className="ref-icon">📈</span>
              <div>
                <strong>{analytics.average_compatibility?.toFixed(1)}%</strong>
                <p>Average Compatibility</p>
                <small>Overall expertise match</small>
              </div>
            </article>
            <article className="ref-mini-card">
              <span className="ref-icon">👥</span>
              <div>
                <strong>{analytics.total_evaluators}</strong>
                <p>Active Judges</p>
                <small>Ready to grade</small>
              </div>
            </article>
            <article className="ref-mini-card">
              <span className="ref-icon">⚠️</span>
              <div>
                <strong>0</strong>
                <p>Conflicts Detected</p>
                <small>Conflict of interest checks</small>
              </div>
            </article>
          </section>
        )}

        {/* Tabs navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px', marginBottom: '20px' }}>
          {[
            { id: 'matching', label: 'Compatibility Heatmap' },
            { id: 'optimizer', label: 'Allocations & Rationale' },
            { id: 'scheduler', label: 'Presentation Timetable' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-color)' : 'none',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '10px 4px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
            <div className="spinner" style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
              animation: 'shimmer 1.4s infinite'
            }}></div>
          </div>
        ) : (
          <div>
            {/* Matching Matrix Tab */}
            {activeTab === 'matching' && (
              <section className="ref-card" style={{ padding: '20px' }}>
                <div className="ref-section-title" style={{ marginBottom: '16px' }}>
                  <h3>Judge-Team Compatibility Heatmap (%)</h3>
                </div>
                {matrix ? (
                  <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Judge / Evaluator</th>
                          {Object.keys(Object.values(matrix)[0] || {}).map(teamName => (
                            <th key={teamName} style={{ textAlign: 'center', padding: '10px 6px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '80px' }}>{teamName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(matrix).map(([judge, teams]) => (
                          <tr key={judge}>
                            <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--text-primary)', background: 'var(--bg-muted)', borderRadius: '6px' }}>{judge}</td>
                            {Object.entries(teams).map(([teamName, val]) => {
                              const score = Array.isArray(val) ? val[0] : val;
                              const reason = Array.isArray(val) ? val[1] : '';
                              return (
                                <td key={teamName} title={reason} style={{
                                  textAlign: 'center',
                                  padding: '10px 6px',
                                  background: score === 0 ? 'rgba(239, 68, 68, 0.12)' : score >= 70 ? 'rgba(74, 222, 128, 0.18)' : score >= 40 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.06)',
                                  color: score === 0 ? '#f87171' : score >= 70 ? '#4ade80' : score >= 40 ? '#38bdf8' : 'var(--text-muted)',
                                  fontWeight: 'bold',
                                  borderRadius: '6px',
                                  border: score >= 70 ? '1px solid rgba(74, 222, 128, 0.2)' : score >= 40 ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid transparent',
                                  cursor: reason ? 'help' : 'default',
                                  transition: 'all 0.2s ease'
                                }}>
                                  {Math.round(score)}%
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    No compatibility matrix calculated yet. Click "Calculate Matching" to load expertise scores.
                  </div>
                )}
              </section>
            )}

            {/* Solver Assignments Tab */}
            {activeTab === 'optimizer' && (() => {
              const uniqueTeams = Array.from(
                new Map(assignments.map(ass => [ass.team_id, { id: ass.team_id, name: ass.team_name }])).values()
              ).sort((a, b) => a.name.localeCompare(b.name));
              const teamAssignments = assignments.filter(ass => ass.team_id === selectedTeamId);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Search box */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Search assignments by Judge or Team name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-color)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Scrollable list of cards */}
                    <div style={{ 
                      maxHeight: '650px', 
                      overflowY: 'auto', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      paddingRight: '6px'
                    }}>
                      {assignments
                        .filter(ass => 
                          ass.evaluator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ass.team_name.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(ass => (
                          <section key={ass.assignment_id} className="ref-card" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{ass.evaluator_name}</strong>
                                <span style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                  {ass.evaluator_domain}
                                </span>
                              </div>
                              <span className="badge" style={{
                                background: ass.compatibility_score === 0 ? 'rgba(239, 68, 68, 0.12)' : ass.compatibility_score >= 70 ? 'rgba(74, 222, 128, 0.18)' : ass.compatibility_score >= 40 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.06)',
                                color: ass.compatibility_score === 0 ? '#f87171' : ass.compatibility_score >= 70 ? '#4ade80' : ass.compatibility_score >= 40 ? '#38bdf8' : 'var(--text-muted)',
                                border: ass.compatibility_score >= 70 ? '1px solid rgba(74, 222, 128, 0.2)' : ass.compatibility_score >= 40 ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid transparent',
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                              }}>
                                {Math.round(ass.compatibility_score)}% match
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Assigned to: <strong style={{ color: 'var(--text-primary)' }}>{ass.team_name}</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTeamId(ass.team_id);
                                  setOverrideData({ assignmentId: ass.assignment_id, evaluatorId: '' });
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--accent-color)',
                                  fontSize: '12.5px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  transition: 'all 0.2s',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                ✏️ Reassign
                              </button>
                            </div>
                            <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Rationale:</strong> {ass.reasoning}
                            </div>
                          </section>
                        ))}
                      {assignments.filter(ass => 
                        ass.evaluator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ass.team_name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                          No assignments matched your search filter.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sticky Manual override box */}
                  <div style={{ position: 'sticky', top: '20px' }}>
                    <section className="ref-card" style={{ padding: '20px' }}>
                      <div className="ref-section-title" style={{ marginBottom: '12px' }}>
                        <h3>Manual Override</h3>
                      </div>
                      <form onSubmit={handleApplyOverride} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>1. Select Team</label>
                          <select 
                            value={selectedTeamId} 
                            onChange={e => {
                              setSelectedTeamId(e.target.value);
                              setOverrideData(prev => ({ ...prev, assignmentId: '' }));
                            }}
                            style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                          >
                            <option value="">-- Choose Team --</option>
                            {uniqueTeams.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: selectedTeamId ? 'var(--text-secondary)' : 'var(--text-muted)', marginBottom: '6px' }}>2. Current Judge to Replace</label>
                          <select 
                            value={overrideData.assignmentId} 
                            onChange={e => setOverrideData(prev => ({ ...prev, assignmentId: e.target.value }))}
                            disabled={!selectedTeamId}
                            style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '13px', opacity: selectedTeamId ? 1 : 0.5, outline: 'none' }}
                          >
                            <option value="">-- Choose Current Judge --</option>
                            {teamAssignments.map(ass => (
                              <option key={ass.assignment_id} value={ass.assignment_id}>
                                {ass.evaluator_name} ({Math.round(ass.compatibility_score)}% compatibility)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: overrideData.assignmentId ? 'var(--text-secondary)' : 'var(--text-muted)', marginBottom: '6px' }}>3. Assign New Evaluator</label>
                          <select 
                            value={overrideData.evaluatorId} 
                            onChange={e => setOverrideData(prev => ({ ...prev, evaluatorId: e.target.value }))}
                            disabled={!overrideData.assignmentId}
                            style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '13px', opacity: overrideData.assignmentId ? 1 : 0.5, outline: 'none' }}
                          >
                            <option value="">-- Choose New Evaluator --</option>
                            {evaluators.map(ev => {
                              const isAlreadyAssigned = teamAssignments.some(ass => ass.evaluator_id === ev.id);
                              return (
                                <option key={ev.id} value={ev.id} disabled={isAlreadyAssigned}>
                                  {ev.name} {isAlreadyAssigned ? '(Already Assigned)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <button 
                          type="submit" 
                          disabled={!overrideData.assignmentId || !overrideData.evaluatorId}
                          className="ref-primary-button" 
                          style={{ marginTop: '8px', background: 'var(--accent-color)', color: '#101927', width: '100%', textAlign: 'center', fontWeight: 'bold' }}
                        >
                          Apply Override
                        </button>
                      </form>
                    </section>
                  </div>
                </div>
              );
            })()}

            {/* Evaluation Schedule Tab */}
            {activeTab === 'scheduler' && (
              <section className="ref-card" style={{ padding: '20px' }}>
                <div className="ref-section-title" style={{ marginBottom: '16px' }}>
                  <h3>Presentation Schedule Grid</h3>
                </div>
                {schedule.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Time Slot</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Room Location</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Team Evaluated</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Assigned Judge</th>
                          <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Round Sequence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedule.map((slot, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{slot.time_slot}</td>
                            <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{slot.room || 'Room Alpha'}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{slot.team_name}</td>
                            <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{slot.evaluator_name}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <span className="badge" style={{ background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-secondary)' }}>
                                #{slot.sequence_order}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    No timetable generated yet. Click "Create Timetable" to schedule timeslots.
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </CommitteeLayout>
  )
}
