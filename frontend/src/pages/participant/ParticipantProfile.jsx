import { useState, useEffect } from 'react'
import ParticipantLayout from '../../components/layout/ParticipantLayout'
import { fetchDashboard } from '../../api/participant'

function Skeleton({ width = '100%', height = '16px', radius = '6px', style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-color) 50%, var(--bg-secondary) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  )
}

function ParticipantProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [emailNotif, setEmailNotif] = useState(true)
  const [pushNotif, setPushNotif] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchDashboard()
        setProfile(data.profile)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleThemeToggle = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setThemeState(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    // Dispatch event so layout top-right toggle updates too
    window.dispatchEvent(new CustomEvent('HackSmart-theme-change', { detail: nextTheme }))
  };

  // Listen to external theme changes (like top-right toggle)
  useEffect(() => {
    const handleExternalTheme = (e) => {
      if (e.detail) {
        setThemeState(e.detail)
      }
    }
    window.addEventListener('HackSmart-theme-change', handleExternalTheme)
    return () => window.removeEventListener('HackSmart-theme-change', handleExternalTheme)
  }, [])

  const qStatus = profile?.qualification_status || 'pending'
  const badgeColor = qStatus === 'qualified' ? '#38bdf8' : '#fbbf24'
  const badgeBg = qStatus === 'qualified' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(251, 191, 36, 0.15)'

  const personalItems = [
    { label: 'Full Name', value: profile?.name },
    { label: 'Institution', value: profile?.institution },
    { label: 'Experience Level', value: profile?.experience_level ? profile.experience_level.charAt(0).toUpperCase() + profile.experience_level.slice(1) : 'Beginner' },
    { label: 'Department / Domain', value: profile?.domain },
    { label: 'Location', value: 'Bangalore, India' }
  ]

  return (
    <ParticipantLayout>
      <div className="committee-reference-dashboard">
        <header className="ref-header">
          <div>
            <h2>My Profile</h2>
            <p>Manage your participant credentials, skills tags, and portal preferences</p>
          </div>
        </header>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', marginBottom: '20px', fontSize: '13px' }}>
            âš ï¸ Could not load profile: {error}. Make sure your event_id and participant_id are set correctly.
          </div>
        )}

        {/* Identity Row Card */}
        <section className="ref-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #7dbbff 0%, #adadfb 100%)',
              color: '#101927',
              fontWeight: '900',
              display: 'grid',
              placeItems: 'center',
              fontSize: '24px'
            }}>
              {loading ? <Skeleton width="32px" height="32px" radius="999px" /> : (profile?.avatar_initials || 'P')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '850' }}>
                  {loading ? <Skeleton width="150px" height="22px" /> : profile?.name}
                </h3>
                {!loading && (
                  <span className="badge" style={{ background: badgeBg, color: badgeColor }}>
                    {qStatus.charAt(0).toUpperCase() + qStatus.slice(1)}
                  </span>
                )}
              </div>
              <div style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {loading ? <Skeleton width="220px" height="14px" style={{ marginTop: '4px' }} /> : `${profile?.email} â€¢ ${profile?.phone || 'No phone number'}`}
              </div>
              <small style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                {loading ? <Skeleton width="100px" height="10px" style={{ marginTop: '4px' }} /> : 'Member since 10 May 2024'}
              </small>
            </div>
          </div>
        </section>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Personal Details */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title">
                <h3>Personal Information</h3>
                <button type="button" style={{ fontSize: '10px', padding: '4px 8px' }}>Edit</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                {personalItems.map((item) => (
                  <div key={item.label} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <small style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                      {item.label}
                    </small>
                    {loading ? (
                      <Skeleton width="120px" height="15px" style={{ marginTop: '4px' }} />
                    ) : (
                      <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>{item.value || 'N/A'}</strong>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Skills */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title">
                <h3>Expertise & Skills</h3>
                <button type="button" style={{ fontSize: '10px', padding: '4px 8px' }}>Edit</button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 12px 0' }}>
                These skills were verified via intake form and are used for team balance matching:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {loading ? (
                  <>
                    <Skeleton width="60px" height="24px" radius="12px" style={{ display: 'inline-block' }} />
                    <Skeleton width="80px" height="24px" radius="12px" style={{ display: 'inline-block' }} />
                    <Skeleton width="50px" height="24px" radius="12px" style={{ display: 'inline-block' }} />
                  </>
                ) : (
                  profile?.skill_tags && profile.skill_tags.length > 0 ? (
                    profile.skill_tags.map((skill) => (
                      <span key={skill} className="badge" style={{ fontSize: '11px', padding: '4px 10px', background: 'var(--bg-primary)' }}>
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No skills listed</span>
                  )
                )}
              </div>
            </section>
          </div>

          {/* Preferences */}
          <section className="ref-card" style={{ padding: '20px' }}>
            <div className="ref-section-title">
              <h3>Portal Preferences</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>Email Notifications</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={emailNotif}
                    onChange={(e) => setEmailNotif(e.target.checked)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emailNotif ? 'On' : 'Off'}</span>
                </div>
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>Push Notifications</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={pushNotif}
                    onChange={(e) => setPushNotif(e.target.checked)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pushNotif ? 'On' : 'Off'}</span>
                </div>
              </label>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>Dark Mode Theme</span>
                <button
                  type="button"
                  onClick={handleThemeToggle}
                  className="ref-primary-button"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    padding: '4px 12px'
                  }}
                >
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ParticipantLayout>
  )
}

export default ParticipantProfile

