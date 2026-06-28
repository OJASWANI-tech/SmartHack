import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function CommitteeSetup() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token')

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // If no token in URL, show an error immediately
useEffect(() => {
  
    if (!token) {
      setError('No invite token found. Make sure you opened the full link from your email.')
    }

}, [token])

useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const googleToken = params.get('google_token')
  const googleRefresh = params.get('google_refresh')
  const dbRole = params.get('db_role')   // âœ… ADD THIS LINE
  const error = params.get('error')

  if (error) {
    setError(error)
    return
  }

  if (googleToken) {
    const payload = JSON.parse(atob(googleToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    localStorage.setItem('HackSmart_token', googleToken)
    if (googleRefresh) localStorage.setItem('HackSmart_refresh_token', googleRefresh)

    // âœ… ADD THIS
    localStorage.setItem('committee_user', JSON.stringify({
      id: payload.sub,
      email: payload.email,
      role: dbRole || 'member'
    }))
    localStorage.setItem('HackSmart_mock_role', 'committee')
    setSuccess(true)
    setTimeout(() => navigate('/login', { 
        replace: true,
        state: { showMemberLogin: true }  // â† add this
    }), 1800)
  }
}, [])

  // Inject the same glassmorphism button style used in Login.jsx
  useEffect(() => {
    const styleId = 'glassmorphism-setup-runtime-styles'
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style')
      styleSheet.id = styleId
      styleSheet.innerHTML = `
        @keyframes glass-shimmer-pulse {
          0% { background-position: -200% 0; opacity: 0.95; }
          50% { opacity: 1; }
          100% { background-position: 200% 0; opacity: 0.95; }
        }
        .btn-glass-sm-submit {
          position: relative;
          overflow: hidden;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 6px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.03), inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
          background-size: 200% auto;
          animation: glass-shimmer-pulse 5s linear infinite;
          background-image: linear-gradient(120deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 40%, rgba(71, 85, 105, 0.9) 50%, rgba(15, 23, 42, 0.9) 60%, rgba(30, 41, 59, 0.8) 100%);
        }
        .btn-glass-sm-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px 0 rgba(15, 23, 42, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.3);
        }
        .btn-glass-sm-submit:active:not(:disabled) {
          transform: scale(0.97);
        }
        .btn-glass-sm-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `
      document.head.appendChild(styleSheet)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`${BASE_URL}/committee/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.detail === 'Invalid or already used invite link') {
          setError('already_used')  // special flag
        } else {
          setError(data.detail || 'Something went wrong. Please try again.')
        }
        return
      }

      // Store tokens and role â€” matches the pattern in auth.js
      localStorage.setItem('HackSmart_token', data.access_token)
      localStorage.setItem('HackSmart_refresh_token', data.refresh_token)
      localStorage.setItem('HackSmart_mock_role', 'committee')
      localStorage.setItem('committee_user', JSON.stringify(data.user))

      // â† ADD THESE to prevent auto-redirect on login page
      localStorage.removeItem('current_event_id')
      localStorage.removeItem('event_id')

      setSuccess(true)
      setTimeout(() => navigate('/login', { 
          replace: true,
          state: { showMemberLogin: true }
      }), 1800)

    } catch (err) {
      setError('Could not connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #344963',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    background: '#101927',
    color: '#e7eef8',
  }

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '6px',
    display: 'block',
  }

  return (
    <main className="access-page">
      <section className="card" style={{ width: 'min(480px, calc(100vw - 40px))' }}>

        {/* â”€â”€ Header â”€â”€ */}
        <p className="eyebrow">HackSmart Â· Committee Invite</p>

        {success ? (
          /* â”€â”€ Success state â”€â”€ */
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>âœ…</div>
            <h2 style={{ margin: '0 0 8px' }}>Account Created!</h2>
            <p className="login-copy">
              Your committee account is ready. Redirecting you to login...
            </p>
          </div>

        ) : (
          <>
            <h2 style={{ margin: '8px 0 4px' }}>Set Up Your Account</h2>
            <p className="login-copy" style={{ marginBottom: '24px' }}>
              You've been invited to join the committee. Set your name and password to get started.
            </p>

            {/* â”€â”€ Error banner â”€â”€ */}
            {error && (
              <div style={{
                background: 'rgba(248, 113, 113, 0.1)',
                border: '1px solid rgba(248, 113, 113, 0.3)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'left',
              }}>
                {error === 'already_used' ? (
                  <div>
                    Account already set up.{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      style={{ background: 'none', border: 'none', color: '#7dbbff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', padding: 0 }}
                    >
                      Go to Login â†’
                    </button>
                  </div>
                ) : error}
              </div>
            )}

            {/* â”€â”€ Form â”€â”€ */}
            {token && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Full name */}
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g., Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ ...inputStyle, paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        fontSize: '13px',
                        padding: 0,
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      ...inputStyle,
                      borderColor: confirmPassword && confirmPassword !== password
                        ? 'rgba(248, 113, 113, 0.6)'
                        : confirmPassword && confirmPassword === password
                          ? 'rgba(74, 222, 128, 0.5)'
                          : '#344963',
                    }}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#f87171' }}>
                      Passwords don't match
                    </p>
                  )}
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={loading || !name.trim() || !password || !confirmPassword}
                    className="btn-glass-sm-submit"
                    style={{ width: '60%' }}
                  >
                    {loading ? 'Creating Account...' : 'Create My Account â†’'}
                  </button>

                  {/* OR divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ color: '#475569', fontSize: '12px' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  </div>

                  {/* Google Signup Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
                      window.location.href = `${baseURL}/auth/google?flow=member-signup&token=${token}`
                    }}
                    style={{
                      width: '60%', padding: '10px 16px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
                      color: '#e2e8f0', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    <svg width="16" height="16" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      style={{
                        background: 'none', border: 'none', color: '#7dbbff',
                        cursor: 'pointer', fontSize: '12px', fontWeight: '600', padding: 0,
                      }}
                    >
                      Go to Login
                    </button>
                  </p>
                </div>

              </form>
            )}
          </>
        )}

      </section>
    </main>
  )
}

