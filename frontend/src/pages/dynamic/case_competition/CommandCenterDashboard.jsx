import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, FileCheck2, BookOpenCheck, MonitorPlay, Plus, Megaphone,
  CalendarClock, Clock, CircleDot, Loader2, DoorOpen, BarChart3, CheckCircle2
} from 'lucide-react';

const GLASS = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]';

export default function CommandCenterDashboard() {
  const [eventName, setEventName] = useState('Case Competition');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [activeTrackFilter, setActiveTrackFilter] = useState('all');

  const [metrics, setMetrics] = useState({
    registeredTeams: 38,
    activeSubmissions: 31,
    caseBriefReleased: true,
    liveRoomsActive: 4,
    liveRoomsTotal: 6
  });

  const [liveFeed, setLiveFeed] = useState([
    { id: 1, time: '3m ago', severity: 'success', message: 'Team Meridian Strategy submitted final deck' },
    { id: 2, time: '9m ago', severity: 'warning', message: 'Room 3: Q&A running 6 minutes over schedule' },
    { id: 3, time: '14m ago', severity: 'info', message: 'Case Brief v2 (Grand Finale) released to all teams' },
    { id: 4, time: '22m ago', severity: 'success', message: 'Judge panel for Track B fully checked in' },
    { id: 5, time: '31m ago', severity: 'critical', message: 'Team Apex Consulting flagged for late upload' },
    { id: 6, time: '40m ago', severity: 'info', message: 'Room 5 reassigned to Semi-Final pairing' }
  ]);

  const [roomStatus, setRoomStatus] = useState([
    { id: 1, name: 'Room 1 — Track A', status: 'Live', pitch: 'Meridian Strategy vs Apex Consulting' },
    { id: 2, name: 'Room 2 — Track A', status: 'Live', pitch: 'NorthStar Group vs Catalyst Partners' },
    { id: 3, name: 'Room 3 — Track B', status: 'Delayed', pitch: 'Vertex Advisory vs BluePeak Co.' },
    { id: 4, name: 'Room 4 — Track B', status: 'Live', pitch: 'Ironclad Ventures vs Summit Collective' },
    { id: 5, name: 'Room 5 — Finals', status: 'Idle', pitch: '—' },
    { id: 6, name: 'Room 6 — Track C', status: 'Live', pitch: 'Lumen Insights vs Anchor & Co.' }
  ]);

  // Analytics datasets map matching active track categories
  const trackAnalyticsData = {
    all: { progress: 77, evaluationCount: "24/31", metrics: [{ name: 'Innovation', val: 82 }, { name: 'Feasibility', val: 76 }, { name: 'Pitch Delivery', val: 84 }, { name: 'Financials', val: 71 }] },
    trackA: { progress: 92, evaluationCount: "12/13", metrics: [{ name: 'Innovation', val: 88 }, { name: 'Feasibility', val: 81 }, { name: 'Pitch Delivery', val: 89 }, { name: 'Financials', val: 79 }] },
    trackB: { progress: 64, evaluationCount: "7/11", metrics: [{ name: 'Innovation', val: 74 }, { name: 'Feasibility', val: 70 }, { name: 'Pitch Delivery', val: 78 }, { name: 'Financials', val: 62 }] },
    trackC: { progress: 75, evaluationCount: "5/7", metrics: [{ name: 'Innovation', val: 81 }, { name: 'Feasibility', val: 75 }, { name: 'Pitch Delivery', val: 83 }, { name: 'Financials', val: 69 }] },
  };

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
      if (currentEventId) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseURL}/api/v1/events/${currentEventId}`);
        if (res.ok) {
          const data = await res.json();
          setEventName(data.name || 'Case Competition');
        }
      }
    } catch (err) {
      console.error("Failed to sync metrics pipeline:", err);
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

  const handleGlobalAnnouncement = () => triggerToast('Global announcement queued for all teams and judges.');
  const handleChangeDeadline = () => triggerToast('Submission deadline updated — teams notified automatically.');
  const handleReleaseCaseBrief = () => triggerToast('Next case brief released to all registered teams.');

  const severityStyles = {
    critical: 'border-red-500/40 bg-red-500/[0.08] text-red-300',
    warning: 'border-amber-400/40 bg-amber-400/[0.08] text-amber-300',
    success: 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-300',
    info: 'border-indigo-500/30 bg-indigo-500/[0.06] text-indigo-300'
  };

  const roomStatusStyles = {
    Live: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    Delayed: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    Idle: 'text-slate-400 bg-slate-400/10 border-slate-400/20'
  };

  const metricCards = [
    { label: 'Total Registered Teams', value: metrics.registeredTeams, icon: Users, accent: 'text-indigo-400' },
    { label: 'Active Submissions', value: metrics.activeSubmissions, icon: FileCheck2, accent: 'text-violet-400' },
    { label: 'Case Brief Status', value: metrics.caseBriefReleased ? 'Released' : 'Pending', icon: BookOpenCheck, accent: metrics.caseBriefReleased ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Live Presentations', value: `${metrics.liveRoomsActive}/${metrics.liveRoomsTotal} Rooms`, icon: MonitorPlay, accent: 'text-indigo-400' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060B16] text-slate-400 font-mono text-xs tracking-wider">
        <Loader2 className="w-4 h-4 animate-spin mr-2 text-indigo-400" /> SYNCING COMMAND CENTER HUB ENVIRONMENT...
      </div>
    );
  }

  const currentAnalytics = trackAnalyticsData[activeTrackFilter];

  return (
    <div className="min-h-screen bg-[#060B16] p-6 md:p-8 text-slate-200 selection:bg-indigo-500/30">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold font-mono">Case Competition Command Center</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">{eventName}</h1>
        </div>
        <div className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase font-mono tracking-wider">
          <CircleDot className="w-3.5 h-3.5 animate-pulse text-emerald-400" /> Event Live
        </div>
      </div>

      {/* Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricCards.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className={`${GLASS} rounded-2xl p-6 transition-all duration-300 hover:border-white/10 group`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold font-mono">{label}</span>
              <Icon className={`w-5 h-5 ${accent} transition-transform duration-300 group-hover:scale-110`} />
            </div>
            <div className="text-3xl font-black text-white tracking-tight">{value}</div>
          </div>
        ))}
      </div>


      {/* Asymmetric Dashboard Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live Timeline / Feed */}
        <div className={`${GLASS} rounded-2xl p-6 lg:col-span-6`}>
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-md font-bold uppercase tracking-wider text-white font-mono">Live Timeline</h2>
          </div>
          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
            {liveFeed.map((item) => (
              <div
                key={item.id}
                className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 transition-all duration-300 hover:bg-white/[0.02] ${severityStyles[item.severity]}`}
              >
                <span className="text-sm font-medium tracking-wide">{item.message}</span>
                <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap pt-0.5">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Presentation Rooms */}
        <div className={`${GLASS} rounded-2xl p-6 lg:col-span-3`}>
          <div className="flex items-center gap-2 mb-6">
            <DoorOpen className="w-4 h-4 text-violet-400" />
            <h2 className="text-md font-bold uppercase tracking-wider text-white font-mono">Judging Rooms</h2>
          </div>
          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
            {roomStatus.map((room) => (
              <div key={room.id} className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3.5 transition-all duration-300 hover:border-white/10">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="text-sm font-bold text-slate-200 truncate">{room.name}</span>
                  <span className={`text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${roomStatusStyles[room.status]}`}>
                    {room.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate font-mono bg-black/20 p-1.5 rounded border border-white/[0.02]">{room.pitch}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Action Sidebar */}
        <div className="lg:col-span-3">
          <div className={`${GLASS} rounded-2xl p-6 sticky top-6 space-y-3`}>
            <h2 className="text-md font-bold uppercase tracking-wider text-white font-mono mb-4">Quick Actions</h2>
            <button
              onClick={handleGlobalAnnouncement}
              className="w-full flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold font-mono uppercase text-xs px-4 py-3.5 transition-all duration-300"
            >
              <Megaphone className="w-4 h-4" /> Global Announcement
            </button>
            <button
              onClick={handleChangeDeadline}
              className="w-full flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 font-bold font-mono uppercase text-xs px-4 py-3.5 transition-all duration-300"
            >
              <CalendarClock className="w-4 h-4" /> Change Deadline
            </button>
            <button
              onClick={handleReleaseCaseBrief}
              className="w-full flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold font-mono uppercase text-xs px-4 py-3.5 transition-all duration-300"
            >
              <Plus className="w-4 h-4" /> Release Case Brief
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Evaluation Analytics Panel Component Upgrade */}
      <div className={`${GLASS} rounded-2xl p-6 mb-8 mt-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <h2 className="text-md font-bold uppercase tracking-wider text-white font-mono">Real-Time Evaluation Framework</h2>
          </div>
          
          {/* Live Tab Filters */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-black/30 border border-white/[0.04] rounded-xl self-start sm:self-auto">
            {['all', 'trackA', 'trackB', 'trackC'].map((trackKey) => (
              <button
                key={trackKey}
                onClick={() => setActiveTrackFilter(trackKey)}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg transition-all duration-200 ${
                  activeTrackFilter === trackKey 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow' 
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {trackKey === 'all' ? 'All Tracks' : `Track ${trackKey.slice(-1)}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Progress Completion Wheel Ring */}
          <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/[0.06] pb-6 md:pb-0 md:pr-6 text-center">
            <div className="relative flex items-center justify-center w-28 h-28 mb-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-800" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-indigo-400 transition-all duration-500 stroke-dasharray" strokeWidth="2.5" strokeDasharray={`${currentAnalytics.progress}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-white font-mono tracking-tight">{currentAnalytics.progress}%</span>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider mb-0.5">Judging Completion</span>
            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {currentAnalytics.evaluationCount} Balance Matrices Finalized
            </div>
          </div>

          {/* Criteria Performance Scores Bars */}
          <div className="md:col-span-8 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">Rubric Averages Matrix</h3>
            {currentAnalytics.metrics.map((metric) => (
              <div key={metric.name} className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300 font-medium">{metric.name}</span>
                  <span className="text-white font-black">{metric.val} <span className="text-slate-500 font-normal">/ 100</span></span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/[0.02]">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500" 
                    style={{ width: `${metric.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Alert Frame */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-indigo-500/30 bg-slate-900/90 backdrop-blur-md px-5 py-3.5 text-xs font-mono font-semibold tracking-wide text-indigo-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-5 duration-300">
          ⚡ SYSTEM // {toastMessage}
        </div>
      )}
    </div>
  );
}