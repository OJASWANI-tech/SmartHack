import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CommitteeLayout from "../../components/layout/CommitteeLayout";
import Skeleton from "../../components/common/Skeleton";
import MascotEmptyState from "../../components/common/MascotEmptyState";
import {
  advanceCommitteeStage,
  getActivityLog,
  getApprovalQueue,
  getCommitteeSummary,
  getLeaderboard,
  getScoreAnomalies,
  getEventStages,
  toggleSubmissionPhase,
} from "../../services/committee";

// Standardized 5-Step Process
const FALLBACK_STAGES = [
  { label: "Participant Intake", status: "completed" },
  { label: "Team Formation", status: "completed" },
  { label: "Team Review & Approval", status: "completed" },
  { label: "Mentor Assignment", status: "active" },
  { label: "Build Phase", status: "upcoming" },
  { label: "Evaluation", status: "upcoming" },
  { label: "Final Results", status: "upcoming" },
];

const STATUS_LABELS = {
  complete: "Completed",
  completed: "Completed",
  active: "In Progress",
  awaiting_approval: "Awaiting Approval",
  pending: "Pending",
  proposed: "Pending",
  upcoming: "Upcoming",
};

function clampPercent(value) {
  const numeric = Number.parseFloat(String(value ?? 0).replace("%", ""));
  if (Number.isNaN(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "complete" || normalized === "completed") return "green";
  if (normalized === "active" || normalized === "awaiting_approval")
    return "purple";
  return "muted";
}

function formatStatus(status) {
  return (
    STATUS_LABELS[String(status || "").toLowerCase()] || status || "Pending"
  );
}

function MiniMetric({ icon, label, value, sub }) {
  return (
    <article
      className="p-3 rounded-xl flex gap-3 items-center"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(26, 43, 32, 0.04)",
      }}
    >
      <span
        style={{
          background: "var(--accent-bg)",
          color: "var(--accent-color)",
          width: "2rem",
          height: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.625rem",
          fontWeight: 700,
          borderRadius: "0.75rem",
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="flex flex-col">
        <strong
          style={{
            fontSize: "0.75rem",
            color: "var(--text-primary)",
            lineHeight: 1.2,
            marginBottom: "0.125rem",
          }}
        >
          {value}
        </strong>
        <p
          style={{
            margin: 0,
            fontSize: "0.625rem",
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </p>
        <small
          style={{
            fontSize: "0.5rem",
            color: "var(--text-muted)",
            marginTop: "0.125rem",
          }}
        >
          {sub}
        </small>
      </div>
    </article>
  );
}

function SectionTitle({ title, action, onAction }) {
  return (
    <div className="flex justify-between items-center mb-4 w-full">
      <h3
        style={{
          margin: 0,
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h3>
      {action && (
        <button
          type="button"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            padding: "0.35rem 0.625rem",
            borderRadius: "0.375rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
          onClick={onAction}
        >
          {action}
        </button>
      )}
    </div>
  );
}

function EmptyPanel({ children }) {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        borderRadius: "0.75rem",
        border: "1px dashed var(--border-color)",
        margin: 0,
      }}
    >
      <MascotEmptyState message={children} size={72} />
    </div>
  );
}

export default function CommitteeDashboard() {
  const navigate = useNavigate();
  const activeEventId = localStorage.getItem("current_event_id");

  const [summary, setSummary] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activity, setActivity] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [stages, setStages] = useState([]);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Custom File Refs and UI loading states
  const inviteFileInputRef = useRef(null);
  const [invitingMembers, setInvitingMembers] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        summaryData,
        approvalsData,
        leaderboardData,
        activityData,
        anomalyData,
        stagesData,
      ] = await Promise.all([
        getCommitteeSummary(activeEventId),
        getApprovalQueue(activeEventId),
        getLeaderboard(activeEventId),
        getActivityLog(activeEventId),
        activeEventId
          ? getScoreAnomalies(activeEventId).catch(() => [])
          : Promise.resolve([]),
        activeEventId
          ? getEventStages(activeEventId).catch(() => [])
          : Promise.resolve([]),
      ]);

      setSummary(summaryData);
      setApprovals(Array.isArray(approvalsData) ? approvalsData : []);
      setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      setActivity(Array.isArray(activityData) ? activityData : []);
      setAnomalies(Array.isArray(anomalyData) ? anomalyData : []);
      setStages(Array.isArray(stagesData) ? stagesData : FALLBACK_STAGES);
      setIsSubmissionOpen(Boolean(summaryData?.is_submission_open));
    } catch (dashboardError) {
      setError(dashboardError.message || "Unable to load committee dashboard.");
    } finally {
      setLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const workflowStages = useMemo(() => {
    const stageData = stages.length ? stages : FALLBACK_STAGES;
    return stageData.map((stage) => ({
      label: stage.label || stage.name,
      status: stage.status || "upcoming",
      tone: statusTone(stage.status),
    }));
  }, [stages]);

  const currentActiveStageIndex = workflowStages.findIndex(
    (s) => s.tone !== "green",
  );
  const activeStageName =
    currentActiveStageIndex >= 0
      ? workflowStages[currentActiveStageIndex].label
      : "Results";

  const evaluation = summary?.evaluationOverview || {};
  const overallPercent = clampPercent(
    evaluation.overallPercent ?? summary?.evaluationStatus,
  );
  const pendingAnomalies = anomalies.filter((item) =>
    ["pending", "unresolved", "escalated"].includes(item.resolution_status),
  );

  const approvalData = useMemo(() => {
    const approved = Number(summary?.approvedTeams || 0);
    const pending = Number(summary?.pendingApprovals || 0);
    const rejected = Number(summary?.rejectedTeams || 0);
    const total = Math.max(approved + pending + rejected, 1);
    return {
      approved,
      pending,
      rejected,
      approvedPct: (approved / total) * 100,
      pendingPct: ((approved + pending) / total) * 100,
    };
  }, [summary]);

  const handleCommitteeInviteCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setInvitingMembers(true);
      setError(null);

      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const adminToken =
        localStorage.getItem("HackSmart_token") ||
        localStorage.getItem("token");

      if (!activeEventId) {
        throw new Error(
          "Please select an active event context before running invitations.",
        );
      }

      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length <= 1) {
        throw new Error("The CSV file appears empty or missing rows.");
      }

      const headers = lines[0]
        .toLowerCase()
        .split(",")
        .map((h) => h.trim());
      const emailIndex = headers.indexOf("email");

      if (emailIndex === -1) {
        throw new Error(
          "CSV schema mismatch: Could not find mandatory 'email' header column.",
        );
      }

      const emailsToInvite = lines
        .slice(1)
        .map((line) => {
          const columns = line.split(",").map((c) => c.trim());
          return columns[emailIndex];
        })
        .filter(Boolean);

      if (emailsToInvite.length === 0) {
        throw new Error("No valid email addresses found in the rows.");
      }

      let processedCount = 0;
      let failedCount = 0;

      const loggedInEmail = (() => {
        try {
          const userStr = localStorage.getItem("committee_user");
          if (userStr) {
            const user = JSON.parse(userStr);
            return user.email || "";
          }
        } catch (e) {}
        return "";
      })();

      const allowedSandboxes = ["shreya67324@gmail.com", "shubhika1056@gmail.com", "shubhtech1056@gmail.com", "noname972642@gmail.com", "shreya67324@gmail.com"];

      for (let i = 0; i < emailsToInvite.length; i++) {
        const currentEmail = emailsToInvite[i];

        try {
          let sandboxEmail = undefined;
          if (!allowedSandboxes.includes(currentEmail.toLowerCase())) {
            sandboxEmail = allowedSandboxes.includes(loggedInEmail.toLowerCase())
              ? loggedInEmail
              : "shubhtech1056@gmail.com";
          }

          const payload = {
            email: currentEmail,
            event_id: activeEventId,
            sandbox_delivery_email: sandboxEmail,
          };

          const response = await fetch(`${baseURL}/committee/invite`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: adminToken ? `Bearer ${adminToken.trim()}` : "",
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            processedCount++;
          } else {
            console.error(
              `Row execution failed with code status: ${response.status} for email: ${currentEmail}`,
            );
            failedCount++;
          }
        } catch (rowError) {
          console.error(
            `Network pipeline failure introducing invite sequence break:`,
            rowError,
          );
          failedCount++;
        }
      }

      if (processedCount > 0) {
        alert(
          `Successfully processed ${processedCount} records in the database! Exactly 1 test magic link dispatched to your sandbox inbox.`,
        );
      } else {
        throw new Error(
          "All invite transmissions rejected by server validations. Check console stack output.",
        );
      }
    } catch (err) {
      console.error("Bulk invitations sequence aborted:", err);
      setError(err.message || "Failed to process bulk invitations.");
    } finally {
      setInvitingMembers(false);
      if (inviteFileInputRef.current) inviteFileInputRef.current.value = "";
    }
  };

  const handleSubmissionToggle = async () => {
    if (!activeEventId) {
      setError(
        "Select or create an event before changing the submission phase.",
      );
      return;
    }

    const targetState = !isSubmissionOpen;
    setIsToggling(true);
    setError(null);

    try {
      await toggleSubmissionPhase(activeEventId, targetState);
      setIsSubmissionOpen(targetState);
      setSummary((current) =>
        current ? { ...current, is_submission_open: targetState } : current,
      );
    } catch (toggleError) {
      setError(toggleError.message);
    } finally {
      setIsToggling(false);
    }
  };

  const handleAdvanceStage = async () => {
    if (!activeEventId) {
      setError("Select or create an event before advancing results.");
      return;
    }

    setIsAdvancing(true);
    setError(null);

    try {
      await advanceCommitteeStage(activeEventId);
      await loadDashboard();
    } catch (advanceError) {
      setError(advanceError.message);
    } finally {
      setIsAdvancing(false);
    }
  };

  const headerActions = (
    <div className="flex gap-3 items-center text-xs">
      <div
        className="flex items-center gap-3 px-3 py-1.5 rounded-full transition-all duration-300"
        style={{
          background: isSubmissionOpen
            ? "var(--status-success-bg)"
            : "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "999px",
              background: isSubmissionOpen
                ? "var(--status-success)"
                : "var(--status-danger)",
              boxShadow: isSubmissionOpen
                ? "0 0 8px rgba(16,185,129,0.35)"
                : "0 0 8px rgba(239,68,68,0.35)",
            }}
          />
          <div className="flex flex-col">
            <strong
              style={{
                fontSize: "0.625rem",
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {isSubmissionOpen ? "Submissions Open" : "Submissions Closed"}
            </strong>
          </div>
        </div>

        <button
          type="button"
          disabled={isToggling}
          onClick={handleSubmissionToggle}
          className="w-8 h-4 rounded-full relative cursor-pointer transition-colors duration-300"
          style={{
            background: isSubmissionOpen
              ? "var(--accent-bg)"
              : "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
          }}
          aria-label="Toggle submission phase"
        >
          <span
            className={`absolute left-[1px] top-[1px] w-3 h-3 rounded-full transition-transform duration-300 ease-in-out ${isSubmissionOpen ? "translate-x-[14px]" : ""}`}
            style={{
              background: isSubmissionOpen
                ? "var(--accent-color)"
                : "var(--text-secondary)",
            }}
          />
        </button>
      </div>

      <button
        className="text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
        }}
        type="button"
        disabled={isAdvancing}
        onClick={handleAdvanceStage}
      >
        {isAdvancing ? "Advancing..." : "Advance Phase"}
      </button>
    </div>
  );

  return (
    <CommitteeLayout
      pageTitle="Dashboard Overview"
      pageSubtitle="Real-time overview of your event and workflow"
      headerActions={headerActions}
    >
      <div
        className="p-4 md:p-6 min-h-screen font-sans committee-dashboard-page"
        style={{
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          borderRadius: "16px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {error && (
          <div
            className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-xs"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading || !summary ? (
          <Skeleton rows={8} />
        ) : (
          <>
            {pendingAnomalies.length > 0 && (
              <button
                type="button"
                className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl mb-4 w-full text-left cursor-pointer transition-colors hover:bg-amber-500/15"
                onClick={() => navigate("/committee/anomalies")}
              >
                <span className="bg-amber-500 text-slate-900 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                  !
                </span>
                <p className="m-0 text-xs text-amber-400 flex-1">
                  <strong className="font-semibold text-amber-100">
                    Critical Alert: Score anomaly detected.
                  </strong>
                  {" Team(s) "}
                  {pendingAnomalies.map((item) => item.team_name).join(", ")}
                  {
                    " require immediate committee review before results can advance."
                  }
                </p>
                <span className="text-amber-500 text-xs font-semibold hover:underline shrink-0">
                  Review Now &rarr;
                </span>
              </button>
            )}

            {/* Event Workflow Progress */}
            <section
              className="ref-card workflow-card"
              style={{ marginBottom: "16px" }}
            >
              <style>{`
                .committee-dashboard-page .workflow-track {
                  display: flex !important;
                  flex-wrap: nowrap !important;
                  overflow-x: auto !important;
                  justify-content: space-between !important;
                  gap: 0 !important;
                }
                .committee-dashboard-page .workflow-step {
                  flex: 1 1 0 !important;
                  min-width: 0 !important;
                  flex-shrink: 1 !important;
                }
                .committee-dashboard-page .workflow-step strong {
                  font-size: 9px !important;
                  word-break: break-word !important;
                  on-break: keep-all !important;
                }
                .committee-dashboard-page .workflow-step small {
                  font-size: 9px !important;
                }
                .committee-dashboard-page .workflow-dot {
                  width: 32px !important;
                  height: 32px !important;
                  font-size: 11px !important;
                }
              `}</style>

              <div className="ref-section-title">
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Event Workflow Progress
                </h3>
              </div>

              <div className="workflow-track" style={{ marginTop: "20px" }}>
                {workflowStages.slice(0, 7).map((stage, index) => (
                  <div
                    className="workflow-step"
                    key={`${stage.label}-${index}`}
                  >
                    <span className={`workflow-dot ${stage.tone}`}>
                      {stage.tone === "green"
                        ? "âœ“"
                        : stage.tone === "purple"
                          ? "â—"
                          : index + 1}
                    </span>
                    <strong
                      style={{
                        textAlign: "center",
                        color: "var(--text-primary)",
                        lineHeight: "1.3",
                      }}
                    >
                      {stage.label}
                    </strong>
                    <small
                      style={{
                        textTransform: "capitalize",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {formatStatus(stage.status)}
                    </small>
                  </div>
                ))}
              </div>
            </section>

            {/* Dashboard 12-Col Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-stretch">
              {/* EVALUATION OVERVIEW */}
              <section className="committee-card committee-light-panel p-5 flex flex-col col-span-12 xl:col-span-6">
                <SectionTitle
                  title="Evaluation Overview"
                  action="View All"
                  onAction={() => navigate("/committee/evaluations")}
                />

                <div className="flex flex-col h-full mt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <MiniMetric
                      icon="EV"
                      label="Evaluated"
                      value={evaluation.evaluated || 0}
                      sub={`${overallPercent}% complete`}
                    />
                    <MiniMetric
                      icon="PD"
                      label="Pending"
                      value={evaluation.pending || 0}
                      sub="Awaiting scorecards"
                    />
                    <MiniMetric
                      icon="NS"
                      label="Not Started"
                      value={evaluation.notStarted || 0}
                      sub="No scores yet"
                    />
                    <MiniMetric
                      icon="TE"
                      label="Total Evaluations"
                      value={evaluation.totalEvaluations || 0}
                      sub="Live assignment pool"
                    />
                  </div>

                  <div className="flex-1">
                    <h4 className="text-[10px] font-medium text-slate-400 m-0 mb-3">
                      Evaluation Progress by Judge
                    </h4>
                    {summary.judgeProgress?.length ? (
                      summary.judgeProgress.map((judge) => (
                        <div
                          className="flex items-center gap-3 mb-3 text-xs"
                          key={judge.name}
                        >
                          <span className="min-w-[100px] text-slate-200 truncate">
                            {judge.name}
                          </span>
                          <div className="bg-slate-900 flex-1 h-1.5 rounded-full overflow-hidden border border-slate-700/50">
                            <i
                              className="block h-full bg-indigo-400 rounded-full"
                              style={{ width: `${clampPercent(judge.value)}%` }}
                            />
                          </div>
                          <small className="min-w-[24px] text-right text-slate-400 text-[10px]">
                            {judge.count}
                          </small>
                        </div>
                      ))
                    ) : (
                      <EmptyPanel>
                        No judge assignments have been generated yet.
                      </EmptyPanel>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-700 flex gap-3 items-center text-xs">
                      <span className="min-w-[100px] text-slate-100 font-semibold">
                        Overall Progress
                      </span>
                      <strong className="font-bold text-slate-100">
                        {overallPercent}%
                      </strong>
                      <div className="bg-slate-900 flex-1 h-1.5 rounded-full overflow-hidden border border-slate-700/50">
                        <i
                          className="block h-full bg-indigo-400 rounded-full"
                          style={{ width: `${overallPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* TEAM APPROVAL OVERVIEW */}
              <section className="committee-card committee-light-panel p-5 flex flex-col col-span-12 md:col-span-6 xl:col-span-3">
                <SectionTitle
                  title="Team Approval Overview"
                  action="Open"
                  onAction={() => navigate("/committee/approvals")}
                />

                {(() => {
                  const totalTeams =
                    approvalData.approved +
                    approvalData.pending +
                    approvalData.rejected;
                  const approvedPct =
                    totalTeams > 0
                      ? (approvalData.approved / totalTeams) * 100
                      : 0;
                  const pendingPct =
                    totalTeams > 0
                      ? (approvalData.pending / totalTeams) * 100
                      : 0;

                  return (
                    <>
                      <div className="flex flex-col gap-5 items-center justify-center mb-5 mt-2 w-full flex-1">
                        {/* Outer Pie Chart Wrapper */}
                        <div
                          className="relative w-24 h-24 rounded-full shrink-0 shadow-sm"
                          style={{
                            background:
                              totalTeams > 0
                                ? `conic-gradient(
                    #a855f7 0% ${approvedPct}%,
                    #3b82f6 ${approvedPct}% ${approvedPct + pendingPct}%,
                    #f43f5e ${approvedPct + pendingPct}% 100%
                  )`
                                : "rgba(148,163,184,0.15)",
                          }}
                        >
                          {/* Sleeker inner mask ring cutout */}
                          <div className="absolute inset-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center shadow-inner">
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none mb-0.5">
                              {totalTeams}
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              Teams
                            </span>
                          </div>
                        </div>

                        {/* Legend Labels */}
                        <div className="flex flex-col gap-2 w-full px-2 text-xs">
                          <span className="flex gap-2 items-center font-medium text-slate-600 dark:text-slate-300">
                            <i className="w-2.5 h-2.5 rounded-full shrink-0 bg-purple-500" />
                            Approved
                            <strong className="ml-auto text-slate-900 dark:text-slate-100">
                              {approvalData.approved}
                            </strong>
                          </span>
                          <span className="flex gap-2 items-center font-medium text-slate-600 dark:text-slate-300">
                            <i className="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-500" />
                            Pending
                            <strong className="ml-auto text-slate-900 dark:text-slate-100">
                              {approvalData.pending}
                            </strong>
                          </span>
                          <span className="flex gap-2 items-center font-medium text-slate-600 dark:text-slate-300">
                            <i className="w-2.5 h-2.5 rounded-full shrink-0 bg-rose-500" />
                            Rejected
                            <strong className="ml-auto text-slate-900 dark:text-slate-100">
                              {approvalData.rejected}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <button
                        className="bg-slate-700/50 border border-slate-600 text-slate-200 p-2 rounded-lg cursor-pointer transition-all hover:bg-slate-700 w-full text-center mt-auto text-xs font-medium"
                        type="button"
                        onClick={() => navigate("/committee/team-review")}
                      >
                        Go to Approvals
                      </button>
                    </>
                  );
                })()}
              </section>

              {/* QUICK ACTIONS */}
              <section className="committee-card committee-light-panel p-4 flex flex-col col-span-12 md:col-span-6 xl:col-span-3">
                <SectionTitle title="Quick Actions" />
                <div className="flex flex-col gap-2 mt-2 flex-1">
                  <input
                    type="file"
                    accept=".csv"
                    ref={inviteFileInputRef}
                    onChange={handleCommitteeInviteCsv}
                    style={{ display: "none" }}
                  />

                  <button
                    className="flex items-center gap-2.5 w-full committee-action-btn p-2 rounded-lg cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={() => inviteFileInputRef.current?.click()}
                    disabled={invitingMembers}
                    type="button"
                  >
                    <span className="committee-tag accent text-[10px] px-1.5 py-0.5 leading-none shrink-0">
                      {invitingMembers ? "..." : "Access"}
                    </span>
                    <span className="truncate text-xs font-medium">
                      {invitingMembers
                        ? "Inviting Members..."
                        : "Invite Committee Members"}
                    </span>
                  </button>

                  {activeStageName === "Evaluation" ? (
                    <button
                      className="flex items-center gap-2.5 w-full committee-action-btn p-2 rounded-lg cursor-pointer transition-all"
                      type="button"
                      onClick={() => navigate("/committee/upload-judges")}
                    >
                      <span className="committee-tag accent text-[10px] px-1.5 py-0.5 leading-none shrink-0">
                        Nudge
                      </span>
                      <span className="truncate text-xs font-medium">
                        Remind Judges
                      </span>
                    </button>
                  ) : (
                    <button
                      className="flex items-center gap-2.5 w-full committee-action-btn p-2 rounded-lg cursor-pointer transition-all"
                      type="button"
                      onClick={() => navigate("/committee/communications")}
                    >
                      <span className="committee-tag accent text-[10px] px-1.5 py-0.5 leading-none shrink-0">
                        New
                      </span>
                      <span className="truncate text-xs font-medium">
                        Send Announcement
                      </span>
                    </button>
                  )}

                  {activeStageName === "Team Formation" ? (
                    <button
                      className="flex items-center gap-2.5 w-full committee-action-btn p-2 rounded-lg cursor-pointer transition-all"
                      type="button"
                      onClick={() => navigate("/committee/teams/generate")}
                    >
                      <span className="committee-tag accent text-[10px] px-1.5 py-0.5 leading-none shrink-0">
                        Action
                      </span>
                      <span className="truncate text-xs font-medium">
                        Generate Teams
                      </span>
                    </button>
                  ) : (
                    <button
                      className="flex items-center gap-2.5 w-full committee-action-btn p-2 rounded-lg cursor-pointer transition-all"
                      type="button"
                      onClick={() => navigate("/committee/upload-judges")}
                    >
                      <span className="committee-tag accent text-[10px] px-1.5 py-0.5 leading-none shrink-0">
                        Manage
                      </span>
                      <span className="truncate text-xs font-medium">
                        Assign Judges
                      </span>
                    </button>
                  )}
                </div>
              </section>

              {/* LEADERBOARD PREVIEW */}
              <section className="committee-card committee-light-panel p-5 flex flex-col col-span-12 xl:col-span-6">
                <SectionTitle
                  title="Leaderboard Preview"
                  action="Open"
                  onAction={() => navigate("/committee/results")}
                />

                <div className="overflow-x-auto mb-3 flex-1 mt-2">
                  <table className="w-full text-left border-collapse text-xs min-w-[450px]">
                    <thead>
                      <tr>
                        <th className="p-3 text-slate-400 font-medium border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="p-3 text-slate-400 font-medium border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          Team Name
                        </th>
                        <th className="p-3 text-slate-400 font-medium border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          Score
                        </th>
                        <th className="p-3 text-slate-400 font-medium border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          Status
                        </th>
                        <th className="p-3 text-slate-400 font-medium border-b border-slate-700 text-[10px] uppercase tracking-wider">
                          Anomaly
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.length ? (
                        leaderboard.map((row, index) => {
                          const flagged = pendingAnomalies.some(
                            (item) => item.team_name === row.team,
                          );
                          return (
                            <tr
                              key={row.team || index}
                              className="hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="p-3 font-semibold text-slate-300">
                                {index + 1}
                              </td>
                              <td className="p-3 text-slate-100 font-medium">
                                {row.team}
                              </td>
                              <td className="p-3 text-indigo-400 font-bold">
                                {row.score}
                              </td>
                              <td className="p-3">
                                <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-medium border border-green-500/20">
                                  Evaluated
                                </span>
                              </td>
                              <td className="p-3">
                                {flagged ? (
                                  <span className="text-amber-400 font-semibold text-[10px] flex items-center gap-1">
                                    âš ï¸ Flagged
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">
                                    None
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5}>
                            <EmptyPanel>
                              No active scores recorded to populate rankings
                              yet.
                            </EmptyPanel>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ðŸ”‘ FIXED: ADDED PENDING ACTIONS & APPROVALS PANEL */}
              <section className="committee-card committee-light-panel p-5 flex flex-col col-span-12 xl:col-span-6">
                <SectionTitle
                  title="Pending Commitee Actions Queue"
                  action="View Feed"
                  onAction={() => navigate("/committee/approvals")}
                />

                <div className="flex flex-col gap-3 mt-2 flex-1 overflow-y-auto max-h-[280px] pr-1">
                  {approvals.length === 0 && pendingAnomalies.length === 0 ? (
                    <EmptyPanel>
                      All caught up! No registrations or scoring feeds are
                      awaiting response panels.
                    </EmptyPanel>
                  ) : (
                    <>
                      {/* Approvals Loop */}
                      {approvals.slice(0, 3).map((item, i) => (
                        <div
                          key={`pending-app-${item.id || i}`}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs"
                        >
                          <div className="flex flex-col gap-0.5 truncate mr-2">
                            <strong className="text-slate-200 truncate">
                              {item.name || "Unnamed Project"}
                            </strong>
                            <span className="text-[10px] text-slate-400">
                              Staged Team Registration Request
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate("/committee/approvals")}
                            className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold text-[10px] px-2.5 py-1 rounded border border-indigo-500/30 shrink-0 transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                        </div>
                      ))}

                      {/* Score Anomalies Loop */}
                      {pendingAnomalies.slice(0, 2).map((item, i) => {
  // ðŸ” Extract true team name from the backend's reasoning payload if available
  let displayTeamName = item.team_name;
  if ((!displayTeamName || displayTeamName === "Unknown Team" || displayTeamName === "Team Delta") && item.ai_reasoning) {
    const parsedMatch = item.ai_reasoning.match(/Divergence detected for (.*?):/);
    if (parsedMatch && parsedMatch[1]) {
      displayTeamName = parsedMatch[1].trim();
    }
  }

  return (
    <div
      key={`pending-anom-${item.id || i}`}
      className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs"
    >
      <div className="flex flex-col gap-0.5 truncate mr-2">
        <strong className="text-amber-300 truncate">
          âš ï¸ Delta Breach: {displayTeamName || `Team ID: ${String(item.team_id).slice(0, 6)}`}
        </strong>
        <span className="text-[10px] text-amber-400/80">
          Conflicting scores submitted by judges
        </span>
      </div>
      <button
        type="button"
        onClick={() => navigate("/committee/anomalies")}
        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[10px] px-2.5 py-1 rounded border border-amber-500/30 shrink-0 transition-colors cursor-pointer"
      >
        Resolve
      </button>
    </div>
  );
})}
                    </>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </CommitteeLayout>
  );
}

