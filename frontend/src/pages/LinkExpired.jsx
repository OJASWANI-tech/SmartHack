function LinkExpired() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '40px', borderRadius: '12px', background: '#1e293b', color: 'white' }}>
        <h2 style={{ color: '#f87171' }}>🔗 Link Expired or Revoked</h2>
        <p style={{ color: '#94a3b8' }}>This access link is no longer valid.</p>
        <p style={{ color: '#94a3b8' }}>Please contact the committee for a new link.</p>
      </div>
    </div>
  )
}

export default LinkExpired