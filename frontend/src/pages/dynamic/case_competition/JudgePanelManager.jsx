import React, { useState, useEffect, useCallback } from 'react';
import {
  Gavel, Briefcase, Landmark, GraduationCap, Loader2, CircleDot, Plus
} from 'lucide-react';

const GLASS = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]';

const CATEGORY_META = {
  'Corporate Partner': { icon: Briefcase, accent: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30' },
  'VC Investor': { icon: Landmark, accent: 'text-violet-300 bg-violet-500/10 border-violet-500/30' },
  Alumnus: { icon: GraduationCap, accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' }
};

const TRACKS = ['Track A', 'Track B', 'Track C', 'Unassigned'];

export default function JudgePanelManager() {
  const [eventName, setEventName] = useState('Case Competition');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [judges, setJudges] = useState([
    { id: 1, name: 'Dana Whitfield', category: 'Corporate Partner', track: 'Track A', completeness: 100 },
    { id: 2, name: 'Marcus Cole', category: 'VC Investor', track: 'Track A', completeness: 75 },
    { id: 3, name: 'Priya Anand', category: 'Alumnus', track: 'Track B', completeness: 60 },
    { id: 4, name: 'Jonathan Reeve', category: 'Corporate Partner', track: 'Track B', completeness: 100 },
    { id: 5, name: 'Sofia Liang', category: 'VC Investor', track: 'Unassigned', completeness: 0 },
    { id: 6, name: 'Elliot Park', category: 'Alumnus', track: 'Track C', completeness: 40 }
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
          setEventName(data.name || 'Case Competition');
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

  const reassignTrack = (id, track) => {
    setJudges((prev) => prev.map((j) => (j.id === id ? { ...j, track } : j)));
    triggerToast(`Judge reassigned to ${track}.`);
  };

  const avgCompleteness = Math.round(judges.reduce((sum, j) => sum + j.completeness, 0) / judges.length);
  const unassignedCount = judges.filter((j) => j.track === 'Unassigned').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060B16] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading judge panel…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B16] p-6 md:p-8 text-slate-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Judge Panel Manager</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{eventName}</h1>
        </div>
        <button
          onClick={() => triggerToast('Judge invitation link copied — share with new panelists.')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-sm font-semibold transition-all duration-300"
        >
          <Plus className="w-4 h-4" /> Invite Judge
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className={`${GLASS} rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Registered Judges</span>
            <Gavel className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{judges.length}</div>
        </div>
        <div className={`${GLASS} rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Avg. Grading Completeness</span>
            <CircleDot className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{avgCompleteness}%</div>
        </div>
        <div className={`${GLASS} rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Unassigned Judges</span>
            <Gavel className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{unassignedCount}</div>
        </div>
      </div>

      <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
        <h2 className="text-lg font-bold text-white mb-6">Judge Registry</h2>
        <div className="space-y-3">
          {judges.map((judge) => {
            const meta = CATEGORY_META[judge.category];
            const Icon = meta.icon;
            return (
              <div key={judge.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${meta.accent}`}>
                    <Icon className="w-3 h-3" /> {judge.category}
                  </span>
                  <span className="text-sm font-semibold text-slate-100 truncate">{judge.name}</span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2 w-36">
                    <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${judge.completeness >= 80 ? 'bg-emerald-500' : judge.completeness >= 40 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${judge.completeness}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-9">{judge.completeness}%</span>
                  </div>
                  <select
                    value={judge.track}
                    onChange={(e) => reassignTrack(judge.id, e.target.value)}
                    className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/40"
                  >
                    {TRACKS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-indigo-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-indigo-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
