import { useState, useEffect } from 'react'
import ParticipantLayout from '../../components/layout/ParticipantLayout'
import { fetchSubmissions, uploadSubmission, updateGithubUrl } from '../../api/participant'

const CHECKLIST_ITEMS = [
  'I confirm that all team members have reviewed these deliverables.',
  'I verify that the links are public and accessible to evaluators.',
  'I understand that submissions can be updated until the deadline.',
]

function ParticipantSubmissions() {
  const [githubUrl, setGithubUrl] = useState('')
  const [pptUrl, setPptUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [checks, setChecks] = useState([false, false, false])
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [githubSaving, setGithubSaving] = useState(false)
  const [message, setMessage] = useState(null) // { text, type: 'success'|'error' }
  const [loading, setLoading] = useState(true)
  const [stageId, setStageId] = useState(null)

  // Load existing submission from backend
  useEffect(() => {
    fetchSubmissions()
      .then(data => {
        const existing = data.submissions?.[0]
        if (existing) {
          setGithubUrl(existing.github_url || '')
          setPptUrl(existing.ppt_url || '')
          setVideoUrl(existing.demo_video_url || '')
          setNotes(existing.notes || '')
          setSubmitted(existing.ppt_url != null || existing.demo_video_url != null)
          setStageId(existing.stage_id)
        }
      })
      .catch(() => {}) // non-fatal
      .finally(() => setLoading(false))
  }, [])

  const handleCheckChange = (index) => {
    setChecks(prev => { const u = [...prev]; u[index] = !u[index]; return u })
  }

  const allChecked = checks.every(Boolean)
  const canSubmit = pptUrl && videoUrl && allChecked && !submitting

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setMessage(null)

    // We need a stage_id â€” fetch it from the journey if not cached
    let sid = stageId
    if (!sid) {
      try {
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const token = localStorage.getItem('HackSmart_token')
          const payload = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) : {}
          const eventId = payload.event_id || localStorage.getItem('current_event_id')
          const participantId = payload.participant_id || localStorage.getItem('participant_id')

          // Fetch all stages directly and find the active submission stage
          const res = await fetch(`${baseURL}/api/v1/events/${eventId}/stages`)
          const allStages = await res.json()
          const activeStage = allStages.find(s => s.name === 'Submission' && s.status === 'active')
          sid = activeStage?.id
          setStageId(sid)
      } catch (err) {}
    }

    if (!sid) {
      setMessage({ text: 'Could not determine the active stage for submission. Please try again.', type: 'error' })
      setSubmitting(false)
      return
    }

    try {
      await uploadSubmission({ stageId: sid, pptUrl, demoVideoUrl: videoUrl, notes })
      if (githubUrl.trim()) {
        await updateGithubUrl(githubUrl)
      }
      setSubmitted(true)
      setMessage({ text: 'âœ… Submission saved successfully!', type: 'success' })
    } catch (err) {
      setMessage({ text: `âŒ Submission failed: ${err.message}`, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleGithubSave = async () => {
    if (!githubUrl.trim()) return
    setGithubSaving(true)
    setMessage(null)
    try {
      await updateGithubUrl(githubUrl)
      setMessage({ text: 'âœ… GitHub URL saved!', type: 'success' })
    } catch (err) {
      setMessage({ text: `âŒ GitHub save failed: ${err.message}`, type: 'error' })
    } finally {
      setGithubSaving(false)
    }
  }

  if (loading) return (
    <ParticipantLayout>
      <div className="committee-reference-dashboard">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Loading submission status...
        </div>
      </div>
    </ParticipantLayout>
  )

  return (
    <ParticipantLayout pageTitle="Project Submission" pageSubtitle="Upload project deliverables for your team. All links must be publicly accessible.">
      <div className="committee-reference-dashboard">

        {/* Status strip */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <article className="ref-mini-card">
            <span className="ref-icon" style={{ background: submitted ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 191, 36, 0.1)', color: submitted ? '#4ade80' : '#fbbf24' }}>
              {submitted ? 'âœ“' : 'â±'}
            </span>
            <div>
              <strong>{submitted ? 'Submitted' : 'Pending'}</strong>
              <p>Submission Status</p>
              <small>{submitted ? 'Saved to backend' : 'Awaiting upload'}</small>
            </div>
          </article>
          <article className="ref-mini-card">
            <span className="ref-icon">ðŸ“…</span>
            <div><strong>Active Stage</strong><p>Deadline</p><small>Submit before stage closes</small></div>
          </article>
          <article className="ref-mini-card">
            <span className="ref-icon">âš¡</span>
            <div>
              <strong>{submitted ? '1' : '0'} / 1</strong>
              <p>Limit</p>
              <small>One submission per team</small>
            </div>
          </article>
        </section>

        {message && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: '600',
            background: message.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: message.type === 'success' ? '#4ade80' : '#f87171'
          }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Main Form */}
          <section className="ref-card" style={{ padding: '24px' }}>
            <div className="ref-section-title"><h3>Deliverable Links</h3></div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                  GitHub Repository URL
                </label>
                <input type="url" placeholder="https://github.com/username/project"
                  value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              {[
                { label: 'Presentation Link (PPT/PDF) *', placeholder: 'https://docs.google.com/presentation/...', value: pptUrl, onChange: setPptUrl },
                { label: 'Demo Video Link (Loom/Drive) *', placeholder: 'https://loom.com/share/...', value: videoUrl, onChange: setVideoUrl },
              ].map(({ label, placeholder, value, onChange }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>{label}</label>
                  <input type="url" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>Notes (Optional)</label>
                <textarea placeholder="Additional details for evaluators..." value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px', resize: 'none' }}
                />
              </div>

              <button type="submit" disabled={!canSubmit} className="ref-primary-button"
                style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed', textAlign: 'center', padding: '12px', borderRadius: '6px', fontSize: '14px', width: '100%', marginTop: '4px' }}>
                {submitting ? 'Saving...' : submitted ? 'Update Submission' : 'Submit Deliverables'}
              </button>
            </form>
          </section>

          {/* Checklist + Guidelines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title"><h3>Readiness Checklist</h3></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {CHECKLIST_ITEMS.map((item, idx) => (
                  <label key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checks[idx]} onChange={() => handleCheckChange(idx)} style={{ marginTop: '3px' }} />
                    <span style={{ fontSize: '11px', lineHeight: '1.4' }}>{item}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title"><h3>Guidelines</h3></div>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                <li>GitHub repo must be public or evaluators must have access.</li>
                <li>Presentation: Problem, Architecture, Tech Stack, Business model.</li>
                <li>Video demo should be maximum 3 minutes.</li>
                <li>GitHub URL can be updated anytime; PPT/Video locks on first save.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </ParticipantLayout>
  )
}

export default ParticipantSubmissions

