import React, { useState, useEffect } from 'react';
import { 
  Clock, Play, Pause, AlertOctagon, Plus, Calendar, Megaphone, 
  Settings, CheckCircle2, ChevronRight, Loader2, AlertCircle,
  Terminal, Activity
} from 'lucide-react';

const GLASS_CARD = 'bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-lg';
const BUTTON_SECONDARY = 'bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-350 font-bold py-2 px-3 rounded-lg text-xs cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5';

export default function CodingSchedule() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0); 
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [contestInfo, setContestInfo] = useState({
    startTime: '---',
    duration: '---'
  });
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        if (currentEventId) {
          const res = await fetch(`${baseURL}/api/v1/events/${currentEventId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.name) setEventName(data.name);
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
                setTotalDuration(durationSec);
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
        console.error("Failed to fetch event data inside schedule:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, []);

  useEffect(() => {
    if (isPaused || loading) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, loading]);

  // Telemetry stream processor hook skeleton
  useEffect(() => {
    // Pipeline stream event handler can be wired here to push logs via WebSocket/SSE
    // logTemplates are kept clear for live data integration
    const logTemplates = [];

    if (logTemplates.length === 0) return;

    const interval = setInterval(() => {
      const randomTemplate = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      setLogs((prev) => {
        const next = [...prev, { time: timeStr, msg: randomTemplate.msg, type: randomTemplate.type }];
        if (next.length > 5) {
          next.shift();
        }
        return next;
      });
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds) => {
    if (totalSeconds <= 0) return '00:00:00';
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleAddTime = (mins) => {
    setSecondsLeft(prev => prev + mins * 60);
    setTotalDuration(prev => prev + mins * 60);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-500" /> Connecting to live telemetry clock…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      
      {/* --- DASHBOARD HEADER --- */}
      <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-800 flex-wrap gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-500 font-extrabold">// Live Time Telemetry</span>
          <h1 className="text-2xl font-extrabold text-white mt-1">Contest Schedule</h1>
          <p className="text-xs text-slate-450 mt-1">Monitor, adjust, and view scheduled segments for {eventName || 'Active Event'}.</p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-1.5 rounded-lg text-xs text-emerald-450 font-bold">
          <span className={`h-2 w-2 rounded-full ${secondsLeft > 0 && !isPaused ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
          {secondsLeft > 0 && !isPaused ? 'Contest Running' : isPaused ? 'Contest Paused' : 'Contest Inactive'}
        </div>
      </div>

      {/* --- TWO-COLUMN TRANSPARENT GRID WORKSPACE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COMPONENT STACK */}
        <div className="flex flex-col gap-6">
          
          {/* PHASE PANEL */}
          <div className={GLASS_CARD}>
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-4">// Current Execution Phase</span>
            <h2 className="text-base font-extrabold text-white mb-5 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Live Sandbox Round
            </h2>
            
            {/* FUTURISTIC SEGMENTED TIMER */}
            <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl mb-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-indigo-500/60"></div>
              <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-indigo-500/60"></div>
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-indigo-500/60"></div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-indigo-500/60"></div>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-mono tracking-widest text-indigo-400 font-bold uppercase flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full bg-indigo-500 ${!isPaused && secondsLeft > 0 ? 'animate-ping' : ''}`}></span>
                  Telemetry Sync {secondsLeft > 0 && !isPaused ? 'Active' : 'Idle'}
                </span>
                <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">
                  LATENCY: --
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 py-3 bg-[#080d1a]/60 border border-slate-900 rounded-lg shadow-inner">
                {/* Hours Box */}
                <div className="flex flex-col items-center">
                  <div className="bg-slate-950/90 border border-indigo-500/20 text-indigo-400 font-mono text-4xl font-extrabold px-3.5 py-2 rounded-lg shadow-[0_0_12px_rgba(99,102,241,0.1)] relative w-[72px] text-center">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-indigo-500 to-cyan-400"></div>
                    {Math.floor(secondsLeft / 3600).toString().padStart(2, '0')}
                  </div>
                  <span className="text-[8px] text-slate-500 font-mono font-bold tracking-widest mt-1.5">HOURS</span>
                </div>

                <div className="text-2xl font-extrabold text-indigo-500/80 animate-pulse pb-4">:</div>

                {/* Minutes Box */}
                <div className="flex flex-col items-center">
                  <div className="bg-slate-950/90 border border-indigo-500/20 text-indigo-400 font-mono text-4xl font-extrabold px-3.5 py-2 rounded-lg shadow-[0_0_12px_rgba(99,102,241,0.1)] relative w-[72px] text-center">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-indigo-500 to-cyan-400"></div>
                    {Math.floor((secondsLeft % 3600) / 60).toString().padStart(2, '0')}
                  </div>
                  <span className="text-[8px] text-slate-500 font-mono font-bold tracking-widest mt-1.5">MINUTES</span>
                </div>

                <div className="text-2xl font-extrabold text-indigo-500/80 animate-pulse pb-4">:</div>

                {/* Seconds Box */}
                <div className="flex flex-col items-center">
                  <div className="bg-slate-950/90 border border-cyan-500/20 text-cyan-400 font-mono text-4xl font-extrabold px-3.5 py-2 rounded-lg shadow-[0_0_12px_rgba(34,211,238,0.1)] relative w-[72px] text-center">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-400 to-indigo-500"></div>
                    {(secondsLeft % 60).toString().padStart(2, '0')}
                  </div>
                  <span className="text-[8px] text-slate-500 font-mono font-bold tracking-widest mt-1.5">SECONDS</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 font-bold mb-1.5">
                  <span>ROUND TIMELINE PROGRESS</span>
                  <span className="text-cyan-400">
                    {totalDuration > 0 ? Math.round((secondsLeft / totalDuration) * 100) : 0}% REMAINING
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-900/80 p-0.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-indigo-650 to-cyan-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(34,211,238,0.3)]" 
                    style={{ width: `${totalDuration > 0 ? (secondsLeft / totalDuration) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={() => handleAddTime(5)} className={BUTTON_SECONDARY}>
                <Plus className="w-3.5 h-3.5" /> +5 Min
              </button>
              <button onClick={() => handleAddTime(15)} className={BUTTON_SECONDARY}>
                <Plus className="w-3.5 h-3.5" /> +15 Min
              </button>
              <button onClick={togglePause} className={BUTTON_SECONDARY}>
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-450" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button onClick={() => setSecondsLeft(0)} className="bg-transparent border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-rose-300 font-bold py-2 px-3 rounded-lg text-xs cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" /> End Round
              </button>
            </div>
          </div>

          {/* QUICK INTERVENTIONS */}
          <div className={GLASS_CARD}>
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-4">// Quick Interventions</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-750 text-slate-300 font-semibold p-4 rounded-xl cursor-pointer text-left transition-all duration-200 flex items-center gap-3" onClick={() => handleAddTime(30)}>
                <Calendar className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Extend Contest</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Extend sandbox duration by 30 mins</div>
                </div>
              </button>
              
              <button className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-750 text-slate-300 font-semibold p-4 rounded-xl cursor-pointer text-left transition-all duration-200 flex items-center gap-3" onClick={() => alert('Leaderboard freeze delayed.')}>
                <Settings className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Delay Freeze</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Defer the final scoreboard lock</div>
                </div>
              </button>

              <button className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-750 text-slate-300 font-semibold p-4 rounded-xl cursor-pointer text-left transition-all duration-200 flex items-center gap-3" onClick={() => alert('Edit timeline dialog.')}>
                <Calendar className="w-5 h-5 text-amber-450 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Edit Schedule</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Adjust segment start/end limits</div>
                </div>
              </button>

              <button className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-750 text-slate-300 font-semibold p-4 rounded-xl cursor-pointer text-left transition-all duration-200 flex items-center gap-3" onClick={() => alert('Announcement broadcasted.')}>
                <Megaphone className="w-5 h-5 text-emerald-450 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Broadcast Alert</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Push a notification to contestants</div>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COMPONENT STACK */}
        <div className="flex flex-col gap-6">
          
          {/* SCHEDULE LIVE RUNTIMELINE */}
          <div className={GLASS_CARD}>
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-5">// Schedule Timeline (Starts: {contestInfo.startTime} | Duration: {contestInfo.duration})</span>

            <div className="relative border-l border-slate-800 ml-3.5 pl-6 flex flex-col gap-5">
              
              <div className="relative flex items-center justify-between text-xs">
                <span className="absolute -left-[30px] w-4.5 h-4.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700"></span>
                </span>
                <span className="text-slate-500 font-bold">Registration Segment</span>
                <span className="text-slate-600 font-mono">--:-- --</span>
              </div>

              <div className="relative flex items-center justify-between text-xs">
                <span className="absolute -left-[30px] w-4.5 h-4.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700"></span>
                </span>
                <span className="text-slate-500 font-bold">Contest Start</span>
                <span className="text-slate-600 font-mono">--:-- --</span>
              </div>

              <div className="relative flex items-center justify-between text-xs py-1">
                <span className={`absolute -left-[32px] w-5.5 h-5.5 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center ${secondsLeft > 0 && !isPaused ? 'animate-pulse' : ''}`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-white font-extrabold">Contest Running</span>
                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                  <span className={`h-1 w-1 rounded-full ${secondsLeft > 0 && !isPaused ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                  {secondsLeft > 0 && !isPaused ? 'LIVE' : 'IDLE'}
                </div>
              </div>

              <div className="relative flex items-center justify-between text-xs">
                <span className="absolute -left-[29.5px] w-4 h-4 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-800"></span>
                </span>
                <span className="text-slate-400 font-semibold">Leaderboard Freeze</span>
                <span className="text-slate-500 font-mono">--:-- --</span>
              </div>

              <div className="relative flex items-center justify-between text-xs">
                <span className="absolute -left-[29.5px] w-4 h-4 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-800"></span>
                </span>
                <span className="text-slate-400 font-semibold">Contest End</span>
                <span className="text-slate-500 font-mono">--:-- --</span>
              </div>

              <div className="relative flex items-center justify-between text-xs">
                <span className="absolute -left-[29.5px] w-4 h-4 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-800"></span>
                </span>
                <span className="text-slate-400 font-semibold">Rejudge Phase</span>
                <span className="text-slate-500 font-mono">--:-- --</span>
              </div>

              <div className="relative flex items-center justify-between text-xs">
                <span className="absolute -left-[29.5px] w-4 h-4 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-800"></span>
                </span>
                <span className="text-slate-400 font-semibold">Results Publish</span>
                <span className="text-slate-500 font-mono">--:-- --</span>
              </div>
            </div>
          </div>

          {/* TELEMETRY ACTIVITY LOG */}
          <div className={GLASS_CARD}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block">// Sandbox Telemetry Activity</span>
              <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                <span className={`h-1.5 w-1.5 rounded-full bg-indigo-500 ${logs.length > 0 ? 'animate-pulse' : ''}`}></span>
                {logs.length > 0 ? 'STREAMING' : 'LISTENING'}
              </div>
            </div>

            <div className="bg-[#050811] border border-slate-900 rounded-lg p-3.5 font-mono text-[10.5px] leading-relaxed text-slate-400 shadow-inner flex flex-col gap-2 h-[180px] overflow-y-auto justify-center items-center">
              {logs.length === 0 ? (
                <span className="text-slate-600 text-xs">// No pipeline telemetry logs received yet...</span>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="w-full flex gap-2.5 items-start animate-[fadeIn_0.3s_ease-out]">
                    <span className="text-slate-600 font-bold shrink-0">[{log.time}]</span>
                    <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded shrink-0 border ${
                      log.type === 'ac' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-550/20' :
                      log.type === 'wa' ? 'bg-rose-500/10 text-rose-450 border-rose-550/20' :
                      log.type === 'sub' ? 'bg-sky-500/10 text-sky-400 border-sky-550/20' :
                      'bg-slate-800/40 text-slate-400 border-slate-800'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-slate-350 break-words">{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}