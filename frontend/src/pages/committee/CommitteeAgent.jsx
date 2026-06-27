import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import api from "../../api/client";
import { setMockRole } from "../../services/auth";

/* ------------------------------------------------------------------ */
/* Progress sections shown in the "Configuration Progress" card        */
/* ------------------------------------------------------------------ */
const CONFIG_SECTIONS = [
  { name: "Event Type & Mode",        check: (bp) => has(g(bp, "event_type")) && has(g(bp, "mode")) },
  { name: "Workflow Stages",          check: (bp, stages) => Array.isArray(stages) && stages.length > 0 },
  { name: "Participants",             check: (bp) => has(g(bp, "participants.expected_count")) },
  { name: "Timeline",                 check: (bp) => has(g(bp, "timeline.registration_deadline")) || has(g(bp, "timeline.start_date")) },
  { name: "Judging & Scoring",        check: (bp) => has(g(bp, "judging.criteria")) },
  { name: "Roles & Resources",        check: (bp) => has(g(bp, "roles")) || has(g(bp, "resources")) },
  { name: "Description",              check: (bp) => has(g(bp, "description")) },
  { name: "Other Settings",           check: (bp) => has(g(bp, "participants.team_formation_factors")) || has(g(bp, "participants.team_size_max")) },
];

/* Ten signals used for the "X/10 Completed" badge */
const COMPLETION_CHECKS = [
  (bp) => has(g(bp, "event_name")),
  (bp) => has(g(bp, "event_type")),
  (bp) => has(g(bp, "mode")),
  (bp) => has(g(bp, "participants.expected_count")),
  (bp, stages) => Array.isArray(stages) && stages.length > 0,
  (bp) => has(g(bp, "description")),
  (bp) => has(g(bp, "timeline.registration_deadline")) || has(g(bp, "timeline.start_date")),
  (bp) => has(g(bp, "participants.team_formation_factors")),
  (bp) => has(g(bp, "participants.team_size_max")),
  (bp) => has(g(bp, "judging.criteria")),
];

/* ------------------------------------------------------------------ */
/* Inline SVG icons (clean, consistent look)                           */
/* ------------------------------------------------------------------ */
const iconBase = { display: "block", flexShrink: 0 };

function SparkleIcon({ size = 20, color = "#4F46E5" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <path d="M12 3l1.8 4.8L18.6 9.6 13.8 11.4 12 16.2 10.2 11.4 5.4 9.6 10.2 7.8z" fill={color} />
      <path d="M18.5 14l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z" fill={color} opacity="0.6" />
    </svg>
  );
}

function RobotIcon({ size = 18, color = "#2563EB" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <rect x="4" y="8" width="16" height="11" rx="3" stroke={color} strokeWidth="1.6" />
      <path d="M12 4v4M9 13h.01M15 13h.01" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="3.5" r="1.4" fill={color} />
      <path d="M2 12v3M22 12v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function DocIcon({ size = 16, color = "#7C3AED" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v4h4M8 12h8M8 16h6" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WorkflowIcon({ size = 16, color = "#10B981" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <rect x="9" y="3" width="6" height="5" rx="1.2" stroke={color} strokeWidth="1.6" />
      <rect x="3" y="16" width="6" height="5" rx="1.2" stroke={color} strokeWidth="1.6" />
      <rect x="15" y="16" width="6" height="5" rx="1.2" stroke={color} strokeWidth="1.6" />
      <path d="M12 8v4M12 12H6v4M12 12h6v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressIcon({ size = 16, color = "#3B82F6" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <path d="M4 20V4M4 20h16" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="8" y="12" width="3" height="5" rx="1" fill={color} />
      <rect x="13" y="8" width="3" height="9" rx="1" fill={color} opacity="0.6" />
      <rect x="18" y="14" width="3" height="3" rx="1" fill={color} opacity="0.4" />
    </svg>
  );
}

function CheckCircleIcon({ size = 16, color = "#22C55E" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={color} />
      <path d="M8.5 12.5l2.2 2.2 4.8-4.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotCircleIcon({ size = 16, color = "#F59E0B", filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      {filled && <circle cx="12" cy="12" r="3.5" fill={color} />}
    </svg>
  );
}

