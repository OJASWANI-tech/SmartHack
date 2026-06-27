import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { dashboardByRole } from '../navigation'
import { getCurrentRole, setMockRole, VALID_ROLES } from '../services/auth'
import { createEvent } from '../services/committee'
import { checkTokenVersion } from '../services/auth'
import ReactMarkdown from 'react-markdown'

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

// ─── Seeded IDs (updated by seed_data.py output) ───────────────────────────
const SEED = {
  event_id: 'd9914688-e56e-455b-a634-ef3b6b9c96e3',
  participant_id: '19a3e182-ed5a-429c-9ddd-0203aa4f264d', // Aryan Mehta
  participant_name: 'Aryan Mehta',
  evaluator_token: 'eval_token_a88f9500e2e6', // Dr. Anand Krishnan
}

const roleCopy = {
  committee: 'Operate participants, teams, approvals, communications, evaluations, anomalies, and results.',
  participant: 'View team assignment, event progress, dates, and qualification status.',
  evaluator: 'Review assigned submissions and submit scorecards.',
}

const roleIcons = { committee: '🏛️', participant: '🎓', evaluator: '⚖️' }

// ─── Blueprint helpers — everything is derived from the stored blueprint ─────
function g(obj, path) {
  if (!obj) return undefined;
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function has(val) {
  if (val === null || val === undefined || val === false || val === "") return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return true;
}

function hasJudging(bp) {
  return has(g(bp, "judging.criteria")) || has(g(bp, "judging.judges_per_entity"));
}

function prettify(str) {
  if (!str || typeof str !== "string") return str;
  return str.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMode(mode) {
  if (!mode) return null;
  const m = String(mode).toLowerCase();
  if (m === "solo") return "Individual (Solo)";
  if (m === "team") return "Team Based";
  return prettify(mode);
}

const ENGINE_META = {
  AUTOMATED: { badge: "AUTOMATED", sub: "Automatically scored", dot: "#10B981" },
  ASSESSMENT: { badge: "ASSESSMENT", sub: "Evaluated by judges", dot: "#8B5CF6" },
  SUBMISSION: { badge: "SUBMISSION", sub: "Submission round", dot: "#3B82F6" },
  MATCHUP: { badge: "MATCHUP", sub: "Head-to-head matches", dot: "#F59E0B" },
};

function parseStagesPreview(stagePreview) {
  if (!Array.isArray(stagePreview)) return [];
  const sorted = [...stagePreview].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  return sorted.map((s, i) => {
    const eng = (s.engine || "").toUpperCase();
    const meta = ENGINE_META[eng] || { badge: eng || "STAGE", sub: "Configured stage", dot: "#6366F1" };
    return {
      num: s.sequence || i + 1,
      label: s.name || `Stage ${i + 1}`,
      badge: meta.badge,
      dot: meta.dot,
      sub: [meta.sub, s.approval_required ? "🔒 Approval gate" : null].filter(Boolean).join(" • "),
    };
  });
}

const CONFIG_SECTIONS = [
  { name: "Event Type & Mode",        check: (bp) => has(g(bp, "event_type")) && has(g(bp, "mode")) },
  { name: "Event Structure (Stages)", check: (bp, sp) => Array.isArray(sp) && sp.length > 0 },
  { name: "Participants",             check: (bp) => has(g(bp, "participants.expected_count")) },
  { name: "Timeline",                 check: (bp) => has(g(bp, "timeline.registration_deadline")) || has(g(bp, "timeline.start_date")) },
  { name: "Evaluation & Scoring",     check: (bp) => has(g(bp, "judging.criteria")) },
  { name: "Judges",                   check: (bp) => hasJudging(bp) },
  { name: "Communication & Results",  check: (bp) => has(g(bp, "description")) },
  { name: "Other Settings",           check: (bp) => has(g(bp, "participants.team_formation_factors")) || has(g(bp, "constraints")) },
];

const COMPLETION_CHECKS = [
  (bp) => has(g(bp, "event_name")),
  (bp) => has(g(bp, "event_type")),
  (bp) => has(g(bp, "mode")),
  (bp) => has(g(bp, "participants.expected_count")),
  (bp, sp) => Array.isArray(sp) && sp.length > 0,
  (bp) => has(g(bp, "description")),
  (bp) => has(g(bp, "timeline.registration_deadline")) || has(g(bp, "timeline.start_date")),
  (bp) => has(g(bp, "participants.team_formation_factors")),
  (bp) => has(g(bp, "participants.team_size_min")) || has(g(bp, "constraints")),
  (bp) => has(g(bp, "judging.criteria")) || hasJudging(bp),
];

function countCompleted(bp, sp) {
  return COMPLETION_CHECKS.reduce((n, fn) => n + (fn(bp, sp) ? 1 : 0), 0);
}

function BadgeChip({ label }) {
  const palette = {
    AUTOMATED: { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
    ASSESSMENT: { bg: "#F3E8FF", color: "#7C3AED", border: "#D8B4FE" },
    SUBMISSION: { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
    MATCHUP: { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  };
  const s = palette[label] || { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
      border: `1px solid ${s.border}`, background: s.bg, color: s.color, letterSpacing: "0.03em"
    }}>
      {label}
    </span>
  );
}

function Placeholder({ children = "Not set yet" }) {
  return <span style={{ color: "#9CA3AF", fontStyle: "italic", fontWeight: 400 }}>{children}</span>;
}

// ─── Live Preview — fully driven by the stored blueprint ─────────────────────
function LivePreview({ blueprint, stagePreview, summary, onApprove, approveLoading }) {
  const total = 10;
  const completed = Math.min(countCompleted(blueprint, stagePreview), total);

  const name = g(blueprint, "event_name");
  const type = g(blueprint, "event_type");
  const mode = formatMode(g(blueprint, "mode"));
  const participants = g(blueprint, "participants.expected_count");
  const participantsLabel = mode === "Team Based" ? "Teams" : "Participants";

  const rounds = parseStagesPreview(stagePreview);
  const firstIncomplete = CONFIG_SECTIONS.find((s) => !s.check(blueprint, stagePreview))?.name;
  const readyToApprove = has(type) && rounds.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: 'space-between' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#4F46E5", fontSize: 18 }}>✦</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1F2937" }}>Live Configuration Preview</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, background: "#E8F8EE", color: "#15803D", borderRadius: 6, padding: "4px 12px" }}>{completed}/{total} Completed</span>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, color: "#4F46E5" }}>📋</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>Event Overview</span>
          </div>
          <button type="button" style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", color: "#4B5563", fontWeight: 500 }}>✎ Edit</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>Name</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{name || <Placeholder />}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>Type</div>
            {type
              ? <span style={{ fontSize: 12, fontWeight: 500, background: "#F3E8FF", color: "#6B21A8", borderRadius: 6, padding: "4px 10px", display: 'inline-block' }}>{prettify(type)}</span>
              : <Placeholder />}
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>Mode</div>
            {mode
              ? <span style={{ fontSize: 12, fontWeight: 500, background: "#EFF6FF", color: "#1E40AF", borderRadius: 6, padding: "4px 10px", display: 'inline-block' }}>{mode}</span>
              : <Placeholder />}
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{participantsLabel}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{participants != null ? `~${participants}` : <Placeholder />}</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, color: "#10B981" }}>🌿</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>Event Workflow <span style={{ color: "#6B7280", fontWeight: 400 }}>({rounds.length} Stage{rounds.length !== 1 ? "s" : ""})</span></span>
          </div>
          <button type="button" style={{ background: "none", border: "1px solid #E5E7EB", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", color: "#4B5563", fontWeight: 500 }}>✎ Edit</button>
        </div>
        {rounds.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", padding: "8px 0" }}>
            No rounds detected yet. Describe your event stages in the chat.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {rounds.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: r.dot, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{r.num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{r.label}</span>
                    <BadgeChip label={r.badge} />
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{r.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 10, color: "#1F2937" }}>
          <span style={{ color: "#3B82F6" }}>📊</span> Configuration Progress
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {CONFIG_SECTIONS.map((s) => {
            const done = s.check(blueprint, stagePreview);
            const inProgress = !done && s.name === firstIncomplete;
            return (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>{done ? "✅" : inProgress ? "🟡" : "⚪"}</span>
                <span style={{ fontSize: 13, color: done ? "#111827" : inProgress ? "#D97706" : "#9CA3AF" }}>{s.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p style={{ fontSize: 12, color: "#6D28D9", margin: 0, lineHeight: 1.5 }}>
          {readyToApprove
            ? "Your event is configured. Approve to create it, or keep describing changes."
            : "Once the event type and workflow stages are set, you'll be able to approve the configuration."}
        </p>
        <button
          type="button"
          onClick={onApprove}
          disabled={!readyToApprove || approveLoading}
          style={{ background: readyToApprove && !approveLoading ? "#7C3AED" : "#fff", border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: readyToApprove && !approveLoading ? "pointer" : "not-allowed", color: readyToApprove && !approveLoading ? "#fff" : "#7C3AED", whiteSpace: "nowrap" }}
        >
          {approveLoading ? "Creating…" : readyToApprove ? "Approve & Create Event" : "Keep Describing Your Event"}
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.state?.googleAdmin) {
      // Token already stored by AuthCallback, just show setup
      setShowLogin(false)
      setShowSetup(true)
      return
    }
    if (location.state?.showMemberLogin) {
      setShowLogin(true)        // ← show login form
      setCommitteeRole('member') // ← pre-select member tab
      return
    }
    if (location.state?.role) {
      handleRoleClick(location.state.role)
    }
  }, [location.state])

  // 🔄 FIXED 1: Smart Auto-Redirect Check handles both Admin and Mock states cleanly
  useEffect(() => {
    if (location.state?.googleAdmin) return
    if (location.state?.showMemberLogin) return  // ← add this

    const token = localStorage.getItem('eventflow_token')
    const eventId = localStorage.getItem('current_event_id')
    const currentRole = getCurrentRole()
    const mockRole = localStorage.getItem('eventflow_mock_role')

    // Combine structural roles to confirm permissions layout context
    const effectiveRole = mockRole || currentRole

    if (token) {
      // 🎯 FIX: If user evaluates to 'admin' or 'dynamic-committee', route them to the playground
      if (effectiveRole === 'dynamic-committee' || effectiveRole === 'admin') {
        // Automatically ensure your mock synchronization flag matches for sub-layouts
        localStorage.setItem('eventflow_mock_role', 'dynamic-committee')
        // ✅ Correct path (matches your App.jsx route)
        navigate('/dynamic-test/dynamic-dashboard', { replace: true })
      } else if (effectiveRole === 'committee' && eventId) {
        navigate('/committee/dashboard', { replace: true })
      }
    }
  }, [navigate, location.state])

  // Read error from URL if redirected back from Google auth failure
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const googleToken = params.get('google_token')
    const googleRefresh = params.get('google_refresh')

    if (error) {
      setShowLogin(true)
      setLoginError(error)
    }

    if (googleToken) {
      try {
        const payload = JSON.parse(atob(googleToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))

        // ✅ Read db_role from URL params (sent by backend)
        const dbRole = params.get('db_role')

        // Clear stale session first
        localStorage.removeItem('current_event_id')
        localStorage.removeItem('event_id')

        localStorage.setItem('eventflow_token', googleToken)
        if (googleRefresh) localStorage.setItem('eventflow_refresh_token', googleRefresh)

        // ✅ ADD THIS — store user so select-workspace can read stored.id
        localStorage.setItem('committee_user', JSON.stringify({
          id: payload.sub,        // sub contains member_id in your JWT
          email: payload.email,
          role: dbRole || 'member'   // ✅ use DB role from URL, not JWT role
        }))
        localStorage.setItem('eventflow_mock_role', 'committee')

        if (payload.event_id) {
          localStorage.setItem('current_event_id', payload.event_id)
          localStorage.setItem('event_id', payload.event_id)
        }

        if (dbRole === 'admin') {
          setShowLogin(false)
          setShowSetup(true)
        } else {
          navigate(dashboardByRole['committee'], { replace: true })
        }
      } catch {
        setShowLogin(true)
        setLoginError('Authentication failed. Please try again.')
      }
    }
  }, [])

  const [showSeedDetails, setShowSeedDetails] = useState(false)
  const [copiedField, setCopiedField] = useState(null)

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 1500)
  }

  const [showLogin, setShowLogin] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Role toggle + signup
  const [committeeRole, setCommitteeRole] = useState('admin') // 'admin' | 'member'
  const [showSignup, setShowSignup] = useState(false)
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupError, setSignupError] = useState(null)
  const [signupLoading, setSignupLoading] = useState(false)

  // Splash Screen State
  const [showSplash, setShowSplash] = useState(false)

  // States to manage the dynamic layout within the portal card
  const [showSetup, setShowSetup] = useState(false)
  const [eventName, setEventName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [apiError, setApiError] = useState(null)

  const [existingEvents, setExistingEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [mode, setMode] = useState('select') // 'select' or 'create'
  const [newEventName, setNewEventName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)

  // --- Config Agent (chatbot) states ---
  const [showConfigAgent, setShowConfigAgent] = useState(false)
  const [showCreatingScreen, setShowCreatingScreen] = useState(false)
  const [agentMessages, setAgentMessages] = useState([])
  const [agentInput, setAgentInput] = useState('')
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentCollected, setAgentCollected] = useState({})
  const [agentStagePreview, setAgentStagePreview] = useState([])
  const [agentSummary, setAgentSummary] = useState(null)
  const [agentApproved, setAgentApproved] = useState(false)
  const [agentDraftId, setAgentDraftId] = useState(null)
  const [agentApproveLoading, setAgentApproveLoading] = useState(false)
  const [eventReady, setEventReady] = useState(false)
  const agentBottomRef = useRef(null)
  const agentTextareaRef = useRef(null)
  const [agentIsRecording, setAgentIsRecording] = useState(false)
  const [agentUploadProgress, setAgentUploadProgress] = useState(null)
  const agentFileInputRef = useRef(null)
  const agentMediaRecorderRef = useRef(null)
  const agentAudioChunksRef = useRef([])
  const agentSpeechRecognitionRef = useRef(null)

  const AGENT_FIELDS = [
    { key: 'eventName', label: 'Event name' },
    { key: 'eventFormat', label: 'Format' },
    { key: 'teamSize', label: 'Team size' },
    { key: 'participantCount', label: 'Participants' },
    { key: 'stages', label: 'Stages' },
    { key: 'evaluationCriteria', label: 'Evaluation' },
    { key: 'communicationTriggers', label: 'Communications' },
    { key: 'timeline', label: 'Timeline' },
  ]

  function agentExtractFields(text, existing) {
    const updated = { ...existing }
    const t = text.toLowerCase()
    if (!updated.eventName) {
      const m = text.match(/event[:\s]+"?'?([A-Z][^\n"',.]{2,40})/i) || text.match(/called\s+"?'?([A-Z][^\n"',.]{2,40})/i)
      if (m) updated.eventName = m[1].trim()
    }
    if (!updated.eventFormat) {
      ['hackathon', 'case competition', 'sports tournament', 'coding contest', 'quiz', 'debate', 'ideathon']
        .forEach(f => { if (t.includes(f)) updated.eventFormat = f })
    }
    if (!updated.teamSize) {
      const m = t.match(/teams?\s+of\s+(\d+)/) || t.match(/(\d+)\s*(?:to|-)\s*(\d+)\s+(?:members?|people)/)
      if (m) updated.teamSize = m[0]
    }
    if (!updated.participantCount) {
      const m = t.match(/(\d+)\s+participants?/) || t.match(/(\d+)\s+students?/)
      if (m) updated.participantCount = m[1]
    }
    if (!updated.stages && (t.includes('stage') || t.includes('phase') || t.includes('round'))) updated.stages = 'mentioned'
    if (!updated.evaluationCriteria && (t.includes('evaluat') || t.includes('scor') || t.includes('criteri'))) updated.evaluationCriteria = 'mentioned'
    if (!updated.communicationTriggers && (t.includes('email') || t.includes('communicat') || t.includes('notif'))) updated.communicationTriggers = 'mentioned'
    if (!updated.timeline && (t.includes('date') || t.includes('deadline') || t.includes('by ') || t.match(/\w+ \d{1,2}/))) updated.timeline = 'mentioned'
    return updated
  }

  function agentParseSummary(text) {
    const start = text.indexOf('---SUMMARY---')
    const end = text.indexOf('---END SUMMARY---')
    if (start === -1 || end === -1) return null
    return text.slice(start + 13, end).trim()
  }

  // Helper to initialize an event workspace (dynamic or standard)
  async function initializeWorkspace(workspace, eventFormat, defaultName, stagesBlueprint) {
    setApiError(null);
    setLoginError(null);
    setSignupError(null);

    try {
      const stored = JSON.parse(localStorage.getItem('committee_user') || '{}');
      let userId = stored.id;
      const token = localStorage.getItem('eventflow_token');

      // Reconstruct user ID if missing from localStorage but token is present
      if (!userId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          userId = payload.sub;
          localStorage.setItem('committee_user', JSON.stringify({
            id: payload.sub,
            email: payload.email,
            role: payload.committee_role || 'member'
          }));
        } catch (err) {
          console.error('Failed to parse token payload:', err);
        }
      }

      if (!userId) {
        throw new Error('Authentication session not found. Please sign out and sign in again.');
      }

      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // 1. Swap token
      const swapRes = await fetch(`${baseURL}/auth/select-workspace?workspace=${workspace}&user_id=${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!swapRes.ok) {
        const swapErr = await swapRes.json().catch(() => ({}));
        throw new Error(swapErr.detail || 'Failed to authorize workspace credentials.');
      }
      const swapData = await swapRes.json();
      localStorage.setItem('eventflow_token', swapData.access_token);
      localStorage.setItem('eventflow_refresh_token', swapData.refresh_token);
      localStorage.setItem('eventflow_mock_role', workspace);

      // 2. Create event
      const eventRes = await fetch(`${baseURL}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${swapData.access_token}`
        },
        body: JSON.stringify({ name: newEventName.trim() || defaultName, event_type: eventFormat })
      });
      if (!eventRes.ok) {
        const eventErr = await eventRes.json().catch(() => ({}));
        throw new Error(eventErr.detail || 'Failed to create event database entry.');
      }
      const eventData = await eventRes.json();
      localStorage.setItem('current_event_id', eventData.id);
      localStorage.setItem('event_id', eventData.id);

      // 3. Patch stages configuration blueprint
      if (stagesBlueprint) {
        const patchRes = await fetch(`${baseURL}/api/v1/events/${eventData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${swapData.access_token}`
          },
          body: JSON.stringify({ stage_config: stagesBlueprint })
        });
        if (!patchRes.ok) {
          const patchErr = await patchRes.json().catch(() => ({}));
          throw new Error(patchErr.detail || 'Failed to configure event workflow stages.');
        }
      }

      return eventData;
    } catch (err) {
      setApiError(err.message || 'An unexpected error occurred during initialization.');
      return null;
    }
  }

  // --- Timer to hide Splash Screen after 3.5s ---
  useEffect(() => {
    if (showSplash) {
      checkTokenVersion()
      const timer = setTimeout(() => {
        setShowSplash(false)
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [showSplash])

  useEffect(() => {
    if (showSetup) {
      async function fetchEvents() {
        try {
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const res = await fetch(`${baseURL}/api/v1/events`)
          if (res.ok) {
            const data = await res.json()
            setExistingEvents(data)
            if (data.length > 0) {
              setSelectedEventId(data[0].id)
              setMode('select')
            } else {
              setMode('create')
            }
          }
        } catch (err) {
          console.error("Failed to load events:", err)
          setMode('create')
        }
      }
      fetchEvents()
    }
  }, [showSetup])

  // Inject glassmorphism dynamic styles safely on execution mount
  useEffect(() => {
    const styleId = 'glassmorphism-login-runtime-styles'
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style')
      styleSheet.id = styleId
      styleSheet.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .access-page {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          position: relative;
          min-height: 100vh;
          width: 100vw;
          overflow-x: hidden;
          background:
            radial-gradient(at 15% 0%, rgba(251, 249, 244, 0.6) 0, transparent 55%),
            radial-gradient(at 85% 100%, rgba(31, 87, 56, 0.12) 0, transparent 55%),
            #B3E6B5;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .access-grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(26, 43, 32, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(26, 43, 32, 0.035) 1px, transparent 1px);
          background-size: 50px 50px;
          background-position: center;
          pointer-events: none;
          z-index: 1;
        }

        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.30;
          pointer-events: none;
          z-index: 1;
        }
        .glow-orb-1 {
          width: 480px;
          height: 480px;
          background: radial-gradient(circle, #4C9A6A 0%, #1F5738 100%);
          top: -10%;
          right: -10%;
        }
        .glow-orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #FBF9F4 0%, #E2DDD0 100%);
          bottom: -15%;
          left: -15%;
        }

        .login-card {
          position: relative;
          z-index: 5;
          width: min(860px, calc(100vw - 32px));
          background: rgba(251, 249, 244, 0.85);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(226, 221, 208, 0.70);
          border-radius: 28px;
          padding: 28px;
          box-shadow:
            0 30px 70px -15px rgba(26, 43, 32, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          transform: translateY(0);
          animation: loginCardFloatIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes loginCardFloatIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          background: linear-gradient(90deg, #1F5738 0%, #4C9A6A 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 14px;
          display: inline-block;
        }

        .login-card h2 {
          font-size: 34px;
          font-weight: 800;
          color: #1A2B20;
          margin: 0 0 10px 0;
          letter-spacing: -0.6px;
        }

        .login-copy {
          color: #526357;
          font-size: 14.5px;
          line-height: 1.65;
          max-width: 620px;
          margin: 0 0 32px 0;
        }

        .login-role-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          margin-top: 10px;
        }

        .custom-role-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          background: rgba(251, 249, 244, 0.55);
          border: 1px solid rgba(226, 221, 208, 0.60);
          border-radius: 18px;
          padding: 26px;
          color: #526357;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .custom-role-card::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--theme-color, #1F5738);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .custom-role-card:hover {
          transform: translateY(-5px);
          border-color: rgba(226, 221, 208, 0.90);
          background: rgba(251, 249, 244, 0.80);
          box-shadow:
            0 16px 36px -12px rgba(26, 43, 32, 0.18),
            0 0 24px -6px var(--glow-color, rgba(31, 87, 56, 0.25));
        }

        .custom-role-card:hover::after {
          transform: scaleX(1);
        }

        .role-icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: var(--icon-bg, rgba(31, 87, 56, 0.10));
          border: 1px solid var(--icon-border, rgba(31, 87, 56, 0.25));
          font-size: 20px;
          margin-bottom: 22px;
          transition: all 0.3s ease;
        }

        .custom-role-card:hover .role-icon-container {
          transform: scale(1.1) rotate(4deg);
          box-shadow: 0 0 14px var(--icon-border, rgba(31, 87, 56, 0.30));
        }

        .role-title {
          font-size: 16px;
          font-weight: 750;
          color: #1A2B20;
          margin-bottom: 10px;
          letter-spacing: -0.2px;
        }

        .role-description {
          font-size: 12.5px;
          color: #526357;
          line-height: 1.55;
          margin-bottom: 22px;
          flex-grow: 1;
        }

        .role-action-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--theme-color, #1F5738);
          margin-top: auto;
          opacity: 0.75;
          transition: all 0.3s ease;
        }

        .custom-role-card:hover .role-action-link {
          opacity: 1;
          transform: translateX(5px);
        }

        .role-committee {
          --theme-color: #1F5738;
          --glow-color: rgba(31, 87, 56, 0.35);
          --icon-bg: rgba(31, 87, 56, 0.10);
          --icon-border: rgba(31, 87, 56, 0.28);
        }
        .role-participant {
          --theme-color: #8A6A3B;
          --glow-color: rgba(138, 106, 59, 0.35);
          --icon-bg: rgba(138, 106, 59, 0.10);
          --icon-border: rgba(138, 106, 59, 0.28);
        }
        .role-evaluator {
          --theme-color: #3D6B57;
          --glow-color: rgba(61, 107, 87, 0.35);
          --icon-bg: rgba(61, 107, 87, 0.10);
          --icon-border: rgba(61, 107, 87, 0.28);
        }

        .seed-details-container {
          margin-top: 32px;
          border: 1px solid rgba(226, 221, 208, 0.60);
          background: rgba(251, 249, 244, 0.40);
          border-radius: 16px;
          padding: 6px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .seed-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          cursor: pointer;
          user-select: none;
          font-size: 13.5px;
          font-weight: 600;
          color: #526357;
          transition: color 0.2s;
        }

        .seed-summary:hover {
          color: #1A2B20;
        }

        .seed-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 12px;
          border-top: 1px solid rgba(226, 221, 208, 0.50);
          background: rgba(226, 221, 208, 0.25);
          border-radius: 12px;
        }

        .seed-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 14px;
          background: rgba(251, 249, 244, 0.55);
          border: 1px solid rgba(226, 221, 208, 0.50);
          border-radius: 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          text-align: left;
        }

        .seed-label {
          font-size: 9px;
          font-weight: 600;
          color: #7C8D80;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .seed-value-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .seed-value {
          color: #1A2B20;
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          max-width: 76%;
        }

        .seed-copy-btn {
          background: rgba(226, 221, 208, 0.30);
          border: 1px solid rgba(226, 221, 208, 0.60);
          color: #526357;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 10px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .seed-copy-btn:hover {
          background: rgba(226, 221, 208, 0.55);
          color: #1A2B20;
          border-color: rgba(226, 221, 208, 0.90);
        }

        .glass-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(226, 221, 208, 0.70);
          background: rgba(251, 249, 244, 0.60);
          color: #1A2B20;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .glass-input:focus {
          border-color: rgba(31, 87, 56, 0.55);
          background: rgba(251, 249, 244, 0.80);
          box-shadow:
            0 0 0 1px rgba(31, 87, 56, 0.4),
            0 0 16px rgba(31, 87, 56, 0.12);
        }

        .btn-glass-sm-submit {
          position: relative;
          overflow: hidden;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: #ffffff;
          box-shadow: 0 4px 20px rgba(26, 43, 32, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          background-size: 200% auto;
          background-image: linear-gradient(135deg, #4C9A6A 0%, #1F5738 50%, #163F2A 100%);
        }
        .btn-glass-sm-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(31, 87, 56, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          background-position: right center;
        }
        .btn-glass-sm-submit:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .btn-glass-sm-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* --- SPLASH SCREEN CSS --- */
        .splash-stage {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #FBF9F4;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          --ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
          --spring-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .splash-logoRow { display: flex; align-items: center; justify-content: center; gap: 24px; }
        .splash-iconWrap { position: relative; width: 120px; height: 120px; flex-shrink: 0; animation: dropIn 0.9s var(--ease-out-quart) forwards; }
        .splash-iconWrap svg { overflow: visible; }
        .splash-svg-state { transform-origin: 65px 65px; opacity: 0; animation: popIn 0.4s var(--ease-out-quart) 0.3s forwards; }
        .splash-svg-t { transform-origin: 56px 55px; opacity: 0; animation: slamDown 0.5s var(--ease-out-quart) 0.5s forwards; }
        .splash-svg-i { transform-origin: 76px 70px; opacity: 0; animation: springDown 0.7s var(--spring-bounce) 0.75s forwards; }
        .splash-textSide { display: flex; flex-direction: column; line-height: 1; overflow: hidden; }
        .splash-line-wrap { overflow: hidden; display: block; }
        .splash-txt { display: block; font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 52px; color: #1A2B20; letter-spacing: 3px; opacity: 0; }
        .splash-txt-texas { animation: slideUp 0.6s var(--ease-out-quart) 0.9s forwards; }
        .splash-txt-inst { animation: slideUp 0.6s var(--ease-out-quart) 1.05s forwards; }
        .splash-redLine { width: 0; height: 3px; background: #1F5738; margin-top: 6px; border-radius: 2px; animation: sweepRight 0.5s var(--ease-out-quart) 1.3s forwards; }
        .splash-tagline { margin-top: 18px; font-size: 12px; letter-spacing: 5px; color: #526357; text-transform: uppercase; opacity: 0; animation: fadeRise 0.5s var(--ease-out-quart) 1.6s forwards; }
        
        @keyframes dropIn { 0% { transform: translateY(-300px) rotate(-20deg) scale(0.4); opacity: 0; } 100% { transform: translateY(0) rotate(0) scale(1); opacity: 1; } }
        @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slamDown { 0% { transform: translateY(-60px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes springDown { 0% { transform: translateY(-80px) rotate(-15deg); opacity: 0; } 100% { transform: translateY(0) rotate(0); opacity: 1; } }
        @keyframes slideUp { 0% { transform: translateY(100%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes sweepRight { 0% { width: 0; } 100% { width: 100%; } }
        @keyframes fadeRise { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      `
      document.head.appendChild(styleSheet)
    }
  }, [])

  // Triggered when any role card is clicked
  async function handleRoleClick(role) {
    setMockRole(role)

    let activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id')
    if (!activeEventId) {
      activeEventId = SEED.event_id
      localStorage.setItem('current_event_id', activeEventId)
      localStorage.setItem('event_id', activeEventId)
    }

    if (role === 'participant') {
      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await fetch(`${baseURL}/api/v1/events/${activeEventId}/participants`)
        if (response.ok) {
          const participants = await response.json()
          if (participants && participants.length > 0) {
            localStorage.setItem('participant_id', participants[0].id)
          } else {
            localStorage.setItem('participant_id', SEED.participant_id)
          }
        } else {
          localStorage.setItem('participant_id', SEED.participant_id)
        }
      } catch (err) {
        localStorage.setItem('participant_id', SEED.participant_id)
      }
    }

    if (role === 'evaluator') {
      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await fetch(`${baseURL}/api/v1/events/${activeEventId}/evaluators`)
        if (response.ok) {
          const evaluators = await response.json()
          if (evaluators && evaluators.length > 0) {
            const firstEval = evaluators[0]
            if (firstEval && firstEval.access_token) {
              localStorage.setItem('evaluator_token', firstEval.access_token)
            } else {
              localStorage.setItem('evaluator_token', SEED.evaluator_token)
            }
          } else {
            localStorage.setItem('evaluator_token', SEED.evaluator_token)
          }
        } else {
          localStorage.setItem('evaluator_token', SEED.evaluator_token)
        }
      } catch (err) {
        localStorage.setItem('evaluator_token', SEED.evaluator_token)
      }
    }

    if (role === 'committee') {
      setShowLogin(true)
    } else {
      navigate(dashboardByRole[role], { replace: true })
    }
  }

  async function handleCommitteeLogin(e) {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)

    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setLoginError(data.detail || 'Invalid email or password')
        return
      }

      // Extract dynamic role signatures safely
      let actualRole = null
      let decoded = null
      try {
        const payload = data.access_token.split('.')[1]
        decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))

      } catch (err) {
        console.error("JWT reading fault:", err)
      }

      // ✅ Fix — DB role should be checked, JWT role is irrelevant here
      actualRole = data.user?.role

      if (committeeRole === 'member' && actualRole === 'admin') {
        setLoginError('This account has admin privileges. Please sign in using the Admin tab.')
        return
      }

      if (committeeRole === 'admin' && actualRole === 'member') {
        setLoginError('This account does not have admin privileges. Please sign in using the Member tab.')
        return
      }

      // 🎯 FIXED: Do not blindly stomp mock role with 'committee' if logging in as Admin
      if (actualRole === 'admin' || actualRole === 'dynamic-committee') {
        localStorage.setItem('eventflow_mock_role', 'dynamic-committee')
      } else {
        localStorage.setItem('eventflow_mock_role', 'committee')
      }

      // Store standard access vectors
      localStorage.setItem('eventflow_token', data.access_token)
      localStorage.setItem('eventflow_refresh_token', data.refresh_token)
      localStorage.setItem('committee_user', JSON.stringify(data.user))

      if (decoded?.event_id) {
        localStorage.setItem('current_event_id', decoded.event_id)
        localStorage.setItem('event_id', decoded.event_id)
      }

      setShowLogin(false)

      // Route transitions based on authorization clearance
      if (committeeRole === 'admin' || actualRole === 'admin') {
        setShowSetup(true)
      } else {
        navigate(dashboardByRole['committee'], { replace: true })
      }

    } catch (err) {
      setLoginError('Could not connect to server.')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleCommitteeSignup(e) {
    e.preventDefault()
    setSignupError(null)
    setSignupLoading(true)
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${baseURL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName, email: signupEmail, password: signupPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSignupError(data.detail || 'Signup failed. Please try again.')
        return
      }

      // 🎯 FIXED: Align registration mock roles for new workspace structures
      if (committeeRole === 'admin') {
        localStorage.setItem('eventflow_mock_role', 'dynamic-committee')
      } else {
        localStorage.setItem('eventflow_mock_role', 'committee')
      }

      localStorage.setItem('eventflow_token', data.access_token)
      localStorage.setItem('eventflow_refresh_token', data.refresh_token)
      localStorage.setItem('committee_user', JSON.stringify(data.user))
      setShowSignup(false)
      setShowLogin(false)
      setShowSetup(true)
    } catch (err) {
      setSignupError('Could not connect to server.')
    } finally {
      setSignupLoading(false)
    }
  }

  function handleGoogleAuth(flow) {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    window.location.href = `${baseURL}/auth/google?flow=${flow}`
  }

  // Submits the Event name form data directly onto FastAPI endpoints
  async function handleInitializeWorkspace(e) {
    e.preventDefault()

    // 🎯 FIXED: Safely evaluate dynamic track routing variables here
    const currentRole = getCurrentRole()
    const mockRole = localStorage.getItem('eventflow_mock_role')
    const effectiveRole = mockRole || currentRole

    const targetDashboardPath = (effectiveRole === 'dynamic-committee' || effectiveRole === 'admin')
      ? '/dynamic-test/dynamic-dashboard'
      : dashboardByRole['committee']

    if (mode === 'select') {
      if (!selectedEventId) return
      localStorage.setItem('current_event_id', selectedEventId)
      localStorage.setItem('event_id', selectedEventId)
      navigate(targetDashboardPath, { replace: true })
      return
    }

    const finalEventName = newEventName.trim() || eventName.trim() || 'New Event'

    try {
      setIsCreating(true)
      setApiError(null)

      const response = await createEvent({
        name: finalEventName,
        event_type: 'Hackathon',
      })

      const dynamicId = response.id || response.event_id || SEED.event_id

      localStorage.setItem('current_event_id', dynamicId)
      localStorage.setItem('event_id', dynamicId)

      navigate(targetDashboardPath, { replace: true })

    } catch (err) {
      console.error('FastAPI Connection Error:', err)
      setApiError(err.message || 'Backend communication dropped. Falling back to local mock defaults.')

      localStorage.setItem('current_event_id', SEED.event_id)
      setTimeout(() => navigate(targetDashboardPath, { replace: true }), 1500)
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    agentBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentMessages, agentLoading])

  async function initAgentChat() {
    setAgentLoading(true)
    setAgentMessages([])
    setAgentCollected({})
    setAgentStagePreview([])
    setAgentSummary(null)
    setAgentApproved(false)
    setAgentDraftId(null)
    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${baseURL}/api/config-agent/init`, { method: 'POST' })
      if (!res.ok) throw new Error('init failed')
      const data = await res.json()
      setAgentMessages([{ role: 'assistant', content: data.reply }])
      if (data.blueprint) setAgentCollected(data.blueprint)
      if (data.stage_preview) setAgentStagePreview(data.stage_preview)
      if (data.draft_id) setAgentDraftId(data.draft_id)
    } catch (e) {
      console.error('[v0] config-agent init failed:', e)
      setAgentMessages([{ role: 'assistant', content: "Hi! I'm your Event Configuration Assistant. Tell me about the event you want to create. You can describe it in any way you like - I'll figure out the structure, rules, and settings." }])
    }
    setAgentLoading(false)
  }

  async function sendAgentMessage(inputText = null, fileType = null, fileContent = null) {
    const text = (typeof inputText === 'string' ? inputText : null) || agentInput.trim()
    if (!text || agentLoading) return
    setAgentInput('')
    if (agentTextareaRef.current) agentTextareaRef.current.style.height = 'auto'

    const newMessages = [...agentMessages, {
      role: 'user',
      content: text,
      file_type: fileType,
      file_content: fileContent
    }]
    setAgentMessages(newMessages)
    setAgentLoading(true)

    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${baseURL}/api/config-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          blueprint: agentCollected,
          draft_id: agentDraftId,
        }),
      })
      if (!res.ok) throw new Error('chat failed')
      const data = await res.json()
      setAgentMessages([...newMessages, { role: 'assistant', content: data.reply }])
      setAgentCollected(data.blueprint || {})
      if (data.stage_preview) setAgentStagePreview(data.stage_preview)
      if (data.draft_id) setAgentDraftId(data.draft_id)
      if (data.is_summary) setAgentSummary(agentParseSummary(data.reply))
      if (data.is_approved) setAgentApproved(true)
    } catch (e) {
      console.error('[v0] config-agent message failed:', e)
      setAgentMessages([...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setAgentLoading(false)
  }

  function handleAgentKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendAgentMessage()
    }
  }

  function handleAgentTextareaChange(e) {
    setAgentInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  async function handleAgentFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file || agentLoading) return

    const isPDF = file.type === "application/pdf"
    if (!isPDF) {
      alert("Please upload a PDF file")
      return
    }

    setAgentUploadProgress(50)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const fileContent = event.target?.result?.split(",")[1] // base64
        const userMsg = `PDF uploaded: ${file.name}`

        const newMessages = [...agentMessages, { role: 'user', content: userMsg, file_type: 'pdf', file_content: fileContent }]
        setAgentMessages(newMessages)
        setAgentUploadProgress(100)
        setTimeout(() => setAgentUploadProgress(null), 500)

        setAgentLoading(true)
        try {
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const res = await fetch(`${baseURL}/api/config-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: newMessages.map((m) => ({
                role: m.role,
                content: m.content,
                file_type: m.file_type || null,
                file_content: m.file_content || null
              })),
              blueprint: agentCollected,
              draft_id: agentDraftId,
            }),
          })
          if (!res.ok) throw new Error('chat failed')
          const data = await res.json()
          setAgentMessages([...newMessages, { role: 'assistant', content: data.reply }])
          setAgentCollected(data.blueprint || {})
          if (data.stage_preview) setAgentStagePreview(data.stage_preview)
          if (data.draft_id) setAgentDraftId(data.draft_id)
          if (data.is_summary) setAgentSummary(agentParseSummary(data.reply))
          if (data.is_approved) setAgentApproved(true)
        } catch (err) {
          console.error('[v0] PDF upload failed:', err)
          setAgentMessages([...newMessages, { role: 'assistant', content: 'Sorry, failed to process the PDF. Please try again.' }])
        }
        setAgentLoading(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error("[v0] File read error:", err)
      setAgentUploadProgress(null)
    }

    if (agentFileInputRef.current) agentFileInputRef.current.value = ""
  }

  async function startAgentRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome, Safari, or Edge.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      const startText = agentInput

      recognition.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }

        const speechText = finalTranscript || interimTranscript
        const newText = startText + (startText && speechText ? ' ' : '') + speechText
        setAgentInput(newText)

        if (agentTextareaRef.current) {
          agentTextareaRef.current.style.height = 'auto'
          agentTextareaRef.current.style.height = Math.min(agentTextareaRef.current.scrollHeight, 120) + 'px'
        }
      }

      recognition.onerror = (e) => {
        console.error("[SpeechRecognition] Error:", e)
        if (e.error === 'not-allowed') {
          alert("Microphone permission was denied.")
        } else if (e.error !== 'aborted') {
          alert(`Speech recognition error: ${e.error}`)
        }
        setAgentIsRecording(false)
      }

      recognition.onend = () => {
        setAgentIsRecording(false)
      }

      agentSpeechRecognitionRef.current = recognition
      recognition.start()
      setAgentIsRecording(true)
    } catch (err) {
      console.error("[SpeechRecognition] Access denied/failed:", err)
      alert("Microphone access is required for voice input")
    }
  }

  function stopAgentRecording() {
    if (agentSpeechRecognitionRef.current) {
      agentSpeechRecognitionRef.current.stop()
    }
    setAgentIsRecording(false)
  }

  async function handleAgentFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file || agentLoading) return

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file")
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        const fileContent = event.target?.result?.split(",")[1]
        const userMsg = `PDF uploaded: ${file.name}`
        sendAgentMessage(userMsg, 'pdf', fileContent)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error("[v0] File read error:", err)
    }

    if (agentFileInputRef.current) agentFileInputRef.current.value = ""
  }
  async function handleAgentApprove() {
    if (agentApproveLoading) return

    // Hackathon: the standard event (fixed 13-stage committee pipeline) was already
    // created via POST /api/v1/events when "Configure Event via Agent" was clicked
    // (initializeWorkspace), and its id is already in current_event_id. Open THAT
    // existing event in the committee admin — don't commit a second dynamic event.
    const isHackathon = (agentCollected?.event_type || '').toLowerCase().includes('hackathon')
    if (isHackathon) {
      const existingEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id')
      if (existingEventId) {
        localStorage.setItem('current_event_id', existingEventId)
        localStorage.setItem('event_id', existingEventId)
      }
      setMockRole('committee')
      setShowConfigAgent(false)
      setShowCreatingScreen(true)
      setTimeout(() => {
        setEventReady(true)
        navigate('/committee/dashboard', { replace: true })
      }, 2500)
      return
    }

    if (!agentDraftId) return
    setAgentApproveLoading(true)

    const currentRole = getCurrentRole()
    const mockRole = localStorage.getItem('eventflow_mock_role')
    const effectiveRole = mockRole || currentRole

    const targetDashboardPath = (effectiveRole === 'dynamic-committee' || effectiveRole === 'admin')
      ? '/dynamic-test/dynamic-dashboard'
      : dashboardByRole['committee']

    try {
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${baseURL}/api/config-agent/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: agentDraftId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail?.message || err.detail || 'commit failed')
      }
      const data = await res.json()
      localStorage.setItem('current_event_id', data.event_id)
      localStorage.setItem('event_id', data.event_id)
    } catch (e) {
      console.error('[v0] config-agent commit failed:', e)
      setAgentApproveLoading(false)
      return // don't fall back to a fake event — let the committee fix the issue and retry
    }

    setAgentApproveLoading(false)
    setShowCreatingScreen(true)
    setShowConfigAgent(false)
    setTimeout(() => {
      setEventReady(true)
      navigate(targetDashboardPath, { replace: true })
    }, 2500)
  }

  if (showSplash) {
    return (
      <div className="splash-stage">
        <div className="splash-logoRow">
          <div className="splash-iconWrap">
            <svg viewBox="0 0 130 130" width="120" height="120">
              <g className="splash-svg-state">
                <path d="M18 26 L70 16 L112 28 L114 72 L96 92 L80 120 L65 109 L49 120 L28 92 L16 72 Z" fill="#CC0000" />
              </g>
              <g className="splash-svg-t">
                <rect x="30" y="32" width="50" height="11" rx="2.5" fill="black" />
                <rect x="50" y="32" width="12" height="44" rx="2.5" fill="black" />
              </g>
              <g className="splash-svg-i">
                <rect x="66" y="54" width="11" height="9" rx="2" fill="black" />
                <rect x="63" y="65" width="24" height="9" rx="2" fill="black" />
                <rect x="68" y="63" width="6" height="22" rx="1.5" fill="black" />
                <rect x="63" y="85" width="24" height="9" rx="2" fill="black" />
              </g>
            </svg>
          </div>
          <div className="splash-textSide">
            <span className="splash-line-wrap"><span className="splash-txt splash-txt-texas">TEXAS</span></span>
            <span className="splash-line-wrap"><span className="splash-txt splash-txt-inst">INSTRUMENTS</span></span>
            <div className="splash-redLine"></div>
          </div>
        </div>
        <div className="splash-tagline">Think innovation. Think TI.</div>
      </div>
    )
  }

  return (
    <main className="access-page">
      <div className="access-grid-overlay" />
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />

      <section className="card login-card">
        {!showSetup && !showLogin ? (
          <>
            <h2>Choose a portal</h2>
            <p className="login-copy">
              Demo mode active. Profiles are pre-configured to automatically inject local seeded structures for verification testing instantly.
            </p>

            <div className="login-role-grid">
              {VALID_ROLES.map((role) => (
                <div
                  className={`custom-role-card role-${role}`}
                  key={role}
                  onClick={() => handleRoleClick(role)}
                >
                  <div className="role-icon-container">
                    {roleIcons[role]}
                  </div>
                  <strong className="role-title">
                    {role === 'committee' ? 'Committee Dashboard' : role === 'participant' ? 'Participant Portal' : 'Evaluator Workspace'}
                  </strong>
                  <span className="role-description">{roleCopy[role]}</span>
                  <span className="role-action-link">
                    Enter Portal <span>→</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="seed-details-container">
              <div
                className="seed-summary"
                onClick={() => setShowSeedDetails(!showSeedDetails)}
              >
                <span>🔑 Seeded IDs &amp; Reference Identifiers</span>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>{showSeedDetails ? '▲ Hide' : '▼ Show'}</span>
              </div>

              {showSeedDetails && (
                <div className="seed-grid">
                  <div className="seed-item">
                    <span className="seed-label">Active Event ID</span>
                    <div className="seed-value-wrapper">
                      <span className="seed-value" style={{ color: '#1F5738' }}>{SEED.event_id}</span>
                      <button
                        type="button"
                        className="seed-copy-btn"
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(SEED.event_id, 'event_id') }}
                      >
                        {copiedField === 'event_id' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="seed-item">
                    <span className="seed-label">Participant ID (Aryan Mehta)</span>
                    <div className="seed-value-wrapper">
                      <span className="seed-value" style={{ color: '#3D6B57' }}>{SEED.participant_id}</span>
                      <button
                        type="button"
                        className="seed-copy-btn"
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(SEED.participant_id, 'participant_id') }}
                      >
                        {copiedField === 'participant_id' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="seed-item">
                    <span className="seed-label">Evaluator Access Token</span>
                    <div className="seed-value-wrapper">
                      <span className="seed-value" style={{ color: '#6D28D9' }}>{SEED.evaluator_token}</span>
                      <button
                        type="button"
                        className="seed-copy-btn"
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(SEED.evaluator_token, 'evaluator_token') }}
                      >
                        {copiedField === 'evaluator_token' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="seed-item">
                    <span className="seed-label">Active Host Endpoint</span>
                    <div className="seed-value-wrapper">
                      <span className="seed-value" style={{ color: '#BE123C' }}>http://localhost:8000</span>
                      <button
                        type="button"
                        className="seed-copy-btn"
                        onClick={(e) => { e.stopPropagation(); copyToClipboard('http://localhost:8000', 'endpoint') }}
                      >
                        {copiedField === 'endpoint' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : showLogin ? (
          <div style={{ marginTop: '12px' }}>
            <div style={{
              background: 'rgba(251, 249, 244, 0.55)',
              borderRadius: '20px',
              padding: '24px',
              color: '#1A2B20',
              boxShadow: '0 20px 40px rgba(26, 43, 32, 0.15)',
              border: '1px solid rgba(226, 221, 208, 0.60)',
            }}>
              <p className="eyebrow" style={{ marginBottom: '8px' }}>EventFlow · Committee Portal</p>
              <h2 style={{ margin: '0 0 8px', color: '#1A2B20' }}>
                {showSignup ? 'Create Admin Account' : 'Committee Login'}
              </h2>
              <p style={{ color: '#526357', fontSize: '14.5px', margin: '0 0 24px' }}>
                {showSignup
                  ? 'Sign up as a committee admin to create and manage your event.'
                  : 'Sign in with your committee credentials to access the workspace.'}
              </p>

              {!showSignup && (
                <div style={{
                  display: 'flex',
                  background: 'rgba(226, 221, 208, 0.35)',
                  borderRadius: '10px',
                  padding: '4px',
                  marginBottom: '24px',
                  border: '1px solid rgba(226, 221, 208, 0.60)',
                }}>
                  {['admin', 'member'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setCommitteeRole(r); setLoginError(null) }}
                      style={{
                        flex: 1,
                        padding: '9px 0',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.25s ease',
                        background: committeeRole === r ? '#1F5738' : 'transparent',
                        color: committeeRole === r ? '#ffffff' : '#526357',
                        textTransform: 'capitalize',
                        boxShadow: committeeRole === r ? '0 4px 12px rgba(31, 87, 56, 0.3)' : 'none',
                      }}
                    >
                      {r === 'admin' ? '🏛 Admin' : '👤 Member'}
                    </button>
                  ))}
                </div>
              )}

              {(loginError || signupError) && (
                <div style={{
                  background: 'rgba(225, 29, 72, 0.08)',
                  border: '1px solid rgba(225, 29, 72, 0.25)',
                  color: '#BE123C',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  marginBottom: '20px',
                  textAlign: 'left',
                }}>
                  {loginError || signupError}
                </div>
              )}

              {showSignup ? (
                <form onSubmit={handleCommitteeSignup} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#526357' }}>Full Name</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Your name"
                      className="glass-input"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#526357' }}>Email</label>
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      className="glass-input"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#526357' }}>Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Min. 8 characters"
                      className="glass-input"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginTop: '8px' }}>
                    <button type="submit" disabled={signupLoading} className="btn-glass-sm-submit" style={{ width: '55%' }}>
                      {signupLoading ? 'Creating account...' : 'Create Account →'}
                    </button>

                    {/* Google Signup */}
                    <button
                      type="button"
                      onClick={() => handleGoogleAuth('admin-signup')}
                      style={{
                        width: '55%', padding: '11px 24px', borderRadius: '10px',
                        border: '1px solid rgba(226,221,208,0.7)', background: 'rgba(251,249,244,0.5)',
                        color: '#1A2B20', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      Continue with Google
                    </button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#7C8D80', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: '4px' }}
                      onClick={() => { setShowSignup(false); setSignupError(null) }}
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              ) : (
                /* ── Login Form ── */
                <form onSubmit={handleCommitteeLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#526357' }}>Email</label>
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="your@email.com"
                      className="glass-input"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#526357' }}>Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Your password"
                      className="glass-input"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                    <button type="submit" disabled={loginLoading} className="btn-glass-sm-submit" style={{ width: '55%' }}>
                      {loginLoading ? 'Signing in...' : 'Sign In →'}
                    </button>

                    {/* Google login*/}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(226,221,208,0.6)' }} />
                      <span style={{ color: '#7C8D80', fontSize: '12px' }}>or</span>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(226,221,208,0.6)' }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoogleAuth(committeeRole === 'admin' ? 'admin-login' : 'member-login')}
                      style={{
                        width: '55%', padding: '11px 24px', borderRadius: '10px',
                        border: '1px solid rgba(226,221,208,0.7)', background: 'rgba(251,249,244,0.5)',
                        color: '#1A2B20', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,249,244,0.75)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,249,244,0.5)'}
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      Continue with Google
                    </button>
                    {/* Only show signup link for admin */}
                    {committeeRole === 'admin' && (
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#1F5738', fontSize: '13.5px', cursor: 'pointer', padding: '4px' }}
                        onClick={() => { setShowSignup(true); setLoginError(null) }}
                      >
                        Don't have an account? Sign up
                      </button>
                    )}
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#7C8D80', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: '4px' }}
                      onClick={() => { navigate('/'); setLoginError(null); setShowSignup(false) }}
                    >
                      ← Back to Home
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="setup-view-transition" style={{ marginTop: '12px' }}>
            <h2>Initialize Event Workspace</h2>
            <p className="login-copy" style={{ marginBottom: '24px' }}>
              Select an existing active event workspace or create a new one.
            </p>

            {apiError && (
              <div style={{ background: 'rgba(225, 29, 72, 0.08)', border: '1px solid rgba(225, 29, 72, 0.25)', color: '#BE123C', padding: '12px', borderRadius: '8px', fontSize: '13.5px', marginBottom: '18px', textAlign: 'left' }}>
                {apiError}
              </div>
            )}

            <form onSubmit={handleInitializeWorkspace}>
              {mode === 'select' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', textAlign: 'left' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: '600', color: '#526357' }}>
                    Select Existing Event
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="glass-input"
                      style={{
                        appearance: 'none',
                        backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%23526357\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")',
                        backgroundPosition: 'right 14px center',
                        backgroundSize: '1.25rem',
                        backgroundRepeat: 'no-repeat',
                        paddingRight: '40px'
                      }}
                    >
                      <option value="" style={{ background: '#FBF9F4', color: '#7C8D80' }}>-- Select an Event --</option>
                      {existingEvents.map(ev => (
                        <option key={ev.id} value={ev.id} style={{ background: '#FBF9F4', color: '#1A2B20' }}>{ev.name} ({ev.id.substring(0, 8)})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#1F5738', fontSize: '13px', cursor: 'pointer', textAlign: 'left', marginTop: '10px', padding: 0, fontWeight: '700' }}
                    onClick={() => { setMode('create'); setShowNameInput(true); setNewEventName('') }}
                  >
                    + Create a New Event
                  </button>
                </div>
              ) : showNameInput ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: '600', color: '#526357' }}>Event Name</label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. TI Hackathon 2026"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newEventName.trim()) setShowNameInput(false) } }}
                      className="glass-input"
                    />
                    <p style={{ fontSize: '12.5px', color: '#7C8D80', margin: '2px 0 0', textAlign: 'left' }}>This name will be used to identify your event across the platform.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled={!newEventName.trim()}
                      onClick={() => setShowNameInput(false)}
                      className="btn-glass-sm-submit"
                      style={{ flex: 1, opacity: newEventName.trim() ? 1 : 0.45 }}
                    >
                      Continue →
                    </button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#526357', fontSize: '13.5px', cursor: 'pointer', textDecoration: 'underline', padding: '4px', whiteSpace: 'nowrap' }}
                      onClick={() => { setMode('select'); setShowNameInput(false); setNewEventName('') }}
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(31, 87, 56, 0.08)', border: '1px solid rgba(31, 87, 56, 0.25)', borderRadius: '10px' }}>
                    <span>📌</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1F5738' }}>{newEventName}</span>
                    <button type="button" onClick={() => setShowNameInput(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#526357', fontSize: '12.5px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>edit</button>
                  </div>

                  <p style={{ fontSize: '13.5px', fontWeight: '600', color: '#526357', margin: 0, textAlign: 'left' }}>How would you like to set up your new event?</p>



                  {/* ── OPTION B: Committee Dashboard Workspace ── */}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      const eventData = await initializeWorkspace('committee', 'Hackathon', 'New Event', null);
                      if (eventData) {
                        navigate(dashboardByRole['committee'], { replace: true });
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '18px 20px', borderRadius: '12px', border: '1px solid rgba(226, 221, 208, 0.60)', background: 'rgba(251, 249, 244, 0.45)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', width: '100%' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(31, 87, 56, 0.4)'; e.currentTarget.style.background = 'rgba(31, 87, 56, 0.06)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(31, 87, 56, 0.10)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(226, 221, 208, 0.60)'; e.currentTarget.style.background = 'rgba(251, 249, 244, 0.45)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ fontSize: '24px', lineHeight: 1 }}>🗂️</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '750', color: '#1A2B20', marginBottom: '4px' }}>Open Committee Workspace</div>
                      <div style={{ fontSize: '12.5px', color: '#526357', lineHeight: 1.45 }}>Jump straight into the committee dashboard with default settings.</div>
                    </div>
                  </button>



                  {/* ── OPTION C: AI Copilot Setup ── */}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      const eventData = await initializeWorkspace('dynamic-committee', 'Hackathon', 'New Event', null);
                      if (eventData) {
                        setShowConfigAgent(true);
                        setShowSetup(false);
                        initAgentChat();
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '18px 20px', borderRadius: '12px', border: '1px solid rgba(226, 221, 208, 0.60)', background: 'rgba(251, 249, 244, 0.45)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', width: '100%' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(61, 107, 87, 0.4)'; e.currentTarget.style.background = 'rgba(61, 107, 87, 0.06)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(61, 107, 87, 0.10)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(226, 221, 208, 0.60)'; e.currentTarget.style.background = 'rgba(251, 249, 244, 0.45)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ fontSize: '24px', lineHeight: 1 }}>🤖</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '750', color: '#1A2B20', marginBottom: '4px' }}>Configure Event via Agent</div>
                      <div style={{ fontSize: '12.5px', color: '#526357', lineHeight: 1.45 }}>Chat with our AI assistant to configure your event step by step.</div>
                    </div>
                  </button>

                  {existingEvents.length > 0 && (
                    <button type="button" style={{ background: 'none', border: 'none', color: '#526357', fontSize: '13px', cursor: 'pointer', textAlign: 'left', padding: 0, fontWeight: '700', marginTop: '6px' }} onClick={() => { setMode('select'); setShowNameInput(false); setNewEventName('') }}>← Select an Existing Event</button>
                  )}
                </div>
              )}

              {/* Existing Event Selection Submission Layout */}
              {mode === 'select' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="submit"
                    disabled={isCreating || !selectedEventId}
                    className="btn-glass-sm-submit"
                    style={{ width: '55%', fontWeight: '700' }}
                  >
                    {isCreating ? 'Provisioning DB...' : 'Open Committee Workspace →'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </section>

      {/* ── Fixed Target UI Layout inside the Overlay Window ── */}
      {showConfigAgent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#FBF9F4', display: 'flex', flexDirection: 'column', fontFamily: "Inter, system-ui, sans-serif" }}>

          {/* Header Row */}
          <div style={{ padding: "14px 24px", background: "#FBF9F4", borderBottom: "1px solid #E2DDD0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ color: "#1F5738", fontSize: 22, fontWeight: "bold" }}>✨</div>
              <div>
                <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1A2B20" }}>Event Configuration Assistant</h1>
                <p style={{ fontSize: 12, color: "#526357", margin: 0 }}>Describe your event in natural language and I'll configure everything for you.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" onClick={() => { setShowConfigAgent(false); setShowSetup(true); }} style={{ background: "#FBF9F4", border: "1px solid #E2DDD0", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "#1A2B20", fontWeight: 500 }}>← Back to Dashboard</button>
              <button type="button" onClick={() => initAgentChat()} style={{ background: "#FBF9F4", border: "1px solid #1F5738", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "#1F5738", fontWeight: 500 }}> New Conversation</button>
            </div>
          </div>

          {/* 2-Column Core Interface Split Layout */}
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 0, minHeight: 0, overflow: "hidden" }}>

            {/* Left Box: Chat Panel */}
            <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid #E2DDD0", background: "#FBF9F4", overflow: "hidden" }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {agentMessages.map((msg, i) => (
                    <div key={i}>
                      {i === 1 && (
                        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
                          <span style={{ background: "#EDE8DC", color: "#526357", fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 12 }}>Today</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 12 }}>
                        {msg.role === "assistant" && (
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E5F0E9", border: "1px solid #BFE3C9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
                        )}
                        <div style={{ maxWidth: "75%", padding: "14px 18px", borderRadius: 16, background: msg.role === "user" ? "#E5F0E9" : "#FBF9F4", color: "#1A2B20", fontSize: 14, lineHeight: 1.6, boxShadow: "0 1px 2px rgba(26,43,32,0.04)", border: "1px solid #E2DDD0" }}>
                          {msg.role === "user" && <div style={{ fontSize: 10, color: "#7C8D80", textAlign: "right", marginBottom: 4 }}>11:32 AM</div>}
                          {msg.role === "assistant" && i === 2 && <div style={{ fontSize: 10, color: "#7C8D80", marginBottom: 4 }}>11:32 AM</div>}

                          <ReactMarkdown components={{
                            p: ({ children }) => <p style={{ margin: "4px 0" }}>{children}</p>,
                            ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: "6px 0" }}>{children}</ul>,
                            li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                            strong: ({ children }) => <strong style={{ fontWeight: 700, color: "#1A2B20" }}>{children}</strong>,
                          }}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={agentBottomRef} />
                </div>
              </div>

              {/* Custom Action Suggestion Chips Row */}
              <div style={{ padding: "0px 24px 12px", display: "flex", gap: 8, flexWrap: "wrap", background: "transparent" }}>
                {["Add timeline details", "Define scoring criteria", "Judges & evaluation", "Communication preferences"].map((chipText) => (
                  <button type="button" key={chipText} onClick={() => setAgentInput(chipText)} style={{ background: "#FBF9F4", border: "1px solid #E2DDD0", color: "#1F5738", padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 500, boxShadow: "0 1px 2px rgba(26,43,32,0.04)" }}>
                    {chipText}
                  </button>
                ))}
              </div>

              {/* Chat Input Deck */}
              <div style={{ padding: "16px 24px 20px", background: "#FBF9F4", borderTop: "1px solid #E2DDD0" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  {/* File upload button */}
                  <input
                    ref={agentFileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleAgentFileUpload}
                    style={{ display: "none" }}
                    disabled={agentLoading || agentApproved}
                  />
                  <button
                    type="button"
                    onClick={() => agentFileInputRef.current?.click()}
                    disabled={agentLoading || agentApproved}
                    aria-label="Upload PDF"
                    title="Upload PDF"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: agentLoading || agentApproved ? "#EDE8DC" : "#FBF9F4",
                      border: "1px solid #E2DDD0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: agentLoading || agentApproved ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      flexShrink: 0
                    }}
                  >
                    <FileIcon color={agentLoading || agentApproved ? "#7C8D80" : "#526357"} />
                  </button>

                  {/* Voice recording button */}
                  <button
                    type="button"
                    onClick={agentIsRecording ? stopAgentRecording : startAgentRecording}
                    disabled={agentLoading || agentApproved}
                    aria-label={agentIsRecording ? "Stop recording" : "Start recording"}
                    title={agentIsRecording ? "Stop recording" : "Start voice recording"}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: agentIsRecording ? "#DC2626" : (agentLoading || agentApproved ? "#EDE8DC" : "#FBF9F4"),
                      border: agentIsRecording ? "1px solid #991B1B" : "1px solid #E2DDD0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: agentLoading || agentApproved ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      flexShrink: 0
                    }}
                  >
                    <MicIcon color={agentIsRecording ? "#fff" : (agentLoading || agentApproved ? "#7C8D80" : "#526357")} isRecording={agentIsRecording} />
                  </button>

                  {/* Textarea */}
                  <textarea
                    ref={agentTextareaRef}
                    value={agentInput}
                    onChange={handleAgentTextareaChange}
                    onKeyDown={handleAgentKeyDown}
                    placeholder="Describe your event or answer a question..."
                    rows={1}
                    disabled={agentLoading || agentApproved}
                    style={{ flex: 1, resize: "none", minHeight: 48, maxHeight: 120, padding: "14px 60px 14px 16px", fontSize: 14, borderRadius: 10, border: "1px solid #E2DDD0", outline: "none", fontFamily: "inherit", lineHeight: 1.5, boxShadow: "0 1px 2px rgba(26,43,32,0.04)", background: agentApproved ? "#EDE8DC" : "#FBF9F4", color: '#1A2B20' }}
                  />

                  {/* Send button */}
                  <button type="button" onClick={() => sendAgentMessage()} disabled={!agentInput.trim() || agentApproved} style={{ position: "relative", width: 36, height: 36, borderRadius: 8, background: agentInput.trim() ? "#1F5738" : "#7C8D80", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: agentInput.trim() ? "pointer" : "not-allowed", transition: "background 0.2s", flexShrink: 0 }}>
                    ➔
                  </button>
                </div>

                {/* Status text */}
                <div style={{ fontSize: 11, color: "#7C8D80", marginTop: 8 }}>
                  {agentUploadProgress ? `Uploading PDF... ${agentUploadProgress}%` : (agentIsRecording ? '🎙️ Recording...' : 'Press Enter to send • Shift + Enter for new line • Or upload PDF / record voice')}
                </div>
              </div>
            </div>


            {/* Right Box: Configuration Preview Dashboard Display */}
            <div style={{ overflowY: "auto", padding: 24, background: "#EDE8DC" }}>
              <LivePreview blueprint={agentCollected} stagePreview={agentStagePreview} summary={agentSummary} onApprove={handleAgentApprove} approveLoading={agentApproveLoading} />
            </div>

          </div>
        </div>
      )}

      {/* ── Creating Event Screen ── */}
      {showCreatingScreen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#FBF9F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          {!eventReady ? (
            <>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid #1F5738', borderTopColor: 'transparent', animation: 'agentSpin 1s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#1A2B20', fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Configuring Your Event</h2>
                <p style={{ color: '#526357', fontSize: 15, margin: 0 }}>Setting up workspaces, pipelines, and team structures…</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Intake forms', 'Team engine', 'Evaluation rubrics', 'Comms pipeline'].map((step, i) => (
                  <span key={step} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#E2DDD0', color: '#526357', border: '1px solid rgba(31, 87, 56, 0.18)', animation: `agentFadeIn 0.5s ease ${i * 0.4}s both` }}>{step}</span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid #1F5738', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 28, color: '#1F5738' }}>✓</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#1A2B20', fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Your Event is Ready</h2>
                <p style={{ color: '#526357', fontSize: 15, margin: 0 }}>Everything has been configured and is ready to go.</p>
              </div>
              <button
                type="button"
                // ✅ Respect the workspace role
                onClick={() => {
                  const mockRole = localStorage.getItem('eventflow_mock_role')
                  if (mockRole === 'dynamic-committee') {
                    navigate('/dynamic-test/dynamic-dashboard', { replace: true })
                  } else {
                    navigate(dashboardByRole['committee'], { replace: true })
                  }
                }}
                style={{ padding: '12px 36px', background: '#1F5738', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.3px' }}
              >
                Open Dashboard →
              </button>
            </>
          )}
          <style>{`
            @keyframes agentSpin { to { transform: rotate(360deg); } }
            @keyframes agentFadeIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
          `}</style>
        </div>
      )}
    </main>
  )
}