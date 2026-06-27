import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import MascotEmptyState from '../../components/common/MascotEmptyState'
import { getDashboardSummary, getProfile, getAssignments } from '../../services/evaluator'
import { getScheduleGrid } from '../../services/orchestration'

export default function EvaluatorDashboard() {
  const [summary, setSummary] = useState(null)
  const [profile, setProfile] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Recover event_id from token if missing from localStorage
        let eventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id')
        if (!eventId) {
          const token = localStorage.getItem('eventflow_token')
          if (token) {
            const parts = token.split('.')
            if (parts.length === 3) {
              try {
                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
                if (payload.event_id) {
                  localStorage.setItem('current_event_id', payload.event_id)
                  localStorage.setItem('event_id', payload.event_id)
                }
              } catch (e) {
                console.error("Token decoding error on mount:", e)
              }
            }
          }
        }

        const [sum, prof, assigns, schedGrid] = await Promise.all([
          getDashboardSummary(),
          getProfile(),
          getAssignments(),
          getScheduleGrid()
        ])
        
        setSummary(sum)
        setProfile(prof)
        setAssignments(assigns || [])
        
        // Filter schedule for this specific evaluator
        if (prof) {
          const mySched = (schedGrid?.schedules || []).filter(s => 
            s.evaluator_id === prof.id || 
            s.evaluator_name?.toLowerCase() === prof.name?.toLowerCase()
          )
          setSchedule(mySched)
        }
      } catch (e) {
        console.error("Dashboard data load error:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Calculate stats for circular progress
  const totalAssigned = assignments.length || summary?.total_assigned || 0
  const completedCount = assignments.length ? assignments.filter(a => a.scoring_status === 'completed').length : (summary?.completed_count || 0)
  const pendingCount = assignments.length ? assignments.filter(a => a.scoring_status === 'pending' || a.scoring_status === 'rescore_requested').length : (summary?.pending_count || 0)
  const draftCount = 0
  const actualPending = pendingCount

  const hardcodedSchedule = [
    { team_name: 'Team Alpha', time_slot: '12:30 PM - 12:45 PM', room: 'Room Alpha', sequence_order: 1 },
    { team_name: 'Team Beta', time_slot: '01:15 PM - 01:30 PM', room: 'Room Beta', sequence_order: 2 },
    { team_name: 'Team Gamma', time_slot: '02:30 PM - 02:45 PM', room: 'Room Delta', sequence_order: 3 },
    { team_name: 'Team Epsilon', time_slot: '04:15 PM - 04:30 PM', room: 'Room Alpha', sequence_order: 4 },
    { team_name: 'Team Zeta', time_slot: '05:00 PM - 05:15 PM', room: 'Room Gamma', sequence_order: 5 }
  ]
  const displaySchedule = schedule && schedule.length > 0 ? schedule : hardcodedSchedule

  const completedPercent = totalAssigned ? (completedCount / totalAssigned) * 100 : 0
  const pendingPercent = totalAssigned ? (actualPending / totalAssigned) * 100 : 0
  const draftPercent = totalAssigned ? (draftCount / totalAssigned) * 100 : 0

  const rescoreAssignments = assignments.filter(a => a.scoring_status === 'rescore_requested')
  const notificationList = []
  const normalPendingCount = assignments.filter(a => a.scoring_status === 'pending').length
  if (normalPendingCount > 0) {
    notificationList.push(`${normalPendingCount} evaluations pending`)
  }
  rescoreAssignments.forEach(a => {
    const teamNameStr = a.team_name.startsWith('Team') ? a.team_name : `Team ${a.team_name}`;
    notificationList.push(`⚠️ Rescore Requested: The committee has requested you to revise your score for ${teamNameStr}.`)
  })

  return (
    <EvaluatorLayout
      notifications={notificationList}
      statusItems={[{ label: 'Status', value: 'Active' }]}
      pageTitle="Evaluator Dashboard"
      pageSubtitle={
        profile ? `Welcome back, ${profile.name}. New to judging? Check the Judging Guidelines to see the step-by-step evaluation workflow.` : 'Welcome back, Judge.'
      }
    >
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
          <>
            {/* Quick Start Guide / Onboarding Checklist */}
            <div style={{
              background: 'var(--glass-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🚀</span> Judge Onboarding Checklist
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Follow this quick flow to calibrate your credentials and complete assigned hackathon project evaluations:
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '8px' }}>
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {profile?.availability ? '✅ 1. Calibrate Profile' : '⏳ 1. Calibrate Profile'}
                  </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Confirm your expertise tracks and Morning/Afternoon blocks in <Link to="/evaluator/profile" style={{ color: 'var(--accent-color)', fontWeight: 'bold', textDecoration: 'none' }}>Profile Settings</Link>.
                  </span>
                </div>

                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {displaySchedule.length > 0 ? '✅ 2. Review Timetable' : '⏳ 2. Review Timetable'}
                  </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Check <strong>Sessions Timeline</strong> on the right to see your assigned presentation rooms and slot times.
                  </span>
                </div>

                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    ⏳ 3. Evaluate Projects
                  </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Go to the <strong>Queue</strong> below and click <strong>Evaluate</strong> to grade submissions via the AI rubrics tool.
                  </span>
                </div>
              </div>
            </div>
            {/* Top Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <article className="ref-mini-card">
                <span className="ref-icon">📋</span>
                <div>
                  <strong>{totalAssigned}</strong>
                  <p>Assigned Teams</p>
                  <small>Allocated workload</small>
                </div>
              </article>
              <article className="ref-mini-card">
                <span className="ref-icon">⏳</span>
                <div>
                  <strong>{pendingCount}</strong>
                  <p>Pending Reviews</p>
                  <small>Awaiting score cards</small>
                </div>
              </article>
              <article className="ref-mini-card">
                <span className="ref-icon">✅</span>
                <div>
                  <strong>{completedCount}</strong>
                  <p>Completed</p>
                  <small>Scores finalized</small>
                </div>
              </article>
            </div>

            {/* Main Telemetry & Layout Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: '20px', marginBottom: '24px' }}>
              
              {/* Left Column: Assigned Teams Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <section className="ref-card" style={{ padding: '20px', flex: 1 }}>
                  <div className="ref-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3>Assigned Evaluation Queue</h3>
                    <Link to="/evaluator/assignments" style={{ fontSize: '12px', color: 'var(--accent-color)', textDecoration: 'none' }}>View All</Link>
                  </div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          <th style={{ padding: '10px 8px' }}>Team Name</th>
                          <th style={{ padding: '10px 8px' }}>Challenge Track</th>
                          <th style={{ padding: '10px 8px' }}>Evaluation Status</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.slice(0, 5).map(ass => (
                          <tr key={ass.team_id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-primary)' }}>
                            <td style={{ padding: '12px 8px', fontWeight: '600' }}>{ass.team_name}</td>
                            <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{ass.challenge}</td>
                            <td style={{ padding: '12px 8px' }}>
                              <span className={`badge ${ass.scoring_status === 'completed' ? 'badge-green' : ass.scoring_status === 'rescore_requested' ? 'badge-red' : 'badge-purple'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                {ass.scoring_status === 'rescore_requested' ? 'rescore requested' : ass.scoring_status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              <Link 
                                to={`/evaluator/workspace/${ass.team_id}`}
                                className="ref-primary-button"
                                style={{ 
                                  padding: '4px 10px', 
                                  fontSize: '12px', 
                                  textDecoration: 'none', 
                                  display: 'inline-block',
                                  borderRadius: '4px',
                                  background: ass.scoring_status === 'rescore_requested' ? '#f87171' : undefined,
                                  color: ass.scoring_status === 'rescore_requested' ? '#101927' : undefined
                                }}
                              >
                                {ass.scoring_status === 'rescore_requested' ? 'Rescore' : ass.scoring_status === 'completed' ? 'Edit Score' : 'Evaluate'}
                              </Link>
                            </td>
                          </tr>
                        ))}
                        {assignments.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ padding: '8px' }}>
                              <MascotEmptyState message="No assignments allocated yet." size={80} />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {/* Right Column: Progress Ring & Schedule Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Progress Breakdown Card */}
                <section className="ref-card" style={{ padding: '20px' }}>
                  <div className="ref-section-title" style={{ marginBottom: '16px' }}>
                    <h3>Evaluation Progress</h3>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0' }}>
                    <div style={{
                      width: '150px',
                      height: '150px',
                      borderRadius: '50%',
                      background: totalAssigned 
                        ? `conic-gradient(
                            #10B981 0% ${completedPercent}%, 
                            #8B5CF6 ${completedPercent}% ${completedPercent + pendingPercent}%, 
                            #F59E0B ${completedPercent + pendingPercent}% ${completedPercent + pendingPercent + draftPercent}%,
                            var(--border-color) ${completedPercent + pendingPercent + draftPercent}% 100%
                          )`
                        : 'var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{
                        width: '114px',
                        height: '114px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {completedCount}/{totalAssigned}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', tracking: '0.05em' }}>
                          Done
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Legends */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                        <span style={{ color: 'var(--text-primary)' }}>Completed</span>
                      </div>
                      <strong style={{ color: 'var(--text-primary)' }}>{completedCount} ({Math.round(completedPercent)}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8B5CF6', display: 'inline-block' }}></span>
                        <span style={{ color: 'var(--text-primary)' }}>Pending Reviews</span>
                      </div>
                      <strong style={{ color: 'var(--text-primary)' }}>{actualPending} ({Math.round(pendingPercent)}%)</strong>
                    </div>
                    {draftCount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }}></span>
                          <span style={{ color: 'var(--text-primary)' }}>Drafts</span>
                        </div>
                        <strong style={{ color: 'var(--text-primary)' }}>{draftCount} ({Math.round(draftPercent)}%)</strong>
                      </div>
                    )}
                  </div>
                </section>

                {/* Upcoming Sessions Timeline */}
                <section className="ref-card" style={{ padding: '20px' }}>
                  <div className="ref-section-title" style={{ marginBottom: '16px' }}>
                    <h3>Your Sessions Timeline</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                    {displaySchedule.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                        {idx !== displaySchedule.length - 1 && (
                          <div style={{
                            position: 'absolute',
                            left: '15px',
                            top: '24px',
                            bottom: '-16px',
                            width: '2px',
                            backgroundColor: 'var(--border-color)'
                          }}></div>
                        )}
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-primary)',
                          border: '2px solid var(--accent-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: 'var(--accent-color)',
                          zIndex: 1
                        }}>
                          {item.sequence_order}
                        </div>
                        <div style={{ flex: 1, paddingBottom: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <h4 style={{ fontSize: '13.5px', margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>{item.team_name}</h4>
                            <span style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: 'bold' }}>{item.time_slot}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            🏢 {item.room}
                          </p>
                        </div>
                      </div>
                    ))}
                    {displaySchedule.length === 0 && (
                      <MascotEmptyState message="No upcoming sessions scheduled yet." size={72} />
                    )}
                  </div>
                </section>

              </div>
            </div>

            {/* Quick Actions Panel */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title" style={{ marginBottom: '16px' }}>
                <h3>Quick Action Shortcuts</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
                <Link to="/evaluator/assignments" className="ref-mini-card" style={{ textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: '16px' }}>
                  <span className="ref-icon" style={{ fontSize: '20px', marginBottom: '8px' }}>📂</span>
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>View Assignments</strong>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Manage assigned teams</p>
                  </div>
                </Link>
                {assignments.length > 0 && (
                  <Link 
                    to={`/evaluator/workspace/${assignments.find(a => a.scoring_status === 'pending')?.team_id || assignments[0]?.team_id}`}
                    className="ref-mini-card" 
                    style={{ textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: '16px' }}
                  >
                    <span className="ref-icon" style={{ fontSize: '20px', marginBottom: '8px' }}>📝</span>
                    <div>
                      <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>Next Evaluation</strong>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Open rubric workspace</p>
                    </div>
                  </Link>
                )}
                <Link to="/evaluator/history" className="ref-mini-card" style={{ textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: '16px' }}>
                  <span className="ref-icon" style={{ fontSize: '20px', marginBottom: '8px' }}>🕒</span>
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>Grading History</strong>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Review submitted scores</p>
                  </div>
                </Link>
                <Link to="/evaluator/feedback" className="ref-mini-card" style={{ textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: '16px' }}>
                  <span className="ref-icon" style={{ fontSize: '20px', marginBottom: '8px' }}>💬</span>
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>Provide Feedback</strong>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Send portal remarks</p>
                  </div>
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </EvaluatorLayout>
  )
}
