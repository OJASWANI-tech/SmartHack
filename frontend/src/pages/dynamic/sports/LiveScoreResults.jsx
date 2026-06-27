import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Trophy, ArrowLeft, Volume2 } from 'lucide-react';

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function LiveScoreResults({ 
  match = { id: 'M-107', court: 'Court 1', teamA: 'Eagles', teamB: 'Comets', durationMinutes: 10 }, 
  onClose = () => window.history.back() 
}) {
  // Score & Stat States
  const [scoreA, setScoreA] = useState(42);
  const [scoreB, setScoreB] = useState(39);
  const [foulsA, setFoulsA] = useState(4);
  const [foulsB, setFoulsB] = useState(3);
  const [timeoutsA, setTimeoutsA] = useState(2);
  const [timeoutsB, setTimeoutsB] = useState(1);
  
  // Match Rules & Progression States
  const [period, setPeriod] = useState(2);
  const [possession, setPossession] = useState('A'); // 'A' or 'B'
  const [events, setEvents] = useState([
    { id: 1, time: '08:35', text: '🏀 +3 Eagles (Three-Pointer)', type: 'score' },
    { id: 2, time: '08:21', text: '⚠️ Foul Comets (Personal)', type: 'foul' }
  ]);
  
  // Clock States
  const [secondsLeft, setSecondsLeft] = useState((match?.durationMinutes || 40) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState('');
  const intervalRef = useRef(null);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  // Timer Countdown Monitor
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            setIsRunning(false);
            setMatchEnded(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // Event Feed Helper
  const logEvent = (text, type = 'info') => {
    const timestamp = formatClock(secondsLeft);
    setEvents((prev) => [{ id: Date.now(), time: timestamp, text, type }, ...prev]);
  };

  // Score Action Handlers
  const adjustScore = (team, amount) => {
    if (team === 'A') {
      setScoreA((prev) => {
        const next = Math.max(0, prev + amount);
        logEvent(`${amount > 0 ? '+' : ''}${amount} 🦅 ${match?.teamA || 'Eagles'}`, 'score');
        return next;
      });
    } else {
      setScoreB((prev) => {
        const next = Math.max(0, prev + amount);
        logEvent(`${amount > 0 ? '+' : ''}${amount} ☄️ ${match?.teamB || 'Comets'}`, 'score');
        return next;
      });
    }
  };

  const incrementFoul = (team) => {
    if (team === 'A') {
      setFoulsA((prev) => {
        logEvent(`⚠️ Foul on 🦅 ${match?.teamA || 'Eagles'}`, 'foul');
        return prev + 1;
      });
    } else {
      setFoulsB((prev) => {
        logEvent(`⚠️ Foul on ☄️ ${match?.teamB || 'Comets'}`, 'foul');
        return prev + 1;
      });
    }
  };

  const useTimeout = (team) => {
    if (team === 'A') {
      setTimeoutsA((prev) => {
        logEvent(`🛑 Timeout: 🦅 ${match?.teamA || 'Eagles'}`, 'timeout');
        return prev + 1;
      });
    } else {
      setTimeoutsB((prev) => {
        logEvent(`🛑 Timeout: ☄️ ${match?.teamB || 'Comets'}`, 'timeout');
        return prev + 1;
      });
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all live console configurations?")) {
      setIsRunning(false);
      setMatchEnded(false);
      setScoreA(0);
      setScoreB(0);
      setFoulsA(0);
      setFoulsB(0);
      setTimeoutsA(0);
      setTimeoutsB(0);
      setPeriod(1);
      setSecondsLeft((match?.durationMinutes || 40) * 60);
      setEvents([{ id: Date.now(), time: '40:00', text: '🔄 Board Reset By Match Official', type: 'info' }]);
    }
  };

  const handlePublishResults = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      triggerToast('🏆 Match results signed and synced back to tournament core.');
      setTimeout(onClose, 900);
    }, 1500);
  };

  // Compute live analytical derivatives
  const leadDifference = Math.abs(scoreA - scoreB);
  const currentLeader = scoreA > scoreB ? match?.teamA : scoreB > scoreA ? match?.teamB : 'Tie';
  const foulDiff = scoreA > scoreB ? foulsA - foulsB : foulsB - foulsA;

  return (
    <div className="min-h-screen bg-[#070A13] text-slate-100 flex flex-col font-sans select-none antialiased text-xs">
      
      {/* 2. MATCH STATUS BAR */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 px-5 py-2.5 sticky top-0 backdrop-blur z-40 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl border border-slate-800 transition">
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <div className="flex items-center gap-2 font-medium tracking-wide text-slate-400 text-[11px]">
            <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded animate-pulse border border-emerald-500/20 text-[10px]">LIVE</span>
            <span>🏀 Basketball</span>
            <span className="text-slate-700">•</span>
            <span>Tournament Semi-Finals</span>
            <span className="text-slate-700">•</span>
            <span className="text-cyan-400 font-mono bg-cyan-500/5 px-1.5 py-0.5 rounded border border-cyan-500/10">{match?.court}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            {[1, 2, 3, 4].map((q) => (
              <button 
                key={q} 
                onClick={() => { setPeriod(q); logEvent(`🏁 Moved to Quarter ${q}`, 'info'); }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${period === q ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Q{q}
              </button>
            ))}
          </div>
          <button onClick={handleReset} className="p-1.5 bg-slate-950 hover:bg-red-950/40 text-slate-500 hover:text-red-400 border border-slate-800 rounded-lg transition" title="Reset Dashboard">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* PRIMARY CONSOLE CORE GRID */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-4 p-4 gap-4 max-w-[1920px] w-full mx-auto">
        
        {/* SCOREBOARD & CONTROLS LEFT CARDS */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          
          {/* 1. HERO SCOREBOARD ELEMENT */}
          <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950/90 border border-slate-800/70 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
            
            <div className="grid grid-cols-3 items-center relative z-10">
              {/* Team A Info */}
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${possession === 'A' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-ping' : 'bg-transparent'}`} />
                  <h3 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                    <span>🦅</span> {match?.teamA}
                  </h3>
                </div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Home Team</div>
                <div className="text-4xl md:text-5xl font-bold tracking-tighter font-mono text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-500 leading-none drop-shadow-[0_4px_16px_rgba(34,211,238,0.15)]">
                  {scoreA}
                </div>
              </div>

              {/* 4. LARGE CENTER TIMEPANEL BLOCK */}
              <div className="text-center flex flex-col items-center justify-center border-x border-slate-800/60 px-2">
                <div className="text-[10px] font-mono tracking-widest uppercase text-slate-500 font-bold mb-2">Quarter {period} / 4</div>

                <div className={`text-2xl md:text-3xl font-bold font-mono tracking-tight px-4 py-2 rounded-xl border ${isRunning ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.15)]' : 'bg-amber-500/5 border-amber-500/20 text-amber-400'}`}>
                  {formatClock(secondsLeft)}
                </div>

                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`mt-4 flex items-center justify-center gap-1.5 rounded-lg px-5 py-2 text-xs font-black tracking-wide uppercase shadow-lg transition-all w-full max-w-[140px] ${
                    isRunning 
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  }`}
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  {isRunning ? 'Pause' : 'Start'}
                </button>
              </div>

              {/* Team B Info */}
              <div className="text-right flex flex-col items-end">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                    {match?.teamB} <span>☄️</span>
                  </h3>
                  <span className={`w-2 h-2 rounded-full ${possession === 'B' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-ping' : 'bg-transparent'}`} />
                </div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Away Team</div>
                <div className="text-4xl md:text-5xl font-bold tracking-tighter font-mono text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 to-emerald-500 leading-none drop-shadow-[0_4px_16px_rgba(52,211,153,0.15)]">
                  {scoreB}
                </div>
              </div>
            </div>

            {/* Sub-Score Board Summary Stats Row */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 mt-5 pt-4 text-xs font-mono tracking-wide text-slate-400">
              <div className="flex justify-around bg-slate-950/40 p-2 rounded-xl border border-slate-900 items-center">
                <div>💥 FOULS: <span className="text-amber-400 font-bold text-sm">{foulsA}</span></div>
                <div className="text-slate-800">|</div>
                <div>🛑 TIMEOUTS: <span className="text-cyan-400 font-bold text-sm">{timeoutsA}/3</span></div>
              </div>
              <div className="flex justify-around bg-slate-950/40 p-2 rounded-xl border border-slate-900 items-center">
                <div>🛑 TIMEOUTS: <span className="text-emerald-400 font-bold text-sm">{timeoutsB}/3</span></div>
                <div className="text-slate-800">|</div>
                <div>💥 FOULS: <span className="text-amber-400 font-bold text-sm">{foulsB}</span></div>
              </div>
            </div>
          </section>

          {/* 6. TEAM CONTROL PANEL CARDS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* TEAM A TACTICAL CARD */}
            <div className="bg-slate-900/60 border-2 border-cyan-500/20 rounded-xl p-4 shadow-lg relative">
              <div className="absolute top-3 right-4 text-[9px] font-bold font-mono text-cyan-400/40">TEAM A CONTROL</div>
              <h4 className="text-sm font-black text-white mb-3 flex items-center gap-1.5">
                <span>🦅</span> {match?.teamA} Panel
              </h4>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[1, 2, 3].map((pts) => (
                  <button
                    key={pts}
                    onClick={() => adjustScore('A', pts)}
                    className="h-12 text-sm font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg transition-all active:scale-95"
                  >
                    +{pts}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => incrementFoul('A')} className="h-10 font-bold text-xs uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg transition active:scale-95">
                  ＋ Foul
                </button>
                <button onClick={() => useTimeout('A')} disabled={timeoutsA >= 3} className="h-10 font-bold text-xs uppercase bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition disabled:opacity-30 active:scale-95">
                  Timeout
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPossession('A')} className={`h-9 font-bold text-[11px] uppercase rounded-lg border transition ${possession === 'A' ? 'bg-cyan-500 text-slate-950 font-black border-cyan-400' : 'bg-slate-950/40 text-slate-500 border-slate-900'}`}>
                  Possession
                </button>
                <button onClick={() => adjustScore('A', -1)} className="h-9 font-bold text-[11px] uppercase bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition active:scale-95">
                  Undo (-1)
                </button>
              </div>
            </div>

            {/* TEAM B TACTICAL CARD */}
            <div className="bg-slate-900/60 border-2 border-emerald-500/20 rounded-xl p-4 shadow-lg relative">
              <div className="absolute top-3 right-4 text-[9px] font-bold font-mono text-emerald-400/40">TEAM B CONTROL</div>
              <h4 className="text-sm font-black text-white mb-3 flex items-center gap-1.5">
                {match?.teamB} Panel <span>☄️</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[1, 2, 3].map((pts) => (
                  <button
                    key={pts}
                    onClick={() => adjustScore('B', pts)}
                    className="h-12 text-sm font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all active:scale-95"
                  >
                    +{pts}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={() => incrementFoul('B')} className="h-10 font-bold text-xs uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg transition active:scale-95">
                  ＋ Foul
                </button>
                <button onClick={() => useTimeout('B')} disabled={timeoutsB >= 3} className="h-10 font-bold text-xs uppercase bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition disabled:opacity-30 active:scale-95">
                  Timeout
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPossession('B')} className={`h-9 font-bold text-[11px] uppercase rounded-lg border transition ${possession === 'B' ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400' : 'bg-slate-950/40 text-slate-500 border-slate-900'}`}>
                  Possession
                </button>
                <button onClick={() => adjustScore('B', -1)} className="h-9 font-bold text-[11px] uppercase bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition active:scale-95">
                  Undo (-1)
                </button>
              </div>
            </div>

          </section>
        </div>

        {/* 5. RIGHT PANEL EVENT LOG FEED */}
        <div className="flex flex-col gap-4">
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 flex-1 flex flex-col min-h-[320px] xl:min-h-0">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> Live Event Feed
              </span>
              <span className="text-[9px] font-mono text-slate-600 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900">AUTO_LOG_ON</span>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[380px] xl:max-h-none space-y-1.5 pr-1 font-mono text-[11px] scrollbar-thin">
              {events.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 text-[11px] text-center p-3 italic">
                  No match timeline logs registered yet. Turn on timer clock console to initialize tracking.
                </div>
              ) : (
                events.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-2 p-1.5 rounded bg-slate-950/40 border border-slate-900/60 hover:border-slate-800/60 transition">
                    <span className="text-indigo-400 font-bold bg-indigo-500/5 px-1 rounded text-[10px] shrink-0">{evt.time}</span>
                    <span className={`text-[11px] ${evt.type === 'score' ? 'text-slate-200 font-medium' : evt.type === 'foul' ? 'text-amber-400/90' : evt.type === 'timeout' ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {evt.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 12. LIVE ANALYTICS ANALYTICAL SUB PANEL */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
            <div className="text-slate-500 uppercase font-bold tracking-wider mb-0.5 text-[10px]">Live Match Analytics</div>
            <div className="flex justify-between p-1.5 rounded bg-slate-950/30 border border-slate-900">
              <span className="text-slate-500">Active Leader:</span>
              <span className="text-white font-bold">{currentLeader} {leadDifference > 0 && `(+${leadDifference})`}</span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-slate-950/30 border border-slate-900">
              <span className="text-slate-500">Fouls Spread:</span>
              <span className={`font-bold ${foulDiff > 0 ? 'text-amber-400' : foulDiff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {foulDiff === 0 ? 'Even' : `${foulDiff > 0 ? '+' : ''}${foulDiff}`}
              </span>
            </div>
            <div className="flex justify-between p-1.5 rounded bg-slate-950/30 border border-slate-900">
              <span className="text-slate-500">Possession Unit:</span>
              <span className="text-indigo-400 font-black">{possession === 'A' ? match?.teamA : match?.teamB}</span>
            </div>
          </section>
        </div>
      </main>

      {/* 9. FIXED ACTION PUBLISH STRIP BOTTOM FOOTER */}
      <footer className="sticky bottom-0 bg-slate-900 border-t border-slate-800 p-3 flex justify-between items-center z-40 backdrop-blur">
        <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
          Umpire Console Token: <span className="text-slate-400">{match?.id}</span>
        </div>
        <button
          onClick={handlePublishResults}
          disabled={isPublishing}
          className="w-full sm:w-auto ml-auto flex items-center justify-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white text-xs font-black tracking-wide uppercase rounded-lg border border-indigo-500/30 shadow-md transition disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          {isPublishing ? "Syncing Platform Database..." : "Publish Match Result"}
        </button>
      </footer>

      {/* 8. MATCH COMPLETE FULL-SCREEN CONTEXT MODAL OVERLAY */}
      {matchEnded && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-2xl relative overflow-hidden">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-3 animate-bounce" />
            <h2 className="text-lg font-bold text-white tracking-tight mb-0.5">MATCH COMPLETE</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">{match?.court} · Final Standings</p>
            
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 mb-4 grid grid-cols-3 items-center">
              <div>
                <div className="text-sm font-bold text-white truncate">🦅 {match?.teamA}</div>
                <div className="text-lg font-bold font-mono text-cyan-400 mt-1">{scoreA}</div>
              </div>
              <div className="text-[10px] font-mono font-black text-slate-600">FINAL</div>
              <div>
                <div className="text-sm font-bold text-white truncate">☄️ {match?.teamB}</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">{scoreB}</div>
              </div>
            </div>
            
            <div className="text-xs text-slate-300 font-medium mb-5">
              Winner declared:&nbsp;
              <span className="text-amber-400 font-black underline decoration-2 decoration-amber-400/30 underline-offset-4">
                {scoreA > scoreB ? `🦅 ${match?.teamA}` : scoreB > scoreA ? `☄️ ${match?.teamB}` : "Draw Match"}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handlePublishResults}
                disabled={isPublishing}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-lg transition"
              >
                {isPublishing ? "Syncing API Core..." : "Sign & Publish Final Result"}
              </button>
              <button
                onClick={() => setMatchEnded(false)}
                className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 text-[11px] font-semibold rounded-lg border border-slate-800/60 transition"
              >
                Return to Editor Grid (Adjustment Mode)
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[210] rounded-lg border border-emerald-500/30 bg-slate-900/95 backdrop-blur-lg px-4 py-2.5 text-xs font-semibold text-emerald-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          {toast}
        </div>
      )}

    </div>
  );
}