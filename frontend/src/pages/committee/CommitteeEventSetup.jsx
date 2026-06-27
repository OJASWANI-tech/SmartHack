import { useState, useRef, useEffect } from 'react'
import PortalLayout from '../../components/layout/PortalLayout'
import { createEvent } from '../../services/committee'

// Icon components
function FileIcon({ size = 16, color = "#6B7280" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }} aria-hidden="true">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 2v7h7" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon({ size = 16, color = "#6B7280", isRecording = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }} aria-hidden="true">
      <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" stroke={color} strokeWidth="1.6" fill={isRecording ? color : "none"} strokeLinejoin="round" />
      <path d="M8 12v3a4 4 0 0 0 8 0v-3M9 20h6M12 17v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const navItems = [
  { to: '/committee', label: 'Dashboard' },
  { to: '/committee/setup', label: 'Event Setup' },
]

const CONFIG_FIELDS = [
  'Event Type & Mode',
  'Event Structure (Rounds)',
  'Participants',
  'Timeline',
  'Evaluation & Scoring',
  'Judges',
  'Communication & Results',
  'Other Settings',
]

const QUICK_REPLIES = [
  'Add timeline details',
  'Define scoring criteria',
  'Judges & evaluation',
  'Communication preferences',
]

function parseEventFromMessages(messages) {
  const userText = messages.filter(m => m.role === 'user').map(m => m.text).join(' ')
  const config = { name: '', type: '', mode: '', participants: '', rounds: [] }

  const nameMatch = userText.match(/organizing\s+([A-Za-z0-9 ]+?)[\.\n,]/)
  if (nameMatch) config.name = nameMatch[1].trim()

  if (/hackathon/i.test(userText)) config.type = 'Hackathon'
  else if (/coding contest|code sprint/i.test(userText)) config.type = 'Coding Contest'
  else if (/quiz/i.test(userText)) config.type = 'Quiz'

  if (/team/i.test(userText)) config.mode = 'Team'
  else if (/solo|individual/i.test(userText)) config.mode = 'Individual (Solo)'

  const partMatch = userText.match(/(\d+)\s+participants?/i)
  if (partMatch) config.participants = `~${partMatch[1]}`

  const roundMatches = [...userText.matchAll(/round\s*\d+[:\s]+([^\.\n]+)/gi)]
  config.rounds = roundMatches.map((m, i) => {
    const text = m[1].toLowerCase()
    const label = m[1].trim()
    const isAuto = /automatically scored|auto/i.test(text)
    const qualifyMatch = text.match(/top\s+(\d+)\s+qualify/i)
    return {
      num: i + 1,
      label,
      badge: isAuto ? 'AUTOMATED' : 'ASSESSMENT',
      sub: [isAuto ? 'Automatically scored' : 'Evaluated by judges', qualifyMatch ? `Top ${qualifyMatch[1]} qualify` : null].filter(Boolean).join(' • '),
    }
  })

  return config
}

function getCompletedCount(config) {
  let count = 0
  if (config.name) count++
  if (config.type) count++
  if (config.participants) count++
  if (config.rounds.length) count++
  return count
}

function BadgeChip({ label }) {
  const colors = {
    AUTOMATED: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
    ASSESSMENT: { bg: '#e3f2fd', color: '#1565c0', border: '#90caf9' },
  }
  const c = colors[label] || { bg: '#f3e5f5', color: '#6a1b9a', border: '#ce93d8' }
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: `1px solid ${c.border}`, background: c.bg, color: c.color, letterSpacing: '0.04em' }}>
      {label}
    </span>
  )
}

