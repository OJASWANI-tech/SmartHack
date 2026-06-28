import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardByRole } from '../../navigation'
import { getCurrentRole, setMockRole, VALID_ROLES } from '../../services/auth'

const roleLabels = {
  admin: 'Admin',
  committee: 'Committee Member',
  'dynamic-committee': 'Dynamic Sandbox Track',
  participant: 'Participant',
  evaluator: 'Evaluator',
}

function RoleSwitcher() {
  const navigate = useNavigate()
  const currentRole = getCurrentRole()
  const [evaluators, setEvaluators] = useState([])
  const [activeEvaluatorToken, setActiveEvaluatorToken] = useState(localStorage.getItem('evaluator_token') || '')
  const [participants, setParticipants] = useState([])
  const [activeParticipantId, setActiveParticipantId] = useState(localStorage.getItem('participant_id') || '')

  const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id') || 'd9914688-e56e-455b-a634-ef3b6b9c96e3'

  useEffect(() => {
    if (currentRole === 'evaluator') {
      const fetchEvaluators = async () => {
        try {
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const response = await fetch(`${baseURL}/api/v1/events/${activeEventId}/evaluators`)
          if (response.ok) {
            const data = await response.json()
            setEvaluators(data || [])
            if (data && data.length > 0) {
              const currentToken = localStorage.getItem('evaluator_token') || localStorage.getItem('HackSmart_token')
              
              let evaluatorId = null
              if (currentToken && currentToken.split('.').length === 3) {
                try {
                  const payload = JSON.parse(atob(currentToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
                  evaluatorId = payload.evaluator_id
                } catch (e) {
                  // Ignore parse mismatches
                }
              }

              const tokenExists = evaluatorId 
                ? data.some(ev => ev.id === evaluatorId)
                : data.some(ev => ev.access_token === currentToken)

              if (!tokenExists) {
                const fallbackToken = data[0].access_token
                localStorage.setItem('evaluator_token', fallbackToken)
                setActiveEvaluatorToken(fallbackToken)
                window.location.reload()
              } else if (evaluatorId && !localStorage.getItem('evaluator_token')) {
                localStorage.setItem('evaluator_token', currentToken)
                setActiveEvaluatorToken(currentToken)
              }
            } else {
              const currentToken = localStorage.getItem('evaluator_token')
              if (currentToken) {
                localStorage.removeItem('evaluator_token')
                setActiveEvaluatorToken('')
                window.location.reload()
              }
            }
          }
        } catch (err) {
          console.error(err)
        }
      }
      fetchEvaluators()
    } else if (currentRole === 'participant') {
      const fetchParticipants = async () => {
        try {
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const response = await fetch(`${baseURL}/api/v1/events/${activeEventId}/participants`)
          if (response.ok) {
            const data = await response.json()
            const sortedData = (data || []).sort((a, b) => {
              const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
              const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
              return nameA.localeCompare(nameB)
            })
            setParticipants(sortedData)
            if (sortedData && sortedData.length > 0) {
              const currentPId = localStorage.getItem('participant_id')
              const pExists = sortedData.some(p => p.id === currentPId)
              if (!pExists) {
                const fallbackPId = sortedData[0].id
                localStorage.setItem('participant_id', fallbackPId)
                setActiveParticipantId(fallbackPId)
                window.location.reload()
              }
            }
          }
        } catch (err) {
          console.error(err)
        }
      }
      fetchParticipants()
    }
  }, [currentRole, activeEventId])

  async function handleEvaluatorChange(event) {
    const token = event.target.value
    localStorage.setItem('evaluator_token', token)
    setActiveEvaluatorToken(token)
    window.location.reload()
  }

  async function handleParticipantChange(event) {
    const pId = event.target.value
    localStorage.setItem('participant_id', pId)
    setActiveParticipantId(pId)
    window.location.reload()
  }

  async function handleChange(event) {
    const nextRole = event.target.value
    setMockRole(nextRole)
    
    let activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id')
    if (!activeEventId) {
      activeEventId = 'd9914688-e56e-455b-a634-ef3b6b9c96e3'
      localStorage.setItem('current_event_id', activeEventId)
      localStorage.setItem('event_id', activeEventId)
    }

    if (nextRole === 'participant') {
      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await fetch(`${baseURL}/api/v1/events/${activeEventId}/participants`)
        if (response.ok) {
          const participants = await response.json()
          if (participants && participants.length > 0) {
            localStorage.setItem('participant_id', participants[0].id)
          } else {
            localStorage.setItem('participant_id', '19a3e182-ed5a-429c-9ddd-0203aa4f264d')
          }
        } else {
          localStorage.setItem('participant_id', '19a3e182-ed5a-429c-9ddd-0203aa4f264d')
        }
      } catch (err) {
        localStorage.setItem('participant_id', '19a3e182-ed5a-429c-9ddd-0203aa4f264d')
      }
    } else if (nextRole === 'evaluator') {
      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await fetch(`${baseURL}/api/v1/events/${activeEventId}/evaluators`)
        if (response.ok) {
          const evs = await response.json()
          if (evs && evs.length > 0) {
            const firstEval = evs[0]
            if (firstEval && firstEval.access_token) {
              localStorage.setItem('evaluator_token', firstEval.access_token)
            } else {
              localStorage.setItem('evaluator_token', 'eval_token_a88f9500e2e6')
            }
          } else {
            localStorage.setItem('evaluator_token', 'eval_token_a88f9500e2e6')
          }
        } else {
          localStorage.setItem('evaluator_token', 'eval_token_a88f9500e2e6')
        }
      } catch (err) {
        localStorage.setItem('evaluator_token', 'eval_token_a88f9500e2e6')
      }
    }
    
    // Fallback alignment map check
    const targetDashboard = dashboardByRole[nextRole] || '/committee/dashboard'
    navigate(targetDashboard, { replace: true })
  }

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <label className="role-switcher" style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#fff', fontSize: '13px' }}>
        <span>Active Scope:</span>
        <select 
          value={currentRole} 
          onChange={handleChange}
          style={{
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {VALID_ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role] || role.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      {/* Renders sub-selectors depending on test criteria scopes */}
      {currentRole === 'evaluator' && evaluators.length > 0 && (
        <select value={activeEvaluatorToken} onChange={handleEvaluatorChange} style={{ background: '#1e293b', color: '#fff', padding: '4px', borderRadius: '6px' }}>
          {evaluators.map(ev => (
            <option key={ev.id} value={ev.access_token}>{ev.name} ({ev.is_calibrated ? 'ðŸ“Š Calibrated' : 'â³ Pending'})</option>
          ))}
        </select>
      )}

      {currentRole === 'participant' && participants.length > 0 && (
        <select value={activeParticipantId} onChange={handleParticipantChange} style={{ background: '#1e293b', color: '#fff', padding: '4px', borderRadius: '6px' }}>
          {participants.map(p => (
            <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
          ))}
        </select>
      )}
    </div>
  )
}

export default RoleSwitcher
