import {
  eventStages,
  notifications,
  participant,
  teamMembers,
} from './participantData'

const palette = ['#6BE6D3', '#71DD8C', '#7DBBFF', '#A0BCE8', '#ADADFB', '#B899EB']

export function PortalIcon({ name, variant = 'participant' }) {
  const icons = {
    // Participant icons
    home: 'H',
    team: 'T',
    journey: 'J',
    submit: 'S',
    results: 'R',
    announce: 'A',
    assistant: 'AI',
    profile: 'P',
    chat: '💬',
    // Committee icons
    dashboard: '⊞',
    intake: '⊕',
    teams: '◈',
    comms: '◉',
    eval: '◎',
    logs: '≡',
    settings: '⚙',
    matchmaker: '⧓',
    leaderboard: 'L',
    submissions: 'S',
    // Sports track icons
    bracket: '⊿',
    roster: '⛀',
    matchCenter: '⚑',
  }

  const cls = variant === 'committee' ? 'committee-nav-icon' : 'participant-nav-icon'
  return <span className={cls} aria-hidden="true">{icons[name] || name?.charAt(0)?.toUpperCase() || '·'}</span>
}

export function FloatingBackground() {
  return (
    <div className="participant-bg" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

export function GradientCard({ children, className = '' }) {
  return <section className={`participant-card gradient-card ${className}`}>{children}</section>
}

export function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="participant-section-header">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && <button type="button">{action}</button>}
    </div>
  )
}

export function ParticipantHeroBanner({ stage = participant.stage }) {
  const stageMeta = {
    Registration: { icon: '01', cta: 'Complete profile', gradient: 'registration' },
    'Team Formation': { icon: '02', cta: 'Meet your team', gradient: 'formation' },
    Evaluation: { icon: '03', cta: 'View evaluation plan', gradient: 'evaluation' },
    Results: { icon: '04', cta: 'Open results', gradient: 'results' },
  }[stage]

  return (
    <section className={`participant-hero stage-${stageMeta.gradient}`}>
      <div className="hero-copy">
        <span className="event-badge">{participant.event} / Live</span>
        <h1>{stage} Round</h1>
        <p>Aug 18 - Aug 20, 2024</p>
        <div className="hero-stage-pill">
          <span>Current stage</span>
          <strong>{stage}</strong>
        </div>
        <button type="button">{stageMeta.cta}<span>-&gt;</span></button>
      </div>
      <div className="hero-stage-art" aria-hidden="true">
        <div className="hero-orbit">
          <span>{stageMeta.icon}</span>
        </div>
        <div className="hero-illustration-base" />
        {palette.slice(0, 5).map((color, index) => (
          <i key={color} style={{ '--dot-color': color, '--dot-index': index }} />
        ))}
      </div>
    </section>
  )
}

export function EventProgressStepper({ stages = eventStages }) {
  return (
    <section className="participant-card progress-stepper">
      <SectionHeader title="Event Progress" action="View full journey" />
      <div className="progress-track">
        {stages.map((stage) => (
          <div className={`progress-step ${stage.state}`} key={stage.label}>
            <span>{stage.state === 'complete' ? 'OK' : stage.state === 'active' ? 'NOW' : 'NEXT'}</span>
            <strong>{stage.label}</strong>
            <small>{stage.date}</small>
          </div>
        ))}
      </div>
    </section>
  )
}

export function StatusCard({ status = participant.qualification, detail = 'Great job. Your team has qualified for the next round.' }) {
  return (
    <GradientCard className="status-card">
      <div className="status-emblem">OK</div>
      <div>
        <span>My Status</span>
        <h3>{status}</h3>
        <p>{detail}</p>
      </div>
    </GradientCard>
  )
}

export function TeamMemberCard({ member }) {
  return (
    <article className="team-member-card">
      <div className="member-avatar-wrap">
        <div className="member-avatar" style={{ '--avatar-color': member.color }}>{member.name.split(' ').map((part) => part[0]).join('')}</div>
        <span className="member-presence" />
      </div>
      <div>
        <h3>{member.name}</h3>
        <p>{member.role}</p>
        <div className="chip-row">{member.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
      </div>
    </article>
  )
}

export function TeamExperienceCard() {
  return (
    <section className="participant-card team-experience">
      <SectionHeader eyebrow="Your squad" title={participant.team.name} action={participant.team.status} />
      <div className="team-member-strip">
        {teamMembers.map((member) => <TeamMemberCard member={member} key={member.name} />)}
      </div>
      <div className="team-rationale">
        <span>Team Rationale</span>
        <p>{participant.team.rationale}</p>
      </div>
    </section>
  )
}

export function EvaluatorCard({ evaluator }) {
  return (
    <article className="evaluator-card">
      <div className="evaluator-avatar">{evaluator.name.replace('Judge ', '')}</div>
      <div>
        <h3>{evaluator.name}</h3>
        <p>{evaluator.specialty}</p>
      </div>
      <span>{evaluator.expertise}</span>
    </article>
  )
}

export function TimelineCard({ item, index }) {
  return (
    <article className={`timeline-card ${item.state || item.tone || ''}`}>
      <span>{index + 1}</span>
      <div>
        <h3>{item.label || item.title}</h3>
        <p>{item.detail || item.value || item.body}</p>
      </div>
    </article>
  )
}

export function QuickActionCard({ label, icon, meta }) {
  return (
    <button className="quick-action-card" type="button">
      <span>{icon}</span>
      <strong>{label}</strong>
      {meta && <small>{meta}</small>}
    </button>
  )
}

export function AnnouncementCard({ announcement }) {
  return (
    <article className={`announcement-card ${announcement.category.toLowerCase()}`}>
      <div>
        <span>{announcement.category}</span>
        <small>{announcement.time}</small>
      </div>
      <h3>{announcement.title}</h3>
      <p>{announcement.body}</p>
    </article>
  )
}

export function SubmissionCard({ submission }) {
  return (
    <article className="submission-card">
      <span>{submission.status}</span>
      <div>
        <h3>{submission.version}</h3>
        <p>{submission.date}</p>
      </div>
    </article>
  )
}

export function ProgressTracker({ value = 78, label = 'Evaluation readiness' }) {
  return (
    <section className="participant-card progress-tracker">
      <SectionHeader title={label} />
      <div className="progress-ring" style={{ '--progress': `${value}%` }}>
        <strong>{value}%</strong>
      </div>
      <p>Submission, team profile, and readiness checks are in strong shape.</p>
    </section>
  )
}

export function NotificationFeed() {
  return (
    <section className="participant-card notification-feed">
      <SectionHeader title="Recent Notifications" action="View all" />
      {notifications.map((item) => (
        <article key={item.title}>
          <span>{item.type === 'success' ? 'OK' : item.type === 'win' ? '*' : 'i'}</span>
          <p>{item.title}</p>
          <small>{item.time}</small>
        </article>
      ))}
    </section>
  )
}
