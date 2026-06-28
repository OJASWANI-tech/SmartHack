import { useState, useRef, useEffect } from 'react'
import ParticipantLayout from '../../components/layout/ParticipantLayout'
import { askAI } from '../../api/participant'

const SUGGESTIONS = [
  'Who is my mentor?',
  'What is my team challenge?',
  'What is the current stage?',
  'What has my team submitted so far?',
  'When is my evaluation scheduled?',
  'What are the judging criteria?',
]

const HELP_TOPICS = [
  { title: 'Team & Mentor Info', desc: 'Team name, challenge statement, mentor details, and next session time.' },
  { title: 'Event Stage & Schedule', desc: 'Current stage, what comes next, and key event dates.' },
  { title: 'Submission Status', desc: 'What your team has uploaded vs what is still missing.' },
  { title: 'Evaluation Schedule', desc: 'Your assigned presentation room and time slot.' },
  { title: 'Rules & Judging Criteria', desc: 'Event rules, judging weights, and submission guidelines.' },
  { title: 'Announcements', desc: 'Latest official broadcasts from the organizers.' },
]

export default function ParticipantAssistant() {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I'm your HackSmart AI assistant. I can answer questions about this event, your team, submission status, mentor sessions, stages, and official rules.\n\nWhat would you like to know?",
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const handleSend = async (textToSend) => {
    const q = (textToSend ?? input).trim()
    if (!q || typing) return

    setMessages(prev => [...prev, { sender: 'user', text: q }])
    setInput('')
    setTyping(true)

    try {
      const res = await askAI(q)
      setMessages(prev => [...prev, { sender: 'ai', text: res.answer }])
    } catch (e) {
      const msg =
        e.message?.includes('not found in this event')
          ? 'Your account does not appear to be linked to this event. Please contact the organizers.'
          : `Sorry, I couldn't reach the assistant right now. (${e.message})`
      setMessages(prev => [...prev, { sender: 'ai', text: msg }])
    } finally {
      setTyping(false)
    }
  }

  return (
    <ParticipantLayout pageTitle="Ask AI" pageSubtitle="Get instant answers about the event schedule, rules, your team details, or mentor sessions">
      <div className="committee-reference-dashboard">

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* â”€â”€ Chat window â”€â”€ */}
          <section className="ref-card" style={{ display: 'flex', flexDirection: 'column', height: '540px', overflow: 'hidden' }}>

            {/* Header bar */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '999px', background: '#b899eb', display: 'grid', placeItems: 'center', fontSize: '16px' }}>ðŸ¤–</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800' }}>HackSmart Helper</h4>
                <small style={{ color: '#71dd8c', fontSize: '10px' }}>Always active Â· Event-scoped AI</small>
              </div>
            </div>

            {/* Message list */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '8px' }}>
                  {msg.sender === 'ai' && (
                    <div style={{ width: '24px', height: '24px', borderRadius: '999px', background: '#adadfb', display: 'grid', placeItems: 'center', fontSize: '10px', flexShrink: 0, marginTop: '4px', fontWeight: '700' }}>AI</div>
                  )}
                  <div style={{
                    maxWidth: '72%', padding: '10px 14px', borderRadius: '12px', fontSize: '12.5px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                    background: msg.sender === 'user' ? 'var(--accent-color)' : 'var(--bg-primary)',
                    color: msg.sender === 'user' ? '#101927' : 'var(--text-primary)',
                    border: msg.sender === 'ai' ? '1px solid var(--border-color)' : 'none',
                  }}>
                    {msg.text}
                  </div>
                  {msg.sender === 'user' && (
                    <div style={{ width: '24px', height: '24px', borderRadius: '999px', background: '#7dbbff', display: 'grid', placeItems: 'center', fontSize: '10px', flexShrink: 0, marginTop: '4px', color: '#101927', fontWeight: '700' }}>You</div>
                  )}
                </div>
              ))}
              {typing && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '999px', background: '#adadfb', display: 'grid', placeItems: 'center', fontSize: '10px', fontWeight: '700' }}>AI</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>HackSmart AI is thinkingâ€¦</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
              {/* Suggestion chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {SUGGESTIONS.map(sug => (
                  <button key={sug} type="button" onClick={() => handleSend(sug)} disabled={typing}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '999px', padding: '4px 10px', fontSize: '10px', color: 'var(--text-primary)', cursor: typing ? 'not-allowed' : 'pointer', opacity: typing ? 0.5 : 1 }}>
                    {sug}
                  </button>
                ))}
              </div>
              {/* Text input */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text" placeholder="Type your questionâ€¦"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  disabled={typing}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
                <button type="button" onClick={() => handleSend()} disabled={typing || !input.trim()}
                  className="ref-primary-button" style={{ borderRadius: '6px', padding: '10px 16px', opacity: typing || !input.trim() ? 0.6 : 1 }}>
                  Send
                </button>
              </div>
            </div>
          </section>

          {/* â”€â”€ Info panel â”€â”€ */}
          <section className="ref-card" style={{ padding: '20px' }}>
            <div className="ref-section-title"><h3>What I Can Help With</h3></div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '8px 0 16px 0' }}>
              This assistant is scoped to your active event and your own data only. It will not answer general questions or reveal information about other teams.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {HELP_TOPICS.map(item => (
                <div key={item.title} style={{ padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-primary)' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '800' }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-secondary)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                ðŸ”’ <strong>Privacy:</strong> Your data is never shared with other participants. Each response uses only your event context.
              </p>
            </div>
          </section>

        </div>
      </div>
    </ParticipantLayout>
  )
}
