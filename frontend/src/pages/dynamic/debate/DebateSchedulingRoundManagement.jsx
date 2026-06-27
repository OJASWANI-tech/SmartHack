import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Calendar, Clock, ShieldAlert, CheckCircle2, 
  Plus, Users, Play, AlertCircle, RefreshCw, 
  MapPin, UserCheck, ChevronRight
} from 'lucide-react';

export default function DebateSchedulingRoundManagement() {
  const location = useLocation();
  const [toastMessage, setToastMessage] = useState('');
  const [activeRound, setActiveRound] = useState(null);
  const [roundsList, setRoundsList] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [matchingLogic, setMatchingLogic] = useState('power');
  const [enforceInstitutional, setEnforceInstitutional] = useState(true);
  const [preventRepeated, setPreventRepeated] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Extract ongoing event parameters from persistent global app dashboards context
  const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Lifecycle 1: Synchronize all structured tournament rounds on initialization
  useEffect(() => {
    if (!activeEventId) {
      setIsLoading(false);
      return;
    }

    const fetchTournamentRounds = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/rounds`);
        if (!res.ok) throw new Error("Rounds collection mapping matrix failed.");
        const data = await res.json();
        
        // Maps backend structural schema into UI state variables
        const formattedRounds = data.map(r => ({
          id: r.id,
          name: r.round_name,         // e.g., "Round 1"
          status: r.lifecycle_status, // "Completed" | "Draft" | "Locked"
          timestamp: r.scheduled_start_time // e.g., "02:00 PM"
        }));

        setRoundsList(formattedRounds);
        
        // Intelligently fallback onto current Draft or latest active stage if available
        if (formattedRounds.length > 0) {
          const defaultSelection = formattedRounds.find(r => r.status === 'Draft') || formattedRounds[0];
          setActiveRound(defaultSelection.name);
        }
      } catch (err) {
        console.error("Error retrieving tournament structural tiers:", err);
        triggerToast("⚠️ Failed to pull current tournament round configurations.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournamentRounds();
  }, [location.pathname, activeEventId]);

  // Lifecycle 2: Synchronize live matchup room allocations whenever the chosen stage shifts
  useEffect(() => {
    if (!activeEventId || !activeRound) return;

    const fetchActivePairings = async () => {
      try {
        const targetRoundObj = roundsList.find(r => r.name === activeRound);
        if (!targetRoundObj) return;

        const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/rounds/${targetRoundObj.id}/pairings`);
        if (!res.ok) throw new Error("Target matrix query failed.");
        const data = await res.json();

        setPairings(data.map(p => ({
          id: p.id,
          room: p.room_name_label,
          gov: p.government_team_name,
          opp: p.opposition_team_name,
          judges: p.assigned_adjudicators_list, // Expected array of strings
          clashAlert: p.has_institutional_clash,
          clashDetails: p.clash_telemetry_details,
          status: p.allocation_status // "Ready" | "Conflict"
        })));
      } catch (err) {
        console.error("Failed to parse allocation room pairs matrix:", err);
        triggerToast("❌ Error reloading room pairing structures.");
      }
    };

    fetchActivePairings();
  }, [activeRound, roundsList, activeEventId]);

  const handleAutoPair = async () => {
    if (!activeEventId || !activeRound) return;
    const targetRoundObj = roundsList.find(r => r.name === activeRound);
    if (!targetRoundObj) return;

    try {
      triggerToast("⚡ Tabulation Engine running power-pairing algorithm based on current points...");
      
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/rounds/${targetRoundObj.id}/auto-pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matching_logic: matchingLogic,
          enforce_institutional_blocks: enforceInstitutional,
          prevent_repeated_panelists: preventRepeated
        })
      });

      if (!res.ok) throw new Error("Automated parsing logic computation pipeline rejected.");
      const updatedPairings = await res.json();

      setPairings(updatedPairings.map(p => ({
        id: p.id,
        room: p.room_name_label,
        gov: p.government_team_name,
        opp: p.opposition_team_name,
        judges: p.assigned_adjudicators_list,
        clashAlert: p.has_institutional_clash,
        clashDetails: p.clash_telemetry_details,
        status: p.allocation_status
      })));

      triggerToast("✓ Power-pairing brackets computed cleanly with active configurations.");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Failsafe: Tabulation matching algorithm aborted unexpectedly.");
    }
  };

  const handleResolveConflict = async (pairingId) => {
    if (!activeEventId) return;
    
    try {
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/pairings/${pairingId}/resolve-clash`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error("Conflict state mitigation failed.");
      const resolvedPair = await res.json();

      // Instantly map mitigated node updates to state view model arrays
      setPairings(prev => prev.map(p => {
        if (p.id === pairingId) {
          return { 
            ...p, 
            judges: resolvedPair.assigned_adjudicators_list, 
            clashAlert: resolvedPair.has_institutional_clash, 
            status: resolvedPair.allocation_status 
          };
        }
        return p;
      }));
      
      triggerToast("✓ Panel conflict resolved: Reallocated neutral adjudicators.");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Could not programmatically clear target panel clash.");
    }
  };

  const handleReleasePairings = async () => {
    if (!activeEventId || !activeRound) return;
    const targetRoundObj = roundsList.find(r => r.name === activeRound);
    if (!targetRoundObj) return;

    try {
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/rounds/${targetRoundObj.id}/release`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error("Publishing operations matrix rejected.");
      
      setRoundsList(prev => prev.map(r => r.id === targetRoundObj.id ? { ...r, status: 'Locked' } : r));
      triggerToast("🚀 Round pairings released to participant portals successfully.");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Failsafe: Unable to push pairings matrix live.");
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 p-5 rounded-xl border shadow-sm bg-[#0b1120] border-slate-800/60">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
              Tournament Director Core
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">Round Pairings & Scheduling Center</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure live match brackets, run power-pairing allocations, and cross-examine institutional judging conflicts.</p>
          </div>

          <div className="flex gap-2.5 w-full md:w-auto">
            <button 
              onClick={handleAutoPair}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" /> Auto-Pair Brackets
            </button>
            <button 
              onClick={handleReleasePairings}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
            >
              <Play className="w-3.5 h-3.5 fill-white" /> Release Pairings
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide p-6">
          Querying data matrix pipelines...
        </div>
      ) : (
        <>
          {/* Sub-navigation Controls / Track Stages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {roundsList.map((rnd) => (
              <div 
                key={rnd.name}
                onClick={() => setActiveRound(rnd.name)}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between
                  ${activeRound === rnd.name 
                    ? 'bg-indigo-950/30 border-indigo-500/70 shadow-md shadow-indigo-500/5' 
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700/60'}`}
              >
                <div>
                  <h4 className={`text-xs font-bold ${activeRound === rnd.name ? 'text-indigo-400' : 'text-slate-200'}`}>{rnd.name}</h4>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Starts: {rnd.timestamp}</span>
                </div>
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide
                  ${rnd.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                    rnd.status === 'Draft' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                    'bg-slate-800 text-slate-500'}`}>
                  {rnd.status}
                </span>
              </div>
            ))}
          </div>

          {/* Main Grid View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Pairings Queue */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="p-5 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" /> Active Room Allocations ({pairings.length})
                </h3>

                <div className="flex flex-col gap-4">
                  {pairings.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs italic">
                      No matchup allocations found. Trigger 'Auto-Pair Brackets' to populate allocations dynamically.
                    </div>
                  ) : (
                    pairings.map((match) => (
                      <div 
                        key={match.id}
                        className={`p-4 rounded-xl border transition flex flex-col gap-3.5 bg-slate-900/30
                          ${match.clashAlert ? 'border-rose-500/30 bg-rose-950/5' : 'border-slate-800 hover:border-slate-700/60'}`}
                      >
                        {/* Top bar header info */}
                        <div className="flex justify-between items-center border-b border-slate-800/40 pb-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-white">{match.room}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase
                            ${match.status === 'Conflict' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400'}`}>
                            {match.status}
                          </span>
                        </div>

                        {/* Debate Brackets Matchup info */}
                        <div className="grid grid-cols-7 items-center gap-2 text-center py-1">
                          <div className="col-span-3 text-left">
                            <span className="text-[9px] font-bold text-slate-500 block uppercase mb-0.5">Government</span>
                            <span className="text-xs font-semibold text-indigo-300">{match.gov}</span>
                          </div>
                          <div className="col-span-1 text-slate-500 font-mono text-xs font-bold">VS</div>
                          <div className="col-span-3 text-right">
                            <span className="text-[9px] font-bold text-slate-500 block uppercase mb-0.5">Opposition</span>
                            <span className="text-xs font-semibold text-purple-300">{match.opp}</span>
                          </div>
                        </div>

                        {/* Panel Adjudicators Assignment block */}
                        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-850 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Panel:</span>
                            {match.judges?.map((jd, k) => (
                              <span key={k} className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700/60 flex items-center gap-1">
                                <UserCheck className="w-2.5 h-2.5 text-emerald-400" /> {jd}
                              </span>
                            ))}
                          </div>
                          
                          {match.clashAlert && (
                            <button 
                              onClick={() => handleResolveConflict(match.id)}
                              className="text-[10px] bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded transition"
                            >
                              Resolve Conflict
                            </button>
                          )}
                        </div>

                        {/* Warning Details Display if conflict is flag-tripped */}
                        {match.clashAlert && (
                          <div className="p-3 text-[11px] rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-300/90 flex items-start gap-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed font-sans">{match.clashDetails}</p>
                          </div>
                        )}

                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Parameters Configurations */}
            <div className="flex flex-col gap-6">
              <div className="p-5 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" /> Pairing Rule Parameters
                </h3>

                <div className="flex flex-col gap-4 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Bracket Matching Logic</label>
                    <select 
                      value={matchingLogic}
                      onChange={(e) => setMatchingLogic(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="power">Power-Pairing (Standard High-High)</option>
                      <option value="random">Randomized Tier Bracket Allocation</option>
                      <option value="bracket">Strict Power-Protected Allocation</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Clash Integrity Layer</label>
                    <div className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input 
                          type="checkbox" 
                          checked={enforceInstitutional} 
                          onChange={(e) => setEnforceInstitutional(e.target.checked)}
                          className="accent-indigo-500 rounded" 
                        />
                        <span>Enforce Institutional Blockouts</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300 mt-1">
                        <input 
                          type="checkbox" 
                          checked={preventRepeated} 
                          onChange={(e) => setPreventRepeated(e.target.checked)}
                          className="accent-indigo-500 rounded" 
                        />
                        <span>Prevent Repeated Panelists</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/50">
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-950/10 border border-indigo-900/30 text-indigo-300">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                      <p className="text-[11px] leading-relaxed">
                        Changing logic rules recalculates draft configurations instantly. Active ballots for published rounds remain preserved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}