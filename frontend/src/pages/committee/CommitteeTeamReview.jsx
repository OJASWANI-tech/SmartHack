import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import * as CommitteeServices from '../../services/committee'

// ðŸ”„ Translation Dictionary to enforce PostgreSQL CHECK constraints
const UI_TO_DB_STATUS = {
  pending: 'proposed',
  approved: 'approved',
  rejected: 'eliminated'
};

// ðŸŽ¬ Automated Runtime Animation Injector
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = `
    @keyframes cardEntrance {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes skeletonLoading {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes actionPulse {
      0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(56, 189, 248, 0); }
      100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
    }
    .animate-grid-card {
      animation: cardEntrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .rationale-skeleton span {
      display: block;
      height: 10px;
      margin-bottom: 6px;
      border-radius: 4px;
      background: linear-gradient(90deg, var(--bg-card) 25%, var(--border-color) 50%, var(--bg-card) 75%);
      background-size: 200% 100%;
      animation: skeletonLoading 1.5s infinite linear;
    }
    .rationale-skeleton span:nth-child(1) { width: 90%; }
    .rationale-skeleton span:nth-child(2) { width: 75%; }
    .rationale-skeleton span:nth-child(3) { width: 40%; margin-bottom: 0; }
  `;
  document.head.appendChild(styleTag);
}

function TeamReviewCard({ team, onStatus, onRegenerate, loading, stageFinalized }) {
  const displayStatus = team.status 
    ? team.status.charAt(0).toUpperCase() + team.status.slice(1).toLowerCase() 
    : 'Pending';

  const statusTone = (status) => {
    const s = status.toLowerCase();
    if (s === 'approved') return 'success';
    if (s === 'rejected' || s === 'eliminated') return 'danger';
    return 'warning';
  }

  return (
    <article className="committee-card animate-grid-card" style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{team.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`status-pill ${statusTone(team.status)}`} style={{ transition: 'all 0.2s ease' }}>
            {displayStatus}
          </span>
          <details className="overflow-menu" disabled={stageFinalized}>
            <summary style={{ pointerEvents: stageFinalized ? 'none' : 'auto', opacity: stageFinalized ? 0.3 : 1, listStyle: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--text-secondary)' }}>â‹®</summary>
            <div className="committee-card" style={{ position: 'absolute', right: 0, padding: '4px', zIndex: 10 }}>
              <button type="button" className="committee-btn committee-btn-outline" style={{ display: 'block', width: '100%', padding: '6px 12px', textAlign: 'left', border: 'none', fontSize: '12px' }}>Rename Team</button>
              <button type="button" className="committee-btn committee-btn-outline" style={{ display: 'block', width: '100%', padding: '6px 12px', textAlign: 'left', border: 'none', fontSize: '12px' }}>Manually Edit</button>
            </div>
          </details>
        </div>
      </header>

      <div className="review-member-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
        {team.members && team.members.map((member, index) => (
          <span className="status-pill" key={`${member.name}-${index}`} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            <i className={`level-dot ${String(member.level).toLowerCase()}`} style={{ width: '6px', height: '6px', borderRadius: '50%', marginRight: '6px', background: member.level === 'Advanced' ? 'var(--status-success)' : member.level === 'Beginner' ? 'var(--status-info)' : 'var(--status-warning)' }} />
            {member.name}
            <small style={{ color: 'var(--text-secondary)', marginLeft: '2px' }}>({member.institution})</small>
            {member.flagged && <b title="Flagged during intake" style={{ color: 'var(--status-danger)', marginLeft: '2px' }}>!</b>}
          </span>
        ))}
      </div>

      <section className="ai-rationale" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '8px 10px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', color: 'var(--status-purple)', fontWeight: 500 }}>
          <span style={{ fontSize: '11px' }}>âœ¦ AI RATIONALE</span>
          <button 
            type="button" 
            disabled={loading || stageFinalized}
            onClick={() => onRegenerate(team.id)}
            style={{ 
              border: 'none', 
              background: 'none', 
              cursor: loading || stageFinalized ? 'not-allowed' : 'pointer', 
              padding: 0, 
              fontSize: '12px', 
              color: 'inherit',
              transition: 'transform 0.25s ease'
            }}
            onMouseEnter={(e) => !loading && !stageFinalized && (e.currentTarget.style.transform = 'rotate(45deg)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(0deg)')}
          >
            {loading ? 'â³' : 'â†»'}
          </button>
        </div>
        {team.stale && !stageFinalized && <p style={{ color: 'var(--status-warning)', margin: '0 0 2px 0', fontSize: '10px' }}>Rationale outdated â€” regenerate</p>}
        {loading ? (
          <div className="rationale-skeleton"><span /><span /><span /></div>
        ) : (
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{team.rationale || 'No rationale available. Click reload to generate reasoning.'}</p>
        )}
      </section>

      <footer style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
        {team.status === 'approved' ? (
          <button className="committee-btn committee-btn-outline" type="button" disabled={stageFinalized} onClick={() => onStatus(team.id, 'pending')} style={{ flex: 1, padding: '5px 0', fontSize: '11px', transition: 'all 0.15s ease' }}>Revoke Approval</button>
        ) : (
          <button className="committee-btn committee-btn-success" type="button" disabled={stageFinalized} onClick={() => onStatus(team.id, 'approved')} style={{ flex: 1, padding: '5px 0', fontSize: '11px', transition: 'all 0.15s ease' }}>Approve</button>
        )}
        <button 
          className="committee-btn committee-btn-danger" 
          type="button" 
          disabled={stageFinalized} 
          onClick={() => onStatus(team.id, team.status === 'rejected' ? 'pending' : 'rejected')}
          style={{ padding: '5px 10px', fontSize: '11px', background: 'none', transition: 'all 0.15s ease' }}
        >
          {team.status === 'rejected' ? 'Undo Reject' : 'Reject'}
        </button>
      </footer>
    </article>
  )
}

