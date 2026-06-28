import { Link } from 'react-router-dom'

function LandingPage() {
  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.content}>
          <p style={styles.eyebrow}>SmartHack</p>
          <h1 style={styles.title}>Make your event flow feel effortless</h1>
          <p style={styles.subtitle}>
            Welcome to a clean, modern portal for managing participants, teams, judges,
            and event communications from one place.
          </p>

          <div style={styles.actions}>
            <Link to="/login" style={styles.primaryButton}>Open Portal</Link>
            <Link to="/committee/setup" style={styles.secondaryButton}>Create Setup</Link>
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.cardTitle}>What you can do</div>
          <ul style={styles.list}>
            <li>Onboard participants smoothly</li>
            <li>Form and manage teams</li>
            <li>Assign judges and track reviews</li>
            <li>Send updates and manage communications</li>
          </ul>
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
    background: 'linear-gradient(135deg, #07111f 0%, #10233d 55%, #17324c 100%)',
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  hero: {
    width: '100%',
    maxWidth: '1100px',
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '24px',
    alignItems: 'center'
  },
  content: {
    padding: '32px',
    borderRadius: '24px',
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(148, 163, 184, 0.24)',
    boxShadow: '0 20px 60px rgba(2, 8, 23, 0.3)'
  },
  eyebrow: {
    margin: '0 0 10px',
    fontSize: '12px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.24em',
    color: '#7dd3fc'
  },
  title: {
    margin: '0 0 12px',
    fontSize: 'clamp(30px, 4vw, 48px)',
    lineHeight: 1.15
  },
  subtitle: {
    margin: 0,
    fontSize: '18px',
    color: '#cbd5e1',
    lineHeight: 1.7
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '24px'
  },
  primaryButton: {
    display: 'inline-block',
    padding: '12px 18px',
    borderRadius: '999px',
    background: '#38bdf8',
    color: '#08111d',
    textDecoration: 'none',
    fontWeight: 700
  },
  secondaryButton: {
    display: 'inline-block',
    padding: '12px 18px',
    borderRadius: '999px',
    background: 'transparent',
    color: '#f8fafc',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    textDecoration: 'none',
    fontWeight: 600
  },
  panel: {
    padding: '28px',
    borderRadius: '24px',
    background: 'rgba(8, 15, 28, 0.78)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    boxShadow: '0 18px 50px rgba(2, 8, 23, 0.28)'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '12px'
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    color: '#cbd5e1',
    lineHeight: 1.8
  }
}

export default LandingPage
