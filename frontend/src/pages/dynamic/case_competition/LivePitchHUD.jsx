import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ArrowRightLeft, Mic2 } from 'lucide-react';

const GLASS = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]';

const PITCH_SECONDS = 5 * 60;
const QA_SECONDS = 3 * 60;

function formatTime(totalSeconds) {
  const m = Math.floor(Math.max(totalSeconds, 0) / 60);
  const s = Math.max(totalSeconds, 0) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LivePitchHUD() {
  const [context, setContext] = useState(null);
  const [activeTimer, setActiveTimer] = useState('pitch');
  const [pitchTime, setPitchTime] = useState(PITCH_SECONDS);
  const [qaTime, setQaTime] = useState(QA_SECONDS);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('live_pitch_hud_context');
    if (stored) {
      try { setContext(JSON.parse(stored)); } catch { /* ignore malformed context */ }
    }
  }, []);

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      if (activeTimer === 'pitch') {
        setPitchTime((t) => Math.max(t - 1, 0));
      } else {
        setQaTime((t) => Math.max(t - 1, 0));
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, activeTimer]);

  const toggleRunning = () => setRunning((r) => !r);

  const resetTimers = () => {
    setRunning(false);
    setPitchTime(PITCH_SECONDS);
    setQaTime(QA_SECONDS);
    setActiveTimer('pitch');
  };

  const switchTimer = () => {
    setActiveTimer((t) => (t === 'pitch' ? 'qa' : 'pitch'));
  };

  return (
    <div className="min-h-screen bg-[#060B16] text-slate-200 flex flex-col items-center justify-center p-8 gap-10">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 font-semibold">Live Pitch HUD</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
          {context?.team || 'Awaiting Team Assignment'}
        </h1>
        {context && (
          <p className="text-sm text-slate-400 mt-1">{context.room} · Judge: {context.judge}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className={`${GLASS} rounded-3xl p-10 text-center transition-all duration-300 ${activeTimer === 'pitch' ? 'border-indigo-500/50 shadow-[0_0_60px_-10px_rgba(99,102,241,0.4)]' : ''}`}>
          <p className="text-xs uppercase tracking-wider text-indigo-300 font-bold mb-4">Pitch Deck Timer</p>
          <div className="text-7xl font-black text-white font-mono tabular-nums">{formatTime(pitchTime)}</div>
        </div>
        <div className={`${GLASS} rounded-3xl p-10 text-center transition-all duration-300 ${activeTimer === 'qa' ? 'border-violet-500/50 shadow-[0_0_60px_-10px_rgba(139,92,246,0.4)]' : ''}`}>
          <p className="text-xs uppercase tracking-wider text-violet-300 font-bold mb-4">Q&amp;A Timer</p>
          <div className="text-7xl font-black text-white font-mono tabular-nums">{formatTime(qaTime)}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleRunning}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-sm transition-all duration-300"
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={switchTimer}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold text-sm transition-all duration-300"
        >
          <ArrowRightLeft className="w-4 h-4" /> Switch to {activeTimer === 'pitch' ? 'Q&A' : 'Pitch Deck'}
        </button>
        <button
          onClick={resetTimers}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 font-bold text-sm transition-all duration-300"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Mic2 className="w-3.5 h-3.5" /> Master controls — visible to the timing official only.
      </div>
    </div>
  );
}
