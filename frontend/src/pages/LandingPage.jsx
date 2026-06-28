import { Link } from 'react-router-dom'

function LandingPage() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>HackSmart</div>
        <h1 style={styles.title}>Run your hackathon with clarity and speed</h1>
        <p style={styles.subtitle}>
          Coordinate participants, teams, judges, and communications from one polished portal.
        </p>

        <div style={styles.actions}>
          <Link to="/login" style={styles.primaryButton}>Go to Login</Link>
          <Link to="/committee/setup" style={styles.secondaryButton}>Create Committee Setup</Link>
        </div>

        <div style={styles.highlights}>
          <div style={styles.highlightItem}>Participant onboarding</div>
          <div style={styles.highlightItem}>Team formation</div>
          <div style={styles.highlightItem}>Judge evaluation</div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, #07111f 0%, #10233d 55%, #18304a 100%)',
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  card: {
    width: '100%',
    maxWidth: '760px',
    padding: '40px',
    borderRadius: '24px',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    boxShadow: '0 20px 60px rgba(2, 8, 23, 0.35)',
    backdropFilter: 'blur(16px)'
  },
  badge: {
    display: 'inline-block',
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#7dd3fc',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: '16px'
  },
  title: {
    margin: '0 0 12px',
    fontSize: 'clamp(28px, 4vw, 48px)',
    lineHeight: 1.15
  },
  subtitle: {
    margin: 0,
    fontSize: '18px',
    color: '#cbd5e1',
    lineHeight: 1.6
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '24px'
  },
  primaryButton: {
    display: 'inline-block',
    textDecoration: 'none',
    padding: '12px 18px',
    borderRadius: '999px',
    background: '#38bdf8',
    color: '#08111d',
    fontWeight: 700
  },
  secondaryButton: {
    display: 'inline-block',
    textDecoration: 'none',
    padding: '12px 18px',
    borderRadius: '999px',
    background: 'transparent',
    color: '#f8fafc',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    fontWeight: 600
  },
  highlights: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '24px'
  },
  highlightItem: {
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    fontSize: '14px'
  }
}

export default LandingPage
