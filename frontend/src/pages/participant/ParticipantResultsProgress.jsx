import { useEffect, useMemo, useState } from 'react'
import ParticipantLayout from '../../components/layout/ParticipantLayout'
import { fetchResults } from '../../api/participant'

const CHART_COLORS = ['#38BDF8', '#6BE6D3', '#A78BFA', '#F59E0B', '#FB7185', '#7DBBFF']

function formatScore(value) {
  return Number(value || 0).toFixed(1)
}

// Compact, space-efficient Doughnut Chart Component
function DoughnutChart({ categories, overallScore, pending }) {
  const total = categories.reduce((sum, item) => sum + Math.max(0, Number(item.score)), 0)
  const radius = 75 // Downscaled radius for tighter layout footprint
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '200px', height: '200px', margin: '0 auto' }}>
      <svg viewBox="0 0 190 190" width="190" height="190" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="95"
          cy="95"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.03)"
          strokeWidth="16"
        />
        {!pending && total > 0 && categories.map((item, index) => {
          const value = Math.max(0, Number(item.score))
          const segmentLength = (value / total) * circumference
          const dashArray = `${segmentLength} ${circumference - segmentLength}`
          const color = CHART_COLORS[index % CHART_COLORS.length]
          const circle = (
            <circle
              key={item.label}
              cx="95"
              cy="95"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={dashArray}
              strokeDashoffset={-offset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          )
          offset += segmentLength
          return circle
        })}
      </svg>

      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {pending ? (
          <>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--efp-muted)', letterSpacing: '-0.01em' }}>Pending</span>
            <small style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>In Progress</small>
          </>
        ) : (
          <>
            <strong style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
              {Number(overallScore || 0).toFixed(1)}
            </strong>
            <small style={{ fontSize: '10px', fontWeight: 500, color: 'var(--efp-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>
              Score / 100
            </small>
          </>
        )}
      </div>
    </div>
  )
}

function Skeleton({ height = '100px' }) {
  return (
    <div
      style={{
        height,
        borderRadius: '12px',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.03) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }}
    />
  )
}

