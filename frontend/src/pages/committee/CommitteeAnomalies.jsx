import React, { useState, useEffect, useRef } from 'react'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import DashboardCard from '../../components/dashboard/DashboardCard'
import { 
  getScoreAnomalies, 
  resolveScoreAnomaly, 
  requestRescoreFromEvaluators, 
  getAIDivergenceSummary 
} from '../../services/committee'

export default function CommitteeAnomalies() {
  // ðŸ¢ Core API Data States
  const [anomalies, setAnomalies] = useState([])
  const [teamsMap, setTeamsMap] = useState({}) // Key-value lookup database: { team_id: team_name }
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [apiError, setApiError] = useState(null)
  
  // ðŸ” Active Inspector Sidebar States
  const [selectedAnomaly, setSelectedAnomaly] = useState(null)
  const [aiReport, setAiReport] = useState('')
  const [loadingReport, setLoadingReport] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolutionAction, setResolutionAction] = useState('override_average')

  // ðŸ’¡ Ref to preserve selection memory without triggering effect re-runs
  const selectedAnomalyRef = useRef(selectedAnomaly)
  useEffect(() => {
    selectedAnomalyRef.current = selectedAnomaly
  }, [selectedAnomaly])

  // ðŸŽ¯ Dynamic ID Resolution Strategy
  const getActiveEventId = () => {
    return localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
  }

  // ðŸ”„ LocalStorage Property Alignment Guard
  useEffect(() => {
    if (!localStorage.getItem('event_id') && localStorage.getItem('current_event_id')) {
      localStorage.setItem('event_id', localStorage.getItem('current_event_id'));
    }
  }, []);

  // ðŸ“¡ Background Telemetry & Team Mapping Sync Worker Loop
