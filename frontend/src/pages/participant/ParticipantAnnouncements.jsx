import { useState, useEffect } from 'react'
import ParticipantLayout from '../../components/layout/ParticipantLayout'
import { fetchAnnouncements } from '../../api/participant'

function Skeleton({ height = '90px' }) {
  return <div style={{ width: '100%', height, borderRadius: '8px', background: 'linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-color) 50%, var(--bg-secondary) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
}

const CATEGORY_STYLE = {
  urgent: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '#f87171' },
  info:   { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '#38bdf8' },
}

function ParticipantAnnouncements() {
  const [all, setAll] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAnnouncements()
      .then(d => {
        const data = d || []
        setAll(data)
        // Guarded against errors: saves current count to clear notification
        try {
          localStorage.setItem('seen_announcements_count', data.length.toString())
        } catch (e) {
         
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'All' ? all : all.filter(a => a.type === filter.toLowerCase())

  return (
    <ParticipantLayout pageTitle="Announcements" pageSubtitle="Chronological feed of official broadcasts from the organizers" headerActions={!loading ? <span className="badge">{all.length} total</span> : null}>
      <div className="committee-reference-dashboard">

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', marginBottom: '20px', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Filter Bar */}
        <section style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['All', 'Urgent', 'Info'].map((item) => (
            <button
              key={item} type="button" onClick={() => setFilter(item)}
              style={{
                background: filter === item ? '#71dd8c' : 'var(--bg-secondary)',
                color: filter === item ? '#101927' : 'var(--text-primary)',
                border: filter === item ? 'none' : '1px solid var(--border-color)',
                padding: '6px 14px', borderRadius: '999px', cursor: 'pointer',
                fontSize: '11px', fontWeight: '700', transition: 'all 160ms ease'
              }}
            >
              {item}
            </button>
          ))}
        </section>

        {/* Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} />)
          ) : filtered.length > 0 ? filtered.map((ann) => {
            const style = CATEGORY_STYLE[ann.type] || CATEGORY_STYLE.info
            return (
              <article key={ann.id} className="ref-card" style={{ padding: '20px', borderLeft: `4px solid ${style.border}`, background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge" style={{ background: style.bg, color: style.color, border: '1px solid transparent', fontSize: '9px', padding: '2px 8px', textTransform: 'capitalize' }}>
                    {ann.type}
                  </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ann.time_ago || '—'}
                    </span>
                </div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{ann.title}</h3>
                
                <p style={{ 
                  margin: 0, 
                  fontSize: '13px', 
                  color: 'var(--text-secondary)', 
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap', 
                  fontFamily: 'inherit'
                }}>
                  {ann.body}
                </p>
              </article>
            )
          }) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginTop: '24px' }}>
              {all.length === 0 ? 'No announcements have been sent yet.' : 'No announcements match this filter.'}
            </p>
          )}
        </div>
      </div>
    </ParticipantLayout>
  )
}

export default ParticipantAnnouncements