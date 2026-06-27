import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEventSchema, submitEntry, resolveEventId } from "../../api/dynamicRuntime";

/*
 * DynamicParticipantPortal — a single participant submission view that renders
 * itself entirely from the event's blueprint (GET /api/dynamic/event/:id).
 * No event-type branching in the markup: the field set comes from
 * ui_config.submission_fields, so coding (repo link), case (deck + abstract),
 * debate (stance + rebuttal) and sports (roster) all flow through one component.
 */

const card = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 22, boxShadow: "0 1px 3px rgba(16,24,40,0.04)" };
const label = { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" };
const inputStyle = { width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8, border: "1px solid #D1D5DB", outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
const chip = (bg, color) => ({ fontSize: 12, fontWeight: 600, background: bg, color, borderRadius: 6, padding: "4px 10px" });

export default function DynamicParticipantPortal() {
  const { eventId: paramId } = useParams();
  const eventId = resolveEventId(paramId);

  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [entityId, setEntityId] = useState("");
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!eventId) { setErr("No active event. Approve an event in the Config Agent first."); setLoading(false); return; }
    getEventSchema(eventId)
      .then(setSchema)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <Centered>Loading event…</Centered>;
  if (err) return <Centered tone="error">{err}</Centered>;
  if (!schema) return <Centered tone="error">Event not found.</Centered>;

  const { event, ui_config, team_rules, phases, active_phase_id } = schema;
  const fields = ui_config.submission_fields || [];
  const activePhase = phases.find((p) => p.id === active_phase_id);

  async function handleSubmit() {
    setErr(null);
    const missing = fields.filter((f) => f.required && !String(values[f.key] || "").trim());
    if (!entityId.trim()) { setErr("Enter your team name or email first."); return; }
    if (missing.length) { setErr(`Required: ${missing.map((f) => f.label).join(", ")}`); return; }

    setSubmitting(true);
    try {
      const res = await submitEntry(eventId, {
        entity_id: entityId.trim(),
        entity_label: entityId.trim(),
        stage_id: active_phase_id,
        submission_type: ui_config.submission_type,
        payload: values,
      });
      setResult(res);
    } catch (e) {
      setErr(e.message);
    }
    setSubmitting(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FA", padding: "32px 16px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>{event.name}</h1>
            <span style={chip("#F3E8FF", "#6B21A8")}>{event.type}</span>
            <span style={chip("#EFF6FF", "#1E40AF")}>{event.mode === "team" ? "Team" : "Individual"}</span>
          </div>
          {event.description && <p style={{ color: "#6B7280", fontSize: 14, margin: "8px 0 0" }}>{event.description}</p>}
        </div>

        {event.mode === "team" && (
          <div style={{ ...card, padding: 14, fontSize: 13, color: "#374151" }}>
            Team size: <strong>{team_rules.min_size}–{team_rules.max_size}</strong>
            {team_rules.factors?.length ? <> · Formed by: {team_rules.factors.join(", ")}</> : null}
          </div>
        )}

        {result ? (
          <div style={{ ...card, borderColor: "#A7F3D0", background: "#ECFDF5" }}>
            <div style={{ fontWeight: 700, color: "#065F46", marginBottom: 4 }}>✓ Submission received</div>
            <p style={{ fontSize: 13, color: "#047857", margin: 0 }}>
              Your <strong>{result.submission_type}</strong> entry for <strong>{entityId}</strong> is in. Status: {result.status}.
            </p>
            <button onClick={() => { setResult(null); setValues({}); }} style={{ marginTop: 12, ...inputStyle, width: "auto", cursor: "pointer", background: "#fff", fontWeight: 600 }}>
              Submit another entry
            </button>
          </div>
        ) : (
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>
              {activePhase ? activePhase.name : "Submission"}
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 18 }}>
              {activePhase?.instructions || "Complete the fields below to submit your entry."}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>{event.mode === "team" ? "Team name" : "Your name / email"} *</label>
              <input style={inputStyle} value={entityId} onChange={(e) => setEntityId(e.target.value)}
                placeholder={event.mode === "team" ? "e.g. Byte Squad" : "e.g. you@email.com"} />
            </div>

            {fields.map((f) => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={label}>{f.label}{f.required ? " *" : ""}</label>
                {f.type === "textarea" ? (
                  <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={values[f.key] || ""}
                    placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                ) : (
                  <input style={inputStyle} type={f.type === "url" ? "url" : "text"} value={values[f.key] || ""}
                    placeholder={f.placeholder} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}

            {err && <p style={{ color: "#DC2626", fontSize: 13, fontWeight: 500, margin: "0 0 12px" }}>{err}</p>}

            <button onClick={handleSubmit} disabled={submitting}
              style={{ ...inputStyle, width: "100%", background: submitting ? "#C7CDD6" : "#2563EB", color: "#fff", border: "none", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "Submitting…" : "Submit Entry"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Centered({ children, tone }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "Inter, system-ui, sans-serif", color: tone === "error" ? "#DC2626" : "#6B7280", fontSize: 14, textAlign: "center" }}>
      {children}
    </div>
  );
}
