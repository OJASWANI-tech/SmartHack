import { useState, useEffect } from 'react'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import { getScoreHistory } from '../../services/evaluator'

function RubricAnalyticsPanel({ criteriaBreakdown, scoreValue }) {
  const [chartType, setChartType] = useState('radar') // 'radar' or 'bar'
  const [hoveredPoint, setHoveredPoint] = useState(null) // { index, label, value, x, y }

  const criteria = Object.entries(criteriaBreakdown || {}).map(([key, val]) => ({
    label: key.replace(/_/g, ' ').toUpperCase(),
    value: Number(val) || 0
  }))

  if (criteria.length === 0) return null

  // Math calculations for Radar Chart
  const cx = 150
  const cy = 150
  const rMax = 80
  const totalPoints = criteria.length

  const getCoordinates = (index, value) => {
    // Math.PI / 2 offset forces first point to point straight up
    const angle = (index * 2 * Math.PI) / totalPoints - Math.PI / 2
    const r = (value / 10) * rMax
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    return { x, y, angle }
  }

  // Calculate polygon points
  const points = criteria.map((c, i) => {
    const { x, y } = getCoordinates(i, c.value)
    return `${x},${y}`
  }).join(' ')

  // Calculate insights
  const sorted = [...criteria].sort((a, b) => b.value - a.value)
  const highest = sorted[0]
  const lowest = sorted[sorted.length - 1]
  const average = (criteria.reduce((sum, item) => sum + item.value, 0) / criteria.length).toFixed(1)

  return (
    <div style={{
      marginTop: '16px',
      padding: '20px',
      background: 'rgba(255, 255, 255, 0.01)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'row',
      gap: '24px',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Left side: Controls & Insights */}
      <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <button 
            onClick={() => setChartType('radar')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: chartType === 'radar' ? 'var(--accent-color)' : 'transparent',
              color: chartType === 'radar' ? '#fff' : 'var(--text-secondary)',
              border: chartType === 'radar' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🕸️ Radar Web
          </button>
          <button 
            onClick={() => setChartType('bar')}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: chartType === 'bar' ? 'var(--accent-color)' : 'transparent',
              color: chartType === 'bar' ? '#fff' : 'var(--text-secondary)',
              border: chartType === 'bar' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📊 Rubric Breakdown
          </button>
        </div>

        {/* Insights Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px', letterSpacing: '0.05em' }}>Average Rubric Score</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{scoreValue != null ? scoreValue : average}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>/ 10</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <span style={{ fontSize: '9px', color: 'var(--status-success)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🌟 Strongest Dimension</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{highest.label.toLowerCase()}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>Score: {highest.value}/10</span>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <span style={{ fontSize: '9px', color: 'var(--status-danger)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Growth Area</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{lowest.label.toLowerCase()}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>Score: {lowest.value}/10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Dynamic Visualizer */}
      <div style={{
        flex: '1 1 300px',
        maxWidth: '320px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '260px',
        position: 'relative'
      }}>
        {chartType === 'radar' ? (
          <svg width="300" height="300" style={{ overflow: 'visible' }}>
            {/* Concentric grid lines (octagons) */}
            {[2, 4, 6, 8, 10].map((level) => {
              const levelPoints = criteria.map((_, i) => {
                const { x, y } = getCoordinates(i, level)
                return `${x},${y}`
              }).join(' ')
              return (
                <polygon
                  key={level}
                  points={levelPoints}
                  fill="none"
                  stroke="var(--border-color)"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />
              )
            })}

            {/* Radar concentric circular grid helper text */}
            {[2, 4, 6, 8, 10].map((level) => {
              const { x, y } = getCoordinates(0, level)
              return (
                <text
                  key={level}
                  x={x + 4}
                  y={y + 3}
                  fill="var(--text-secondary)"
                  fontSize="8"
                  fontFamily="monospace"
                  opacity="0.5"
                >
                  {level}
                </text>
              )
            })}

            {/* Radial axes */}
            {criteria.map((c, i) => {
              const { x, y, angle } = getCoordinates(i, 10)
              const labelPadding = 12
              const lx = cx + (rMax + labelPadding) * Math.cos(angle)
              const ly = cy + (rMax + labelPadding) * Math.sin(angle)

              // Adjust label positions dynamically to avoid cutting
              let textAnchor = 'middle'
              if (Math.cos(angle) > 0.15) textAnchor = 'start'
              else if (Math.cos(angle) < -0.15) textAnchor = 'end'

              let dy = '0.35em'
              if (Math.sin(angle) > 0.8) dy = '0.8em'
              else if (Math.sin(angle) < -0.8) dy = '-0.1em'

              // Wrap or abbreviate labels
              let shortLabel = c.label
              if (shortLabel.length > 15) {
                shortLabel = shortLabel.substring(0, 13) + '..'
              }

              return (
                <g key={i}>
                  {/* Axis Line */}
                  <line
                    x1={cx}
                    y1={cy}
                    x2={x}
                    y2={y}
                    stroke="var(--border-color)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    strokeOpacity="0.6"
                  />
                  {/* Text Label */}
                  <text
                    x={lx}
                    y={ly}
                    fill="var(--text-secondary)"
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor={textAnchor}
                    dy={dy}
                  >
                    {shortLabel}
                  </text>
                </g>
              )
            })}

            {/* Area polygon */}
            <polygon
              points={points}
              fill="rgba(139, 92, 246, 0.15)"
              stroke="var(--accent-color)"
              strokeWidth="2"
              style={{ transition: 'all 0.3s ease' }}
            />

            {/* Data points (dots) on polygon for interaction */}
            {criteria.map((c, i) => {
              const { x, y } = getCoordinates(i, c.value)
              const isHovered = hoveredPoint && hoveredPoint.index === i
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={isHovered ? '6' : '4'}
                  fill="var(--accent-color)"
                  stroke="var(--bg-secondary)"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                  onMouseEnter={() => setHoveredPoint({ index: i, label: c.label, value: c.value, x, y })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              )
            })}

            {/* Tooltip Overlay */}
            {hoveredPoint && (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={hoveredPoint.x - 45}
                  y={hoveredPoint.y - 28}
                  width="90"
                  height="20"
                  rx="4"
                  fill="var(--bg-secondary)"
                  stroke="var(--accent-color)"
                  strokeWidth="1"
                />
                <text
                  x={hoveredPoint.x}
                  y={hoveredPoint.y - 15}
                  textAnchor="middle"
                  fill="var(--text-primary)"
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {hoveredPoint.value} / 10
                </text>
              </g>
            )}
          </svg>
        ) : (
          /* Bar Chart Mode */
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '10px 0'
          }}>
            {criteria.map((c, i) => {
              const percentage = (c.value / 10) * 100
              let barColor = 'var(--accent-color)'
              if (c.value >= 8.5) barColor = 'var(--status-success)'
              else if (c.value < 6.0) barColor = 'var(--status-danger)'

              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      {c.label}
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {c.value}/10
                    </span>
                  </div>
                  {/* Progress Bar Track */}
                  <div style={{
                    height: '6px',
                    background: 'var(--border-color)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: '3px',
                      transition: 'width 0.4s ease-out'
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EvaluatorHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCharts, setExpandedCharts] = useState({})

  useEffect(() => {
    async function load() {
      try {
        const data = await getScoreHistory()
        setHistory(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleChart = (id) => {
    setExpandedCharts(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  return (
    <EvaluatorLayout pageTitle="Evaluation History" pageSubtitle="Review your past score submissions and AI consistency flags.">
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {history.length === 0 ? (
              <div style={{ padding: '32px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No historical scores found.
              </div>
            ) : (
              history.map(item => (
                <section key={item.id} className="ref-card" style={{ padding: '20px' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '12px',
                    marginBottom: '16px',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {item.team_name || `Team ${item.team_id}`}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          Submitted: {new Date(item.submitted_at).toLocaleDateString()}
                        </span>
                        <button 
                          onClick={() => toggleChart(item.id)}
                          style={{
                            background: 'rgba(139, 92, 246, 0.1)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            color: '#a78bfa',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'
                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)'
                            e.currentTarget.style.color = '#c084fc'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'
                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
                            e.currentTarget.style.color = '#a78bfa'
                          }}
                        >
                          {expandedCharts[item.id] ? '📊 Hide Analytics' : '📊 Analyze Rubrics'}
                        </button>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <small style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Total Score</small>
                      <strong style={{ fontSize: '24px', color: 'var(--status-success)', fontFamily: 'monospace' }}>{item.score_value}</strong>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '10px',
                    marginBottom: '16px'
                  }}>
                    {Object.entries(item.criteria_breakdown || {}).map(([key, val]) => (
                      <div key={key} style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={key}>{key}</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'monospace', marginTop: '2px' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {expandedCharts[item.id] && (
                    <RubricAnalyticsPanel criteriaBreakdown={item.criteria_breakdown} scoreValue={item.score_value} />
                  )}

                  {item.notes && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      margin: '12px 0'
                    }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '10px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Evaluator Remarks</h4>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>{item.notes}</p>
                    </div>
                  )}

                  {item.ai_consistency_flag && (
                    <div style={{
                      padding: '12px',
                      background: 'rgba(251, 191, 36, 0.08)',
                      border: '1px solid rgba(251, 191, 36, 0.25)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>⚠️</span>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 'bold', color: 'var(--status-warning)', textTransform: 'uppercase' }}>AI Consistency Flag</h4>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>{item.ai_consistency_note}</p>
                      </div>
                    </div>
                  )}
                </section>
              ))
            )}
          </div>
        )}
      </div>
    </EvaluatorLayout>
  )
}

