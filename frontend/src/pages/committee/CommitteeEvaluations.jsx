import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardCard from '../../components/dashboard/DashboardCard'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import { getFinalizedTeams } from '../../services/committee'

function EvaluationTeamCard({ team }) {
  const navigate = useNavigate()

  const hasAnomaly = useMemo(() => {
    if (team?.has_active_anomaly === true || team?.has_active_anomaly === 'true' || team?.has_active_anomaly === 1) {
      return !team?.anomalyResolved;
    }
    return (team?.status === 'Anomaly' || team?.status === 'flagged') && !team?.anomalyResolved;
  }, [team?.has_active_anomaly, team?.status, team?.anomalyResolved])
  
  const anomalyInfo = useMemo(() => {
    let details = team?.anomaly_details || team?.anomaly
    if (typeof details === 'string' && details.trim() !== '' && details !== 'NULL') {
      try {
        details = JSON.parse(details)
      } catch (e) {
      
      }
    }
    return typeof details === 'object' && details !== null ? details : null;
  }, [team?.anomaly_details, team?.anomaly])

  const scoreSheets = useMemo(() => {
    let raw = team?.scores_snapshot || team?.scores
    if (!raw || raw === 'NULL' || raw === 'None') return []
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw)
      } catch (err) {
        return []
      }
    }
    return Array.isArray(raw) ? raw : []
  }, [team?.scores_snapshot, team?.scores])

  const metrics = useMemo(() => {
    return {
      innovation: Number(team?.panel_average_innovation) || 0,
      code: Number(team?.panel_average_code) || 0,
      presentation: Number(team?.panel_average_presentation) || 0,
      impact: Number(team?.panel_average_impact) || 0,
      total: Number(team?.final_calculated_total) || 0
    }
  }, [team])

  return (
    <article className="committee-card committee-light-panel" style={{ 
      marginBottom: '16px', 
      border: hasAnomaly ? '2px solid var(--status-danger)' : '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '20px',
      background: hasAnomaly ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)'
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {team?.name || 'Unnamed Entry Team'}
          </h3>
          <span className="status-pill" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border-color)' }}>
            {team?.challenge || 'General Track'}
          </span>
        </div>
        <span style={{
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          background: hasAnomaly ? 'rgba(239, 68, 68, 0.2)' : 'rgba(22, 163, 74, 0.2)',
          color: hasAnomaly ? 'var(--status-danger)' : 'var(--status-success)',
          border: `1px solid ${hasAnomaly ? 'rgba(239, 68, 68, 0.5)' : 'rgba(22, 163, 74, 0.5)'}`
        }}>
          {hasAnomaly ? '⚠️ Review Required' : '✓ Finalized'}
        </span>
      </header>
      
      <div className="committee-table-wrap" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <table className="committee-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Source</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Innovation</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Code Quality</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Presentation</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Impact</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {scoreSheets.map((score, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <td style={{ padding: '10px 12px', fontWeight: '500', color: 'var(--text-primary)' }}>{score?.judge_name || `Reviewer ${idx + 1}`}</td>
                <td style={{ padding: '10px 12px' }}>{Number(score?.innovation || 0).toFixed(1)}</td>
                <td style={{ padding: '10px 12px' }}>{Number(score?.code_quality || score?.code || 0).toFixed(1)}</td>
                <td style={{ padding: '10px 12px' }}>{Number(score?.presentation || 0).toFixed(1)}</td>
                <td style={{ padding: '10px 12px' }}>{Number(score?.impact || 0).toFixed(1)}</td>
                <td style={{ padding: '10px 12px', fontWeight: '600', textAlign: 'right', color: 'var(--text-primary)' }}>{Number(score?.total || 0).toFixed(1)}</td>
              </tr>
            ))}

            <tr style={{ background: 'var(--bg-secondary)', fontWeight: '600', borderTop: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <td style={{ padding: '12px', color: 'var(--accent-color)' }}>Consensus Average</td>
              <td style={{ padding: '12px' }}>{metrics.innovation.toFixed(1)}</td>
              <td style={{ padding: '12px' }}>{metrics.code.toFixed(1)}</td>
              <td style={{ padding: '12px' }}>{metrics.presentation.toFixed(1)}</td>
              <td style={{ padding: '12px' }}>{metrics.impact.toFixed(1)}</td>
              <td style={{ padding: '12px', color: 'var(--accent-color)', textAlign: 'right', fontSize: '14px', fontWeight: '700' }}>{metrics.total.toFixed(1)}</td>
            </tr>

            {hasAnomaly && anomalyInfo && (
              <tr style={{ background: 'rgba(245, 158, 11, 0.12)', borderTop: '1px dashed var(--status-warning)', color: 'var(--text-secondary)' }}>
                <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--status-warning)' }}>⚠️ Deviation: {anomalyInfo.judge_name || 'Flagged Judge'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{anomalyInfo.dimension === 'innovation' ? `${Number(anomalyInfo.score).toFixed(1)}` : '-'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{(anomalyInfo.dimension === 'code_quality' || anomalyInfo.dimension === 'code') ? `${Number(anomalyInfo.score).toFixed(1)}` : '-'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{anomalyInfo.dimension === 'presentation' ? `${Number(anomalyInfo.score).toFixed(1)}` : '-'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{anomalyInfo.dimension === 'impact' ? `${Number(anomalyInfo.score).toFixed(1)}` : '-'}</td>
                <td style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'right', color: 'var(--status-warning)' }}>Delta: +{Number(anomalyInfo.delta || 0).toFixed(1)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasAnomaly && (
        <section style={{ display: 'block', padding: '16px', borderRadius: '8px', marginTop: '14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--status-warning)', color: 'var(--status-primary)' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--status-warning)', fontWeight: '600' }}>Divergent Score Variance Detected</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
            A score submission sits outside typical panel distributions for this team. Please navigate to the specialized Log interface to view exact score indicators and resolve it.
          </p>
          <button 
            onClick={() => navigate('/committee/anomalies')}
            style={{ padding: '8px 16px', fontSize: '12px', background: 'var(--status-danger-bg)', color: 'var(--text-on-accent)', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
            ⚠️ Go to Anomalies Log to Resolve
          </button>
        </section>
      )}

      {(team?.is_corrected || team?.anomalyResolved) && (
        <section style={{ display: 'block', padding: '12px', borderRadius: '8px', marginTop: '14px', fontSize: '13px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success)', color: 'var(--status-success)' }}>
          <strong>✓ Resolved Actions:</strong> Anomaly correction has been securely deployed to ledger indexes.
        </section>
      )}
    </article>
  )
}

export function CommitteeEvaluations() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmingPublish, setConfirmingPublish] = useState(false)

  const activeEventId = localStorage.getItem('current_event_id') || 'fe5b50c9-4181-4c35-905f-e46c58ba9a48'

  useEffect(() => {
    let isMounted = true
    async function loadProductionSnapshot() {
      try {
        setLoading(true)
        const activeTeamsData = await getFinalizedTeams(activeEventId)
        if (isMounted) {
          const validTeams = Array.isArray(activeTeamsData) 
            ? activeTeamsData 
            : (activeTeamsData?.data || activeTeamsData?.teams || [])
          setTeams(validTeams)
        }
      } catch (err) {
        
        if (isMounted) setTeams([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadProductionSnapshot()
    return () => { isMounted = false }
  }, [activeEventId])

  // 📊 DYNAMIC JUDGE ENGINE: Counts actual appearances perfectly
  const calculatedJudgeRegistry = useMemo(() => {
    const safeTeams = Array.isArray(teams) ? teams : [];
    const judgeMap = {};

    safeTeams.forEach(team => {
      let rawScores = team?.scores_snapshot || team?.scores;
      if (typeof rawScores === 'string') {
        try {
          rawScores = JSON.parse(rawScores);
        } catch (e) {
          rawScores = [];
        }
      }

      if (Array.isArray(rawScores)) {
        rawScores.forEach(score => {
          const judgeName = score?.judge_name;
          if (judgeName && judgeName.trim() !== '') {
            const hasSubmitted = Number(score?.total) > 0;
            if (!judgeMap[judgeName]) {
              judgeMap[judgeName] = {
                name: judgeName,
                assigned: 1,
                submitted: hasSubmitted ? 1 : 0,
                lastActivity: 'Live'
              };
            } else {
              judgeMap[judgeName].assigned += 1;
              if (hasSubmitted) {
                judgeMap[judgeName].submitted += 1;
              }
            }
          }
        });
      }
    });

    const registryArray = Object.values(judgeMap);
    
    if (registryArray.length === 0) {
      return [
        { name: 'Syncing live judges from score sheets...', assigned: 0, submitted: 0, lastActivity: 'Live', status: 'Active' }
      ];
    }

    return registryArray.map(judge => ({
      ...judge,
      status: judge.submitted >= judge.assigned ? 'Completed' : 'Pending'
    }));
  }, [teams]);

  const metricsCounters = useMemo(() => {
    const safeTeams = Array.isArray(teams) ? teams : []
    const unresolved = safeTeams.filter((t) => {
      if (!t) return false;
      if (t?.has_active_anomaly === true || t?.has_active_anomaly === 'true' || t?.has_active_anomaly === 1) {
        return !t?.anomalyResolved;
      }
      return (t?.status === 'Anomaly' || t?.status === 'flagged') && !t?.anomalyResolved;
    }).length;

    return { unresolved, completeTeams: safeTeams.length, clearToPublish: unresolved === 0 && safeTeams.length > 0 }
  }, [teams])

  const submittedTotal = useMemo(() => {
    return calculatedJudgeRegistry.reduce((sum, j) => {
      return j.name.includes('Syncing') ? sum : sum + j.submitted;
    }, 0);
  }, [calculatedJudgeRegistry]);

  const safeTeamsList = Array.isArray(teams) ? teams : [];

  return (
    <CommitteeLayout pageTitle="Evaluation & Scoring" pageSubtitle="Review finalized teams, monitor scoring progress, and resolve anomalies before publishing results.">
      <div className="committee-reference-dashboard committee-evaluations-page" style={{ padding: '4px', background: 'var(--bg-secondary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => navigate('/committee/smart-matchmaker')}
            style={{ padding: '10px 18px', fontSize: '13px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
            ⚙️ Control Center
          </button>

          <button
            onClick={() => navigate('/committee/anomalies')}
            style={{ padding: '10px 18px', fontSize: '13px', background: 'var(--status-warning-bg)', color: 'var(--status-warning)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
            ⚠️ Anomalies Logs
          </button>
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <DashboardCard label="Reviewed Teams" value={`${metricsCounters.completeTeams}`} detail="Active target coverage" />
          <DashboardCard label="Total Scores Recorded" value={submittedTotal} detail="Aggregated panels" />
          <DashboardCard label="Unresolved Alerts" value={metricsCounters.unresolved} tone={metricsCounters.unresolved > 0 ? 'danger' : 'default'} />
          <DashboardCard label="Gate Status" value={metricsCounters.clearToPublish ? 'Ready' : 'Locked'} tone={metricsCounters.clearToPublish ? 'default' : 'warn'} />
        </section>

        {/* 🏢 Panel Tracking Registry Table Wrap Container */}
        <section className="committee-card" style={{ marginBottom: '24px', background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Panel Tracking Registry</h3>
          
          {/* Max height restricts display to exactly 5 rows, activating overflow scrollbar */}
          <div className="committee-table-wrap" style={{ 
            borderRadius: '8px', 
            maxHeight: '242px', 
            overflowY: 'auto', 
            border: '1px solid var(--border-color)', 
            background: 'var(--bg-secondary)' 
          }}>
            <table className="committee-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card)' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-secondary)' }}>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)' }}>Judge Assignment</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)' }}>Assigned Tasks</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)' }}>Committed</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)' }}>Latest Update</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)' }}>State</th>
                </tr>
              </thead>
              <tbody>
                {calculatedJudgeRegistry.map((judge, idx) => (
                  <tr key={judge.name || idx} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: '500', color: 'var(--text-primary)' }}>{judge.name}</td>
                    <td style={{ padding: '10px 14px' }}>{judge.assigned} evaluation{judge.assigned > 1 ? 's' : ''}</td>
                    <td style={{ padding: '10px 14px' }}>{judge.submitted}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{judge.lastActivity}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: judge.status === 'Completed' ? 'rgba(22, 163, 74, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: judge.status === 'Completed' ? 'var(--status-success)' : 'var(--status-warning)'
                      }}>
                        {judge.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>Querying finalized data indices...</div>
          ) : safeTeamsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
              No evaluations found in the production stack.
            </div>
          ) : (
            safeTeamsList.map((team) => (
              <EvaluationTeamCard key={team.id || team.team_id} team={team} />
            ))
          )}
        </section>

        <section className="glass-drawer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderRadius: '12px', marginTop: '24px', background: 'rgba(22, 163, 74, 0.15)', border: '1px solid var(--status-success)' }}>
          <span style={{ fontSize: '14px', color: 'var(--status-success)', fontWeight: '600' }}>
            {metricsCounters.clearToPublish ? '✓ Ledger metrics clear to deploy.' : '🔒 Resolve standing anomalies to clear deployment pathways.'}
          </span>
          <button 
            disabled={!metricsCounters.clearToPublish} 
            onClick={() => setConfirmingPublish(true)}
            style={{ 
              padding: '12px 24px', 
              fontSize: '14px',
              borderRadius: '8px',
              fontWeight: '600',
              border: 'none',
              cursor: metricsCounters.clearToPublish ? 'pointer' : 'not-allowed',
              background: metricsCounters.clearToPublish ? 'var(--status-success)' : 'var(--bg-secondary)',
              color: metricsCounters.clearToPublish ? 'var(--text-on-accent)' : 'var(--text-secondary)',
              boxShadow: metricsCounters.clearToPublish ? '0 4px 6px rgba(22, 163, 74, 0.15)' : 'none'
            }}
          >
            Publish Results Set
          </button>
        </section>
      </div>

      {confirmingPublish && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <section className="committee-card" style={{ maxWidth: '440px', width: '100%', margin: '20px', padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Confirm Permanent Data Lock</h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>This will snapshot all scores and publish results live to student boards. You cannot undo this modification sequence.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="committee-btn committee-btn-outline" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setConfirmingPublish(false)}>Abort</button>
              <button className="committee-btn committee-btn-primary" style={{ background: 'var(--accent-color)', color: 'var(--text-on-accent)', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setConfirmingPublish(false)}>Commit Lock</button>
            </div>
          </section>
        </div>
      )}
    </CommitteeLayout>
  )
}

export default CommitteeEvaluations;