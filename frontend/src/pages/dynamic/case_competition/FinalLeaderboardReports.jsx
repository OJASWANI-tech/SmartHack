import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Download, FileBarChart, Medal, AlertTriangle, Loader2, CircleDot
} from 'lucide-react';

const GLASS = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]';

function stdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export default function FinalLeaderboardReports() {
  const [eventName, setEventName] = useState('Case Competition');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [teams] = useState([
    { id: 1, name: 'Meridian Strategy', track: 'Track A', scores: [92, 89, 94] },
    { id: 2, name: 'Ironclad Ventures', track: 'Track B', scores: [88, 90, 87] },
    { id: 3, name: 'NorthStar Group', track: 'Track A', scores: [85, 70, 91] },
    { id: 4, name: 'Catalyst Partners', track: 'Track A', scores: [80, 82, 79] },
    { id: 5, name: 'Vertex Advisory', track: 'Track B', scores: [77, 95, 60] },
    { id: 6, name: 'Lumen Insights', track: 'Track C', scores: [74, 76, 73] }
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

  const ranked = teams
    .map((t) => ({
      ...t,
      avg: t.scores.reduce((a, b) => a + b, 0) / t.scores.length,
      deviation: stdDev(t.scores)
    }))
    .sort((a, b) => b.avg - a.avg);

  const flaggedCount = ranked.filter((t) => t.deviation > 10).length;

  const exportCsv = () => triggerToast('Final score audit exported as CSV.');
  const generateCertificates = () => triggerToast('Certificate generation started for all ranked teams.');

  const medalColor = (idx) => (idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-400' : 'text-slate-600');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060B16] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading final leaderboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B16] p-6 md:p-8 text-slate-200">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Final Leaderboard &amp; Reports</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{eventName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-sm font-semibold transition-all duration-300"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={generateCertificates}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-semibold transition-all duration-300"
          >
            <FileBarChart className="w-4 h-4" /> Generate Certificates
          </button>
        </div>
      </div>

      {flaggedCount > 0 && (
        <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/[0.08] text-amber-300 px-4 py-3 flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {flaggedCount} team{flaggedCount > 1 ? 's' : ''} flagged for high cross-judge score deviation — review for grading fairness.
        </div>
      )}

      <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Weighted Score Matrix</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                <th className="py-3 pr-4 font-semibold">Rank</th>
                <th className="py-3 pr-4 font-semibold">Team</th>
                <th className="py-3 pr-4 font-semibold">Track</th>
                <th className="py-3 pr-4 font-semibold">Judge Scores</th>
                <th className="py-3 pr-4 font-semibold">Weighted Avg</th>
                <th className="py-3 pr-4 font-semibold">Std. Dev.</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((team, idx) => (
                <tr key={team.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-300">
                  <td className="py-3 pr-4">
                    <span className={`flex items-center gap-1 font-bold ${medalColor(idx)}`}>
                      <Medal className="w-4 h-4" /> {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-slate-100">{team.name}</td>
                  <td className="py-3 pr-4 text-slate-400">{team.track}</td>
                  <td className="py-3 pr-4 text-slate-400">{team.scores.join(' / ')}</td>
                  <td className="py-3 pr-4 font-bold text-indigo-300">{team.avg.toFixed(1)}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-semibold ${team.deviation > 10 ? 'text-amber-300' : 'text-slate-400'}`}>
                      {team.deviation.toFixed(1)}
                      {team.deviation > 10 && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
        <CircleDot className="w-3 h-3" /> Standard deviation above 10 points flags potential grading inconsistency across judges.
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-indigo-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-indigo-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
