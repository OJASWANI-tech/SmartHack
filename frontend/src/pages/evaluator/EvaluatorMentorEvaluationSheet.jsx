import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StatusStrip from '../../components/common/StatusStrip'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import CriteriaScoreRow from '../../components/evaluation/CriteriaScoreRow'
import { assignedTeams, criteria, savedEvaluations } from '../../components/evaluation/evaluatorMentorMockData'

function clampScore(value, max) {
  if (value === '') return ''
  return Math.min(max, Math.max(0, Number(value)))
}

function EvaluationForm({ selectedTeam }) {
  const saved = savedEvaluations[selectedTeam.id]
  const [scores, setScores] = useState(() => (
    saved ? Object.fromEntries(criteria.map((item) => [item.id, saved[item.id] ?? ''])) : {}
  ))
  const [feedback, setFeedback] = useState(saved?.feedback || '')
  const [internalNotes, setInternalNotes] = useState(saved?.notes || '')
  const [isDraft, setIsDraft] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(saved?.submitted ?? false)
  const [toast, setToast] = useState('')

  const total = useMemo(() => criteria.reduce((sum, item) => sum + (Number(scores[item.id]) || 0), 0), [scores])
  const isComplete = criteria.every((item) => scores[item.id] !== undefined && scores[item.id] !== '')
  const submissionVersion = selectedTeam.submissionFiles[0]?.match(/v\d+/i)?.[0] || '—'

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }

  function handleScoreChange(criterion, value) {
    setScores((current) => ({ ...current, [criterion.id]: clampScore(value, criterion.max) }))
  }

  function scoreTone() {
    if (total >= 75) return 'success-text'
    if (total >= 50) return 'warn-text'
    return 'danger-text'
  }

  return (
    <>
      <StatusStrip
        items={[
          { label: 'Team ID', value: selectedTeam.id },
          { label: 'Domain', value: selectedTeam.domain },
          { label: 'Submission version', value: submissionVersion },
          { label: 'Current eval status', value: selectedTeam.evalStatus },
        ]}
      />

      <div className="em-sheet-grid">
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Criteria Scoring</h3></div>
          <div className="em-criteria-list">
            {criteria.map((criterion) => (
              <CriteriaScoreRow
                criterion={criterion}
                key={criterion.id}
                value={scores[criterion.id] ?? ''}
                onChange={handleScoreChange}
              />
            ))}
          </div>
          <div className="em-total-row">
            <span className={scoreTone()}>Total: {total} / 100</span>
          </div>
          <div className="em-button-row">
            <button className="ref-outline-button inline-button" type="button" onClick={() => { setIsDraft(true); showToast('Draft saved') }}>
              {isDraft ? 'Draft Saved' : 'Save Draft'}
            </button>
            <button className="ref-primary-button em-primary-compact" type="button" disabled={!isComplete} onClick={() => { setIsSubmitted(true); showToast('Evaluation submitted') }}>
              Submit Evaluation
            </button>
          </div>
        </section>

        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Submission Files</h3></div>
          <div className="em-list">
            {selectedTeam.submissionFiles.length > 0 ? selectedTeam.submissionFiles.map((file) => (
              <div className="em-file-row" key={file}>
                <span className="committee-nav-icon">F</span>
                <strong>{file}</strong>
                <a href="#" onClick={(event) => event.preventDefault()}>Open</a>
              </div>
            )) : <p className="em-muted">No files submitted yet</p>}
            {selectedTeam.github && (
              <div className="em-file-row">
                <span className="committee-nav-icon">G</span>
                <strong>{selectedTeam.github}</strong>
                <a href={`https://${selectedTeam.github}`} target="_blank" rel="noreferrer">Open</a>
              </div>
            )}
          </div>
          <a className="ref-outline-button em-link-button" href="#" onClick={(event) => event.preventDefault()}>Open Submission Portal →</a>
        </section>
      </div>

      <section className="ref-card em-card">
        <div className="ref-section-title"><div><h3>Written Feedback</h3><p>Shown to team after results are released</p></div></div>
        <textarea rows="4" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Provide constructive feedback on the team's submission..." />
      </section>

      <section className="ref-card em-card em-warning-card">
        <div className="ref-section-title"><div><h3>Internal Notes</h3><p>Private - never visible to participants</p></div></div>
        <textarea rows="3" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Private evaluator notes..." />
      </section>

      {isSubmitted && (
        <section className="ref-card em-card em-success-card">
          <div className="ref-section-title">
            <h3>Submitted Summary</h3>
            <span className="badge success">Submitted</span>
          </div>
          <div className="em-summary-bars">
            {criteria.map((criterion) => (
              <div className="progress-row" key={criterion.id}>
                <span>{criterion.label}</span>
                <div className="progress-bar"><i style={{ width: `${((Number(scores[criterion.id]) || 0) / criterion.max) * 100}%` }} /></div>
                <small>{scores[criterion.id] || 0}/{criterion.max}</small>
              </div>
            ))}
          </div>
          <p className="em-muted">Submitted on: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </section>
      )}

      {toast && <div className="em-toast">{toast}</div>}
    </>
  )
}

function EvaluationSheet() {
  const [searchParams] = useSearchParams()
  const [selectedTeamId, setSelectedTeamId] = useState(searchParams.get('team') || assignedTeams[0].id)
  const selectedTeam = assignedTeams.find((team) => team.id === selectedTeamId) || assignedTeams[0]
  const selectedIndex = assignedTeams.findIndex((team) => team.id === selectedTeam.id)

  function moveTeam(offset) {
    const nextIndex = (selectedIndex + offset + assignedTeams.length) % assignedTeams.length
    setSelectedTeamId(assignedTeams[nextIndex].id)
  }

  return (
    <EvaluatorLayout pageTitle="Evaluation Sheet" pageSubtitle="Score assigned teams and submit written feedback." statusItems={[{ label: 'Team', value: selectedTeam.name }, { label: 'Status', value: selectedTeam.evalStatus }]}>
      <div className="committee-reference-dashboard em-page">

      <section className="ref-card em-card em-evaluation-toolbar">
        <label>
          <span>Evaluating</span>
          <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)}>
            {assignedTeams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
          </select>
        </label>
        <div className="em-button-row">
          <button className="ref-outline-button inline-button" type="button" onClick={() => moveTeam(-1)}>← Previous</button>
          <button className="ref-outline-button inline-button" type="button" onClick={() => moveTeam(1)}>Next →</button>
        </div>
      </section>

      <EvaluationForm key={selectedTeam.id} selectedTeam={selectedTeam} />
      </div>
    </EvaluatorLayout>
  )
}

export default EvaluationSheet