function ParticipantResultsProgress() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchResults()
      .then(setResults)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const topFive = results?.leaderboard || []
  const scoreBreakdown = results?.score_breakdown || []
  const resultsPending = !results?.result_published
  const selected = Boolean(results?.selected)
  const rankLabel = results?.rank ? `Rank #${results.rank}` : 'Awaiting Rank'
  const teamName = results?.team?.name || 'Team Pending'
  const teamChallenge = results?.team?.challenge

  const overallRaw = useMemo(() => {
    if (!scoreBreakdown.length) return 0
    const total = scoreBreakdown.reduce((sum, item) => sum + Math.max(0, Number(item.score)), 0)
    return (total / scoreBreakdown.length) * 10
  }, [scoreBreakdown])

  const overallScore = resultsPending ? null : Math.min(100, overallRaw)

  const qualificationStatus = useMemo(() => {
    if (resultsPending) {
      return { label: 'Awaiting Publication', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.15)' }
    }
    if (selected) {
      return { label: 'Top 5 Finalist', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.06)', border: 'rgba(74, 222, 128, 0.15)' }
    }
    if (results?.rank && results.rank <= 8) {
      return { label: 'Qualified', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.06)', border: 'rgba(96, 165, 250, 0.15)' }
    }
    return { label: 'Not Qualified', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.15)' }
  }, [resultsPending, selected, results?.rank])

  const sortedCategories = useMemo(() => {
    return [...scoreBreakdown].sort((a, b) => Number(b.score) - Number(a.score))
  }, [scoreBreakdown])

  const strongestCategory = sortedCategories[0] || null
  const weakestCategory = sortedCategories[sortedCategories.length - 1] || null

  return (
    <ParticipantLayout
      pageTitle="Analytics & Standings"
      pageSubtitle="Your structured performance analysis, real-time standings, and strategic evaluation insights."
    >
      <div style={{ display: 'grid', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', paddingBottom: '24px' }}>
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', fontSize: '13px', fontWeight: 500 }}>
            Could not retrieve evaluation matrix: {error}
          </div>
        )}

        {loading ? (
          <>
            <Skeleton height="180px" />
            <Skeleton height="320px" />
          </>
        ) : resultsPending ? (
          /* ================= PENDING STATE SCREEN ================= */
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '360px', 
            borderRadius: '16px', 
            background: 'linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.00) 100%)', 
            border: '1px solid rgba(255, 255, 255, 0.04)',
            textAlign: 'center',
            padding: '24px'
          }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginBottom: '16px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.01em', color: '#FFFFFF' }}>
              Results Awaiting Publication
            </h2>
            <p style={{ maxWidth: '420px', margin: 0, color: 'var(--efp-muted)', fontSize: '13px', lineHeight: '1.5' }}>
              The evaluation committee is currently auditing score matrices and finalizing standings for <span style={{ color: '#FFF', fontWeight: 500 }}>{teamName}</span>. Your dashboard architecture will automatically update as soon as grades are authorized.
            </p>
          </div>
        ) : (
          <>
            {/* ================= COMPACT HERO SECTION ================= */}
            <section style={{ 
              position: 'relative',
              borderRadius: '16px',
              padding: '24px 32px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.06) 0%, rgba(167, 139, 250, 0.02) 50%, rgba(0,0,0,0) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '24px',
              alignItems: 'center'
            }}>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '999px', 
                    background: qualificationStatus.bg, 
                    color: qualificationStatus.color, 
                    border: `1px solid ${qualificationStatus.border}`,
                    fontWeight: 600, 
                    fontSize: '11px'
                  }}>
                    {qualificationStatus.label}
                  </span>
                </div>

                <div>
                  <h1 style={{ margin: '0 0 4px 0', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                    {teamName}
                  </h1>
                  <p style={{ margin: 0, color: 'var(--efp-muted)', fontSize: '13px' }}>
                    Finalized Performance Summary Analytics Index
                  </p>
                </div>
              </div>

              {/* Scaled Score Frame */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingLeft: '24px', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--efp-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Weighted Score
                  </span>
                  <div style={{ fontSize: '52px', fontWeight: 900, lineHeight: '1', color: '#FFFFFF', letterSpacing: '-0.03em', marginTop: '2px' }}>
                    {formatScore(overallScore)}
                  </div>
                </div>
                <div style={{ 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid rgba(255,255,255,0.04)', 
                  borderRadius: '12px', 
                  padding: '10px 16px',
                  textAlign: 'center',
                  minWidth: '90px'
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--efp-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Standing</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--efp-primary)', marginTop: '2px' }}>{rankLabel}</div>
                </div>
              </div>
            </section>

            {/* ================= ANALYTICS LAYER ================= */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
              
              {/* Left Column: Scaled-down Canvas */}
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.005)', 
                border: '1px solid rgba(255, 255, 255, 0.04)', 
                borderRadius: '16px', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '280px'
              }}>
                <DoughnutChart categories={scoreBreakdown} overallScore={overallScore} pending={resultsPending} />
              </div>

              {/* Right Column: Key Metrics Frame */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', height: '100%' }}>
                <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.04)', padding: '16px', borderRadius: '14px' }}>
                  <span style={{ color: 'var(--efp-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Global Position</span>
                  <strong style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: '#FFF', marginTop: '6px', letterSpacing: '-0.01em' }}>{rankLabel}</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--efp-muted)', fontSize: '11px', lineHeight: '1.3' }}>Current placement in dynamic standing records.</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.04)', padding: '16px', borderRadius: '14px' }}>
                  <span style={{ color: 'var(--efp-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status Metric</span>
                  <strong style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: qualificationStatus.color, marginTop: '6px', letterSpacing: '-0.01em' }}>{qualificationStatus.label}</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--efp-muted)', fontSize: '11px', lineHeight: '1.3' }}>Formal board eligibility parameter framework.</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.04)', padding: '16px', borderRadius: '14px' }}>
                  <span style={{ color: 'rgba(56, 189, 248, 0.8)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Apex Category</span>
                  <strong style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#FFF', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {strongestCategory?.label || '--'}
                  </strong>
                  <p style={{ margin: '2px 0 0 0', fontWeight: 600, color: 'var(--efp-muted)', fontSize: '12px' }}>
                    {strongestCategory ? `${formatScore(strongestCategory.score)} / 10` : '--'}
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.04)', padding: '16px', borderRadius: '14px' }}>
                  <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pivot Category</span>
                  <strong style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: '#FFF', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {weakestCategory?.label || '--'}
                  </strong>
                  <p style={{ margin: '2px 0 0 0', fontWeight: 600, color: 'var(--efp-muted)', fontSize: '12px' }}>
                    {weakestCategory ? `${formatScore(weakestCategory.score)} / 10` : '--'}
                  </p>
                </div>

                <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--efp-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audited Nodes</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#FFF', marginTop: '1px' }}>{scoreBreakdown.length} Criteria Segments</div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--efp-muted)' }}>
                    Moderated
                  </span>
                </div>
              </div>
            </section>

            {/* ================= CATEGORY BREAKDOWN LAYER ================= */}
            <section style={{ 
              background: 'rgba(255,255,255,0.005)', 
              border: '1px solid rgba(255,255,255,0.04)', 
              borderRadius: '16px', 
              padding: '24px' 
            }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Performance Matrix Vectors</h3>
                <p style={{ margin: 0, color: 'var(--efp-muted)', fontSize: '12px' }}>Granular breakdown of verified sector scores weighted out of 10.0 points.</p>
              </div>

              {scoreBreakdown.length ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {scoreBreakdown.map((item, index) => {
                    const isStrongest = item.label === strongestCategory?.label
                    const isWeakest = item.label === weakestCategory?.label
                    
                    let trackColor = CHART_COLORS[index % CHART_COLORS.length]
                    let badgeElement = null

                    if (isStrongest) {
                      trackColor = '#22C55E'
                      badgeElement = <span style={{ fontSize: '9px', fontWeight: 600, color: '#22C55E', background: 'rgba(34, 197, 94, 0.08)', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Highest Merit</span>
                    } else if (isWeakest) {
                      trackColor = '#F59E0B'
                      badgeElement = <span style={{ fontSize: '9px', fontWeight: 600, color: '#F59E0B', background: 'rgba(245, 158, 11, 0.08)', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Optimization Focal</span>
                    }

                    return (
                      <div key={item.label} style={{ 
                        background: 'rgba(255,255,255,0.005)', 
                        border: '1px solid rgba(255,255,255,0.02)', 
                        padding: '12px 18px', 
                        borderRadius: '12px',
                        display: 'grid',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>{item.label}</span>
                            {badgeElement}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
                            {formatScore(item.score)} <span style={{ color: 'var(--efp-muted)', fontWeight: 500 }}>/ 10.0</span>
                          </div>
                        </div>
                        <div style={{ height: '6px', borderRadius: '999px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.03)', position: 'relative' }}>
                          <div style={{ 
                            width: `${Math.max(0, Math.min(100, Number(item.score) * 10))}%`, 
                            height: '100%', 
                            borderRadius: '999px', 
                            background: trackColor,
                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--efp-muted)', fontSize: '12px' }}>No operational parameters logged for this track template.</p>
              )}
            </section>

            {/* ================= LEADERBOARD ================= */}
            <section style={{ 
              background: 'rgba(255,255,255,0.005)', 
              border: '1px solid rgba(255,255,255,0.04)', 
              borderRadius: '16px', 
              padding: '24px' 
            }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Top Standing Cohorts</h3>
                  <p style={{ margin: 0, color: 'var(--efp-muted)', fontSize: '12px' }}>Real-time verification layer mapping leadership telemetry.</p>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--efp-muted)' }}>Top 5 instances</span>
              </div>

              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: 'var(--efp-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', width: '70px' }}>Rank</th>
                      <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: 'var(--efp-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team Identification Instance</th>
                      <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: 'var(--efp-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', width: '100px' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFive.length > 0 ? topFive.map((team) => {
                      const isCurrentTeam = team.team_id === results?.team?.id
                      return (
                        <tr 
                          key={team.team_id} 
                          style={{ 
                            background: isCurrentTeam ? 'rgba(56, 189, 248, 0.04)' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.02)'
                          }}
                        >
                          <td style={{ padding: '12px 18px' }}>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              width: '22px', 
                              height: '22px', 
                              borderRadius: '6px', 
                              background: team.rank === 1 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.02)',
                              color: team.rank === 1 ? '#F59E0B' : '#FFF',
                              fontSize: '11px',
                              fontWeight: 700 
                            }}>
                              #{team.rank}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: isCurrentTeam ? 600 : 400, color: isCurrentTeam ? 'var(--efp-primary)' : '#E2E8F0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {team.team_name}
                              {isCurrentTeam && (
                                <span style={{ fontSize: '9px', background: 'var(--efp-primary)', color: '#FFF', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                            {Number(team.score || 0).toFixed(1)}
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', color: 'var(--efp-muted)', padding: '24px 0', fontSize: '13px' }}>
                          Leaderboard registration offline or recalculating.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ================= PERFORMANCE INSIGHTS CARD ================= */}
            <section style={{ 
              background: 'linear-gradient(180deg, rgba(255,255,255,0.005) 0%, rgba(255,255,255,0.00) 100%)', 
              border: '1px solid rgba(255,255,255,0.04)', 
              borderRadius: '16px', 
              padding: '24px' 
            }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 700, color: '#FFFFFF' }}>Performance Insights Analysis</h3>
                <p style={{ margin: 0, color: 'var(--efp-muted)', fontSize: '12px' }}>Systemized evaluation logs parsing core operational competencies.</p>
              </div>

              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div style={{ background: 'rgba(34, 197, 94, 0.01)', border: '1px solid rgba(34, 197, 94, 0.08)', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ADE80', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ADE80' }} />
                      Primary Efficiency Asset
                    </div>
                    <h4 style={{ margin: '6px 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#FFF' }}>{strongestCategory?.label || 'Awaiting Metrics'}</h4>
                    <p style={{ margin: 0, color: 'var(--efp-muted)', fontSize: '12px', lineHeight: '1.4' }}>
                      Demonstrated structural leadership and scoring efficiency within this parameter matrix.
                    </p>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.01)', border: '1px solid rgba(245, 158, 11, 0.08)', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#F59E0B' }} />
                      Strategic Optimization Pivot
                    </div>
                    <h4 style={{ margin: '6px 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#FFF' }}>{weakestCategory?.label || 'Awaiting Metrics'}</h4>
                    <p style={{ margin: 0, color: 'var(--efp-muted)', fontSize: '12px', lineHeight: '1.4' }}>
                      Identified as a core pathway where subsequent iteration will maximize returns.
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 600, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Synthesis Overview</h4>
                  <p style={{ margin: 0, color: 'var(--efp-muted)', fontSize: '12px', lineHeight: '1.5' }}>
                    Your aggregated grading balance confirms a steady evaluation profile. {selected ? 'Your placement indicates top-tier strategic design alignment across all audited operational sectors.' : 'Refining target low-efficiency sectors marked above will steadily raise total system grade profiles during successive submissions.'}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </ParticipantLayout>
  )
}

export default ParticipantResultsProgress