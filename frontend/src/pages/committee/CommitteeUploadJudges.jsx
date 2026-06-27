import { getCommitteeRole } from '../../services/auth'
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CommitteeLayout from "../../components/layout/CommitteeLayout";
import Skeleton from "../../components/common/Skeleton";
import {
  getFinalizedTeams,
  uploadJudgesExpertiseCsv,
} from "../../services/committee";

// 🎯 Synced exactly with your database normalization blocks
const DOMAIN_MAPPING = {
  ai: "Artificial Intelligence & Machine Learning",
  developer: "Artificial Intelligence & Machine Learning",
  data: "Artificial Intelligence & Machine Learning",
  devs: "Artificial Intelligence & Machine Learning",
  "artificial intelligence & machine learning":
    "Artificial Intelligence & Machine Learning",

  business: "FinTech & Decentralized Payments",
  pm: "FinTech & Decentralized Payments",
  biz: "FinTech & Decentralized Payments",
  "fintech & decentralized payments": "FinTech & Decentralized Payments",

  cyber: "CyberSecurity & Zero-Trust Architecture",
  security: "CyberSecurity & Zero-Trust Architecture",
  "cybersecurity & zero-trust architecture":
    "CyberSecurity & Zero-Trust Architecture",

  design: "HealthTech & Digital Patient Care",
  ux: "HealthTech & Digital Patient Care",
  ui: "HealthTech & Digital Patient Care",
  designer: "HealthTech & Digital Patient Care",
  "healthtech & digital patient care": "HealthTech & Digital Patient Care",

  web3: "Web3 & Blockchain Infrastructure",
  blockchain: "Web3 & Blockchain Infrastructure",
  "web3 & blockchain infrastructure": "Web3 & Blockchain Infrastructure",
};

// Helper utility to safely extract normalized domain tags
const resolveNormalizedDomain = (challengeText) => {
  if (!challengeText) return "General Track";
  const lowerText = challengeText.toLowerCase().trim();

  // Find matching keyword inside the string context
  const matchedKey = Object.keys(DOMAIN_MAPPING).find((key) =>
    lowerText.includes(key),
  );
  return matchedKey ? DOMAIN_MAPPING[matchedKey] : "General Track";
};

