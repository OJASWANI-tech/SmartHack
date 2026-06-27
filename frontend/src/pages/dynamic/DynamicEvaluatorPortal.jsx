import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  getEventSchema, listSubmissions, evaluateSubmission, resolveEventId,
} from "../../api/dynamicRuntime";

/*
 * DynamicEvaluatorPortal — one evaluation view for every event type. The rubric
 * is whatever evaluation_model.criteria the blueprint defines (one weighted
 * slider per criterion), so a case-competition's Feasibility/Innovation matrix
 * and a coding contest's Correctness/Complexity rubric render identically. The
 * aggregate is computed server-side per the event's EventScoringConfig.
 */

const card = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: 18, boxShadow: "0 1px 3px rgba(16,24,40,0.04)" };
const chip = (bg, color) => ({ fontSize: 11, fontWeight: 600, background: bg, color, borderRadius: 6, padding: "3px 8px" });

export default function DynamicEvaluatorPortal() {
  const { eventId: paramId } = useParams();
  const eventId = resolveEventId(paramId);

  const [schema, setSchema] = useState(null);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [selected, setSelected] = useState(null);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState("");
  const [evaluator, setEvaluator] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);

  const refresh = useCallback(async () => {
    const list = await listSubmissions(eventId);
    setSubs(list);
  }, [eventId]);

  useEffect(() => {
    if (!eventId) { setErr("No active event. Approve an event in the Config Agent first."); setLoading(false); return; }
    Promise.all([getEventSchema(eventId), listSubmissions(eventId)])
      .then(([s, list]) => { setSchema(s); setSubs(list); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <Centered>Loading evaluation console…</Centered>;
  if (err) return <Centered tone="error">{err}</Centered>;
  if (!schema) return <Centered tone="error">Event not found.</Centered>;

  const { event, evaluation_model, ui_config } = schema;
  const criteria = evaluation_model.criteria || [];
  const roleLabel = ui_config.evaluator_role_label || "Evaluator";

  function pick(sub) {
    setSelected(sub);
    setScores({});
    setFeedback("");
    setFlash(null);
  }

  async function handleEvaluate() {
    setErr(null);
    if (!selected) return;
    if (!criteria.length) { setErr("This event has no rubric configured."); return; }
    const unscored = criteria.filter((c) => scores[c.name] === undefined || scores[c.name] === "");
    if (unscored.length) { setErr(`Score all criteria: ${unscored.map((c) => c.name).join(", ")}`); return; }

    setSaving(true);
    try {
      const res = await evaluateSubmission(eventId, {
        submission_id: selected.id,
        evaluator_label: evaluator.trim() || roleLabel,
        scores: Object.fromEntries(criteria.map((c) => [c.name, Number(scores[c.name])])),
        feedback: feedback.trim() || null,
      });
      setFlash(`Recorded — aggregate ${res.aggregate_score} (${res.method}).`);
      await refresh();
      setSelected(null);
    } catch (e) {
      setErr(e.message);
    }
    setSaving(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FA", padding: "28px 16px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, color: "#111827" }}>{event.name}</h1>
          <span style={chip("#F3E8FF", "#6B21A8")}>{event.type}</span>
          <span style={chip("#FEF3C7", "#92400E")}>{roleLabel} Console</span>
        </div>
        <p style={{ color: "#6B7280", fontSize: 13, margin: "0 0 18px" }}>
          {criteria.length} criteria · {evaluation_model.aggregation.replace("_", " ")} aggregation
        </p>

        {flash && <div style={{ ...card, borderColor: "#A7F3D0", background: "#ECFDF5", color: "#065F46", fontWeight: 600, marginBottom: 16 }}>{flash}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 18, alignItems: "start" }}>
          {/* Submissions list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Submissions ({subs.length})
            </div>
            {subs.length === 0 && <div style={{ ...card, color: "#9CA3AF", fontSize: 13 }}>No submissions yet.</div>}
            {subs.map((s) => (
              <button key={s.id} onClick={() => pick(s)}
                style={{ ...card, textAlign: "left", cursor: "pointer", borderColor: selected?.id === s.id ? "#2563EB" : "#E5E7EB", padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{s.entity_label || s.entity_id}</span>
                  <span style={chip(s.status === "evaluated" ? "#DCFCE7" : "#E0E7FF", s.status === "evaluated" ? "#166534" : "#3730A3")}>{s.status}</span>
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                  {s.submission_type} · {s.evaluations.length} evaluation{s.evaluations.length !== 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </div>

          {/* Scoring panel */}
          <div style={card}>
            {!selected ? (
              <div style={{ color: "#9CA3AF", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
                Select a submission to review and score.
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 12 }}>
                  {selected.entity_label || selected.entity_id}
                </div>

                {/* Submission payload (blind judging hides identity, never content) */}
                <div style={{ background: "#F9FAFB", border: "1px solid #EEF0F3", borderRadius: 10, padding: 14, marginBottom: 18 }}>
                  {Object.entries(selected.payload || {}).map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</div>
                      {/^https?:\/\//.test(String(v))
                        ? <a href={v} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#2563EB", wordBreak: "break-all" }}>{v}</a>
                        : <div style={{ fontSize: 13, color: "#111827", whiteSpace: "pre-wrap" }}>{String(v)}</div>}
                    </div>
                  ))}
                </div>

                {/* Rubric sliders — one per criterion */}
                {criteria.map((c) => {
                  const val = scores[c.name] ?? "";
                  return (
                    <div key={c.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                          {c.name} <span style={{ color: "#9CA3AF", fontWeight: 400 }}>· {Math.round(c.weight * 100)}%</span>
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{val === "" ? "—" : val} / {c.max_score}</span>
                      </div>
                      {c.description && <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>{c.description}</div>}
                      <input type="range" min={0} max={c.max_score} step={c.max_score > 20 ? 1 : 0.5} value={val === "" ? 0 : val}
                        onChange={(e) => setScores((s) => ({ ...s, [c.name]: e.target.value }))} style={{ width: "100%" }} />
                    </div>
                  );
                })}

                {evaluation_model.qualitative_feedback && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Feedback</label>
                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                      style={{ width: "100%", minHeight: 70, padding: "10px 12px", fontSize: 14, borderRadius: 8, border: "1px solid #D1D5DB", outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Your name (optional)</label>
                  <input value={evaluator} onChange={(e) => setEvaluator(e.target.value)} placeholder={roleLabel}
                    style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8, border: "1px solid #D1D5DB", outline: "none", boxSizing: "border-box" }} />
                </div>

                {err && <p style={{ color: "#DC2626", fontSize: 13, fontWeight: 500, margin: "0 0 12px" }}>{err}</p>}

                <button onClick={handleEvaluate} disabled={saving}
                  style={{ width: "100%", padding: "11px 12px", fontSize: 14, borderRadius: 8, border: "none", background: saving ? "#C7CDD6" : "#7C3AED", color: "#fff", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : "Submit Evaluation"}
                </button>
              </>
            )}
          </div>
        </div>
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
