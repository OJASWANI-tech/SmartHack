/*
 * TeamPicker — the dynamic sports track has no participant login, so a captain
 * self-identifies their team once per browser (persisted via setSelectedTeamId).
 * Shared across Overview / Roster / Bracket so "my team" stays consistent.
 */
export default function TeamPicker({ teams, selectedTeamId, onSelect }) {
  if (!teams.length) {
    return (
      <section className="ref-card" style={{ padding: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
          No teams have been formed for this event yet. Check back once the committee finalizes team formation.
        </p>
      </section>
    )
  }

  return (
    <section className="ref-card" style={{ padding: 20 }}>
      <div className="ref-section-title"><h3>Which team are you on?</h3></div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '4px 0 14px' }}>
        Select your team to see your matches, roster, and standing. This is remembered on this device.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="quick-action-card"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: 12,
              background: t.id === selectedTeamId ? 'color-mix(in srgb, var(--accent-color) 12%, transparent)' : 'var(--bg-secondary)',
              border: `1px solid ${t.id === selectedTeamId ? 'var(--accent-color)' : 'var(--border-color)'}`,
              borderRadius: 8, textAlign: 'left', cursor: 'pointer',
            }}
          >
            <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t.name}</strong>
            <small style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{t.members.length} athlete{t.members.length !== 1 ? 's' : ''}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
