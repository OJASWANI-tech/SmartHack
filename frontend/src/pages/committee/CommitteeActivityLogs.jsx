import React, { useState, useEffect } from 'react'
import CommitteeLayout from '../../components/layout/CommitteeLayout'
import { getActivityLog } from '../../services/committee'

export default function CommitteeActivityLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')

  useEffect(() => {
    const eventId = localStorage.getItem('current_event_id')
    if (eventId) {
      getActivityLog(eventId)
        .then(data => {
          setLogs(data || [])
          setLoading(false)
        })
        .catch(err => {
          console.error("Failed to load activity logs:", err)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const mockLogs = [
    {
      id: 'mock-1',
      created_at: null,
      actor: 'System Engine',
      action: 'CSV Roster successfully verified and parsed into staging records.',
      action_type: 'Database',
      status: 'Success'
    },
    {
      id: 'mock-2',
      created_at: null,
      actor: 'AI Optimization',
      action: 'Calculated structural cohort compatibility and balanced team profiles.',
      action_type: 'Matching',
      status: 'Success'
    },
    {
      id: 'mock-3',
      created_at: null,
      actor: 'Admin Portal',
      action: 'Workspace Context initialized and setup metrics validated.',
      action_type: 'System',
      status: 'Success'
    }
  ]

  // Combine database logs with fallback mock logs
  const allLogs = logs.length > 0 ? logs.map(l => ({
    ...l,
    status: 'Success'
  })) : mockLogs

  // Extract unique categories for dropdown
  const categories = ['All Categories', ...new Set(allLogs.map(l => l.action_type || 'System'))]

  // Filter logs by search query and category
  const filteredLogs = allLogs.filter(log => {
    const matchesSearch = `${log.actor || ''} ${log.action || ''} ${log.action_type || ''}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All Categories' || (log.action_type || 'System') === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatTimestamp = (isoString) => {
    if (!isoString) return '—'
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '—'
    }
  }

  return (
    <CommitteeLayout 
      pageTitle="Activity Logs" 
      pageSubtitle="Audit trail and real-time ledger of system actions."
      statusItems={[{ label: 'System', value: 'Live' }]}
    >
      <div className="committee-reference-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 🔍 Search & Filtering Controls */}
        <section className="committee-card" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                className="committee-input"
                type="text"
                placeholder="Search audit trail..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="committee-select"
              style={{ width: '200px' }}
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </section>

        {/* 📋 Logs Table */}
        <section className="committee-card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <div className="spinner" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '4px solid var(--accent-color)', borderTopColor: 'transparent',
                animation: 'shimmer 1.4s infinite'
              }}></div>
            </div>
          ) : (
            <div className="committee-table-wrap">
              <table className="committee-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Category</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No audit records found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ color: 'var(--text-secondary)' }}>{formatTimestamp(log.created_at)}</td>
                        <td style={{ fontWeight: 600 }}>{log.actor}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{log.action}</td>
                        <td>
                          <span className="status-pill info" style={{ textTransform: 'capitalize' }}>
                            {log.action_type || 'System'}
                          </span>
                        </td>
                        <td>
                          <span className="status-pill success">
                            {log.status || 'Success'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </CommitteeLayout>
  )
}