function ConfigPreview({ config, messages }) {
  const completed = getCompletedCount(config)
  const total = 10

  const fieldsDone = [
    config.type && config.mode ? 'Event Type & Mode' : null,
    config.rounds.length ? 'Event Structure (Rounds)' : null,
    config.participants ? 'Participants' : null,
  ].filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent)', fontSize: 18 }}>✦</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Live Configuration Preview</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '3px 10px' }}>
          {completed}/{total} Completed
        </span>
      </div>

      {/* Event Overview card */}
      {config.name && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Event Overview</span>
            </div>
            <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>✎ Edit</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Name', value: config.name },
              { label: 'Type', value: config.type, chip: true },
              { label: 'Mode', value: config.mode, chip: true },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{f.label}</div>
                {f.chip && f.value
                  ? <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', color: 'var(--text)' }}>{f.value}</span>
                  : <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{f.value || '—'}</div>}
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Participants</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{config.participants || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Rounds card */}
      {config.rounds.length > 0 && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔀</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Event Workflow <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({config.rounds.length} Rounds Detected)</span></span>
            </div>
            <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>✎ Edit</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {config.rounds.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{r.num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{r.label}</span>
                    <BadgeChip label={r.badge} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress card */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📊</span> Configuration Progress
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CONFIG_FIELDS.map(f => {
            const done = fieldsDone.includes(f)
            return (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, color: done ? '#43a047' : '#bdbdbd' }}>{done ? '✅' : '⭕'}</span>
                <span style={{ fontSize: 12, color: done ? 'var(--text)' : 'var(--text-muted)' }}>{f}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ background: '#fffde7', border: '1px solid #ffe082', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ fontSize: 12, color: '#795548', margin: 0 }}>Once all required information is collected, you'll be able to review the summary and approve the configuration.</p>
        <button style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'not-allowed', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          View Summary (Soon)
        </button>
      </div>
    </div>
  )
}

const INITIAL_BOT_MSG = {
  role: 'bot',
  text: "Hi! I'm your Event Configuration Assistant.\n\nTell me about the event you want to create. You can describe it in any way you like – I'll figure out the structure, rules, and settings.",
}

function summarizeEvent(config) {
  const lines = []
  if (config.type) lines.push(`Event type: ${config.type}`)
  if (config.mode) lines.push(`Mode: ${config.mode}`)
  if (config.participants) lines.push(`Total participants: ${config.participants}`)
  if (config.rounds.length) {
    lines.push(`${config.rounds.length} Rounds detected`)
    config.rounds.forEach(r => lines.push(`${r.label.split(':')[0] || 'Round'}: ${r.badge === 'AUTOMATED' ? 'Automated' : 'Assessment'}` ))
  }
  return lines
}

function CommitteeEventSetup() {
  const [messages, setMessages] = useState([INITIAL_BOT_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({ name: '', type: '', mode: '', participants: '', rounds: [] })
  const [isRecording, setIsRecording] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim()) return
    const userMsg = { role: 'user', text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Update config from conversation
    const newConfig = parseEventFromMessages(newMessages)
    setConfig(newConfig)

    // Simulate assistant reply
    await new Promise(r => setTimeout(r, 900))
    const summary = summarizeEvent(newConfig)
    const botText = summary.length
      ? `Got it! I've understood the event structure. Here's what I have so far:\n\n${summary.map(l => `✅ ${l}`).join('\n')}\n\nI just need a few more details to complete the configuration.\nShall we continue?`
      : "Got it! Could you tell me more about the event structure? For example: the number of rounds, how participants are scored, and how many advance to each stage."
    setMessages(prev => [...prev, { role: 'bot', text: botText }])
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || loading) return

    const isPDF = file.type === "application/pdf"
    if (!isPDF) {
      alert("Please upload a PDF file")
      return
    }

    setUploadProgress(50)
    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        const fileContent = event.target?.result?.split(",")[1]
        const userMsg = `PDF uploaded: ${file.name}`
        sendMessage(userMsg)
        setUploadProgress(100)
        setTimeout(() => setUploadProgress(null), 500)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error("[v0] File read error:", err)
      setUploadProgress(null)
    }
    
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        
        const reader = new FileReader()
        reader.onload = (event) => {
          const userMsg = "Voice message recorded"
          sendMessage(userMsg)
        }
        reader.readAsDataURL(audioBlob)
      }
      
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error("[v0] Microphone access denied:", err)
      alert("Microphone access is required for voice recording")
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <PortalLayout
      title="EventFlow"
      eyebrow="Committee Portal"
      navItems={navItems}
      pageTitle="Event Configuration Assistant"
      pageSubtitle="Describe your event in natural language and I'll configure everything for you."
      headerActions={
        <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to Dashboard
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, height: 'calc(100vh - 130px)', minHeight: 0 }}>

        {/* LEFT: Chat panel */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>Today</div>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                {msg.role === 'bot' && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: '75%',
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text)',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  padding: '12px 14px',
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  border: '1px solid var(--border)',
                }}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6c63ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>You</div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 2px', padding: '12px 16px', fontSize: 18, color: 'var(--text-muted)' }}>···</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          <div style={{ padding: '10px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {QUICK_REPLIES.map(q => (
              <button key={q} onClick={() => sendMessage(q)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--text)', transition: 'background 0.15s' }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              disabled={loading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              aria-label="Upload PDF"
              title="Upload PDF"
              style={{ width: 40, height: 40, borderRadius: 10,
                background: loading ? "#F3F4F6" : "#fff", border: "1px solid #D1D5DB",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", flexShrink: 0 }}
            >
              <FileIcon color={loading ? "#9CA3AF" : "#6B7280"} />
            </button>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              title={isRecording ? "Stop recording" : "Start voice recording"}
              style={{ width: 40, height: 40, borderRadius: 10,
                background: isRecording ? "#DC2626" : (loading ? "#F3F4F6" : "#fff"),
                border: isRecording ? "1px solid #991B1B" : "1px solid #D1D5DB",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", flexShrink: 0 }}
            >
              <MicIcon color={isRecording ? "#fff" : (loading ? "#9CA3AF" : "#6B7280")} isRecording={isRecording} />
            </button>

            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your event or answer a question..."
              rows={2}
              style={{ flex: 1, resize: 'none', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', opacity: !input.trim() || loading ? 0.5 : 1, flexShrink: 0 }}
            >
              ➤
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: '4px 16px 10px' }}>
            {isRecording ? '🎙️ Recording...' : 'Press Enter to send • Shift + Enter for new line • Or upload PDF / record voice'}
          </div>
        </div>

        {/* RIGHT: Live config preview */}
        <div style={{ overflowY: 'auto', paddingRight: 2 }}>
          <ConfigPreview config={config} messages={messages} />
        </div>
      </div>
    </PortalLayout>
  )
}

export default CommitteeEventSetup
