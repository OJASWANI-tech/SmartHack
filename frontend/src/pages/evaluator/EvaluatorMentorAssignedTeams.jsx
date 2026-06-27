import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StatusStrip from '../../components/common/StatusStrip'
import { assignedTeams } from '../../components/evaluation/evaluatorMentorMockData'

function badgeTone(status) {
  if (status === 'Evaluated') return 'success'
  if (status === 'Pending') return 'warn'
  return ''
}

function AssignedTeams() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return assignedTeams
    return assignedTeams.filter((team) => (
      team.name.toLowerCase().includes(query) ||
      team.id.toLowerCase().includes(query) ||
      team.domain.toLowerCase().includes(query)
    ))
  }, [search])

  return (
    <div className="committee-reference-dashboard em-page">
      <StatusStrip
        items={[
          { label: 'Total', value: '8' },
          { label: 'Evaluated', value: '5' },
          { label: 'Pending', value: '3' },
          { label: 'Deadline', value: 'Aug 15' },
        ]}
      />

      <section className="ref-card em-card">
        <div className="em-card-header">
          <div className="ref-section-title">
            <h3>Assigned Teams</h3>
          </div>
          <div className="table-controls">
            <input
              aria-label="Search assigned teams"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search teams"
            />
          </div>
        </div>
        <div className="data-table-wrap">
          <table className="pipeline-table em-assigned-table">
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Team Name</th>
                <th>Members</th>
                <th>Domain</th>
                <th>Submission</th>
                <th>Eval Status</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map((team) => (
                <tr key={team.id}>
                  <td><strong>{team.name}</strong><small>{team.id}</small></td>
                  <td>{team.members}</td>
                  <td><span className="badge">{team.domain}</span></td>
                  <td>{team.submission}</td>
                  <td><span className={`badge ${badgeTone(team.evalStatus)}`}>{team.evalStatus}</span></td>
                  <td>{team.score ?? '—'}</td>
                  <td>
                    <button
                      className="ref-outline-button inline-button"
                      type="button"
                      disabled={team.evalStatus === 'Locked'}
                      onClick={() => navigate(`/em/evaluation-sheet?team=${team.id}`)}
                    >
                      {team.evalStatus === 'Pending' ? 'Evaluate →' : 'View →'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default AssignedTeams
