import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FileCheck, ShieldCheck, AlertTriangle, PenTool, 
  Download, Eye, Lock, CheckCircle2 
} from 'lucide-react';

export default function DebateResultsCertification() {
  const location = useLocation();
  const [isCertified, setIsCertified] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  
  // Real-time compliance engine telemetry models
  const [auditStatus, setAuditStatus] = useState({
    ballotsConvergencePercentage: 0,
    ballotsCountText: "0/0",
    isAnomalyQueueClean: false,
    activeAnomaliesCount: 0,
    historicalTokenSignature: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // Extract application event target identifiers out of standard persistent tokens
  const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Fetch the cryptographic verification checklists directly from ledger tables
  useEffect(() => {
    if (!activeEventId) {
      setIsLoading(false);
      return;
    }

    const fetchAuditTelemeterData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/tabulation-certification/status`);
        if (!res.ok) throw new Error("Compliance trace configuration verification rejected.");
        const data = await res.json();

        // Hydrate active UI checklist rows with database aggregations
        setAuditStatus({
          ballotsConvergencePercentage: parseFloat(data.convergence_percentage) || 0,
          ballotsCountText: `${data.received_ballots_count || 0}/${data.expected_ballots_count || 0}`,
          isAnomalyQueueClean: !!data.is_anomaly_queue_clean,
          activeAnomaliesCount: parseInt(data.pending_anomalies_count, 10) || 0,
          historicalTokenSignature: data.existing_authority_signature || null
        });

        if (data.is_already_certified && data.existing_authority_signature) {
          setSignerName(data.existing_authority_signature);
          setIsCertified(true);
        }
      } catch (err) {
        console.error("Could not securely poll ledger state indices:", err);
        triggerToast("⚠️ Failed to read global tabulation audit profiles.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditTelemeterData();
  }, [location.pathname, activeEventId]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleCertify = async (e) => {
    e.preventDefault();
    if (!activeEventId) return;
    
    if (!signerName.trim()) {
      triggerToast("❌ Verification Error: Signer name authority token is required.");
      return;
    }

    try {
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/tabulation-certification/lock-and-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authority_signatory_name: signerName.trim()
        })
      });

      if (!res.ok) {
        const errorPayload = await res.json();
        throw new Error(errorPayload.message || "Lock pipeline structural validation error.");
      }

      setIsCertified(true);
      triggerToast("⚡ Tabulation Certified! Results ledger locked and exported to live feeds.");
    } catch (err) {
      console.error(err);
      triggerToast(`❌ Failsafe: ${err.message || 'Error processing cryptographic release signoff.'}`);
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white border border-indigo-400 shadow-xl">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 p-5 rounded-xl border bg-[#0b1120] border-slate-800/60 shadow-sm">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
          Compliance & Ledger Cryptography
        </span>
        <h2 className="text-xl font-bold text-white tracking-tight mt-1">Final Tabulation Certification Ledger</h2>
        <p className="text-xs text-slate-400 mt-0.5">Seal open and novice division point matrices. Locking commits records permanently into historic event databases.</p>
      </div>

      {isLoading ? (
        <div className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide p-6">
          Querying secure consensus check matrices from event nodes...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Pre-Release Audit Checklists */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-400" /> Pre-Release Sanity Audit Checklist
              </h3>
              
              <div className="flex flex-col gap-3.5">
                {/* Condition Row 1: Ballot Delivery Tracking */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                  {auditStatus.ballotsConvergencePercentage >= 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Ballot Submission Convergence ({auditStatus.ballotsConvergencePercentage.toFixed(1)}%)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {auditStatus.ballotsCountText} structural ballots accounted for across preliminary round panel scheduling vectors.
                    </p>
                  </div>
                </div>

                {/* Condition Row 2: Mitigations Processing tracking */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800">
                  {auditStatus.isAnomalyQueueClean ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {auditStatus.isAnomalyQueueClean ? "Anomaly Queue Clean Status" : "Pending Anomaly Flags Intercepted"}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {auditStatus.isAnomalyQueueClean 
                        ? "All rank splits, variance deviations, low-point configurations, and scoring exceptions verified and resolved." 
                        : `Attention: ${auditStatus.activeAnomaliesCount} outstanding ballot discrepancy elements require active override mitigation actions before signature.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Signing Box */}
          <div>
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40 sticky top-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-purple-400" /> Authority Signature
              </h3>

              {isCertified ? (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/35 text-center flex flex-col items-center gap-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tabulation Structure Sealed</h4>
                  <p className="text-[11px] text-emerald-300/90 font-mono">Signatory Token: {signerName}</p>
                </div>
              ) : (
                <form onSubmit={handleCertify} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block uppercase mb-1.5">Authorized Chief Adjudicator Name</label>
                    <input 
                      type="text" 
                      value={signerName}
                      disabled={!auditStatus.isAnomalyQueueClean && auditStatus.ballotsConvergencePercentage < 100}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="e.g., Dr. Elizabeth Jenkins"
                      className="w-full bg-slate-900 border border-slate-800 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!auditStatus.isAnomalyQueueClean && auditStatus.ballotsConvergencePercentage < 100}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-850 disabled:cursor-not-allowed text-white border border-indigo-400 shadow-md transition-all duration-200"
                  >
                    🔒 Sign and Release Final Standings
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}