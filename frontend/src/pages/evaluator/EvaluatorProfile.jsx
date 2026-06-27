import React, { useState, useEffect } from 'react'
import EvaluatorLayout from '../../components/layout/EvaluatorLayout'
import { getProfile, updateProfile } from '../../services/evaluator'

export default function EvaluatorProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Form states
  const [institution, setInstitution] = useState('')
  const [domain, setDomain] = useState('')
  const [maxWorkload, setMaxWorkload] = useState(5)
  const [availability, setAvailability] = useState({
    morning: true,
    afternoon: true,
    evening: false
  })

  useEffect(() => {
    async function load() {
      try {
        const prof = await getProfile()
        setProfile(prof)
        if (prof) {
          setInstitution(prof.institution || '')
          setDomain(prof.domain || '')
          setMaxWorkload(prof.max_workload || 5)
          setAvailability(prof.availability || { morning: true, afternoon: true, evening: false })
        }
      } catch (e) {
        setError("Failed to load profile.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError(null)
    
    try {
      const updated = await updateProfile({
        institution,
        domain,
        max_workload: parseInt(maxWorkload),
        availability
      })
      setProfile(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError("Failed to update profile.")
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailability = (period) => {
    setAvailability(prev => ({
      ...prev,
      [period]: !prev[period]
    }))
  }

  return (
    <EvaluatorLayout pageTitle="Judge Profile & Availability" pageSubtitle="Configure your expertise domains, workload capacities, and availability blocks for scheduling.">
      <div className="committee-reference-dashboard">

        {success && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '20px', fontSize: '13.5px', fontWeight: 'bold' }}>
            ✓ Profile and availability constraints saved successfully to backend.
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', marginBottom: '20px', fontSize: '13.5px' }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
              animation: 'shimmer 1.4s infinite'
            }}></div>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* Left Card: Profile Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section className="ref-card" style={{ padding: '24px' }}>
                <div className="ref-section-title" style={{ marginBottom: '20px' }}>
                  <h3>Expertise Settings</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
                      <input 
                        type="text" 
                        value={profile?.name || ''} 
                        disabled 
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontSize: '13.5px',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
                      <input 
                        type="text" 
                        value={profile?.email || ''} 
                        disabled 
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontSize: '13.5px',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Institution / Company</label>
                      <input 
                        type="text" 
                        value={institution} 
                        disabled
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontSize: '13.5px',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Primary Domain</label>
                      <input 
                        type="text" 
                        value={domain} 
                        disabled
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontSize: '13.5px',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Max Workload Capacity (Teams)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="15"
                      value={maxWorkload} 
                      onChange={(e) => setMaxWorkload(e.target.value)} 
                      required
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        fontSize: '13.5px',
                        outline: 'none',
                        width: '120px'
                      }}
                    />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                      Max teams allocated to you during scheduling solver runs.
                    </small>
                  </div>

                </div>
              </section>

              <section className="ref-card" style={{ padding: '24px' }}>
                <div className="ref-section-title" style={{ marginBottom: '12px' }}>
                  <h3>Skill Tags Overview</h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                  These tags are parsed by the matching engine to compute your expertise affinity:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {profile?.skill_tags?.map(tag => (
                    <span key={tag} className="badge" style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--bg-secondary)' }}>
                      {tag}
                    </span>
                  ))}
                  {(!profile?.skill_tags || profile.skill_tags.length === 0) && (
                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>No tags configured.</span>
                  )}
                </div>
              </section>
            </div>

            {/* Right Card: CP-SAT Availability Window Constraints */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section className="ref-card" style={{ padding: '24px' }}>
                <div className="ref-section-title" style={{ marginBottom: '16px' }}>
                  <h3>Scheduling Availabilities</h3>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                  Select the blocks you are available to evaluate live presentations. The CP-SAT timetable optimizer will respect these constraints.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div 
                    onClick={() => toggleAvailability('morning')}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '14px', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)' }}>🌅 Morning Block</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>10:00 AM - 12:00 PM</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={availability.morning} 
                      readOnly
                      style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                    />
                  </div>

                  <div 
                    onClick={() => toggleAvailability('afternoon')}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '14px', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)' }}>☀️ Afternoon Block</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>12:00 PM - 04:00 PM</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={availability.afternoon} 
                      readOnly
                      style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                    />
                  </div>

                  <div 
                    onClick={() => toggleAvailability('evening')}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '14px', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-primary)' }}>🌆 Evening Block</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>04:00 PM - 08:00 PM</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={availability.evening} 
                      readOnly
                      style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="ref-primary-button"
                  style={{
                    width: '100%',
                    marginTop: '24px',
                    background: 'var(--accent-color)',
                    color: '#101927',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {saving ? (
                    <div className="spinner" style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--accent-color)', animation: 'spin 1s linear infinite' }}></div>
                  ) : (
                    'Save Calibration Profile'
                  )}
                </button>
              </section>
            </div>

          </form>
        )}
      </div>
    </EvaluatorLayout>
  )
}