function CommitteeUploadJudges() {
  const { eventId: urlEventId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  const activeEventId =
    urlEventId || localStorage.getItem("current_event_id") || "default_event";

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [toast, setToast] = useState(null);

 const isAdmin = 
  getCommitteeRole() === 'admin' || 
  localStorage.getItem('eventflow_mock_role') === 'dynamic-committee' ||
  getCommitteeRole() === 'committee';

  const showToast = useCallback((message, type = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadEcosystemData = useCallback(async () => {
    try {
      setLoading(true);
      const teamsData = await getFinalizedTeams(activeEventId);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
    } catch (err) {
  
      showToast("Failed to pull updated panel ecosystems.", "error")
    } finally {
      setLoading(false);
    }
  }, [activeEventId, showToast]);

  useEffect(() => {
    loadEcosystemData();
  }, [loadEcosystemData]);

  const handleJudgeClick = async (judgeName) => {
    try {
      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const registryResponse = await fetch(
        `${baseURL}/api/v1/events/${activeEventId}/evaluators`,
      );
      if (!registryResponse.ok) {
        showToast("Failed to query evaluators registry.", "error");
        return;
      }

      const evaluators = await registryResponse.json();
      const matchedJudge = (evaluators || []).find((ev) => {
        const targetName = ev.name || ev.judge_name || "";
        return targetName.toLowerCase() === judgeName.toLowerCase();
      });

      if (!matchedJudge || !matchedJudge.email) {
        showToast(`Could not resolve email for judge: ${judgeName}`, "error");
        return;
      }

      const adminToken =
        localStorage.getItem("eventflow_token") ||
        localStorage.getItem("token");

      const tokenResponse = await fetch(`${baseURL}/tokens/evaluator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken && { Authorization: `Bearer ${adminToken.trim()}` }),
        },
        body: JSON.stringify({
          evaluator_email: matchedJudge.email,
          sandbox_delivery_email: "shubhtech1056@gmail.com",
          event_id: activeEventId
        })
      })

      if (tokenResponse.ok) {
        const data = await tokenResponse.json();
        const accessToken =
          typeof data === "object" && data !== null
            ? data.token || data.access_token || data.link
            : data;

        if (accessToken) {
          localStorage.setItem('evaluator_token', accessToken)
          localStorage.setItem('role', 'evaluator')
          showToast(`📬 Magic Link routed to your test mailbox! Check shubhtech1056@gmail.com`, 'success')
        } else {
          showToast(`Empty token returned for judge: ${judgeName}`, "error");
        }
      } else {
        showToast("Failed to issue a valid evaluator context token.", "error");
      }
    } catch (err) {
      
      showToast("Error switching to evaluator context.", 'error')
    }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingCsv(true);
      await uploadJudgesExpertiseCsv(activeEventId, file);
      showToast(
        "Successfully parsed judges registry and matched taxonomy!",
        "success",
      );
      await loadEcosystemData();
    } catch (err) {
      showToast(
        err.message ||
          "Failed to distribute judges based on expertise matrices.",
        "error",
      );
    } finally {
      setUploadingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    // Generates a comprehensive template including all of your custom tracks
    const csvContent =
      "judge_name,email,domain,institution,max_workload,availability\n" +
      'Dr. Aris Vance,vance@polytech.edu,"AI Developer, Data Engineering","MIT",4,"morning, afternoon"\n' +
      'Sarah Jenkins,s.jenkins@vcfund.io,"FinTech & Decentralized Payments, PM","Venture Labs",5,"afternoon, evening"\n' +
      'Marcus Thorne,marcus@infosec.net,"cyber, security","InfoSec Corp",3,"morning"\n' +
      'Elena Rostova,elena@medtech.org,"ui, design, HealthTech","Global Health",4,"afternoon"\n' +
      'Block Wood,wood@ether.io,"web3, blockchain","Consensys",6,"morning, evening"';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "judges_comprehensive_taxonomy.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <CommitteeLayout
        statusItems={[{ label: "Setup", value: "Judges" }]}
        pageTitle="Allocate Judges by Expertise"
      >
        <div style={{ padding: "2rem", color: "#f8fafc" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "500",
              marginBottom: "1.5rem",
            }}
          >
            Mapping Evaluator Matrices...
          </h2>
          <Skeleton rows={6} />
        </div>
      </CommitteeLayout>
    );
  }

  return (
    <CommitteeLayout
      statusItems={[{ label: "Stage", value: "Panel Allocation" }]}
      pageTitle="Allocate Judges by Expertise"
    >
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .animated-judge-card { animation: fadeInUp 0.35s ease forwards; transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .animated-judge-card:hover { transform: translateY(-4px); border-color: #6366f1 !important; box-shadow: 0 10px 18px -8px rgba(99, 102, 241, 0.25) !important; }
        .btn-slate-action { background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); transition: all 0.2s ease; }
        .btn-slate-action:hover { background: var(--bg-card-hover); color: var(--text-primary); border-color: var(--border-color); }
        .btn-gradient-action { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; border: none; transition: all 0.2s ease; }
        .btn-gradient-action:hover:not(:disabled) { transform: scale(1.015); box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3); }
        .custom-toast-banner { animation: slideInDown 0.25s ease-out forwards; }
      `}</style>

      <div
        style={{
          padding: "1.5rem",
          color: "var(--text-primary)",
          position: "relative",
        }}
      >
        {toast && (
          <div
            className="custom-toast-banner"
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: "500",
              fontSize: "0.9rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: "1px solid",
              background:
                toast.type === "success"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(239, 68, 68, 0.15)",
              borderColor: toast.type === "success" ? "#10b981" : "#ef4444",
              color: toast.type === "success" ? "#34d399" : "#f87171",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => {
                setToast(null);
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              }}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: "1.1rem",
                opacity: 0.7,
              }}
            >
              ×
            </button>
          </div>
        )}

        <header
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
          >
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleCsvUpload}
              style={{ display: "none" }}
            />
            
            {isAdmin && (
              <>
              {/* Upload Button */}
                <button
                  type="button"
                  className="btn-slate-action"
                  disabled={uploadingCsv}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    padding: '0.5rem 0.85rem', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: '500',
                    fontSize: '0.85rem'
                  }}
                >
                  {uploadingCsv ? 'Matching Expertise...' : '📤 Upload Judges CSV'}
                </button>
              </>
            )}

            <button
              className="btn-gradient-action"
              onClick={() => navigate("/committee/evaluations")}
              style={{
                padding: "0.5rem 1.1rem",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.85rem",
              }}
            >
              Continue to Evaluations View
            </button>
          </div>
        </header>

        {teams.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              background: "#1e293b",
              borderRadius: "8px",
              border: "1px dashed #334155",
            }}
          >
            <span style={{ fontSize: "2.5rem" }}>⚖️</span>
            <h3 style={{ margin: "1rem 0 0.5rem 0", color: "#f8fafc" }}>
              No Teams Available
            </h3>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {teams.map((team, index) => {
              const assignedJudges = Array.isArray(team.scores_snapshot)
                ? team.scores_snapshot
                : [];
              const resolvedDomain = resolveNormalizedDomain(team.challenge);

              return (
                <article
                  key={team.id}
                  className="animated-judge-card"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "1.15rem",
                    boxShadow: "var(--card-shadow)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    animationDelay: `${index * 40}ms`,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.6rem",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.1rem",
                          color: "var(--text-primary)",
                          fontWeight: "600",
                          paddingRight: "0.75rem",
                        }}
                      >
                        {team.name}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          background:
                            assignedJudges.length > 0
                              ? "rgba(52, 211, 153, 0.12)"
                              : "var(--bg-card)",
                          color:
                            assignedJudges.length > 0
                              ? "var(--success)"
                              : "var(--text-secondary)",
                          border: `1px solid ${assignedJudges.length > 0 ? "rgba(52, 211, 153, 0.2)" : "var(--border-color)"}`,
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {assignedJudges.length} Assigned
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        margin: "0 0 1rem 0",
                      }}
                    >
                      <strong style={{ color: "var(--text-primary)" }}>
                        Track Category:
                      </strong>{" "}
                      <span style={{ color: "#a78bfa", fontWeight: "500" }}>
                        {resolvedDomain}
                      </span>
                    </p>
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "1rem",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "0.7rem",
                        color: "var(--text-secondary)",
                        marginBottom: "0.5rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Panel Configuration
                    </strong>
                    {assignedJudges.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        {assignedJudges.map((j, i) => {
                          const resolvedJudgeName =
                            j.judge_name || j.name || "Assigned Judge";
                          return (
                            <span
                              key={i}
                              onClick={() =>
                                handleJudgeClick(resolvedJudgeName)
                              }
                              title={`Click to send a test invite to ${resolvedJudgeName}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "0.75rem",
                                background: "rgba(99, 102, 241, 0.08)",
                                color: "#818cf8",
                                padding: "0.3rem 0.75rem",
                                borderRadius: "12px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                border: "1px solid rgba(99, 102, 241, 0.25)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#4f46e5";
                                e.currentTarget.style.color = "#ffffff";
                                e.currentTarget.style.borderColor = "#4f46e5";
                                e.currentTarget.style.transform = "scale(1.03)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "rgba(99, 102, 241, 0.08)";
                                e.currentTarget.style.color = "#818cf8";
                                e.currentTarget.style.borderColor =
                                  "rgba(99, 102, 241, 0.25)";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            >
                              <span>🧧</span>
                              <span>Invite {resolvedJudgeName}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                          fontStyle: "italic",
                        }}
                      >
                        No matching judges mapped yet. Upload CSV matrix to
                        populate.
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </CommitteeLayout>
  );
}

export default CommitteeUploadJudges;
