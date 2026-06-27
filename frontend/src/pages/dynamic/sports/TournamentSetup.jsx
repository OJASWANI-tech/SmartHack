import React, { useState } from 'react';
import {
  Swords, Layers, Repeat, GitBranch, Clock, Trophy, Shuffle, Save, Check
} from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const FORMATS = [
  { id: 'single_elim', label: 'Single Elimination', icon: Swords, desc: 'One loss and you\'re out. Fastest path to a champion.' },
  { id: 'double_elim', label: 'Double Elimination', icon: Layers, desc: 'Teams get a second chance via the losers bracket.' },
  { id: 'round_robin', label: 'Round Robin', icon: Repeat, desc: 'Every team plays every other team once.' },
  { id: 'swiss', label: 'Swiss Format', icon: GitBranch, desc: 'Teams are paired against opponents with similar records each round.' },
];

const BRACKET_PREVIEW = {
  single_elim: ['Round of 16', 'Quarterfinals', 'Semifinals', 'Final'],
  double_elim: ['Winners R1', 'Losers R1', 'Winners R2', 'Grand Final'],
  round_robin: ['Matchday 1', 'Matchday 2', 'Matchday 3', 'Standings'],
  swiss: ['Round 1 (random)', 'Round 2 (paired by score)', 'Round 3 (paired by score)', 'Final Standings'],
};

const STORAGE_KEY = 'sports_tournament_setup_config';

export default function TournamentSetup() {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  })();

  const [format, setFormat] = useState(stored?.format || 'single_elim');
  const [matchDuration, setMatchDuration] = useState(stored?.matchDuration ?? 40);
  const [pointsWin, setPointsWin] = useState(stored?.pointsWin ?? 3);
  const [pointsDraw, setPointsDraw] = useState(stored?.pointsDraw ?? 1);
  const [pointsLoss, setPointsLoss] = useState(stored?.pointsLoss ?? 0);
  const [tieBreaker, setTieBreaker] = useState(stored?.tieBreaker || 'head_to_head');
  const [seeding, setSeeding] = useState(stored?.seeding || 'random');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      format, matchDuration, pointsWin, pointsDraw, pointsLoss, tieBreaker, seeding
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Configuration Workshop</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Tournament Setup</h1>
      </div>

      {/* Format selector */}
      <div className={`${GLASS} rounded-2xl p-6 md:p-8 mb-6`}>
        <h2 className="text-sm font-bold text-white mb-5">Tournament Format</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FORMATS.map(({ id, label, icon: Icon, desc }) => {
            const active = format === id;
            return (
              <button
                key={id}
                onClick={() => setFormat(id)}
                className={`text-left rounded-xl border p-5 transition-all duration-300 ${
                  active
                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.15)]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <Icon className={`w-6 h-6 mb-3 ${active ? 'text-emerald-400' : 'text-cyan-400'}`} />
                <div className={`font-bold mb-1 ${active ? 'text-emerald-400' : 'text-white'}`}>{label}</div>
                <p className="text-xs text-slate-500">{desc}</p>
              </button>
            );
          })}
        </div>

        {/* Bracket build micro-animation */}
        <div className="mt-6 flex items-center gap-3 overflow-x-auto pb-2">
          {BRACKET_PREVIEW[format].map((stage, i) => (
            <React.Fragment key={stage}>
              <div
                className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-2 text-xs font-semibold text-emerald-300 transition-all duration-300"
                style={{ animation: `fadeSlide 0.4s ease ${i * 0.12}s both` }}
              >
                {stage}
              </div>
              {i < BRACKET_PREVIEW[format].length - 1 && <div className="w-6 h-px bg-white/20 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Rules settings */}
      <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
        <h2 className="text-sm font-bold text-white mb-5">Rules & Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
              <Clock className="w-4 h-4 text-cyan-400" /> Match Duration (minutes)
            </label>
            <input
              type="number" min="5" value={matchDuration}
              onChange={(e) => setMatchDuration(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none transition-all duration-300"
            />
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
              <Shuffle className="w-4 h-4 text-cyan-400" /> Bracket Seeding
            </label>
            <select
              value={seeding} onChange={(e) => setSeeding(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none transition-all duration-300"
            >
              <option value="random">Random</option>
              <option value="ranked">Ranked / Seeded</option>
              <option value="group_balanced">Group-Balanced</option>
            </select>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 md:col-span-2">
            <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
              <Trophy className="w-4 h-4 text-cyan-400" /> Point Rules
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-xs text-slate-500">
                Win
                <input type="number" value={pointsWin} onChange={(e) => setPointsWin(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none" />
              </label>
              <label className="text-xs text-slate-500">
                Draw
                <input type="number" value={pointsDraw} onChange={(e) => setPointsDraw(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none" />
              </label>
              <label className="text-xs text-slate-500">
                Loss
                <input type="number" value={pointsLoss} onChange={(e) => setPointsLoss(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none" />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 md:col-span-2">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">Tie-Breaker Criteria</label>
            <select
              value={tieBreaker} onChange={(e) => setTieBreaker(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none transition-all duration-300"
            >
              <option value="head_to_head">Head-to-Head Result</option>
              <option value="point_diff">Point/Goal Difference</option>
              <option value="points_scored">Total Points Scored</option>
              <option value="sudden_death">Sudden Death Playoff</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-5 py-3 transition-all duration-300"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
