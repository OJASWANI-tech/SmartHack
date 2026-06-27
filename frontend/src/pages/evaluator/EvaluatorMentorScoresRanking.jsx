import { useMemo, useState } from 'react'
import StatusStrip from '../../components/common/StatusStrip'
import { assignedTeams, savedEvaluations } from '../../components/evaluation/evaluatorMentorMockData'
import RankingsTable from '../../components/evaluation/RankingsTable'

function getQualification(score) {
  if (score == null) return { qualification: 'Pending', tone: '' }
  if (score >= 85) return { qualification: 'Qualified', tone: 'success' }
  if (score >= 70) return { qualification: 'Review', tone: 'warn' }
  return { qualification: 'Eliminated', tone: 'danger' }
}

function ScoresRanking() {
  const [sortKey, setSortKey] = useState('score')
  const [sortDir, setSortDir] = useState('desc')
  const evaluated = assignedTeams.filter((team) => team.evalStatus === 'Evaluated')
  const avgScore = evaluated.length ? (evaluated.reduce((sum, team) => sum + team.score, 0) / evaluated.length).toFixed(1) : '—'
  const topScore = evaluated.length ? Math.max(...evaluated.map((team) => team.score)).toFixed(1) : '—'

  const rankings = useMemo(() => {
    const rows = evaluated.map((team) => ({
      ...team,
      breakdown: savedEvaluations[team.id],
      ...getQualification(team.score),
    }))
    rows.sort((a, b) => {
      const left = a[sortKey] ?? a.breakdown?.[sortKey] ?? ''
      const right = b[sortKey] ?? b.breakdown?.[sortKey] ?? ''
      if (typeof left === 'number' && typeof right === 'number') return sortDir === 'asc' ? left - right : right - left
      return sortDir === 'asc' ? String(left).localeCompare(String(right)) : String(right).localeCompare(String(left))
    })
    return rows.map((team, index) => ({ ...team, rank: index + 1 }))
  }, [evaluated, sortDir, sortKey])

  const buckets = [
    { label: '0-60', min: 0, max: 60 },
    { label: '61-70', min: 61, max: 70 },
    { label: '71-80', min: 71, max: 80 },
    { label: '81-90', min: 81, max: 90 },
    { label: '91-100', min: 91, max: 100 },
  ].map((bucket) => ({
    ...bucket,
    count: evaluated.filter((team) => team.score >= bucket.min && team.score <= bucket.max).length,
  }))
  const maxBucket = Math.max(...buckets.map((bucket) => bucket.count), 1)

  const domains = Object.values(assignedTeams.reduce((acc, team) => {
    acc[team.domain] ||= { domain: team.domain, count: 0, scores: [] }
    acc[team.domain].count += 1
    if (team.score != null) acc[team.domain].scores.push(team.score)
    return acc
  }, {}))

  function handleSort(key) {
    setSortKey(key)
    setSortDir((current) => (sortKey === key && current === 'desc' ? 'asc' : 'desc'))
  }

  return (
    <div className="committee-reference-dashboard em-page">
      <StatusStrip items={[{ label: 'Evaluated', value: '5/8' }, { label: 'Avg Score', value: avgScore }, { label: 'Top Score', value: topScore }]} />
      <section className="ref-card em-card">
        <div className="ref-section-title"><h3>Rankings</h3></div>
        <RankingsTable rankings={rankings} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
      </section>
      <div className="em-two-col">
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Score Distribution</h3></div>
          <div className="em-bar-list">
            {buckets.map((bucket) => (
              <div className="em-bar-row" key={bucket.label}>
                <span>{bucket.label}</span>
                <div><i style={{ width: `${(bucket.count / maxBucket) * 100}%` }} /></div>
                <strong>{bucket.count}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Domain Breakdown</h3></div>
          <div className="data-table-wrap">
            <table className="pipeline-table">
              <thead><tr><th>Domain</th><th>Teams</th><th>Avg Score</th><th>Top Score</th></tr></thead>
              <tbody>
                {domains.map((row) => (
                  <tr key={row.domain}>
                    <td>{row.domain}</td>
                    <td>{row.count}</td>
                    <td>{row.scores.length ? (row.scores.reduce((sum, score) => sum + score, 0) / row.scores.length).toFixed(1) : '—'}</td>
                    <td>{row.scores.length ? Math.max(...row.scores).toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ScoresRanking
