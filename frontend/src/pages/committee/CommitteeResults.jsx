import { useMemo, useState, useEffect, Fragment } from 'react'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import { getFinalizedTeams, sendTargetedAnnouncements } from '../../services/committee'

export default function CommitteeResults() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [invitations, setInvitations] = useState([])
  const [broadcasting, setBroadcasting] = useState(false) 
  const [sendingInviteFor, setSendingInviteFor] = useState(null) 
  const [topTeamsCount, setTopTeamsCount] = useState(5) 
  const [checks, setChecks] = useState({
    scores: true,
    leaderboard: true,
    resultsEmail: false,
    invitations: false,
    complete: false,
  })
  const [completeModal, setCompleteModal] = useState(false)

  const activeEventId = localStorage.getItem('current_event_id') || '4e96cf60-f634-4e1e-9e5b-f40ae2dde992'

  useEffect(() => {
    let isMounted = true
    async function fetchLiveLeaderboard() {
      try {
        setLoading(true)
        const response = await getFinalizedTeams(activeEventId)
        const rawTeams = Array.isArray(response) 
          ? response 
          : (response?.data || response?.teams || [])

        if (isMounted) {
          setTeams(rawTeams)

          const sorted = [...rawTeams].sort((a, b) => Number(b.final_calculated_total || 0) - Number(a.final_calculated_total || 0))
          
          const initialInvites = sorted.slice(0, 3).map((team, index) => ({
            id: team.team_id || team.id, 
            team: team.name,
            rank: index + 1,
            status: index === 0 ? 'Not Sent' : index === 1 ? 'Sent' : 'Accepted'
          }))
          setInvitations(initialInvites)
        }
      } catch (err) {
       
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchLiveLeaderboard()
    return () => { isMounted = false }
  }, [activeEventId])

  const sortedLeaderboardRows = useMemo(() => {
    return [...teams].sort((a, b) => {
      const scoreA = Number(a.final_calculated_total || 0)
      const scoreB = Number(b.final_calculated_total || 0)
      return scoreB - scoreA
    })
  }, [teams])

  const topThree = useMemo(() => {
    return sortedLeaderboardRows.slice(0, 3)
  }, [sortedLeaderboardRows])

  const canComplete = Object.values(checks).every(Boolean)

  function regenerateSummary() {
    setSummaryLoading(true)
    window.setTimeout(() => setSummaryLoading(false), 900)
  }

  const getCustomBody = (teamName, rank) => {
    if (rank === 1) {
      return `Phenomenal job ${teamName}! Your team dominated the metrics and has officially secured 1st Place on the leaderboard! ðŸ† Incredible work building the winning solution. Please check your dashboard for the next milestone steps.`
    }
    if (rank === 2) {
      return `Outstanding work ${teamName}! You fought hard and officially locked in 2nd Place on the leaderboard! ðŸ¥ˆ The judging panel was thoroughly impressed. Head over to your dashboard to see your phase transition steps.`
    }
    if (rank === 3) {
      return `Huge congratulations ${teamName}! Your team has successfully locked in 3rd Place on the final leaderboard! ðŸ¥‰ An amazing showing across all evaluation categories. Review your dashboard details for what comes next.`
    }
    return `Great work ${teamName}! The standings are finalized, and your team officially placed at rank #${rank}. Thank you for your incredible effort and contribution to this phase!`
  }

  // âœ‰ï¸ Progression Invitation Pipeline Handler
  async function sendInvitation(teamId, teamName) {
    if (!teamId) return alert("Error: Could not resolve a valid target identity UUID.");
    if (sendingInviteFor !== null) return 

    const teamIndex = sortedLeaderboardRows.findIndex(t => (t.team_id || t.id) === teamId)
    const rank = teamIndex !== -1 ? teamIndex + 1 : 1

    setSendingInviteFor(teamName)
    try {
      await sendTargetedAnnouncements(activeEventId, {
        subject: `ðŸŽ‰ Official Progression Invitation: ${teamName}`,
        body: getCustomBody(teamName, rank), 
        teamId: teamId, 
        includeLeaderboardContext: true 
      })

      setInvitations((items) => 
        items.map((item) => item.team === teamName ? { ...item, status: 'Sent' } : item)
      )
      alert(`ðŸŽ‰ Progression invitation sent cleanly to ${teamName}!`)
    } catch (err) {
     
      alert(err.message || "Failed dispatching targeted announcement pipeline.")
    } finally {
      setSendingInviteFor(null)
    }
  }

  // ðŸ“¢ Individual Team Urgent Announcement / Broadcast Handler
  async function handleIndividualBroadcast(teamId, teamName) {
    if (!teamId) return alert("Error: Missing valid target team identity UUID.");
    
    const teamIndex = sortedLeaderboardRows.findIndex(t => (t.team_id || t.id) === teamId)
    const rank = teamIndex !== -1 ? teamIndex + 1 : 'N/A'
    
    const confirmBroadcast = window.confirm(`Broadcast dynamic leaderboard dashboard alert to "${teamName}" (Rank #${rank})?`);
    if (!confirmBroadcast) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/events/${activeEventId}/broadcasts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('HackSmart_token') || ''}`
        },
        body: JSON.stringify({
          title: `ðŸ† Standings Update for ${teamName}!`,
          body: `âœ¨ Attention team members! Your final metrics are calculated. You have officially secured Rank #${rank} on the Leaderboard. Check your performance dashboard panel for breakdown parameters!`,
          type: "urgent", 
          scope: "Targeted Team",
          teamId: teamId
        })
      })

      if (response.ok) {
        alert(`ðŸŽ‰ Standing updates successfully broadcasted to ${teamName}'s dashboard!`)
        setChecks(prev => ({ ...prev, resultsEmail: true }))
      } else {
        const errData = await response.json()
        alert(`Failed to broadcast: ${errData.detail || response.statusText}`)
      }
    } catch (err) {
     
      alert("Failed connecting with endpoints server.")
    }
  }

  const getTeamMembers = (row) => {
    if (!row?.members_snapshot) return []
    if (Array.isArray(row.members_snapshot)) return row.members_snapshot
    try {
      return JSON.parse(row.members_snapshot)
    } catch (e) {
      return []
    }
  }

  const getJudgeBreakdown = (row) => {
    let raw = row?.scores_snapshot || row?.scores
    if (!raw || raw === 'NULL') return []
    if (Array.isArray(raw)) return raw
    try {
      return JSON.parse(raw)
    } catch (e) {
      return []
    }
  }

  const handleExportCSV = () => {
    if (sortedLeaderboardRows.length === 0) return alert("No leaderboard rows available to export.")

    const headers = ["Rank", "Team Name", "Total Score", "Innovation", "Code Quality", "Presentation", "Impact", "Status"]
    const rows = sortedLeaderboardRows.map((row, idx) => [
      idx + 1,
      `"${row.name.replace(/"/g, '""')}"`,
      Number(row.final_calculated_total || 0).toFixed(1),
      Number(row.panel_average_innovation || 0).toFixed(1),
      Number(row.panel_average_code || 0).toFixed(1),
      Number(row.panel_average_presentation || 0).toFixed(1),
      Number(row.panel_average_impact || 0).toFixed(1),
      row.has_active_anomaly ? "Flagged" : "Finalized"
    ])

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `leaderboard_event_${activeEventId.substring(0,8)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

 const handleDynamicBroadcast = async () => {
    const selectedTeams = sortedLeaderboardRows.slice(0, topTeamsCount)
    if (selectedTeams.length === 0) return alert("Leaderboard matrix data is currently empty.")

    setBroadcasting(true)

    // ðŸŽ¯ FIX: Remove the hardcoded ASCII line borders that blowout the frontend container width.
    // Use natural spacing and distinct emojis instead for clean vertical flow.
    let rankingsText = "ðŸ† OFFICIAL EVENT LEADERBOARD ðŸ†\n\n" +
                       `ðŸŒŸ Top ${selectedTeams.length} Teams ðŸŒŸ\n\n`;

    const getOrdinalLabel = (n) => {
      if (n === 1) return "1st Place";
      if (n === 2) return "2nd Place";
      if (n === 3) return "3rd Place";
      return `${n}th Place`;
    };

    const medals = ["ðŸ¥‡", "ðŸ¥ˆ", "ðŸ¥‰", "ðŸ…", "ðŸ…", "ðŸ…", "ðŸ…", "ðŸ…", "ðŸ…", "ðŸ…"];

    selectedTeams.forEach((team, idx) => {
      const rankLabel = getOrdinalLabel(idx + 1);
      const medal = medals[idx] || "ðŸ…";
      rankingsText += `${medal} ${rankLabel} âž¤ ${team.name}\n`;
    });

    rankingsText += "\nðŸŽ‰ Congratulations to all participating teams!\n\n" +
                    "Your dedication, creativity, and hard work made this event a huge success. Every team brought something valuable to the competition, and these rankings reflect an outstanding performance by our top contenders.\n\n" +
                    "ðŸ‘ Keep innovating, keep building, and keep striving for excellence!\n" +
                    "ðŸš€ See you at the next challenge!";

    try {
      const response = await fetch(`http://localhost:8000/api/v1/events/${activeEventId}/broadcasts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('HackSmart_token') || ''}`
        },
        body: JSON.stringify({
          title: `ðŸ“¢ Leaderboard Top ${selectedTeams.length} Announcement!`,
          body: rankingsText,
          type: "urgent", 
          scope: "All Participants"
        })
      })

      if (response.ok) {
        alert(`ðŸŽ‰ Top ${selectedTeams.length} standings broadcasted cleanly to all dashboards!`)
        setChecks(prev => ({ ...prev, leaderboard: true }))
      } else {
        const errData = await response.json()
        alert(`Failed to broadcast: ${errData.detail || response.statusText}`)
      }
    } catch (err) {
     
      alert("Failed connecting with endpoints server.")
    } finally {
      setBroadcasting(false)
    }
  }

  return (
    <CommitteeLayout 
      statusItems={[{ label: 'Pipeline', value: 'Results' }]}
      pageTitle="Results & Leaderboard"
    >
      <style>{`
        .podium-interactive-card { transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, border-color 0.25s ease !important; }
        .podium-interactive-card:hover { transform: translateY(-4px) scale(1.015); border-color: var(--accent-color) !important; box-shadow: 0 12px 24px -8px rgba(79, 70, 229, 0.25) !important; }
        .interactive-row { transition: background-color 0.15s ease !important; }
        .interactive-row:hover { background-color: rgba(148, 163, 184, 0.12) !important; }
        .interactive-row.is-active-row { background-color: var(--bg-secondary) !important; }
        .action-button-hover { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .action-button-hover:hover:not(:disabled) { background-color: var(--bg-secondary) !important; color: var(--text-primary) !important; border-color: var(--accent-color) !important; }
        .complete-btn-pulse { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .complete-btn-pulse:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35) !important; background-color: var(--accent-color) !important; }
        .complete-btn-pulse:active:not(:disabled) { transform: scale(0.99); }
        .modal-action-btn:hover { background-color: var(--bg-secondary) !important; color: var(--text-primary) !important; border-color: var(--border-color) !important; }
        .custom-leaderboard-table tbody tr:nth-child(even):not(.is-active-row) { background-color: rgba(148, 163, 184, 0.08); }
      `}</style>

      <div className="committee-reference-dashboard results-page" style={{ padding: '32px 24px', maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: 'var(--text-primary)' }}>
        
        <header className="ref-header" style={{ marginBottom: '32px' }}>
          <div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Publish final rankings, summarize outcomes, and complete event wrap-up.</p>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)', fontSize: '15px' }}>
            Compiling live leaderboard scoring matrices...
          </div>
        ) : (
          <>
            {topThree.length > 0 && (
              <section className="podium-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px', alignItems: 'end' }}>
                {[topThree[1], topThree[0], topThree[2]].filter(Boolean).map((team) => {
                  const teamIndex = sortedLeaderboardRows.findIndex(t => t.id === team.id);
                  const rank = teamIndex + 1;
                  const members = getTeamMembers(team);

                  return (
                    <article 
                      className={`ref-card podium-interactive-card rank-${rank}`} 
                      key={team.id || rank}
                      style={{ 
                        background: 'var(--bg-card)', 
                        border: rank === 1 ? '2px solid var(--accent-color)' : '1px solid var(--border-color)', 
                        borderRadius: '12px', 
                        padding: '28px 20px',
                        textAlign: 'center',
                        boxShadow: rank === 1 ? '0 10px 25px -5px rgba(59, 130, 246, 0.15)' : '0 4px 6px -1px rgba(0,0,0,0.1)',
                        order: rank === 1 ? 2 : rank === 2 ? 1 : 3,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '36px', marginBottom: '10px' }}>
                        {rank === 1 ? 'ðŸ¥‡' : rank === 2 ? 'ðŸ¥ˆ' : 'ðŸ¥‰'}
                      </div>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{team.name}</h3>
                      <strong style={{ fontSize: '20px', color: 'var(--accent-color)', display: 'block', marginBottom: '12px' }}>
                        {Number(team.final_calculated_total || 0).toFixed(1)} <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ 100</span>
                      </strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                        {members.map((m) => (
                          <em key={m.id || m.name} style={{ fontSize: '12px', fontStyle: 'normal', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                            {m.name}
                          </em>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            {/* ðŸ† FULL LEADERBOARD - NO NOTIFY BUTTON HERE */}
            <section className="ref-card full-leaderboard-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
              <div className="ref-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Full Leaderboard</h3>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button className="action-button-hover" style={{ padding: '6px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }} type="button" onClick={handleExportCSV}>Export CSV</button>
                  
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '2px 8px', height: '30px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '6px', userSelect: 'none' }}>Top:</span>
                    <input 
                      type="number" 
                      min="1" 
                      max={sortedLeaderboardRows.length || 10} 
                      value={topTeamsCount}
                      onChange={(e) => setTopTeamsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: '40px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '700', outline: 'none', padding: 0 }}
                    />
                  </div>

                  <button className="action-button-hover" style={{ padding: '6px 14px', border: '1px solid var(--accent-color)', borderRadius: '6px', background: 'var(--accent-color)', color: '#fff', cursor: broadcasting ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600' }} type="button" disabled={broadcasting} onClick={handleDynamicBroadcast}>
                    {broadcasting ? 'Broadcasting...' : `ðŸ“¢ Broadcast Top ${topTeamsCount}`}
                  </button>
                </div>
              </div>

              <div className="data-table-wrap" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <table className="pipeline-table leaderboard-full-table custom-leaderboard-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      <th style={{ padding: '14px 16px', width: '60px' }}>Rank</th>
                      <th style={{ padding: '14px 16px', minWidth: '150px' }}>Team Name</th>
                      <th style={{ padding: '14px 16px', maxWidth: '240px' }}>Members</th>
                      <th style={{ padding: '14px 16px', color: 'var(--accent-color)' }}>Total Score</th>
                      <th style={{ padding: '14px 16px' }}>Innovation</th>
                      <th style={{ padding: '14px 16px' }}>Code Quality</th>
                      <th style={{ padding: '14px 16px' }}>Presentation</th>
                      <th style={{ padding: '14px 16px' }}>Impact</th>
                      <th style={{ padding: '14px 16px' }}>Anomaly</th>
                      <th style={{ padding: '14px 16px', minWidth: '120px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLeaderboardRows.map((row, index) => {
                      const isExpanded = expanded === row.id;
                      const membersList = getTeamMembers(row).map(m => m.name).join(', ');
                      const judges = getJudgeBreakdown(row);

                      return (
                        <Fragment key={row.id || index}>
                          <tr className={`interactive-row ${isExpanded ? 'is-active-row' : ''}`} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : row.id)}>
                            <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>{index + 1}</td>
                            <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>{row.name}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={membersList}>{membersList || 'No members registered'}</td>
                            <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--accent-color)' }}>{Number(row.final_calculated_total || 0).toFixed(1)}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{Number(row.panel_average_innovation || 0).toFixed(1)}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{Number(row.panel_average_code || 0).toFixed(1)}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{Number(row.panel_average_presentation || 0).toFixed(1)}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{Number(row.panel_average_impact || 0).toFixed(1)}</td>
                            <td style={{ padding: '14px 16px' }}>{row.has_active_anomaly ? <span style={{ color: 'var(--status-warning)', fontWeight: '600' }}>âš ï¸ Flagged</span> : <span style={{ color: 'var(--text-secondary)' }}>-</span>}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', background: row.is_corrected ? 'rgba(52, 211, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)', color: row.is_corrected ? 'var(--status-success)' : 'var(--accent-color)', border: `1px solid ${row.is_corrected ? 'rgba(52, 211, 153, 0.2)' : 'rgba(56, 189, 248, 0.2)'}` }}>{row.is_corrected ? 'Resolved' : 'Finalized'}</span>
                            </td>
                          </tr>
                          {isExpanded && judges.length > 0 && (
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                              <td colSpan="10" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Panel Breakdown:</span>
                                  {judges.map((j, jIdx) => (
                                    <span key={jIdx} style={{ fontSize: '13px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                      <strong style={{ color: 'var(--text-primary)' }}>{j.judge_name || `Judge ${jIdx + 1}`}:</strong> {Number(j.total || j.score || 0).toFixed(1)}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <section className="ref-card results-summary-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
          <div className="ref-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Results Summary</h3>
            <button className="action-button-hover" style={{ padding: '6px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }} type="button" onClick={regenerateSummary}>Regenerate Summary</button>
          </div>
          {summaryLoading ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Analyzing live score records...</div>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '15px' }}>
              {topThree[0] ? <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>Team {topThree[0].name}</span> : 'Scoring processes completed.'} {topThree[0] && 'led the competition with the strongest blend of metrics performance.'}{' '}
              {topThree[1] && `Team ${topThree[1].name} followed closely in runner-up metrics,`} while consistent presentation attributes stabilized standing values across panels. Congratulations to all advancing tracks.
            </p>
          )}
        </section>

        {/* ðŸ† PROGRESSION INVITATIONS SECTION (CLEAN & COHESIVE STYLES) */}
        <section className="ref-card invitations-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
          <div className="ref-section-title" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Progression Invitations</h3>
          </div>
          {invitations.map((invite) => (
            <div className="team-row" key={invite.team} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-primary)' }}>#{invite.rank} {invite.team}</strong>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Invitation Status: {invite.status}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* ðŸ“¢ Notify Team Button (Individual Dashboard Broadcast Hook) */}
                <button 
                  type="button" 
                  className="action-button-hover" 
                  onClick={() => handleIndividualBroadcast(invite.id, invite.team)} 
                  style={{ padding: '8px 14px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  ðŸ“¢ Notify Team
                </button>

                {/* âœ‰ï¸ Send Progression Invitation Button (Uniform, Clickable styling) */}
                <button 
                  className="action-button-hover" 
                  type="button" 
                  disabled={sendingInviteFor !== null} 
                  onClick={() => sendInvitation(invite.id, invite.team)} 
                  style={{ 
                    padding: '8px 14px', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    background: 'var(--bg-card)', 
                    cursor: sendingInviteFor !== null ? 'not-allowed' : 'pointer', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: 'var(--text-primary)' 
                  }}
                >
                  {sendingInviteFor === invite.team ? 'Sending Invite...' : invite.status !== 'Not Sent' ? 'âœ‰ï¸ Resend Invitation' : 'âœ‰ï¸ Send Invitation'}
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="ref-card wrapup-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
          <div className="ref-section-title" style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Event Wrap-Up</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {[
              ['scores', 'Scores finalized'],
              ['leaderboard', 'Leaderboard published'],
              ['resultsEmail', 'Results email sent to all participants'],
              ['invitations', 'Progression invitations sent'],
              ['complete', 'Event marked as Complete'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={checks[key]} onChange={(event) => setChecks((items) => ({ ...items, [key]: event.target.checked }))} style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)', cursor: 'pointer' }} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <button className="complete-btn-pulse" type="button" disabled={!canComplete} onClick={() => setCompleteModal(true)} style={{ padding: '12px 24px', background: canComplete ? 'var(--accent-color)' : 'var(--bg-secondary)', color: canComplete ? 'var(--text-on-accent)' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: canComplete ? 'pointer' : 'not-allowed', fontSize: '14px', boxShadow: canComplete ? '0 4px 6px -1px rgba(99, 102, 241, 0.2)' : 'none' }}>Mark Event as Complete</button>
        </section>
      </div>

      {completeModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <section className="ref-card confirm-modal" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '32px', borderRadius: '12px', textAlign: 'center', maxWidth: '420px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>HackSmart Completed ðŸŽ‰</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>All ranking matrices published successfully. Automated notification worker distributions are locked.</p>
            <button className="action-button-hover modal-action-btn" type="button" onClick={() => setCompleteModal(false)} style={{ width: '100%', padding: '10px', border: '1px solid var(--accent-color)', background: 'var(--accent-color)', color: '#fff', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Dismiss</button>
          </section>
        </div>
      )}
    </CommitteeLayout>
  )
}