function CommitteeTeamReview() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState('')
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isStageFinalized, setIsStageFinalized] = useState(false)
  const [loadingRationale, setLoadingRationale] = useState(null)
  
  const [isDispatchingInvites, setIsDispatchingInvites] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const currentEventId = localStorage.getItem('current_event_id') || 'default_event'
    async function fetchFromPostgres() {
      try {
        setIsLoadingPage(true)
        const rawData = await CommitteeServices.getTeams(currentEventId);
        
        if (rawData && rawData.gate_status === 'complete') {
          setIsStageFinalized(true);
        }
        
        const teamsList = Array.isArray(rawData) ? rawData : (rawData.teams || []);
        if (teamsList && Array.isArray(teamsList)) {
          const parsedTeams = teamsList.map((dbTeam) => {
            const rawMembersList = dbTeam.members || dbTeam.participants || dbTeam.members_snapshot || [];
            
            let uiStatus = 'pending';
            const dbStatus = (dbTeam.approval_status || dbTeam.status || '').toLowerCase();
            
            if (dbStatus === 'approved') uiStatus = 'approved';
            if (dbStatus === 'eliminated') uiStatus = 'rejected';
            if (dbStatus === 'proposed') uiStatus = 'pending';

            return {
              id: dbTeam.id || dbTeam.team_id,
              name: dbTeam.name || `Team ${String(dbTeam.id).slice(0, 4)}`,
              status: uiStatus,
              stale: dbTeam.stale || false,
              rationale: dbTeam.llm_rationale || dbTeam.rationale || '',
              rawParticipantsSnapshot: rawMembersList, 
              members: rawMembersList.map((m) => ({
                id: m.id || m.participant_id,
                name: m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Assigned Participant',
                level: m.experience_level || m.level || 'Intermediate',
                institution: m.institution || m.college || m.institution_id || 'Not Specified',
                email: m.email || '',
                flagged: m.flagged || false
              }))
            }
          })
          setTeams(parsedTeams)
        }
      } catch (err) {
        

        setToast(`Database Error: ${err.message}`)
      } finally {
        setIsLoadingPage(false)
      }
    }
    fetchFromPostgres()
  }, [])

  const counts = useMemo(() => ({
    total: teams.length,
    approved: teams.filter((team) => team.status === 'approved').length,
    pending: teams.filter((team) => team.status === 'pending').length,
    rejected: teams.filter((team) => team.status === 'rejected').length,
  }), [teams])

  const visibleTeams = teams.filter((team) => {
    const matchesQuery = [team.name, ...team.members.map((m) => m.name)].join(' ').toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'all' || team.status === filter
    return matchesQuery && matchesFilter
  })

  // ðŸš€ SMART HYBRID DISPATCHER: Real emails for Team #1, Console logs for the rest!
  async function dispatchTeamInvites() {
    const adminToken = localStorage.getItem('HackSmart_token');

    if (!adminToken) {
     
      setToast("ðŸ›‘ Error: Admin access token not found. Please re-login.");
      return;
    }

    setIsDispatchingInvites(true);
    setToast("Sending test emails to your personal inbox...");
    
    const currentEventId = localStorage.getItem('event_id') || 'bd0266b2-8535-4546-bb0b-49b8c437e9df';
    const targetApprovedTeams = teams.filter(t => t.status === 'approved');
    
    let successCount = 0;
    let fallbackCount = 0;

    for (let teamIndex = 0; teamIndex < targetApprovedTeams.length; teamIndex++) {
      const team = targetApprovedTeams[teamIndex];
      
      // TEAM 1 (Index 0) gets routed to YOUR personal email for testing!
      const isLuckyTestTeam = (teamIndex === 0 || 1 || 2 ); 

      for (const member of team.members) {
        const baselineEmail = member.email || `${member.name.toLowerCase().replace(/\s+/g, '')}@example.com`;
        const participantId = member.id || "9951abe9-136f-46f0-9c91-858c851e9566";

        if (isLuckyTestTeam) {
          // --- MODE A: LIVE EMAIL ROUTED TO YOU ---
          try {
            const response = await fetch('http://127.0.0.1:8000/tokens/participant', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + adminToken.trim()
              },
              body: JSON.stringify({
                // ðŸŽ¯ FORCE SEND TO YOU so you can actually click and test the links!
                participant_email: "shubhtech1056@gmail.com", 
                team_id: team.id,
                participant_id: participantId,
                event_id: currentEventId
              })
            });

            if (response.ok) {
              successCount++;
             
            } else {
             
            }
          } catch (e) {
      
          }
        } else {
          // --- MODE B: CONSOLE PRINT FALLBACK FOR THE REST OF THE TEAMS ---
          const simulatedPayload = btoa(JSON.stringify({
            sub: baselineEmail,
            participant_id: participantId,
            team_id: team.id,
            event_id: currentEventId,
            role: "participant",
            type: "link"
          })).replace(/=/g, ''); 

          const generatedMagicLink = `http://localhost:3000/participant?token=MOCK_ENV_${simulatedPayload}`;
         
          
          fallbackCount++;
        }
      }
    }

    setIsDispatchingInvites(false);
    setToast(`âš¡ Finished! Sent ${successCount} test emails to shubhtech1056@gmail.com & generated ${fallbackCount} console links.`);
  }

  async function setAll(status) {
    const normalizedStatus = status.toLowerCase();
    if (isStageFinalized) return;

    try {
      const currentEventId = localStorage.getItem('current_event_id') || 'default_event';
      if (normalizedStatus === 'approved') {
        await CommitteeServices.approveAllTeams(currentEventId);
        setTeams((items) => items.map((team) => ({ ...team, status: 'approved' })));
        setToast("All structural variants successfully moved to approved states.");
      } else if (normalizedStatus === 'rejected') {
        await Promise.all(teams.map((t) => CommitteeServices.rejectSingleTeam(currentEventId, t.id)));
        setTeams((items) => items.map((team) => ({ ...team, status: 'rejected' })));
        setToast("All teams moved to rejected status.");
      }
    } catch (e) {
    
      setToast(`Bulk update tracking failed: ${e.message}`);
    }
  }

  async function setStatus(id, status) {
    const normalizedStatus = status.toLowerCase();
    if (isStageFinalized) return;

    try {
      const currentEventId = localStorage.getItem('current_event_id') || 'default_event';
      
      if (normalizedStatus === 'approved') {
        await CommitteeServices.approveSingleTeam(currentEventId, id);
      } else {
        await CommitteeServices.rejectSingleTeam(currentEventId, id);
      }
      
      setTeams((items) => items.map((team) => team.id === id ? { ...team, status: normalizedStatus } : team));
    } catch (e) {
      
      setToast(`Failed to commit card state adjustment: ${e.message}`);
    }
  }

  async function regenerate(id) {
    if (isStageFinalized) return;
    setLoadingRationale(id);
    
    const currentEventId = localStorage.getItem('current_event_id') || 'default_event';
    
    try {
      const targetTeam = teams.find((t) => t.id === id);
      if (!targetTeam) throw new Error("Staging matrix target missing from component memory.");

      const payload = {
        team_id: targetTeam.id,
        team_name: targetTeam.name,
        members: targetTeam.members.map((m) => ({
          name: m.name,
          level: m.level,
          institution: m.institution,
          skill_tags: m.skill_tags || []
        }))
      };

      const response = await CommitteeServices.generateSingleTeamRationale(currentEventId, id, payload);
      const newRationale = response?.rationale || response?.detail;
      
      if (newRationale) {
        setTeams((prev) => 
          prev.map((t) => t.id === id ? { ...t, stale: false, rationale: newRationale } : t)
        );
        setToast(`AI Team Analysis tracking updated for ${targetTeam.name}!`);
      }
    } catch (err) {
      
      setToast(`Generation Failure: ${err.message}`);
    } finally {
      setLoadingRationale(null);
    }
  }

  // Executes actual process after modal confirmation accepts
  async function executeFinalizeStage() {
    setShowConfirmModal(false);
    const currentEventId = localStorage.getItem('current_event_id') || 'default_event';

    setIsFinalizing(true);
    try {
      const response = await CommitteeServices.approveEntireStage(currentEventId);
      setIsStageFinalized(true);
      setToast(response?.message || "Stage data finalized and frozen.");
    } catch (err) {
      setToast(`Snapshot Failure: ${err.message}`);
    } finally {
      setIsFinalizing(false);
    }
  }

  const canCommunicate = isStageFinalized || (counts.pending === 0 && counts.approved > 0);
  
  return (
    <CommitteeLayout statusItems={[{ label: 'Teams', value: counts.total }]} pageTitle="Team Review & Approval" pageSubtitle="Review generated teams, rationales, approval state, and communication readiness.">
      <div className="committee-reference-dashboard team-review-page">
        
        {toast && (
          <div className="pipeline-toast" style={{ animation: 'cardEntrance 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            {toast}
          </div>
        )}

        {/* ðŸ› ï¸ Styled In-App Confirmation Modal Layer */}
        {showConfirmModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'cardEntrance 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}>
            <div className="committee-card" style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600 }}>
                Finalize Stage?
              </h3>
              <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                This locks all rosters permanently into production storage. Structural changes cannot be reverted after taking this action.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  className="committee-btn committee-btn-outline"
                  onClick={() => setShowConfirmModal(false)}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button 
                  className="committee-btn committee-btn-primary"
                  onClick={executeFinalizeStage}
                  style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: 'var(--accent-color)', color: '#fff' }}
                >
                  Confirm & Lock
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="review-status-bar" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <span className="status-pill info" style={{ transition: 'all 0.2s ease' }}>{counts.total} teams generated</span>
          <span className="status-pill success" style={{ transition: 'all 0.2s ease' }}>{counts.approved} approved</span>
          <span className="status-pill warning" style={{ transition: 'all 0.2s ease' }}>{counts.pending} pending</span>
          <span className="status-pill danger" style={{ transition: 'all 0.2s ease' }}>{counts.rejected} rejected</span>
        </section>

        <section className="committee-card" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', padding: '10px 14px' }}>
          <button className="committee-btn committee-btn-success" type="button" onClick={() => setAll('approved')} style={{ padding: '6px 12px', fontSize: '12px', transition: 'all 0.15s ease' }}>Approve All</button>
          <button className="committee-btn committee-btn-danger" type="button" onClick={() => setAll('rejected')} style={{ padding: '6px 12px', fontSize: '12px', transition: 'all 0.15s ease' }}>Reject All</button>
          <input className="committee-input" placeholder="Search teams or participantsâ€¦" value={query} onChange={(event) => setQuery(event.target.value)} style={{ flex: 1, transition: 'border-color 0.15s ease' }} />
          <select className="committee-select" value={filter} onChange={(event) => setFilter(event.target.value)} style={{ width: 'auto', transition: 'border-color 0.15s ease' }}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* âš¡ THE ACTION DISPATCHER BUTTON */}
          {isStageFinalized && (
            <button
              className="committee-btn"
              type="button"
              disabled={isDispatchingInvites || counts.approved === 0}
              onClick={dispatchTeamInvites}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: isDispatchingInvites ? 'var(--bg-muted)' : '#7c3aed',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: isDispatchingInvites ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(124, 58, 237, 0.3)',
                animation: 'actionPulse 2s infinite',
                transition: 'all 0.2s ease'
              }}
            >
              {isDispatchingInvites ? 'â³ Sending Links...' : 'âš¡ Invite Finalized Teams'}
            </button>
          )}
        </section>

        {isLoadingPage ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>Connecting to database...</div>
        ) : (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px', marginBottom: '100px' }}>
            {visibleTeams.map((team) => (
              <TeamReviewCard key={team.id} team={team} loading={loadingRationale === team.id} stageFinalized={isStageFinalized} onStatus={setStatus} onRegenerate={regenerate} />
            ))}
          </section>
        )}

        <section className="glass-drawer" style={{ 
          position: 'fixed',
          bottom: '16px',
          right: 20,
          width: '82%',
          boxSizing: 'border-box',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '12px 20px', 
          borderRadius: '8px', 
          marginTop: '24px',
          zIndex: 90,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}>
              {counts.approved} of {counts.total} teams approved.
            </strong>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '400' }}>
              {isStageFinalized 
                ? "âœ¨ Stage structural changes locked and tracked in production data repositories." 
                : "Approve and finalize rosters to open background mail communications."}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="committee-btn committee-btn-secondary"
              type="button"
              disabled={isFinalizing || isStageFinalized || counts.total === 0}
              onClick={() => setShowConfirmModal(true)}
              style={{ 
                padding: '8px 14px',
                fontSize: '13px',
                background: isStageFinalized ? 'var(--status-success-bg)' : 'var(--bg-card)',
                color: isStageFinalized ? 'var(--status-success)' : 'var(--text-primary)',
                transition: 'all 0.2s ease'
              }}
            >
              {isStageFinalized ? 'ðŸ”’ Snapshot Frozen' : (isFinalizing ? 'Saving...' : 'Finalize List')}
            </button>

            <button 
              className="committee-btn committee-btn-primary"
              type="button" 
              disabled={!canCommunicate || counts.total === 0} 
              onClick={() => navigate('/committee/communications')}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: canCommunicate ? 'var(--accent-color)' : 'var(--bg-muted)',
                color: canCommunicate ? '#ffffff' : 'var(--text-muted)',
                animation: canCommunicate && !isStageFinalized ? 'actionPulse 2s infinite' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Send Communications â†’
            </button>
          </div>
        </section>
      </div>
    </CommitteeLayout>
  )
}

export default CommitteeTeamReview;
