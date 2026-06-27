import { useState } from 'react'
import StageProgress from '../../components/dashboard/StageProgress'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import TeamConfigForm from '../../components/teams/TeamConfigForm'

function CommitteeTeamConfig() {
  // Custom toast notification state to replace window.alert() in child components
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    // Automatically dismiss after 5 seconds
    setTimeout(() => {
      setToast(null)
    }, 5000)
  }

  return (
    <CommitteeLayout 
      statusItems={[{ label: 'Config', value: 'Draft' }]} 
      pageTitle="Team Formation Config" 
      pageSubtitle="Control the team-generation rules before asking the orchestration engine to propose balanced teams."
    >
      {/* Global CSS Inject for slide-in notification animation */}
      <style>{`
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-toast-banner {
          animation: slideInDown 0.25s ease-out forwards;
        }
      `}</style>

      <div style={{ padding: '0 0.5rem', position: 'relative' }}>
        
        {/* Custom Application Toast Banner */}
        {toast && (
          <div 
            className="custom-toast-banner"
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: '500',
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '1px solid',
              background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              borderColor: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: toast.type === 'success' ? '#34d399' : '#f87171',
              zIndex: 100
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{toast.message}</span>
            </div>
            <button 
              onClick={() => setToast(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '0 0.25rem',
                opacity: 0.7
              }}
            >
              ×
            </button>
          </div>
        )}

        <div className="content-grid">
          {/* Passed the showToast action down so TeamConfigForm can replace its alerts */}
          <TeamConfigForm showToast={showToast} />
          <StageProgress current={1} />
        </div>
      </div>
    </CommitteeLayout>
  )
}

export default CommitteeTeamConfig