import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Plus, Users, Award, Play, CheckCircle2, 
  MapPin, ShieldAlert, Sparkles, RefreshCw 
} from 'lucide-react';

export default function DebateTeamReview() {
  const location = useLocation();
  const [toastMessage, setToastMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedCount, setGeneratedCount] = useState(0);

  // Live matching runtime states
  const [pairings, setPairings] = useState([]);
  const [solverFeasible, setSolverFeasible] = useState(true);

  // Active tournament runtime contexts
  const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Fetch structural data configurations upon structural component mounting
  useEffect(() => {
    if (!activeEventId) {
      setIsLoading(false);
      return;
    }

    const fetchCurrentPairings = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/pairings`);
        
        if (!res.ok) throw new Error("Round allocation matrices dropped sync.");
        const data = await res.json();

        // Model serialization conversion pipeline mapping
        setPairings(data.pairings.map(p => ({
          id: p.id,
          room: p.room_identifier,
          division: p.division_level,
          gov: p.government_team_name,
          opp: p.opposition_team_name,
          judge: p.adjudicator_name,
          status: p.assignment_status
        })));
        
        setGeneratedCount(data.meta?.optimization_runs || 0);
        setSolverFeasible(data.meta?.is_feasible ?? true);
      } catch (err) {
        console.error("Failed to parse round allocations profiles:", err);
        triggerToast("⚠️ Failed to sync active event context records.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentPairings();
  }, [location.pathname, activeEventId]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleAutoGenerate = async () => {
    if (!activeEventId) return;

    try {
      setIsGenerating(true);
      triggerToast("✨ LLM Matching: Optimizing pairings and avoiding conflict clashes...");

      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/pairings/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error("Optimization solver encountered an error.");
      const updatedData = await res.json();

      setPairings(updatedData.pairings.map(p => ({
        id: p.id,
        room: p.room_identifier,
        division: p.division_level,
        gov: p.government_team_name,
        opp: p.opposition_team_name,
        judge: p.adjudicator_name,
        status: p.assignment_status
      })));

      setGeneratedCount(prev => prev + 1);
      setSolverFeasible(updatedData.meta?.is_feasible ?? true);
      triggerToast("✓ Optimization completed: Conflict constraints resolved.");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Constraint solver pipeline termination failure.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSwapSides = async (id) => {
    if (!activeEventId) return;

    // Optimistic state swap interface mutation
    const targetedPairing = pairings.find(p => p.id === id);
    if (!targetedPairing) return;

    try {
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/pairings/${id}/swap-sides`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error("Server rejected matrix side flip modification.");

      setPairings(prev => prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            gov: p.opp,
            opp: p.gov
          };
        }
        return p;
      }));
      triggerToast("Sides flipped cleanly across structural matrices.");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Matrix update rejected by validation rules.");
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">

      {/* Toast Alert Portal */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl shadow-black/40 border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Round Configuration Header Workspace */}
      <div className="mb-6 p-5 rounded-xl border bg-[#0b1120] border-slate-800/60 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-500/20 text-purple-400 border border-purple-500/35">
              Round Pairings Console
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">Division & Speaking Assignments</h2>
            <p className="text-xs text-slate-400 mt-0.5">Map teams to sides, allocate rooms, and assign conflict-free adjudicators.</p>
          </div>

          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating || isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-all duration-200 shadow-lg shadow-purple-600/15"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Resolving Constraints...' : 'Generate Debate Pairings ✨'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide p-6">
          Synchronizing constraint engine matrices from network context...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Visual Assignment Layout Panel */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" /> Room Allocations & Pairings
              </h3>
              
              <div className="flex flex-col gap-4">
                {pairings.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-xs text-slate-500 italic">
                    No matching profiles generated for this current round execution tree.
                  </div>
                ) : (
                  pairings.map(pair => (
                    <div key={pair.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/70 hover:border-slate-700/60 transition-all duration-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700/50 text-center min-w-[70px]">
                          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">ROOM</span>
                          <span className="text-xs font-extrabold text-white">{pair.room}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">Gov: {pair.gov}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">vs</span>
                            <span className="text-xs font-bold text-white">Opp: {pair.opp}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-500/15 text-indigo-300">{pair.division} Division</span>
                            <span className="text-[10px] text-slate-400 font-medium">🗣️ Judge: <strong className="text-slate-200">{pair.judge}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
                        <button
                          onClick={() => handleSwapSides(pair.id)}
                          className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:text-white text-[11px] font-bold transition-all duration-150"
                        >
                          ⇄ Swap Sides
                        </button>
                        <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                          {pair.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Metrics Layout Panel */}
          <div className="flex flex-col gap-6">
            
            {/* Engine Rules Definitions maps */}
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-400" /> Matchmaker Constraints
              </h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Rule Clash Restraint</label>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs leading-relaxed">
                    <span className="text-rose-400 font-bold block mb-1">Active Blocks:</span>
                    • Institutional Clashes (Same university debater/judge matrices)<br/>
                    • Custom high-severity individual restriction profiles
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Division Separation</label>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-500/35 text-[10px] font-extrabold uppercase">
                      Novice Isolated
                    </span>
                    <span className="px-2 py-1 rounded bg-purple-500/25 text-purple-300 border border-purple-500/35 text-[10px] font-extrabold uppercase">
                      Open Isolated
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800/45 pt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Solver Health Matrix</span>
                    <span className={`font-bold ${solverFeasible ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {solverFeasible ? '100% Feasible' : 'Conflicts Detected'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-850">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${solverFeasible ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                      style={{ width: solverFeasible ? '100%' : '40%' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Optimization State Feedback trackers */}
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> AI Optimization Status
              </h3>
              
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded border text-xs font-extrabold ${generatedCount > 0 ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-slate-800/40 border-slate-800 text-slate-500'}`}>
                  {generatedCount > 0 ? '✓ Optimized' : 'Pending'}
                </div>
                <div className="text-xs text-slate-400 leading-snug">
                  {generatedCount > 0 
                    ? `Active matching patterns deployed through ${generatedCount} revision iterations.` 
                    : 'Round allocations have not yet been evaluated by the structural algorithm.'}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}