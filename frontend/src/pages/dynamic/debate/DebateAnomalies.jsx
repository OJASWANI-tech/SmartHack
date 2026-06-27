import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  AlertTriangle, CheckCircle2, ShieldAlert, 
  Search, Eye, HelpCircle, UserX 
} from 'lucide-react';

export default function DebateAnomalies() {
  const location = useLocation();
  const [toastMessage, setToastMessage] = useState('');
  const [anomalies, setAnomalies] = useState([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extract the active event identifier out of the persistent application state contexts
  const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Synchronize dynamic compliance logs from backend databases on load
  useEffect(() => {
    if (!activeEventId) {
      setIsLoading(false);
      return;
    }

    const fetchLiveAnomalies = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/ballot-anomalies`);
        if (!res.ok) throw new Error("Anomalies tracking logs matrix query failed.");
        const data = await res.json();
        
        // Maps backend relational database variables into structural state UI components
        // Expected API schema row shape: { id, anomaly_type, room_name, description_text, threat_severity, diagnostic_telemetry_details }
        const formattedAnomalies = data.map(anom => ({
          id: anom.id,
          type: anom.anomaly_type,
          room: anom.room_name,
          desc: anom.description_text,
          severity: anom.threat_severity, // "Critical" | "Warning" | "Info"
          details: anom.diagnostic_telemetry_details
        }));

        setAnomalies(formattedAnomalies);
      } catch (err) {
        console.error("Could not load tournament audit tables:", err);
        triggerToast("⚠️ Failed to parse ballot compliance tracking pipelines.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveAnomalies();
  }, [location.pathname, activeEventId]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleResolve = async (id, resolutionActionKey) => {
    if (!activeEventId) return;

    try {
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/ballot-anomalies/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_strategy: resolutionActionKey
        })
      });

      if (!res.ok) throw new Error("Resolution action pipeline rejected by ledger engine.");

      // Remove the mitigated node element out of live client queues instantly
      setAnomalies(prev => prev.filter(a => a.id !== id));
      if (selectedAnomaly && selectedAnomaly.id === id) {
        setSelectedAnomaly(null);
      }
      
      triggerToast(`✓ Discrepancy resolved via action: [${resolutionActionKey}]`);
    } catch (err) {
      console.error(err);
      triggerToast("❌ Failsafe: Error committing mitigation action to tabulation servers.");
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl shadow-black/40 border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 p-5 rounded-xl border shadow-sm bg-[#0b1120] border-slate-800/60">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-rose-500/20 text-rose-400 border border-rose-500/35">
            Audit & Compliance
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">Ballot & Rank Split Anomalies</h2>
          <p className="text-xs text-slate-400 mt-0.5">Automated ballot validation scanner. Analyzing rank splits, scoring exceptions, and low-point win telemetry.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide p-6">
          Scanning ballot arrays for structural tracking variances...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Alerts Queue */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Active Discrepancy Queue ({anomalies.length})
              </h3>

              {anomalies.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-900/40 rounded-xl border border-slate-850">
                  🎉 Excellent! No pending ballot discrepancies or splits detected.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {anomalies.map(anom => (
                    <div 
                      key={anom.id} 
                      className={`p-4 rounded-xl border transition-all duration-200 flex flex-col gap-3 cursor-pointer
                        ${selectedAnomaly?.id === anom.id 
                          ? 'bg-[#1e1b4b]/40 border-indigo-500/60 shadow-lg shadow-indigo-500/5' 
                          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/50'}`}
                      onClick={() => setSelectedAnomaly(anom)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase
                            ${anom.severity === 'Critical' 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                              : anom.severity === 'Warning'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                            {anom.severity} Alert
                          </span>
                          <span className="text-xs font-bold text-white">{anom.type}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{anom.room}</span>
                      </div>

                      <p className="text-xs text-slate-200 font-medium leading-relaxed">"{anom.desc}"</p>

                      <div className="flex justify-end gap-2 mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedAnomaly(anom); }}
                          className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-850 hover:bg-slate-800 text-[10px] font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResolve(anom.id, 'APPROVE_BALLOT'); }}
                          className="px-3 py-1 rounded bg-indigo-650 hover:bg-indigo-600 text-[10px] font-bold text-white transition-colors"
                        >
                          Approve Ballot
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Details / Audit Pane */}
          <div>
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40 sticky top-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400" /> Ballot Audit Console
              </h3>

              {selectedAnomaly ? (
                <div className="flex flex-col gap-4">
                  <div className="border-b border-slate-800/40 pb-4">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">TARGET ROUND</span>
                    <h4 className="text-sm font-bold text-white mt-1">{selectedAnomaly.room} — {selectedAnomaly.type}</h4>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">DISCREPANCY OVERVIEW</span>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                      {selectedAnomaly.desc}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">DIAGNOSTIC SYSTEM DETAILS</span>
                    <p className="text-xs text-purple-300/95 mt-1.5 leading-relaxed font-sans bg-purple-950/10 p-3 rounded-lg border border-purple-900/20">
                      {selectedAnomaly.details}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-4 border-t border-slate-800/40">
                    <button
                      onClick={() => handleResolve(selectedAnomaly.id, 'FORCE_OVERRIDE_APPROVE')}
                      className="w-full py-2 rounded-lg text-xs font-bold bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/35 transition-colors"
                    >
                      ✓ Force Approve Ballot
                    </button>
                    <button
                      onClick={() => handleResolve(selectedAnomaly.id, 'ADJUST_SCORES_MODAL')}
                      className="w-full py-2 rounded-lg text-xs font-bold bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/35 transition-colors"
                    >
                      ✏️ Adjust Scores / Rejudge
                    </button>
                    <button
                      onClick={() => handleResolve(selectedAnomaly.id, 'CONTACT_ADJUDICATOR_DISPATCH')}
                      className="w-full py-2 rounded-lg text-xs font-bold bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                    >
                      📞 Flag and Message Adjudicator
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs italic text-center">
                  <HelpCircle className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
                  Select an anomaly alert from the queue to run ballot audits or resolve clashes.
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}