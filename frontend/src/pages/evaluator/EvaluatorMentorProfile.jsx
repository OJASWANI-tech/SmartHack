import { useMemo, useState } from 'react'
import { currentUser, menteeTeams, savedEvaluations, sessions } from '../../components/evaluation/evaluatorMentorMockData'
import { useEvaluatorMentorTheme } from '../../components/layout/EvaluatorMentorTheme'

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="em-toggle-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  )
}

function Profile() {
  const { theme, toggleTheme } = useEvaluatorMentorTheme()
  const [days, setDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [sessionReminders, setSessionReminders] = useState(true)
  const completedSessions = sessions.filter((session) => session.status === 'completed').length
  const upcomingSessions = sessions.filter((session) => session.status === 'upcoming').length
  const avgScore = useMemo(() => {
    const totals = Object.values(savedEvaluations).map((score) => score.c1 + score.c2 + score.c3 + score.c4 + score.c5)
    return totals.length ? (totals.reduce((sum, score) => sum + score, 0) / totals.length).toFixed(1) : '—'
  }, [])

  function toggleDay(day) {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])
  }

  return (
    <div className="committee-reference-dashboard em-page">
      <section className="ref-card em-card em-profile-header">
        <span className="em-profile-avatar">{currentUser.initials}</span>
        <div>
          <h2>{currentUser.name}</h2>
          <div className="em-badge-row">
            {currentUser.roles.map((role) => <span className="badge" key={role}>{role[0].toUpperCase() + role.slice(1)}</span>)}
          </div>
          <p>{currentUser.email} · {currentUser.phone} · {currentUser.institution}</p>
        </div>
        <button className="ref-outline-button inline-button" type="button">Edit</button>
      </section>

      <div className="em-two-col">
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Personal Information</h3></div>
          <div className="em-info-list">
            <span>Full Name <strong>{currentUser.name}</strong></span>
            <span>Institution <strong>{currentUser.institution}</strong></span>
            <span>Experience <strong>{currentUser.experience}</strong></span>
            <span>Email <strong>{currentUser.email}</strong></span>
            <span>Phone <strong>{currentUser.phone}</strong></span>
          </div>
        </section>
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Role & Expertise</h3></div>
          <div className="em-skill-row">{currentUser.expertise.map((skill) => <span className="skill-tag" key={skill}>{skill}</span>)}</div>
          <div className="em-info-list">
            <span>Experience <strong>{currentUser.experience}</strong></span>
            <span>Organization <strong>{currentUser.institution}</strong></span>
          </div>
        </section>
      </div>

      <div className="em-two-col">
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Evaluation Stats</h3></div>
          <div className="mini-metric-grid">
            <div className="ref-mini-card"><span className="ref-icon">T</span><div><strong>5</strong><p>Teams evaluated</p></div></div>
            <div className="ref-mini-card"><span className="ref-icon">A</span><div><strong>{avgScore}</strong><p>Avg score given</p></div></div>
            <div className="ref-mini-card"><span className="ref-icon">S</span><div><strong>{Object.keys(savedEvaluations).length}</strong><p>Submitted</p></div></div>
          </div>
        </section>
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Mentor Stats</h3></div>
          <div className="mini-metric-grid">
            <div className="ref-mini-card"><span className="ref-icon">M</span><div><strong>{menteeTeams.length}</strong><p>Teams mentored</p></div></div>
            <div className="ref-mini-card"><span className="ref-icon">C</span><div><strong>{completedSessions}</strong><p>Sessions conducted</p></div></div>
            <div className="ref-mini-card"><span className="ref-icon">U</span><div><strong>{upcomingSessions}</strong><p>Upcoming sessions</p></div></div>
          </div>
        </section>
      </div>

      <div className="em-two-col">
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Availability</h3></div>
          <div className="em-day-row">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <button className={days.includes(day) ? 'active' : ''} type="button" key={day} onClick={() => toggleDay(day)}>{day}</button>
            ))}
          </div>
        </section>
        <section className="ref-card em-card">
          <div className="ref-section-title"><h3>Preferences</h3></div>
          <ToggleRow label="Email notifications" checked={emailNotifications} onChange={() => setEmailNotifications((value) => !value)} />
          <ToggleRow label="Session reminders" checked={sessionReminders} onChange={() => setSessionReminders((value) => !value)} />
          <ToggleRow label="Dark mode" checked={theme === 'dark'} onChange={toggleTheme} />
        </section>
      </div>
    </div>
  )
}

export default Profile
