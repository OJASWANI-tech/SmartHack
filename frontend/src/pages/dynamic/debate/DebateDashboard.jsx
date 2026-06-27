import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Play, Pause, RotateCcw, Award, Users, 
  MapPin, Clock, Send, Volume2, ShieldAlert 
} from 'lucide-react';

export default function DebateDashboard() {
  const location = useLocation();
  const [isDarkMode] = useState(true);
  const [eventName, setEventName] = useState('Syncing Event Data...');
  const [toastMessage, setToastMessage] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [ballotsLocked, setBallotsLocked] = useState(false);
  
  // Timer state (15 minutes prep time = 900 seconds)
  const [timeLeft, setTimeLeft] = useState(900);
  const [timerRunning, setTimerRunning] = useState(false);

  // Motion states
  const [releasedMotion, setReleasedMotion] = useState('');
  const [motionInput, setMotionInput] = useState('');
  const [isMotionReleased, setIsMotionReleased] = useState(false);

  // Live Telemetry Logs
  const [logs, setLogs] = useState([]);

  // Live structural data metrics state
  const [metrics, setMetrics] = useState({
    divisions: '',
    rooms: 0,
    teams: 0,
    configuredRounds: 0,
    divisionStatusList: []
  });

  // Load Event Details & Initialize Data Stream
  useEffect(() => {
    const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    if (activeEventId) {
      fetch(`${baseURL}/api/v1/events/${activeEventId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch event configuration');
        })
        .then(data => {
          setEventName(data.name || 'Debate Tournament');
          setCurrentRound(data.current_round || 1);
          
          // Map dynamic tournament metadata if provided by backend, otherwise fall back to safe zero structures
          setMetrics({
            divisions: data.divisions_summary || '0 Active',
            rooms: data.total_rooms || 0,
            teams: data.total_teams || 0,
            configuredRounds: data.total_rounds || 0,
            divisionStatusList: data.divisions || []
          });

          pushLog(`SYSTEM: Connected to tournament pipeline for ${data.name || 'Debate Tournament'}.`);
        })
        .catch(err => {
          console.error(err);
          setEventName('Debate Championship Workspace');
          pushLog('WARNING: Real-time event data stream offline. Running in offline sandbox fallback mode.');
        });
    } else {
      setEventName('Unconfigured Debate Session');
      pushLog('SYSTEM: Ready for configuration. No active event ID detected in local workspace storage.');
    }
  }, [location.pathname]);

  // Prep Timer Countdown Logic
  useEffect(() => {
    let interval = null;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false);
      pushLog("TIMER: Prep time has expired! Debate rounds must commence immediately.");
      triggerToast("⏳ Prep time has expired!");
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const pushLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 20)]);
  };

  // Timer formatting
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Action Controllers
  const handleReleaseMotion = () => {
    if (!motionInput.trim()) return;
    setReleasedMotion(motionInput);
    setIsMotionReleased(true);
    setTimeLeft(900); // Reset timer to 15 mins
    setTimerRunning(true);
    pushLog(`COMM: Broadcaster dispatched new motion: "${motionInput}"`);
    triggerToast("📢 Motion released and Prep Timer started!");
    setMotionInput('');
  };

  const handleAdvanceRound = () => {
    const next = currentRound + 1;
    setCurrentRound(next);
    setTimeLeft(900);
    setTimerRunning(false);
    setIsMotionReleased(false);
    setReleasedMotion('');
    pushLog(`SYSTEM: Workspace sequence advanced to Round ${next}. Pairings validation pending.`);
    triggerToast(`Round advanced to Round ${next}`);
  };

  const handleToggleBallotLock = () => {
    const nextState = !ballotsLocked;
    setBallotsLocked(nextState);
    pushLog(`SECURITY: Ballot submission write access has been ${nextState ? 'LOCKED' : 'UNLOCKED'}`);
    triggerToast(`Ballots: ${nextState ? 'Locked' : 'Open'}`);
  };

  return (
    <div className={`min-h-screen p-6 font-sans antialiased transition-colors duration-200 
      ${isDarkMode ? 'bg-[#060b19] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl shadow-black/40 border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Header Panel */}
      <div className={`flex flex-col lg:flex-row justify-between items-center gap-4 mb-6 px-5 py-4 rounded-xl border shadow-sm ${isDarkMode ? 'bg-[#0b1120] border-slate-800/60' : 'bg-white border-slate-200'}`}>
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-500/20 text-purple-400 border border-purple-500/35">
              Round {currentRound} Live
            </span>
            <span className="text-xs text-slate-400">| Live Control Center</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">{eventName}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggleBallotLock}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 border 
              ${ballotsLocked 
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/35' 
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/35'}`}
          >
            {ballotsLocked ? '🔒 Lock Ballots (Active)' : '🔓 Unlock Ballots'}
          </button>
          <button
            onClick={handleAdvanceRound}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-200 shadow-md shadow-indigo-600/20"
          >
            Advance Round 🚀
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[
          { label: 'Active Divisions', value: metrics.divisions || '0 Active', icon: <Users className="text-purple-400 w-5 h-5" /> },
          { label: 'Total Rooms In Play', value: `${metrics.rooms} Rooms`, icon: <MapPin className="text-indigo-400 w-5 h-5" /> },
          { label: 'Total Registered Teams', value: `${metrics.teams} Teams`, icon: <Award className="text-amber-400 w-5 h-5" /> },
          { label: 'Rounds Configured', value: `${metrics.configuredRounds} Rounds`, icon: <Clock className="text-rose-400 w-5 h-5" /> }
        ].map((stat, idx) => (
          <div key={idx} className={`p-5 rounded-xl border ${isDarkMode ? 'bg-[#0f172a]/70 border-slate-800/40' : 'bg-white border-slate-200'} flex items-center gap-4`}>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
              <h4 className="text-lg font-bold text-white mt-0.5">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Motion Release & Timer */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Prep Timer Card */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#0f172a]/70 border-slate-800/40' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" /> Motion Prep Timer
            </h3>
            
            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-6xl font-mono font-bold tracking-tight text-white mb-6 bg-slate-900/60 px-8 py-4 rounded-2xl border border-slate-800/80 shadow-inner">
                {formatTime(timeLeft)}
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 
                    ${timerRunning 
                      ? 'bg-amber-600/25 border border-amber-500/40 text-amber-300 hover:bg-amber-600/40' 
                      : 'bg-emerald-600/25 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/40'}`}
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {timerRunning ? 'Pause Prep' : 'Start Prep'}
                </button>
                <button
                  onClick={() => { setTimeLeft(900); setTimerRunning(false); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4" /> Reset (15m)
                </button>
              </div>
            </div>
          </div>

          {/* Active Motion Card */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#0f172a]/70 border-slate-800/40' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400" /> Active Round Motion
            </h3>
            
            {isMotionReleased ? (
              <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-800/35 mb-4">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">RELEASED MOTION</span>
                <p className="text-base font-semibold text-white leading-relaxed">"{releasedMotion}"</p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/80 mb-4 text-center text-slate-400 text-sm italic">
                No motion released yet for Round {currentRound}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                type="text"
                placeholder="Type motion prompt, e.g. This House believes that..."
                value={motionInput}
                onChange={(e) => setMotionInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={handleReleaseMotion}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Release
              </button>
            </div>
          </div>

        </div>

        {/* Right Col: Divisions & Live logs */}
        <div className="flex flex-col gap-6">
          
          {/* Division status */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#0f172a]/70 border-slate-800/40' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Division Status
            </h3>
            
            <div className="flex flex-col gap-4">
              {metrics.divisionStatusList.length > 0 ? (
                metrics.divisionStatusList.map((div, index) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800/40">
                    <div>
                      <h4 className="text-xs font-bold text-white">{div.name}</h4>
                      <p className="text-[10px] text-slate-400">{div.teams_count} Teams // {div.rooms_count} Rooms</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      div.is_ready 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {div.status_text || (div.is_ready ? 'Pairings Ready' : 'Pending')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-lg bg-slate-900/30 border border-slate-800/25 text-center text-slate-500 text-xs italic">
                  No active tournament divisions configured.
                </div>
              )}
            </div>
          </div>

          {/* Live Telemetry Feed */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-[#0f172a]/70 border-slate-800/40' : 'bg-white border-slate-200'} flex-1`}>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Live Telemetry Feed
            </h3>
            
            <div className="h-[200px] overflow-y-auto font-mono text-[10px] text-slate-400 flex flex-col gap-2 pr-2">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="border-b border-slate-800/40 pb-1.5 leading-relaxed">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-600 text-center py-12 italic">
                  Awaiting operations stream logging telemetry...
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}