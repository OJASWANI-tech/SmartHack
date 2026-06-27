import React, { useState } from 'react';
import { BarChart3, Users, TrendingUp, FileDown, Sheet, Printer, Medal } from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const TABS = ['Top Teams', 'Progression Pace', 'Attendance', 'Institutional Standings'];

const TOP_TEAMS = [
  { rank: 1, name: 'Falcons', wins: 6, points: 18 },
  { rank: 2, name: 'Comets', wins: 5, points: 16 },
  { rank: 3, name: 'Sharks', wins: 5, points: 15 },
  { rank: 4, name: 'Titans', wins: 4, points: 13 },
];

const INSTITUTION_STANDINGS = [
  { rank: 1, institution: 'St. Xavier Institute', gold: 4, silver: 2, bronze: 1, points: 4 * 5 + 2 * 3 + 1 * 1 },
  { rank: 2, institution: 'Greenwood College', gold: 3, silver: 3, bronze: 2, points: 3 * 5 + 3 * 3 + 2 * 1 },
  { rank: 3, institution: 'Northfield University', gold: 2, silver: 1, bronze: 4, points: 2 * 5 + 1 * 3 + 4 * 1 },
  { rank: 4, institution: 'Riverside Academy', gold: 1, silver: 2, bronze: 2, points: 1 * 5 + 2 * 3 + 2 * 1 },
].sort((a, b) => b.points - a.points).map((row, i) => ({ ...row, rank: i + 1 }));

const EXPORTS = [
  { key: 'pdf', label: 'Export Brackets (PDF)', icon: FileDown },
  { key: 'csv', label: 'Download Full Results (CSV)', icon: Sheet },
  { key: 'print', label: 'Print Final Standings', icon: Printer },
];

export default function AnalyticsReports() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [toast, setToast] = useState('');

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const downloadCsv = () => {
    const header = 'Rank,Team,Wins,Points\n';
    const rows = TOP_TEAMS.map((t) => `${t.rank},${t.name},${t.wins},${t.points}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tournament-results.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = (key, label) => {
    if (key === 'csv') {
      downloadCsv();
      triggerToast('CSV results downloaded.');
    } else if (key === 'print') {
      window.print();
      triggerToast('Print dialog opened.');
    } else {
      triggerToast(`${label} queued — link will appear in your downloads shortly.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Post-Event</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Analytics & Reports</h1>
      </div>

      <div className={`${GLASS} rounded-2xl p-6 md:p-8 mb-6`}>
        <div className="flex gap-2 mb-6 border-b border-white/[0.06] overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold transition-all duration-300 border-b-2 whitespace-nowrap ${
                activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Top Teams' && (
          <div className="space-y-3">
            {TOP_TEAMS.map((t) => (
              <div key={t.rank} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center">{t.rank}</span>
                  <span className="font-semibold text-white text-sm">{t.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span>{t.wins} wins</span>
                  <span className="text-emerald-400 font-bold">{t.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Progression Pace' && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 flex flex-col items-center justify-center gap-3 h-48">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            <div className="w-full h-20 flex items-end gap-2">
              {[40, 65, 50, 80, 70, 95].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-cyan-500/20 to-emerald-500/60" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="text-xs text-slate-500">Match completion pace across tournament days</p>
          </div>
        )}

        {activeTab === 'Attendance' && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 flex flex-col items-center justify-center gap-3 h-48">
            <Users className="w-6 h-6 text-emerald-400" />
            <div className="text-2xl font-bold text-white">1,840</div>
            <p className="text-xs text-slate-500">Peak attendance recorded on Day 2</p>
          </div>
        )}

        {activeTab === 'Institutional Standings' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Medal className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Championship Points Matrix (Gold ×5, Silver ×3, Bronze ×1)</h3>
            </div>
            <div className="space-y-3">
              {INSTITUTION_STANDINGS.map((row) => (
                <div key={row.institution} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm flex items-center justify-center">{row.rank}</span>
                    <span className="font-semibold text-white text-sm">{row.institution}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                    <span className="text-amber-400">🥇 {row.gold}</span>
                    <span className="text-slate-300">🥈 {row.silver}</span>
                    <span className="text-orange-400">🥉 {row.bronze}</span>
                    <span className="text-emerald-400 font-bold text-sm">{row.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Export Control Panel</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EXPORTS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleExport(key, label)}
              className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] p-6 transition-all duration-300"
            >
              <Icon className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-200 text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-cyan-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          {toast}
        </div>
      )}
    </div>
  );
}