// ðŸ“¡ Background Telemetry & Team Mapping Sync Worker Loop
// ðŸ“¡ Background Telemetry & Team Mapping Sync Worker Loop
  const fetchLiveAnomalies = async (isInitialMount = false) => {
    const activeEventId = getActiveEventId();
    
    if (!activeEventId || activeEventId === 'default_event') {
      setIsLoading(false);
      return;
    }

    try {
      // ðŸ”„ FIXED STRATEGY: Target the precise route from your finalized teams table
      let teamsLookup = { ...teamsMap };
      try {
        const response = await fetch(`/api/v1/events/${activeEventId}/finalized-teams`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const resJson = await response.json();
          // Extract array cleanly whether it returns directly or nested under an object property
          const teamsData = Array.isArray(resJson) ? resJson : (resJson.teams || resJson.data || []);
          
          // Map array into a quick lookup key-value map
          teamsLookup = teamsData.reduce((acc, team) => {
            if (team) {
              const lookupKey = team.team_id || team.id;
              if (lookupKey) {
                acc[lookupKey] = team.name; // Stores 'Team Alpha', 'Team Delta', etc.
              }
            }
            return acc;
          }, {});
          setTeamsMap(teamsLookup);
        }
      } catch (teamErr) {
        console.error("âš ï¸ Teams dictionary link failed to resolve:", teamErr);
      }

      // ðŸš¨ Fetch anomalies alert dataset stream
      const data = await getScoreAnomalies(activeEventId);
      const parsedData = Array.isArray(data) ? data : [];
      
      // Inject the names directly into our state array right at the intake level
      const enrichedData = parsedData.map(anomaly => {
        // 1. First choice: Clean lookup from our mapped teams dictionary
        let resolvedName = teamsLookup[anomaly.team_id] || anomaly.team_name;
        
        // 2. Second choice fallback: Parse the actual team name saved inside the reasoning statement!
        if ((!resolvedName || resolvedName === "Unknown Team" || resolvedName === "Team Delta") && anomaly.ai_reasoning) {
          // Looks for the pattern "Divergence detected for [Team Name]:"
          const parsedMatch = anomaly.ai_reasoning.match(/Divergence detected for (.*?):/);
          if (parsedMatch && parsedMatch[1]) {
            resolvedName = parsedMatch[1].trim();
          }
        }

        return {
          ...anomaly,
          team_name: resolvedName || `Team ID: ${String(anomaly.team_id).slice(0, 6)}`
        };
      });

      setAnomalies(enrichedData);
      
      const currentSelected = selectedAnomalyRef.current;
      
      // Keep the active panel inspector item structurally synched with live updates
      if (enrichedData.length > 0 && !currentSelected) {
        setSelectedAnomaly(enrichedData[0]);
      } else if (currentSelected) {
        const updatedMatch = enrichedData.find(item => item.id === currentSelected.id);
        if (updatedMatch) {
          setSelectedAnomaly(updatedMatch);
        } else {
          setSelectedAnomaly(enrichedData.length > 0 ? enrichedData[0] : null);
        }
      }
      setApiError(null);
    } catch (err) {
      console.error("Failed fetching live engine variance anomalies:", err);
      setApiError(err.message || "Failed to parse anomalies stream.");
    } finally {
      if (isInitialMount) setIsLoading(false);
    }
  };
  // ðŸ› ï¸ Isolated Polling Worker loop with proper component unmount cleanup
  useEffect(() => {
    fetchLiveAnomalies(true);
    
    const interval = setInterval(() => {
      fetchLiveAnomalies(false);
    }, 4000); // Polling safely every 4 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // AI Divergence Audit Report fetching removed per user request 

  // âš–ï¸ Consensus Actions Labels
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

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAnomaly) return;
    setProcessingId(selectedAnomaly.id);
    const activeEventId = getActiveEventId();
    try {
      await resolveScoreAnomaly(activeEventId, selectedAnomaly.id, resolutionAction, resolutionNote || 'Resolved via Admin Override.');
      
      // Optimistic Local State Update to prevent UI flashes
      const updatedAnomaly = {
        ...selectedAnomaly,
        resolution_status: 'resolved',
        resolution_action: resolutionAction,
        committee_note: resolutionNote || 'Resolved via Admin Override.'
      };
      setSelectedAnomaly(updatedAnomaly);
      setAnomalies(prev => prev.map(a => a.id === selectedAnomaly.id ? updatedAnomaly : a));
      
      setResolutionNote('');
      await fetchLiveAnomalies(false);
      window.dispatchEvent(new CustomEvent('HackSmart-anomalies-updated'));
    } catch (err) {
      alert(`Error processing resolution sequence: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleForceRescore = async () => {
    if (!selectedAnomaly) return;
    if (!confirm('Escalate anomaly flag to judge notification queues for score alignment correction?')) return;
    
    setProcessingId(selectedAnomaly.id);
    const activeEventId = getActiveEventId();
    try {
      await requestRescoreFromEvaluators(activeEventId, selectedAnomaly.id);
      
      // Optimistic Local State Update
      const updatedAnomaly = {
        ...selectedAnomaly,
        resolution_status: 'escalated',
        resolution_action: 'request_rescore',
        committee_note: 'Escalated to judge notification queues for score alignment correction.'
      };
      setSelectedAnomaly(updatedAnomaly);
      setAnomalies(prev => prev.map(a => a.id === selectedAnomaly.id ? updatedAnomaly : a));
      
      await fetchLiveAnomalies(false);
      window.dispatchEvent(new CustomEvent('HackSmart-anomalies-updated'));
    } catch (err) {
      alert(`Escalation aborted: ${err.message}`);
    } finally {
      setProcessingId(null);
      setResolutionAction('override_average'); // Soft-reset action tab context
    }
  };

  const severityTone = (sev) => {
    if (sev === 'high') return 'danger';
    if (sev === 'medium') return 'warning';
    return 'info';
  };

  // Status badge style coordinator 
  const statusTone = (status) => {
    if (status === 'resolved') return 'success';
    if (status === 'escalated') return 'warning';
    if (status === 'unresolved' || status === 'pending') return 'danger';
    return 'default';
  };

  // ðŸ›¡ï¸ Data Filters & Counters
  const safeAnomalies = Array.isArray(anomalies) ? anomalies : [];
  const unresolvedCount = safeAnomalies.filter(
    a => a && (a.resolution_status === 'unresolved' || a.resolution_status === 'pending')
  ).length;

  return (
    <CommitteeLayout statusItems={[{ label: 'System Policy', value: 'Active Monitoring' }]} pageTitle="Score Anomaly & Governance Center" pageSubtitle="Monitor statistical divergence, resolve evaluator bias, and track semantic discrepancies where deviation metrics exceed Ïƒ > 2.0.">
      <div className="committee-reference-dashboard">

        {/* ðŸ“Š TELEMETRY COUNTER HERO GRIDS */}
        <section style={{ marginBottom: '16px' }}>
          <DashboardCard 
            label="Flagged Teams" 
            value={isLoading ? "..." : unresolvedCount.toString()} 
            detail="Require immediate committee review" 
            tone={unresolvedCount > 0 ? "danger" : "default"} 
          />
        </section>

        {/* ðŸ›¡ï¸ LOCAL SYSTEM SAFETY Display */}
        {apiError && (
          <div className="status-pill danger" style={{ padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', display: 'block' }}>
            âš ï¸ API Sync Warning: {apiError}. Check active metrics engine state.
          </div>
        )}

        {/* ðŸ”„ COMPONENT LOADING SPINNER STATE */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
              animation: 'shimmer 1.4s infinite'
            }}></div>
          </div>
        ) : safeAnomalies.length === 0 ? (
          <div className="committee-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', borderStyle: 'dashed' }}>
            ðŸŽ‰ No score anomalies or statistical discrepancies detected in this phase.
          </div>
        ) : (
          /* ðŸ§© CORE WORKSPACE GRID SYSTEM */
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 1.5fr)', 
            gap: '12px', 
            alignItems: 'start',
            minHeight: '500px'
          }}>
            
            {/* ðŸ“‹ LEFT COLUMN: LIVE DETECTED DISCREPANCIES LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Detected Discrepancies ({safeAnomalies.length})
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', paddingRight: '4px' }}>
                {safeAnomalies.map((an) => {
                  if (!an) return null;
                  const scoreValue = typeof an.divergence_score === 'number' ? an.divergence_score : parseFloat(an.divergence_score) || 0;
                  const isSelected = selectedAnomaly?.id === an.id;
                  const currentStatus = an.resolution_status || 'unresolved';
                  
                  return (
                    <div 
                      key={an.id} 
                      onClick={() => {
                        setSelectedAnomaly(an);
                        if (currentStatus === 'pending' || currentStatus === 'unresolved') {
                          setResolutionAction('override_average');
                        }
                      }}
                      className="committee-card"
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                        background: isSelected ? 'var(--accent-bg)' : 'var(--bg-card)',
                        transition: 'all 200ms ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                          {an.team_name}
                        </strong>
                        <span className={`status-pill ${severityTone(an.severity)}`}>
                          {scoreValue.toFixed(2)} Ïƒ {an.severity?.toUpperCase() || 'LOW'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', alignItems: 'center', gap: '12px' }}>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                          {an.ai_reasoning || "Analyzing metric variations..."}
                        </span>
                        <span className={`status-pill ${statusTone(currentStatus)}`} style={{ textTransform: 'capitalize' }}>
                          {currentStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ðŸ” RIGHT COLUMN: INSPECTOR SIDEBAR */}
            {selectedAnomaly && (
              <div className="committee-card" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                position: 'sticky',
                top: '10px',
                maxHeight: 'calc(100vh - 180px)',
                overflowY: 'auto',
                padding: '20px',
              }}>
                
                {/* SECTION 1: REPORT DETAILS */}
                <section>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      Reviewing Flag: {selectedAnomaly.team_name}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                    <div>
                      <small className="committee-label">AI Discrepancy Observation</small>
                      <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.4', fontSize: '13px' }}>
                        {selectedAnomaly.ai_reasoning || "No baseline evaluation tracking parameters provided."}
                      </p>
                    </div>
                  </div>
                </section>

                {/* SECTION 2: DISPATCH RESOLUTION FORM */}
                <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Resolve Discrepancy
                  </h3>
                  
                  {selectedAnomaly.resolution_status !== 'resolved' && selectedAnomaly.resolution_status !== 'escalated' ? (
                    <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label className="committee-label">Resolution Action</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {[
                            { id: 'override_average', label: 'Use Average' },
                            { id: 'accept_divergence', label: 'Accept Bias' },
                            { id: 'request_rescore', label: 'Rescore' }
                          ].map(action => {
                            const isCurrent = resolutionAction === action.id;
                            return (
                              <button
                                key={action.id}
                                type="button"
                                onClick={() => {
                                  if (action.id === 'request_rescore') {
                                    handleForceRescore();
                                  } else {
                                    setResolutionAction(action.id);
                                  }
                                }}
                                className={`committee-btn ${isCurrent ? 'committee-btn-primary' : 'committee-btn-outline'}`}
                                style={{
                                  padding: '8px 4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                }}
                                disabled={processingId !== null}
                              >
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {resolutionAction !== 'request_rescore' && (
                        <>
                          <div>
                            <label className="committee-label">Resolution/Committee Notes</label>
                            <textarea
                              className="committee-textarea"
                              value={resolutionNote}
                              onChange={e => setResolutionNote(e.target.value)}
                              rows="3"
                              placeholder="Provide justification note (optional)..."
                              disabled={processingId !== null}
                            ></textarea>
                          </div>
                          
                          <button
                            type="submit"
                            className="committee-btn committee-btn-primary"
                            disabled={processingId !== null}
                            style={{
                              width: '100%',
                              padding: '10px',
                              fontSize: '13px',
                            }}
                          >
                            {processingId === selectedAnomaly.id ? 'Applying Consensus...' : 'Apply Resolution'}
                          </button>
                        </>
                      )}
                    </form>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className={`status-pill ${statusTone(selectedAnomaly.resolution_status)}`} style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        textAlign: 'center', 
                        display: 'block',
                        width: '100%'
                      }}>
                        ðŸŽ¯ Policy Locked. Action Variant: {selectedAnomaly.resolution_status.toUpperCase()}
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
                            color: 'var(--text-muted)', 
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
                            âš™ï¸ {getResolutionActionLabel(selectedAnomaly.resolution_action)}
                          </span>
                        </div>
                        
                        {selectedAnomaly.committee_note && (
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                            <span style={{ 
                              display: 'block', 
                              fontSize: '10px', 
                              textTransform: 'uppercase', 
                              fontWeight: '700', 
                              color: 'var(--text-muted)', 
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
                            color: 'var(--text-muted)' 
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
