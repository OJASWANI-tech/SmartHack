import { useEffect, useState } from 'react'
import PageHeader from './PageHeader'
import { currentUser } from '../evaluation/evaluatorMentorMockData'
import RoleAwareSidebar from './RoleAwareSidebar'
import { EvaluatorMentorThemeContext } from './EvaluatorMentorTheme'

function EvaluatorMentorLayout({ children, notifications = [], statusItems = [], pageTitle, pageSubtitle }) {
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${theme === 'light' ? 'app-shell-light' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div>
            <p className="eyebrow">EVALUATOR &amp; MENTOR PORTAL</p>
            <h1>TI Hackathon 2026</h1>
          </div>
        </div>
        <nav>
          <RoleAwareSidebar roles={currentUser.roles} />
        </nav>
        <div className="sidebar-footer">
          <div className="em-sidebar-user">
            <span>{currentUser.initials}</span>
            <div>
              <strong>{currentUser.name}</strong>
              <small>{currentUser.email}</small>
            </div>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div className="topbar-left">
            <PageHeader title={pageTitle} subtitle={pageSubtitle} statusItems={statusItems} />
          </div>
          <div className="topbar-actions">
            <button
              onClick={toggleTheme}
              className="theme-toggle-top"
              type="button"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? '☾' : '☀'}
            </button>
          </div>
        </header>
        {notifications.length > 0 && (
          <section className="notification-bar">
            {notifications.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </section>
        )}
        <EvaluatorMentorThemeContext.Provider value={{ theme, toggleTheme }}>
          {children}
        </EvaluatorMentorThemeContext.Provider>
      </main>
    </div>
  )
}

export default EvaluatorMentorLayout
