import { useState, useEffect } from 'react'
import ParticipantLayout from '../../components/layout/ParticipantLayout'
import { fetchDashboard, fetchSubmissions } from '../../api/participant'

function Skeleton({ width = '100%', height = '16px', radius = '6px' }) {
  return <div style={{ width, height, borderRadius: radius, background: 'linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-color) 50%, var(--bg-secondary) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
}

const AVATAR_COLORS = ['#7dbbff', '#71dd8c', '#adadfb', '#b899eb', '#6be6d3', '#fbbf24']

function ParticipantMyTeam() {
  const [team, setTeam] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [dash, subs] = await Promise.all([fetchDashboard(), fetchSubmissions().catch(() => ({ submissions: [] }))])
        setTeam(dash.team)
        setSubmission(subs.submissions?.[0] || null)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const members = team?.members || []
  const mentorInitials = team?.mentor_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'M'

  const readiness = [
    { label: 'Project PPT/Slides', done: !!submission?.ppt_submitted },
    { label: 'GitHub Repository', done: !!submission?.github_submitted },
    { label: 'Demo Video Link',   done: !!submission?.video_submitted },
  ]

  return (
    <ParticipantLayout pageTitle="My Team" pageSubtitle="Collaborate, check deliverables progress, and consult your team mentor">
      <div className="committee-reference-dashboard">

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', marginBottom: '20px', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Team Header Card */}
        <section className="ref-card" style={{ padding: '20px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(113, 221, 140, 0.05) 0%, rgba(107, 230, 211, 0.05) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge" style={{ background: '#71dd8c', color: '#101927', fontWeight: '800' }}>Active Team</span>
              {loading
                ? <Skeleton width="200px" height="28px" radius="6px" style={{ marginTop: '8px' }} />
                : <h3 style={{ fontSize: '22px', margin: '8px 0 4px 0', fontWeight: '850' }}>{team?.team_name || 'Your Team'}</h3>
              }
              {loading
                ? <Skeleton width="280px" height="14px" radius="4px" />
                : <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {team?.challenge ? `Challenge: ${team.challenge}` : 'Team details loading...'}
                  </p>
              }
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge">{members.length || '—'} Members</span>
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Teammates */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title"><h3>Teammate Profiles</h3></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                {loading ? (
                  [1,2,3,4].map(i => <Skeleton key={i} height="60px" radius="8px" />)
                ) : members.length > 0 ? members.map((member, idx) => (
                  <article key={member.name} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-primary)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '999px', background: AVATAR_COLORS[idx % AVATAR_COLORS.length], color: '#101927', fontWeight: '800', display: 'grid', placeItems: 'center', fontSize: '15px', flexShrink: 0 }}>
                      {member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>
                          {member.name}
                          {member.is_self && <span className="badge" style={{ marginLeft: '6px', fontSize: '8px', background: 'rgba(125,187,255,0.2)', color: '#7dbbff' }}>You</span>}
                        </h4>
                        <small style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{member.institution}</small>
                      </div>
                      {member.email && (
                        <a href={`mailto:${member.email}`} style={{ fontSize: '10px', color: 'var(--accent-color)', textDecoration: 'none', display: 'block', marginTop: '2px' }}>
                          ✉ {member.email}
                        </a>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {(member.skills || []).map(skill => (
                          <span key={skill} className="badge" style={{ fontSize: '9px', padding: '1px 5px' }}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                )) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>No teammates loaded.</p>
                )}
              </div>
            </section>

            {/* Challenge */}
            {!loading && team?.challenge && (
              <section className="ref-card" style={{ padding: '20px' }}>
                <div className="ref-section-title"><h3>Assigned Problem Statement</h3></div>
                <h4 style={{ margin: '12px 0 8px', fontSize: '14px', fontWeight: '750', color: 'var(--accent-color)' }}>
                  {team.challenge}
                </h4>
              </section>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Mentor */}
            <section className="ref-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(173, 173, 251, 0.05) 0%, rgba(184, 153, 235, 0.05) 100%)' }}>
              <div className="ref-section-title"><h3>Team Mentor</h3></div>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <Skeleton width="60px" height="60px" radius="999px" />
                  <Skeleton width="140px" height="18px" />
                  <Skeleton width="180px" height="14px" />
                </div>
              ) : team?.mentor_name ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 0 8px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '999px', background: '#adadfb', color: '#101927', fontWeight: '900', display: 'grid', placeItems: 'center', fontSize: '22px', marginBottom: '12px' }}>
                    {mentorInitials}
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800' }}>{team.mentor_name}</h4>
                  {team.mentor_company && <p style={{ margin: '0 0 4px', color: 'var(--text-secondary)', fontSize: '11px' }}>{team.mentor_company}</p>}
                  {team.mentor_email && (
                    <a href={`mailto:${team.mentor_email}`} style={{ fontSize: '12px', color: 'var(--accent-color)', textDecoration: 'underline', marginBottom: '8px' }}>
                      {team.mentor_email}
                    </a>
                  )}
                  {team.next_session_datetime && (
                    <p style={{ fontSize: '11px', color: '#71dd8c', fontWeight: '700', margin: '4px 0 0' }}>
                      Next session: {new Date(team.next_session_datetime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '12px' }}>Mentor not yet assigned.</p>
              )}
            </section>

            {/* Submission Readiness */}
            <section className="ref-card" style={{ padding: '20px' }}>
              <div className="ref-section-title"><h3>Submission Readiness</h3></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {readiness.map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-primary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600' }}>{item.label}</span>
                    <span style={{ fontSize: '9px', fontWeight: '700', color: item.done ? '#4ade80' : 'var(--text-secondary)' }} className="badge">
                      {item.done ? '✓ Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </ParticipantLayout>
  )
}

export default ParticipantMyTeam
