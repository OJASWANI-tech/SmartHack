function RankingsTable({ rankings, sortKey, sortDir, onSort }) {
  const headers = [
    { key: 'rank', label: 'Rank' },
    { key: 'name', label: 'Team' },
    { key: 'domain', label: 'Domain' },
    { key: 'c1', label: 'P.Und' },
    { key: 'c2', label: 'Sol' },
    { key: 'c3', label: 'Tech' },
    { key: 'c4', label: 'Innov' },
    { key: 'c5', label: 'Pres' },
    { key: 'score', label: 'Total' },
    { key: 'qualification', label: 'Status' },
  ]

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="data-table-wrap">
      <table className="pipeline-table em-rankings-table">
        <colgroup>
          <col style={{ width: '7%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header.key}>
                <button type="button" onClick={() => onSort(header.key)}>
                  {header.label}{sortKey === header.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rankings.map((team) => (
            <tr key={team.id}>
              <td><strong>{medals[team.rank - 1] || team.rank}</strong></td>
              <td>{team.name}</td>
              <td><span className="badge">{team.domain}</span></td>
              <td>{team.breakdown?.c1 ?? '—'}</td>
              <td>{team.breakdown?.c2 ?? '—'}</td>
              <td>{team.breakdown?.c3 ?? '—'}</td>
              <td>{team.breakdown?.c4 ?? '—'}</td>
              <td>{team.breakdown?.c5 ?? '—'}</td>
              <td><strong>{team.score ?? '—'}</strong></td>
              <td><span className={`badge ${team.tone}`}>{team.qualification}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default RankingsTable
