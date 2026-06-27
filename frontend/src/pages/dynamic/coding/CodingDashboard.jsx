import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Terminal, Users, CheckCircle2, AlertTriangle, 
  Play, Radio, ShieldAlert, Award, FileCode, Zap,
  Clock, Cpu, RefreshCw, Loader2, PlayCircle, MessageSquare, Layers
} from 'lucide-react';

const GLASS_CARD = 'bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-lg';

export default function CodingDashboard() {
  const [eventName, setEventName] = useState('Coding Championship');
  const [loading, setLoading] = useState(true);
  const [phaseIndex, setPhaseIndex] = useState(2); // Defaults to 'Live Sandbox Round'
  const [toastMessage, setToastMessage] = useState('');
  const [isContestLive, setIsContestLive] = useState(true);
  const [freezeStatus, setFreezeStatus] = useState('OPEN'); 
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [contestInfo, setContestInfo] = useState({
    startTime: '',
    duration: ''
  });
  const [selectedDivision, setSelectedDivision] = useState('All');

  const phases = [
    { step: 1, name: "Intake & Provisioning", status: "Complete" },
    { step: 2, name: "System Environment Check", status: "Complete" },
    { step: 3, name: "Live Sandbox Round", status: "Active" },
    { step: 4, name: "Main Contest Engine", status: "Upcoming" },
    { step: 5, name: "Anti-Plagiarism Check", status: "Upcoming" },
    { step: 6, name: "Final Leaderboard Freeze", status: "Upcoming" }
  ];

  // Cleared Telemetry State Frameworks
  const [submissionStats, setSubmissionStats] = useState({
    accepted: 0,
    wa: 0,
    tle: 0,
    mle: 0
  });

  const [plagiarismQueue, setPlagiarismQueue] = useState([]);
  const [problemAnalytics, setProblemAnalytics] = useState([]);
  const [liveScores, setLiveScores] = useState([]);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      if (currentEventId) {
        const res = await fetch(`${baseURL}/api/v1/events/${currentEventId}`);
        if (res.ok) {
          const data = await res.json();
          setEventName(data.name || 'Coding Championship');
          
          // Hydrate real metrics here if available in your payload structure
          if (data.submission_stats) setSubmissionStats(data.submission_stats);
          if (data.plagiarism_queue) setPlagiarismQueue(data.plagiarism_queue);
          if (data.problem_analytics) setProblemAnalytics(data.problem_analytics);
          if (data.live_scores) setLiveScores(data.live_scores);

          const dbConfig = data.stage_config?.stages?.find(s => s.stage_id === 'case-config')?.config || {};
          if (dbConfig.globalSettings) {
            const settings = dbConfig.globalSettings;
            setContestInfo({
              startTime: settings.startTime,
              duration: `${settings.durationDays > 0 ? `${settings.durationDays}d ` : ''}${settings.durationHours}h ${settings.durationMinutes}m`
            });
            const start = new Date(settings.startTime.replace(' ', 'T'));
            if (!isNaN(start.getTime())) {
              const durationSec = (Number(settings.durationDays || 0) * 86400) + 
                                  (Number(settings.durationHours || 0) * 3600) + 
                                  (Number(settings.durationMinutes || 0) * 60);
              const end = new Date(start.getTime() + durationSec * 1000);
              const now = new Date();
              if (now < start) {
                setSecondsLeft(Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)));
              } else if (now > end) {
                setSecondsLeft(0);
              } else {
                setSecondsLeft(Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)));
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleAdvancePhase = () => {
    const nextIndex = (phaseIndex + 1) % phases.length;
    setPhaseIndex(nextIndex);
    triggerToast(`✓ Stage advanced to: ${phases[nextIndex].name}`);
  };

  const changeFreezeStatus = (newStatus) => {
    setFreezeStatus(newStatus);
    triggerToast(`✓ Leaderboard rankings set to: ${newStatus}`);
  };

  const handlePlagiarismAction = (id, action, teamA, teamB) => {
    setPlagiarismQueue(prev => prev.filter(item => item.id !== id));
    triggerToast(`✓ Plagiarism flag for ${teamA} ↔ ${teamB} resolved via: ${action}`);
  };

  const totalSubmissionsCount = useMemo(() => {
    return submissionStats.accepted + submissionStats.wa + submissionStats.tle + submissionStats.mle;
  }, [submissionStats]);

  const topCompetitor = useMemo(() => {
    return liveScores.length > 0 ? liveScores[0].user : '—';
  }, [liveScores]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing tournament telemetry…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      {/* Toast Portal */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Unified Upper Control Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Live Control Center</p>
          <h1 className="text-2xl font-extrabold text-white mt-1">{eventName} Dashboard</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Contest Status Toggle */}
          <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-lg text-xs">
            <span className={`h-2.5 w-2.5 rounded-full ${isContestLive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-slate-400 font-semibold">Contest Running</span>
            <input 
              type="checkbox" 
              checked={isContestLive} 
              onChange={() => setIsContestLive(!isContestLive)}
              className="ml-1 cursor-pointer accent-indigo-500 w-3.5 h-3.5 rounded"
            />
          </div>

          {/* Phase Advance */}
          <button 
            onClick={handleAdvancePhase}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-md shadow-indigo-950/20"
          >
            <PlayCircle className="w-4 h-4" /> Advance ({phases[phaseIndex].name})
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className={`${GLASS_CARD} p-6 mb-8`}>
        <h2 className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-5">// Contest Execution Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
          {phases.map((item, idx) => {
            const isCurrent = idx === phaseIndex;
            const isDone = idx < phaseIndex;
            return (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold border-2 transition-all
                  ${isDone ? 'bg-indigo-950/20 border-indigo-500 text-indigo-400' : 
                    isCurrent ? 'bg-indigo-600 border-indigo-400 text-white ring-4 ring-indigo-500/10' : 
                    'bg-[#0B0F19] border-slate-800 text-slate-600'}`}>
                  {item.step}
                </div>
                <span className="text-[11px] font-semibold text-slate-300 mt-2 line-clamp-1">{item.name}</span>
                <span className={`text-[9px] uppercase font-bold tracking-wider mt-0.5 ${isCurrent ? 'text-indigo-400' : isDone ? 'text-slate-500' : 'text-slate-600'}`}>
                  {isCurrent ? 'Active' : isDone ? 'Complete' : 'Upcoming'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Stats, Problems, and Standings */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className={`${GLASS_CARD} p-4 flex flex-col justify-between`}>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Submissions</span>
              <p className="text-lg lg:text-xl font-bold mt-1 text-white font-mono">{totalSubmissionsCount.toLocaleString()}</p>
            </div>
            <div className={`${GLASS_CARD} p-4 flex flex-col justify-between min-w-0`}>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Active Leader</span>
              <p className="text-sm lg:text-base font-bold mt-1 text-indigo-400 font-mono truncate" title={topCompetitor}>{topCompetitor}</p>
            </div>
            <div className={`${GLASS_CARD} p-4 flex flex-col justify-between border-l-2 border-l-indigo-500`}>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Contest Timer
              </span>
              <p className="text-lg lg:text-xl font-bold mt-1 text-emerald-400 font-mono animate-pulse">{formatCountdown(secondsLeft)}</p>
            </div>
            <div className={`${GLASS_CARD} p-4 flex flex-col justify-between`}>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Queue Latency</span>
              <p className="text-lg lg:text-xl font-bold mt-1 text-slate-350 font-mono">0 ms</p>
            </div>
            <div className={`${GLASS_CARD} p-4 flex flex-col justify-between`}>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-450">Board Status</span>
              <p className="text-lg lg:text-xl font-bold mt-1 text-amber-400 font-mono">{freezeStatus}</p>
            </div>
          </div>

          {/* Problem Analytics */}
          <div className={`${GLASS_CARD}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold tracking-wider uppercase text-white">Problem Analytics Breakdown</h3>
              <span className="text-[10.5px] text-slate-500 font-medium">Auto-synced</span>
            </div>
            <div className="space-y-3">
              {problemAnalytics.map((prob, idx) => (
                <div key={idx} className="bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-xl flex items-center justify-between transition-colors hover:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold px-2 py-0.5 rounded text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      {prob.code}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{prob.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span className="text-slate-500">{prob.solved} / {prob.total} solved</span>
                        <span className="text-slate-700">•</span>
                        <span className="text-indigo-400 font-mono font-semibold">{(prob.divisions || []).join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-32 flex flex-col items-end">
                    <span className="text-xs font-mono font-bold text-slate-300">{prob.pct}%</span>
                    <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${prob.pct}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
              {problemAnalytics.length === 0 && (
                <p className="text-xs italic text-slate-600 text-center py-4">No active problem telemetry data connected.</p>
              )}
            </div>
          </div>

          {/* Competitive Standings Table */}
          <div className={`${GLASS_CARD}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-white">Live Competitive Standings</h3>
              
              <div className="flex gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-850">
                {['All', 'Div. 1', 'Div. 2', 'Div. 3'].map(div => {
                  const isActive = selectedDivision === div;
                  return (
                    <button
                      key={div}
                      onClick={() => setSelectedDivision(div)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-indigo-650 text-white shadow' 
                          : 'text-slate-400 hover:text-slate-200 bg-transparent'
                      }`}
                    >
                      {div}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0f172a] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <th className="p-3 w-16">Rank</th>
                    <th className="p-3">Competitor</th>
                    <th className="p-3 text-center">Solved Score</th>
                    <th className="p-3 text-center">Penalty Time</th>
                    <th className="p-3 text-right">Last Solved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {liveScores
                    .filter(row => selectedDivision === 'All' || row.division === selectedDivision)
                    .map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/10">
                        <td className="p-3 font-mono font-bold text-slate-500">#{idx + 1}</td>
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span>{row.user}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            row.division === 'Div. 1' ? 'bg-rose-500/15 text-rose-450 border border-rose-500/10' :
                            row.division === 'Div. 2' ? 'bg-amber-500/15 text-amber-450 border border-amber-500/10' :
                            'bg-sky-500/15 text-sky-400 border border-sky-500/10'
                          }`}>
                            {row.division}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-400">{row.score}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{row.penalty}</td>
                        <td className="p-3 text-right text-slate-500 text-[11px] font-medium">{row.last}</td>
                      </tr>
                    ))}
                  {liveScores.filter(row => selectedDivision === 'All' || row.division === selectedDivision).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-600 italic">
                        No scoreboard records processed for this division.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Verdicts, Quick Actions, and Audit Queue */}
        <div className="lg:col-span-4 space-y-6">
          {/* Execution Verdict System */}
          <div className={`${GLASS_CARD}`}>
            <h3 className="text-xs font-bold tracking-wider uppercase text-white mb-4">Execution Verdict System</h3>
            <div className="space-y-2.5">
              {[
                { label: "Accepted (AC)", color: "bg-emerald-500", val: submissionStats.accepted },
                { label: "Wrong Answer (WA)", color: "bg-rose-500", val: submissionStats.wa },
                { label: "Time Limit Exceeded (TLE)", color: "bg-amber-500", val: submissionStats.tle },
                { label: "Memory Limit Exceeded (MLE)", color: "bg-purple-500", val: submissionStats.mle }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-950/40 border border-slate-800/40">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                    <span className="text-xs font-medium text-slate-400">{item.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">{item.val}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Arbitration Interface</span>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => changeFreezeStatus('FROZEN')} className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 text-rose-400 text-xs font-bold py-2 rounded-lg transition-colors">Freeze</button>
                <button onClick={() => changeFreezeStatus('OPEN')} className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-900/40 text-emerald-400 text-xs font-bold py-2 rounded-lg transition-colors">Unfreeze</button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`${GLASS_CARD} space-y-2`}>
            <h3 className="text-xs font-bold tracking-wider uppercase text-white mb-3">Quick Actions</h3>
            <button onClick={() => triggerToast('✓ Zip file integration layer opened.')} className="w-full text-left border border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors text-slate-300 font-semibold">
              <FileCode className="w-4 h-4 text-indigo-400" /> Upload Test Cases (.zip)
            </button>
            <button onClick={() => triggerToast('✓ System clarification pushed to all clients.')} className="w-full text-left border border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors text-slate-300 font-semibold">
              <Radio className="w-4 h-4 text-emerald-400" /> Broadcast System Clarification
            </button>
            <button onClick={() => triggerToast('✓ MOSS Plagiarism verification executing...')} className="w-full text-left border border-slate-800 bg-slate-950/40 hover:bg-slate-900/60 px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors text-slate-300 font-semibold">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Execute MOSS Verification
            </button>
          </div>

          {/* Pending Action Queue */}
          <div className={`${GLASS_CARD}`}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800/60">
              <h3 className="text-xs font-bold tracking-wider uppercase text-white">Pending Action Queue</h3>
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                {plagiarismQueue.length} Flagged
              </span>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {plagiarismQueue.map(item => (
                <div key={item.id} className="bg-slate-950/40 border border-slate-800/40 p-3 rounded-xl flex flex-col gap-2">
                  <div className="text-xs">
                    <span className="font-bold text-rose-400 block">⚠ Plag: {item.teamA} ↔ {item.teamB}</span>
                    <strong className="text-slate-500 font-mono text-[11px]">({item.percentage}% AST match)</strong>
                  </div>
                  <div className="flex gap-1 justify-between mt-1">
                    <button onClick={() => handlePlagiarismAction(item.id, 'Review Logs', item.teamA, item.teamB)} className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-semibold px-2 py-1 rounded hover:bg-slate-800">Review</button>
                    <button onClick={() => handlePlagiarismAction(item.id, 'Dismissed', item.teamA, item.teamB)} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2 py-1 rounded hover:bg-emerald-500/20">Dismiss</button>
                    <button onClick={() => handlePlagiarismAction(item.id, 'Disqualified', item.teamA, item.teamB)} className="bg-rose-500/10 text-rose-450 border border-rose-500/20 text-[10px] font-semibold px-2 py-1 rounded hover:bg-rose-500/20">Decline</button>
                  </div>
                </div>
              ))}

              {plagiarismQueue.length === 0 && (
                <p className="text-xs italic text-slate-600 text-center py-2">✓ Plagiarism queue cleared.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}