function EmptyCircleIcon({ size = 16, color = "#D1D5DB" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function PencilIcon({ size = 13, color = "#4B5563" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2 2 0 0 0-2.83-2.83L5.17 17.17 4 20z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon({ size = 16, color = "#374151" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <path d="M15 5l-7 7 7 7M8 12h12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon({ size = 16, color = "#2563EB" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <path d="M4 5h16v10H9l-5 4V5z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function SendIcon({ size = 18, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill={color} />
    </svg>
  );
}

function FileIcon({ size = 16, color = "#6B7280" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 2v7h7" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon({ size = 16, color = "#6B7280", isRecording = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" stroke={color} strokeWidth="1.6" fill={isRecording ? color : "none"} strokeLinejoin="round" />
      <path d="M8 12v3a4 4 0 0 0 8 0v-3M9 20h6M12 17v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotsIcon({ size = 16, color = "#9CA3AF" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={iconBase} aria-hidden="true">
      <circle cx="12" cy="5" r="1.6" fill={color} />
      <circle cx="12" cy="12" r="1.6" fill={color} />
      <circle cx="12" cy="19" r="1.6" fill={color} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Blueprint helpers — everything is derived from the stored blueprint */
/* ------------------------------------------------------------------ */
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

// FastAPI 422s come back as either our own {message, errors[]} detail (from
// commit_event's explicit raise) or the framework's [{loc, msg, type}] shape
// (malformed request body) — both are objects/arrays, not strings, so they
// can't be rendered directly as a React child.
function formatApiErrorDetail(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === "string" ? d : d?.msg || JSON.stringify(d))).join(" — ") || fallback;
  }
  if (typeof detail === "object") {
    const parts = [detail.message, ...(Array.isArray(detail.errors) ? detail.errors : [])].filter(Boolean);
    return parts.length ? parts.join(" — ") : fallback;
  }
  return fallback;
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

/* Engine → display metadata for the workflow timeline */
const ENGINE_META = {
  AUTOMATED:  { badge: "AUTOMATED",  sub: "Automatically scored", dot: "#10B981" },
  ASSESSMENT: { badge: "ASSESSMENT", sub: "Evaluated by judges",  dot: "#8B5CF6" },
  SUBMISSION: { badge: "SUBMISSION", sub: "Submission round",     dot: "#3B82F6" },
  MATCHUP:    { badge: "MATCHUP",    sub: "Head-to-head matches",  dot: "#F59E0B" },
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
      system: !!s.system,
    };
  });
}

/* Entity list -> bullet section, omitted entirely when empty */
function EntityList({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6, fontWeight: 600 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: 500, background: "#F3F4F6", color: "#374151",
            borderRadius: 6, padding: "4px 10px" }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function BadgeChip({ label }) {
  const palette = {
    AUTOMATED:  { bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
    ASSESSMENT: { bg: "#F3E8FF", color: "#7C3AED", border: "#D8B4FE" },
    SUBMISSION: { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
    MATCHUP:    { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  };
  const s = palette[label] || { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
      border: `1px solid ${s.border}`, background: s.bg, color: s.color, letterSpacing: "0.03em" }}>
      {label}
    </span>
  );
}

function Placeholder({ children = "Not set yet" }) {
  return <span style={{ color: "#9CA3AF", fontStyle: "italic", fontWeight: 400 }}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Right-side live preview — fully driven by the stored blueprint      */
/* ------------------------------------------------------------------ */
function LivePreview({ blueprint, entities, stagePreview, defaultsApplied, completedCount,
                        onApprove, onRegenerate, onModify, summary, committed,
                        commitLoading, regenerateLoading, commitError }) {
  const total = 10;
  const completed = Math.min(completedCount, total);

  const name = g(blueprint, "event_name");
  const type = g(blueprint, "event_type");
  const mode = formatMode(g(blueprint, "mode"));
  const participants = g(blueprint, "participants.expected_count");
  const participantsLabel = mode === "Team Based" ? "Teams" : "Participants";

  const rounds = parseStagesPreview(stagePreview);
  const ent = entities || {};
  const defaults = defaultsApplied || {};
  const defaultEntries = Object.entries(defaults);

  const cardStyle = { background: "#fff", border: "1px solid #EEF0F3", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(16,24,40,0.04)" };
  const editBtn = { display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8,
    padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#4B5563", fontWeight: 500 };

  // First incomplete section is shown as "in progress"
  const firstIncomplete = CONFIG_SECTIONS.find((s) => !s.check(blueprint, stagePreview))?.name;

  // Ready to approve as soon as there's an event type and a generated stage
  // pipeline — deterministic, not dependent on the chat LLM emitting a
  // specific marker string (which it doesn't always do reliably).
  const readyToApprove = has(type) && rounds.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SparkleIcon size={18} />
          <span style={{ fontWeight: 700, fontSize: 15, color: "#1F2937" }}>Live Configuration Preview</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, background: "#E8F8EE", color: "#15803D",
          borderRadius: 6, padding: "4px 12px" }}>{completed}/{total} Completed</span>
      </div>

      {/* Event Overview */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: "#F3E8FF", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <DocIcon size={15} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>Event Overview</span>
          </div>
          <button style={editBtn}><PencilIcon /> Edit</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, rowGap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>Name</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{name || <Placeholder />}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>Type</div>
            {type
              ? <span style={{ fontSize: 12, fontWeight: 500, background: "#F3E8FF", color: "#6B21A8", borderRadius: 6, padding: "4px 10px" }}>{prettify(type)}</span>
              : <Placeholder />}
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>Mode</div>
            {mode
              ? <span style={{ fontSize: 12, fontWeight: 500, background: "#EFF6FF", color: "#1E40AF", borderRadius: 6, padding: "4px 10px" }}>{mode}</span>
              : <Placeholder />}
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{participantsLabel}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{participants != null ? `~${participants}` : <Placeholder />}</div>
          </div>
        </div>
      </div>

      {/* Event Workflow */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: "#E8F8EE", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <WorkflowIcon size={15} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1F2937" }}>
              Workflow Stages <span style={{ color: "#6B7280", fontWeight: 400 }}>({rounds.length} stage{rounds.length !== 1 ? "s" : ""} for this event type)</span>
            </span>
          </div>
          <button style={editBtn} onClick={onRegenerate} disabled={regenerateLoading}>
            <PencilIcon /> {regenerateLoading ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
        {rounds.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", padding: "8px 0" }}>
            Tell me the event type and I&apos;ll generate the workflow stages automatically.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
            {rounds.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative" }}>
                {i < rounds.length - 1 && (
                  <span style={{ position: "absolute", left: 11, top: 26, bottom: -18, width: 2, background: "#E5E7EB" }} />
                )}
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: r.dot,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0, zIndex: 1 }}>{r.num}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{r.label}</span>
                    <BadgeChip label={r.badge} />
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>{r.sub}</div>
                </div>
                <button style={{ background: "none", border: "none", cursor: "pointer", padding: 2, marginTop: 2 }} aria-label="Round options">
                  <DotsIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activities / Tracks / Committees / Categories — content groupings, never stages */}
      {(has(ent.activities) || has(ent.tracks) || has(ent.committees) || has(ent.competition_categories)
        || has(ent.roles) || has(ent.deliverables) || has(ent.constraints) || has(ent.special_requirements)) && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#1F2937" }}>Extracted Details</div>
          <EntityList title="Activities" items={ent.activities} />
          <EntityList title="Tracks" items={ent.tracks} />
          <EntityList title="Committees" items={ent.committees} />
          <EntityList title="Competition Categories" items={ent.competition_categories} />
          <EntityList title="Roles" items={ent.roles} />
          <EntityList title="Deliverables" items={ent.deliverables} />
          <EntityList title="Constraints" items={ent.constraints} />
          <EntityList title="Special Requirements" items={ent.special_requirements} />
        </div>
      )}

      {/* Defaults Applied */}
      {defaultEntries.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#1F2937" }}>Defaults Applied</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {defaultEntries.map(([field, value]) => (
              <div key={field} style={{ fontSize: 12, color: "#374151", display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "#6B7280" }}>{prettify(field.split(".").pop())}</span>
                <span style={{ fontWeight: 600 }}>{typeof value === "boolean" ? (value ? "Enabled" : "Disabled") : String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Progress */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 10, color: "#1F2937" }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "#EFF6FF", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <ProgressIcon size={15} />
          </span>
          Configuration Progress
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {CONFIG_SECTIONS.map((s) => {
            const done = s.check(blueprint, stagePreview);
            const inProgress = !done && s.name === firstIncomplete;
            return (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {done ? <CheckCircleIcon /> : inProgress ? <DotCircleIcon /> : <EmptyCircleIcon />}
                <span style={{ fontSize: 13, color: done ? "#111827" : inProgress ? "#B45309" : "#9CA3AF" }}>
                  {s.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary / approve / committed notice */}
      {committed ? (
        <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <CheckCircleIcon size={18} />
            <span style={{ fontWeight: 700, fontSize: 13, color: "#065F46" }}>Event created successfully</span>
          </div>
          <p style={{ fontSize: 12, color: "#047857", margin: 0, lineHeight: 1.5 }}>
            <strong>{committed.event_name}</strong> — {committed.phase_count} phase{committed.phase_count !== 1 ? "s" : ""} configured.
          </p>
        </div>
      ) : (
        <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 12, color: "#6D28D9", margin: 0, lineHeight: 1.5 }}>
            {readyToApprove
              ? "Your event is configured. Approve to create it, keep describing changes, or regenerate the workflow."
              : "Once the event type and workflow stages are set, you'll be able to approve the configuration."}
          </p>
          {commitError && (
            <p style={{ fontSize: 12, color: "#DC2626", margin: "6px 0 0", fontWeight: 500 }}>{commitError}</p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
            <button
              onClick={onModify}
              disabled={!readyToApprove}
              style={{ background: "#fff", border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 14px",
                fontSize: 12, fontWeight: 600, cursor: readyToApprove ? "pointer" : "not-allowed",
                color: "#6D28D9", whiteSpace: "nowrap" }}>
              Modify
            </button>
            <button
              onClick={onRegenerate}
              disabled={!readyToApprove || regenerateLoading}
              style={{ background: "#fff", border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 14px",
                fontSize: 12, fontWeight: 600, cursor: readyToApprove && !regenerateLoading ? "pointer" : "not-allowed",
                color: "#6D28D9", whiteSpace: "nowrap" }}>
              {regenerateLoading ? "Regenerating…" : "Regenerate"}
            </button>
            <button
              onClick={onApprove}
              disabled={!readyToApprove || commitLoading}
              style={{ background: readyToApprove && !commitLoading ? "#7C3AED" : "#fff",
                border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600,
                cursor: readyToApprove && !commitLoading ? "pointer" : "not-allowed",
                color: readyToApprove && !commitLoading ? "#fff" : "#7C3AED", whiteSpace: "nowrap" }}>
              {commitLoading ? "Creating…" : readyToApprove ? "Approve & Create" : "Keep Describing Your Event"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers for chat                                                    */
/* ------------------------------------------------------------------ */
function parseSummary(text) {
  const start = text.indexOf("---BLUEPRINT_SUMMARY---");
  const end = text.indexOf("---END_BLUEPRINT_SUMMARY---");
  if (start === -1 || end === -1) return null;
  return text.slice(start + 23, end).trim();
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function ConfigAgentPage() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState({});   // the universal event model
  const [entities, setEntities] = useState({});      // activities/tracks/committees/categories/roles/...
  const [stagePreview, setStagePreview] = useState([]); // deterministic generated workflow stages
  const [defaultsApplied, setDefaultsApplied] = useState({});
  const [summary, setSummary] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [committed, setCommitted] = useState(null);  // { event_id, event_name, phase_count, ... }
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitError, setCommitError] = useState(null);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => { initChat(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  /* Applies the universal-model fields a config-agent response carries —
     used by init/chat/upload/voice/regenerate so they stay consistent. */
  function applyAgentResponse(data) {
    if (data.blueprint) setCollected(data.blueprint);
    if (data.entities) setEntities(data.entities);
    if (data.stage_preview) setStagePreview(data.stage_preview);
    if (data.defaults_applied) setDefaultsApplied(data.defaults_applied);
    if (data.draft_id) setDraftId(data.draft_id);
  }

  async function initChat() {
    setLoading(true);
    try {
      const { data } = await api.post("/api/config-agent/init");
      setMessages([{ role: "assistant", content: data.reply, time: nowTime() }]);
      applyAgentResponse(data);
    } catch (e) {
      console.error("[v0] config-agent init failed:", e);
      setMessages([{
        role: "assistant",
        time: nowTime(),
        content: "**Hi! I'm your Event Configuration Assistant.**\n\nTell me about the event you want to create. You can describe it in any way you like — I'll figure out the structure, rules, and settings.",
      }]);
    }
    setLoading(false);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || committed) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const newMessages = [...messages, { role: "user", content: text, time: nowTime() }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data } = await api.post("/api/config-agent", {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        blueprint: collected,
        draft_id: draftId,
      }, { timeout: 60000 });

      setMessages([...newMessages, { role: "assistant", content: data.reply, time: nowTime() }]);
      applyAgentResponse(data);
      if (data.is_summary) setSummary(parseSummary(data.reply) || data.reply);
    } catch (e) {
      console.error("[v0] config-agent message failed:", e);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, something went wrong. Please try again.", time: nowTime() }]);
    }
    setLoading(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || loading || committed) return;

    const isPDF = file.type === "application/pdf";
    if (!isPDF) {
      alert("Please upload a PDF file");
      return;
    }

    setUploadProgress(50);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileContent = event.target?.result?.split(",")[1]; // base64
        const textBefore = input.trim();
        const userMessage = textBefore ? `${textBefore}\n\n[PDF uploaded: ${file.name}]` : `[PDF uploaded: ${file.name}]`;
        
        const newMessages = [...messages, { 
          role: "user", 
          content: userMessage, 
          file_type: "pdf",
          file_content: fileContent,
          time: nowTime() 
        }];
        
        setMessages(newMessages);
        setInput("");
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(null), 500);
        
        setLoading(true);
        try {
          const { data } = await api.post("/api/config-agent", {
            messages: newMessages.map((m) => ({ 
              role: m.role, 
              content: m.content,
              file_type: m.file_type,
              file_content: m.file_content
            })),
            blueprint: collected,
            draft_id: draftId,
          }, { timeout: 120000 });

          setMessages([...newMessages, { role: "assistant", content: data.reply, time: nowTime() }]);
          applyAgentResponse(data);
          if (data.is_summary) setSummary(parseSummary(data.reply) || data.reply);
        } catch (err) {
          console.error("[v0] PDF upload failed:", err);
          setMessages([...newMessages, { role: "assistant", content: "Sorry, failed to process the PDF. Please try again.", time: nowTime() }]);
        }
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("[v0] File read error:", err);
      setUploadProgress(null);
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        
        // Convert to base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          const fileContent = event.target?.result?.split(",")[1];
          const textBefore = input.trim();
          const userMessage = textBefore ? `${textBefore}\n\n[Voice message recorded]` : "[Voice message recorded]";
          
          const newMessages = [...messages, { 
            role: "user", 
            content: userMessage,
            file_type: "voice",
            file_content: fileContent,
            time: nowTime() 
          }];
          
          setMessages(newMessages);
          setInput("");
          setLoading(true);
          
          try {
            const { data } = await api.post("/api/config-agent", {
              messages: newMessages.map((m) => ({ 
                role: m.role, 
                content: m.content,
                file_type: m.file_type,
                file_content: m.file_content
              })),
              blueprint: collected,
              draft_id: draftId,
            }, { timeout: 120000 });

            setMessages([...newMessages, { role: "assistant", content: data.reply, time: nowTime() }]);
            applyAgentResponse(data);
            if (data.is_summary) setSummary(parseSummary(data.reply) || data.reply);
          } catch (err) {
            console.error("[v0] Voice transcription failed:", err);
            setMessages([...newMessages, { role: "assistant", content: "Sorry, failed to process your voice message. Please try again.", time: nowTime() }]);
          }
          setLoading(false);
        };
        reader.readAsDataURL(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("[v0] Microphone access denied:", err);
      alert("Microphone access is required for voice recording");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function handleApprove() {
    // Hackathon: the standard event was already created via POST /api/v1/events when
    // this flow started ("Create new event" / "Configure Event via Agent" →
    // initializeWorkspace), and its id is already in current_event_id. Don't commit a
    // second event — just open that existing standard event in the committee admin.
    if ((collected?.event_type || "").toLowerCase().includes("hackathon")) {
      const existingEventId = localStorage.getItem("current_event_id") || localStorage.getItem("event_id");
      if (existingEventId) {
        localStorage.setItem("current_event_id", existingEventId);
        localStorage.setItem("event_id", existingEventId);
      }
      setMockRole("committee");
      navigate("/committee/dashboard");
      return;
    }

    if (!draftId) {
      setCommitError("No draft found yet. Continue the conversation until the summary appears.");
      return;
    }
    setCommitLoading(true);
    setCommitError(null);
    try {
      const { data } = await api.post("/api/config-agent/commit", { draft_id: draftId }, { timeout: 60000 });
      setCommitted(data);
      // The dynamic sandbox (DynamicTestLayout + DynamicComponentSelector) reads the
      // active event from these keys and self-detects event_type to render the right pages.
      if (data?.event_id) {
        localStorage.setItem("current_event_id", data.event_id);
        localStorage.setItem("event_id", data.event_id);
      }
      // /dynamic-test/* is gated to the 'dynamic-committee' role; this chatbot page is
      // reached as 'committee', so switch the mock role to get past that gate.
      setMockRole("dynamic-committee");
      navigate("/dynamic-test/dynamic-dashboard");
    } catch (e) {
      console.error("[v0] config-agent commit failed:", e.response?.data || e);
      setCommitError(formatApiErrorDetail(e.response?.data?.detail, e.message || "Commit failed"));
    }
    setCommitLoading(false);
  }

  async function handleRegenerate() {
    if (!draftId) return;
    setRegenerateLoading(true);
    try {
      const { data } = await api.post("/api/config-agent/regenerate", { draft_id: draftId }, { timeout: 30000 });
      applyAgentResponse(data);
    } catch (e) {
      console.error("[v0] config-agent regenerate failed:", e);
      setCommitError(e.response?.data?.detail || e.message || "Regenerate failed");
    }
    setRegenerateLoading(false);
  }

  function handleModify() {
    // Drops back into chat-editing mode — the input stays enabled either way,
    // this just clears the "ready to approve" panel until the next summary.
    setSummary(null);
  }

  function newConversation() {
    setMessages([]);
    setInput("");
    setCollected({});
    setEntities({});
    setStagePreview([]);
    setDefaultsApplied({});
    setSummary(null);
    setDraftId(null);
    setCommitted(null);
    setCommitError(null);
    initChat();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleTextareaChange(e) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  const completedCount = COMPLETION_CHECKS.filter((fn) => fn(collected, stagePreview)).length;
  const firstUserIdx = messages.findIndex((m) => m.role === "user");

  const headerBtn = { display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 8,
    padding: "9px 16px", fontSize: 13, cursor: "pointer", fontWeight: 500 };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F7F8FA", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Top header */}
      <div style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #ECEEF1",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: "#EEF2FF", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <SparkleIcon size={22} />
          </span>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>Event Configuration Assistant</h1>
            <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0" }}>Describe your event in natural language and I&apos;ll configure everything for you.</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/committee/dashboard")} style={{ ...headerBtn, border: "1px solid #E5E7EB", color: "#374151" }}>
            <ArrowLeftIcon /> Back to Dashboard
          </button>
          <button onClick={newConversation} style={{ ...headerBtn, border: "1px solid #BFD3FF", color: "#2563EB" }}>
            <ChatIcon /> New Conversation
          </button>
        </div>
      </div>

      {/* Two-column split */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.05fr 0.95fr", minHeight: 0, overflow: "hidden" }}>

        {/* Left: chat */}
        <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid #ECEEF1", background: "#FCFDFE", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {i === firstUserIdx && firstUserIdx !== -1 && (
                    <div style={{ display: "flex", justifyContent: "center", margin: "10px 0" }}>
                      <span style={{ background: "#F3F4F6", color: "black", fontSize: 11, fontWeight: 600, padding: "3px 12px", borderRadius: 12 }}>Today</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-start", gap: 12 }}>
                    {msg.role === "assistant" && (
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", border: "1px solid #BFDBFE",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <RobotIcon size={18} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: "78%",
                      padding: "14px 18px",
                      borderRadius: 16,
                      background: msg.role === "user" ? "#EFF6FF" : "#fff",
                      color: "#1F2937",
                      fontSize: 14,
                      lineHeight: 1.6,
                      boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
                      border: msg.role === "user" ? "1px solid #DBEAFE" : "1px solid #ECEEF1",
                    }}>
                      {msg.time && (
                        <div style={{ fontSize: 10, color: "#9CA3AF", textAlign: msg.role === "user" ? "right" : "left", marginBottom: 4 }}>
                          {msg.time}
                        </div>
                      )}
                      <ReactMarkdown components={{
                        p: ({ children }) => <p style={{ margin: "4px 0" }}>{children}</p>,
                        ul: ({ children }) => <ul style={{ listStyle: "none", paddingLeft: 0, margin: "8px 0", display: "flex", flexDirection: "column", gap: 8 }}>{children}</ul>,
                        li: ({ children }) => (
                          <li style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ marginTop: 1 }}><CheckCircleIcon size={16} /></span>
                            <span>{children}</span>
                          </li>
                        ),
                        ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: "8px 0" }}>{children}</ol>,
                        strong: ({ children }) => <strong style={{ fontWeight: 700, color: "#111827" }}>{children}</strong>,
                        code: ({ children }) => <code style={{ background: "#F3F4F6", padding: "1px 4px", borderRadius: 3, fontSize: 13 }}>{children}</code>,
                        hr: () => <hr style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "8px 0" }} />,
                      }}>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.role === "user" && (
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2563EB", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700 }}>
                        You
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFF6FF", border: "1px solid #BFDBFE",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <RobotIcon size={18} />
                  </div>
                  <div style={{ padding: "12px 16px", borderRadius: 16, background: "#fff", border: "1px solid #ECEEF1",
                    display: "flex", gap: 4, alignItems: "center" }}>
                    {[0, 1, 2].map((d) => (
                      <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF",
                        animation: "bounce 1.2s infinite", animationDelay: `${d * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Suggestion chips */}
          {!committed && (
            <div style={{ padding: "0 24px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Add timeline details", "Define scoring criteria", "Judges & evaluation", "Communication preferences"].map((chipText) => (
                <button
                  key={chipText}
                  onClick={() => setInput(chipText)}
                  style={{ background: "#fff", border: "1px solid #D1D5DB", color: "#2563EB", padding: "7px 14px",
                    borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 500, boxShadow: "0 1px 2px rgba(16,24,40,0.03)" }}
                >
                  {chipText}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{ padding: "14px 24px 18px", background: "#fff", borderTop: "1px solid #ECEEF1" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* File upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  disabled={loading || !!committed}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || !!committed}
                  aria-label="Upload PDF"
                  title="Upload PDF"
                  style={{ width: 40, height: 40, borderRadius: 10,
                    background: loading || committed ? "#F3F4F6" : "#fff", border: "1px solid #D1D5DB",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: loading || committed ? "not-allowed" : "pointer", transition: "all 0.2s" }}
                >
                  <FileIcon color={loading || committed ? "#9CA3AF" : "#6B7280"} />
                </button>

                {/* Voice record button */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading || !!committed}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                  title={isRecording ? "Stop recording" : "Start voice recording"}
                  style={{ width: 40, height: 40, borderRadius: 10,
                    background: isRecording ? "#DC2626" : (loading || committed ? "#F3F4F6" : "#fff"),
                    border: isRecording ? "1px solid #991B1B" : "1px solid #D1D5DB",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: loading || committed ? "not-allowed" : "pointer", transition: "all 0.2s" }}
                >
                  <MicIcon color={isRecording ? "#fff" : (loading || committed ? "#9CA3AF" : "#6B7280")} isRecording={isRecording} />
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={committed ? "Event configured. Head to the dashboard to manage it." : "Describe your event or answer a question..."}
                disabled={loading || !!committed}
                rows={1}
                style={{ flex: 1, resize: "none", minHeight: 40, maxHeight: 120, padding: "10px 50px 10px 16px",
                  fontSize: 14, borderRadius: 12, border: "1px solid #D1D5DB", outline: "none",
                  fontFamily: "inherit", lineHeight: 1.5, boxShadow: "0 1px 2px rgba(16,24,40,0.03)",
                  background: committed ? "#F9FAFB" : "#fff", color: "#111827" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading || !!committed}
                aria-label="Send message"
                style={{ width: 40, height: 40, borderRadius: 10,
                  background: input.trim() && !loading && !committed ? "#2563EB" : "#C7CDD6", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: input.trim() && !loading && !committed ? "pointer" : "not-allowed", transition: "background 0.2s" }}
              >
                <SendIcon />
              </button>
            </div>
            {uploadProgress !== null && (
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
                Uploading PDF... {uploadProgress}%
              </div>
            )}
            {!uploadProgress && (
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
                {isRecording ? "🎙️ Recording..." : "Press Enter to send • Shift + Enter for new line • Or upload PDF / record voice"}
              </div>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div style={{ overflowY: "auto", padding: 24, background: "#F9FAFB" }}>
          <LivePreview
            blueprint={collected}
            entities={entities}
            stagePreview={stagePreview}
            defaultsApplied={defaultsApplied}
            completedCount={completedCount}
            onApprove={handleApprove}
            onRegenerate={handleRegenerate}
            onModify={handleModify}
            summary={summary}
            committed={committed}
            commitLoading={commitLoading}
            regenerateLoading={regenerateLoading}
            commitError={commitError}
          />
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
