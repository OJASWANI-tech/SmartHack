import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Tv, Loader2, CircleDot, Search, Clock
} from 'lucide-react';

const GLASS = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]';

export default function SubmissionEvaluationHub() {
  const navigate = useNavigate();
  const [eventName, setEventName] = useState('Case Competition');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [search, setSearch] = useState('');

  const [submissions] = useState([
    { id: 1, team: 'Meridian Strategy', room: 'Room 1 — Track A', judge: 'Dana Whitfield', submittedAt: '09:12 AM', onTime: true, abstract: 'Restructuring retail supply chains for resilience under tariff volatility...' },
    { id: 2, team: 'Apex Consulting', room: 'Room 1 — Track A', judge: 'Marcus Cole', submittedAt: '11:47 AM', onTime: false, abstract: 'A digital-first market entry strategy for mid-market SaaS in LATAM...' },
    { id: 3, team: 'NorthStar Group', room: 'Room 2 — Track A', judge: 'Marcus Cole', submittedAt: '08:55 AM', onTime: true, abstract: 'Operational turnaround plan for a regional logistics carrier...' },
    { id: 4, team: 'Vertex Advisory', room: 'Room 3 — Track B', judge: 'Jonathan Reeve', submittedAt: '10:05 AM', onTime: true, abstract: 'Pricing strategy redesign for a subscription health platform...' },
    { id: 5, team: 'Lumen Insights', room: 'Room 4 — Track C', judge: 'Elliot Park', submittedAt: '12:20 PM', onTime: false, abstract: 'M&A due diligence framework for a cross-border acquisition...' },
    { id: 6, team: 'Catalyst Partners', room: 'Room 2 — Track A', judge: 'Priya Anand', submittedAt: '09:30 AM', onTime: true, abstract: 'Sustainability-led cost reduction plan for a manufacturing client...' }
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

  const downloadDeck = (team) => triggerToast(`Downloading slide deck for ${team}.`);

  const launchJudgeRoom = (submission) => {
    sessionStorage.setItem('live_pitch_hud_context', JSON.stringify({
      room: submission.room, team: submission.team, judge: submission.judge
    }));
    navigate('/dynamic-test/live-pitch-hud');
  };

  const filtered = submissions.filter((s) => s.team.toLowerCase().includes(search.toLowerCase()));
  const onTimeCount = submissions.filter((s) => s.onTime).length;
  const lateCount = submissions.length - onTimeCount;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060B16] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading submissions…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B16] p-6 md:p-8 text-slate-200">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Submission &amp; Evaluation Hub</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{eventName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
            <CircleDot className="w-3 h-3" /> {onTimeCount} On Time
          </span>
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold">
            <Clock className="w-3 h-3" /> {lateCount} Late
          </span>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search submissions…"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/40"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((s) => (
          <div key={s.id} className={`${GLASS} rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:border-white/20`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">{s.team}</h3>
                <p className="text-[11px] text-slate-500">{s.room}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${
                s.onTime ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'
              }`}>
                {s.onTime ? 'On Time' : 'Late'} · {s.submittedAt}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{s.abstract}</p>

            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => downloadDeck(s.team)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg px-3 py-2 transition-all duration-300"
              >
                <Download className="w-3.5 h-3.5" /> Deck
              </button>
              <button
                onClick={() => launchJudgeRoom(s)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-violet-200 border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg px-3 py-2 transition-all duration-300"
              >
                <Tv className="w-3.5 h-3.5" /> Judge Room
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex items-center justify-center gap-2 text-slate-500 text-sm py-12">
            <FileText className="w-4 h-4" /> No submissions match "{search}".
          </div>
        )}
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-indigo-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-indigo-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
