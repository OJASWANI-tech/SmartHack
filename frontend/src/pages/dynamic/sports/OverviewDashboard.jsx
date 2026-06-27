import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, MapPinned, Radio, Ticket, Plus, Megaphone, AlertTriangle,
  Trophy, Clock, CircleDot, Loader2, Calendar, Shield, CloudSun,
  CheckCircle2, ArrowUpRight, MessageSquare, Play, RefreshCw, BarChart3
} from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

export default function OverviewDashboard() {
  const [eventName, setEventName] = useState('Inter-College Sports Fest 2026');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [activeFeedFilter, setActiveFeedFilter] = useState('All');

  // 3. TOURNAMENT METRICS & PROGRESSION STATE
  const [progress, setProgress] = useState({
    completed: 54,
    total: 75,
    percentage: 72
  });

  // 2. REAL TOURNAMENT OPERATIONS KPIs
  const [kpis, setKpis] = useState([
    { label: 'Matches Today', value: 24, icon: Calendar, accent: 'text-cyan-400' },
    { label: 'Matches Live Now', value: 5, icon: Radio, accent: 'text-emerald-400 animate-pulse' },
    { label: 'Completed Series', value: 18, icon: CheckCircle2, accent: 'text-indigo-400' },
    { label: 'Pending Slots', value: 6, icon: Clock, accent: 'text-amber-400' }
  ]);

  // 1. TODAY'S FEATURED HERO MATCH STATE
  const [featuredMatch, setFeaturedMatch] = useState({
    id: 'M-107',
    sport: '🏀 Basketball',
    stage: 'Semi-Final 1',
    teamA: 'Falcons',
    scoreA: 42,
    teamB: 'Titans',
    scoreB: 39,
    clock: '08:35',
    court: 'Court 1',
    possession: 'A'
  });

  // 6. LIVE MATCHES COMPACT DATA
  const [liveMatches, setLiveMatches] = useState([
    { id: 'M-108', sport: '⚽ Football', teamA: 'Wolves', scoreA: 1, teamB: 'Hurricanes', scoreB: 0, clock: '2nd Half', venue: 'Main Field' },
    { id: 'M-109', sport: '🏸 Badminton', teamA: 'Eagles', scoreA: 18, teamB: 'Sharks', scoreB: 14, clock: 'Set 2', venue: 'Court 3' },
    { id: 'M-110', sport: '🏐 Volleyball', teamA: 'Raptors', scoreA: 25, teamB: 'Bears', scoreB: 23, clock: 'Final Set', venue: 'Court 6' }
  ]);

  // 5. TIMELINE WITH METADATA CATEGORIES
  const [liveFeed, setLiveFeed] = useState([
    { id: 1, time: '2m ago', category: 'Alerts', icon: AlertTriangle, color: 'text-amber-400', message: 'Court 2: Match 4 delayed by 10 mins (Floor clean)' },
    { id: 2, time: '6m ago', category: 'Officials', icon: Shield, color: 'text-cyan-400', message: 'Referee Singh assigned to Court 3, Match 5' },
    { id: 3, time: '11m ago', category: 'Matches', icon: Trophy, color: 'text-emerald-400', message: 'Main Field: Match 2 final score recorded [3-1]' },
    { id: 4, time: '18m ago', category: 'Officials', icon: Shield, color: 'text-cyan-400', message: 'Ref Patel checked in — Active standby allocation pool' },
    { id: 5, time: '25m ago', category: 'Alerts', icon: AlertTriangle, color: 'text-orange-400', message: 'Court 5: Core structural inspection complete' },
  ]);

  // 4. UPGRADED VENUE TRACKING WITH LIVE SCORES
  const [venueStatus, setVenueStatus] = useState([
    { id: 1, name: 'Court 1', status: 'Live', match: 'Falcons 42 - 39 Titans', time: '08:35 Rem.' },
    { id: 2, name: 'Court 2', status: 'Delayed', match: 'Wolves vs Hurricanes', time: 'TBD' },
    { id: 3, name: 'Court 3', status: 'Live', match: 'Sharks 14 - 18 Eagles', time: 'Interval' },
    { id: 4, name: 'Main Field', status: 'Live', match: 'Comets 0 - 2 Vipers', time: '74 Mins' },
    { id: 5, name: 'Court 5', status: 'Idle', match: '—', time: 'Empty' }
  ]);

  // 8. REFEREE DISPATCH CONSOLE STATE
  const [referees, setReferees] = useState([
    { name: 'Ref Singh', venue: 'Court 3', availability: 'Active' },
    { name: 'Ref Kumar', venue: 'Available Pool', availability: 'Available' },
    { name: 'Ref Patel', venue: 'Lounge Zone', availability: 'On Break' }
  ]);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
      if (currentEventId) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseURL}/api/v1/events/${currentEventId}`);
        if (res.ok) {
          const data = await res.json();
          setEventName(data.name || 'Inter-College Sports Fest 2026');
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

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const filteredFeed = activeFeedFilter === 'All' 
    ? liveFeed 
    : liveFeed.filter(item => item.category === activeFeedFilter);

  return (
    <div className="min-h-screen bg-[#070A14] p-4 md:p-8 text-slate-200 antialiased font-sans">
      
      {/* 10. ENHANCED SYSTEM HEADER STATUS */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-indigo-400 font-black mb-1">
            <span>Day 2 of 3</span>
            <span>•</span>
            <span>75 Active Teams</span>
            <span>•</span>
            <span>1,200 Registered Athletes</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">{eventName}</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* 9. WEATHER TELEMETRY METRIC */}
          <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs font-mono text-slate-400">
            <CloudSun className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-white font-bold">☀ 28°C — Sunny</div>
              <div>Wind: 8km/h • Rain Risk: 10%</div>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">SAFE PLAY</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-black tracking-wide uppercase">
            <CircleDot className="w-4 h-4 animate-pulse text-emerald-400" /> Arena Command Live
          </div>
        </div>
      </header>

      {/* 3. WORKFLOW PROGRESS TRACK BAR BLOCK */}
      <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 mb-8">
        <div className="flex items-center justify-between text-xs font-mono mb-2.5">
          <span className="text-slate-400 uppercase font-black tracking-widest">Global Tournament Progression Matrix</span>
          <span className="text-indigo-400 font-black text-sm">{progress.completed} / {progress.total} Matches Settled ({progress.percentage}%)</span>
        </div>
        <div className="h-3 w-full bg-slate-950 rounded-full border border-slate-900 overflow-hidden p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </section>

      {/* 1. FEATURED MATCH MAIN HERO SCREEN */}
      <section className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-3xl p-6 lg:p-8 mb-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 text-xs font-mono font-black text-indigo-400/20 pointer-events-none tracking-widest hidden md:block">
          FEATURED ARENA EVENT PIPELINE
        </div>
        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono uppercase font-black tracking-widest px-2.5 py-1 rounded-md w-fit mb-4">
          {featuredMatch.sport} • {featuredMatch.stage}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6">
          <div className="flex items-center justify-between md:justify-start gap-4">
            <div className="text-left">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>🦅</span> {featuredMatch.teamA}
              </h2>
              <span className="text-xs text-slate-500 font-mono">Home Lineup</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold font-mono text-cyan-400">{featuredMatch.scoreA}</div>
          </div>

          <div className="text-center bg-slate-950/60 rounded-2xl border border-slate-800 p-4 max-w-[260px] mx-auto w-full">
            <div className="text-lg font-bold font-mono text-amber-400 animate-pulse tracking-wider">{featuredMatch.clock}</div>
            <div className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest mt-1">Live Match Clock • {featuredMatch.court}</div>
            <div className="flex gap-2 justify-center mt-3">
              <button onClick={() => triggerToast('Routing to Live Scoreboard')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold rounded-lg flex items-center gap-1 transition">
                <Play className="w-3 h-3 fill-current" /> Scoring Console
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4">
            <div className="text-2xl md:text-3xl font-bold font-mono text-emerald-400 md:order-1">{featuredMatch.scoreB}</div>
            <div className="text-right md:order-2">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2 justify-end">
                {featuredMatch.teamB} <span>☄️</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">Visitor Lineup</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OPERATIONAL KPI COUNTER ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className={`${GLASS} rounded-2xl p-6 transition-all duration-300 hover:border-white/10`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold font-mono">{label}</span>
              <Icon className={`w-4 h-4 ${accent}`} />
            </div>
            <div className="text-xl font-bold text-white font-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* ASYMMETRIC SYSTEM CONTROL MATRIX BLOCKS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN COMPLEMENTS: LIVE SCORES & TIMELINE */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 6. LIVE MATCHES FEED PANEL */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Live Matches Tracker</h2>
              </div>
              <span className="text-xs font-mono text-slate-500">Real-time Node Activity</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {liveMatches.map((lm) => (
                <div key={lm.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mb-2">
                    <span>{lm.sport}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">{lm.venue}</span>
                  </div>
                  <div className="space-y-1.5 font-mono">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 font-medium truncate">{lm.teamA}</span>
                      <span className="font-bold text-cyan-400">{lm.scoreA}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 font-medium truncate">{lm.teamB}</span>
                      <span className="font-bold text-emerald-400">{lm.scoreB}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-amber-500 font-bold">{lm.clock}</span>
                    <button onClick={() => triggerToast(`Connecting to node ${lm.id}`)} className="text-indigo-400 font-bold hover:underline flex items-center gap-0.5">
                      Console <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. LIVE TIMELINE WITH CATEGORY TABS FILTERS */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Live Operation Timeline</h2>
              </div>
              
              {/* Filter Tabs */}
              <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-mono font-bold">
                {['All', 'Matches', 'Alerts', 'Officials'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFeedFilter(cat)}
                    className={`px-3 py-1 rounded-lg transition ${activeFeedFilter === cat ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredFeed.map((item) => {
                const FeedIcon = item.icon;
                return (
                  <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-900 bg-slate-950/30 px-4 py-3 hover:border-slate-800 transition">
                    <div className="flex items-start gap-3">
                      <FeedIcon className={`w-4 h-4 mt-0.5 shrink-0 ${item.color}`} />
                      <span className="text-sm text-slate-300">{item.message}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-600 whitespace-nowrap">{item.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 11. RECENT TERMINATED SERIES OUTCOMES */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <h3 className="text-xs uppercase tracking-widest font-mono font-black text-slate-500 mb-4">Historical Recent Results (Settled Feed)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 bg-slate-950/30 border border-slate-900 rounded-xl flex justify-between items-center">
                <span>🦅 Falcons 76 - 71 Titans ☄️</span>
                <span className="text-emerald-400 font-bold">Final</span>
              </div>
              <div className="p-3 bg-slate-950/30 border border-slate-900 rounded-xl flex justify-between items-center">
                <span>🦈 Sharks 1 - 3 Eagles 🦅</span>
                <span className="text-emerald-400 font-bold">Final</span>
              </div>
              <div className="p-3 bg-slate-950/30 border border-slate-900 rounded-xl flex justify-between items-center">
                <span>☄️ Comets 2 - 0 Wolves 🐺</span>
                <span className="text-emerald-400 font-bold">Final</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN SIDEBAR COMPLEMENTS: STATUS, OFFICIALS & QUICK CONTROLS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 4. REAL-TIME VENUE SCORE TRACK DISPLAY */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <MapPinned className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Venue Metrics Overview</h2>
            </div>
            {/* ... venue items remain the same ... */}
          </div>

          {/* 8. REFEREE DISPATCH DISPOSITION FEED */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Official & Referee Board</h2>
            </div>
            {/* ... referee items remain the same ... */}
          </div>

          {/* NEW HORIZONTAL PLACEMENT: SUB-GRID TO FORCE PANELS ONTO THE SAME LINE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            
            {/* 7. UPGRADED QUICK ACTIONS CONSOLE PANEL */}
            <div className={`${GLASS} rounded-2xl p-6 space-y-3 h-full`}>
              <h2 className="text-sm font-bold text-white mb-3">Operations Quick Console</h2>
              
              <button onClick={() => triggerToast('Opening match scheduling editor matrix')} className="w-full flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold px-4 py-3 transition">
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold font-mono"><Plus className="w-4 h-4" /> Schedule Match</span>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </button>
              
              <button onClick={() => triggerToast('Opening referee dispatcher panel')} className="w-full flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold px-4 py-3 transition">
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold font-mono"><Shield className="w-4 h-4" /> Assign Referee</span>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </button>
              
              <button onClick={() => triggerToast('Opening system public broadcast template manager')} className="w-full flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold px-4 py-3 transition">
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold font-mono"><Megaphone className="w-4 h-4" /> Broadcast Message</span>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </button>

              <button onClick={() => triggerToast('Routing system token to live score console views')} className="w-full flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold px-4 py-3 transition">
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold font-mono"><Radio className="w-4 h-4" /> Open Live Scoreboard</span>
                <ArrowUpRight className="w-4 h-4 opacity-50" />
              </button>

              <button onClick={() => triggerToast('CRITICAL ALARM SENT TO ALL SYSTEM OFFICIAL STATIONS')} className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black px-4 py-3 text-xs tracking-widest font-mono uppercase transition">
                <AlertTriangle className="w-4 h-4 animate-bounce" /> Emergency Alert
              </button>
            </div>

            {/* 12. MINI METRIC ANALYTICAL COMPLEMENT SUMMARY */}
            <div className={`${GLASS} rounded-2xl p-6 space-y-2 h-full font-mono text-[11px] text-slate-500`}>
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400 mb-4">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> Operational Insights
              </div>
              <div className="space-y-2">
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-900/60 items-center">
                  <span>Peak Venue Node:</span>
                  <span className="text-white font-bold text-xs">Court 1</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-900/60 items-center">
                  <span>Mean Play Duration:</span>
                  <span className="text-white font-bold text-xs">42 Mins</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-900/60 items-center">
                  <span>High Latency Delta:</span>
                  <span className="text-amber-400 font-bold text-xs">Court 2 (+10m)</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Global Notification Toast Component */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-500/30 bg-slate-950 text-cyan-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] px-5 py-3 text-xs font-mono font-bold tracking-wide transition-all duration-300 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> {toastMessage}
        </div>
      )}
    </div>
  );
}