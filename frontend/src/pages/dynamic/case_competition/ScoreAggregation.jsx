import React, { useState, useMemo } from 'react';
import {
  ClipboardList, Calculator, AlertTriangle, Lock, LockOpen,
  CheckCircle2, ChevronDown, ChevronRight, Info, ShieldAlert,
  TrendingUp, BarChart3, Users, Gavel
} from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const G = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.5)]';

// ─── Seed data ─────────────────────────────────────────────────────────────────
const CRITERIA = [
  { id: 'analysis',      label: 'Problem Analysis',    weight: 30 },
  { id: 'solution',      label: 'Solution Quality',    weight: 30 },
  { id: 'feasibility',   label: 'Feasibility',         weight: 20 },
  { id: 'presentation',  label: 'Presentation',        weight: 20 },
];

const JUDGES = [
  { id: 'j1', name: 'Dr. Priya Mehta',   role: 'Industry Expert' },
  { id: 'j2', name: 'Anil Kapoor',        role: 'VC Partner'      },
  { id: 'j3', name: 'Sarah Lin',          role: 'Academic Lead'   },
];

// Raw judge scores [0–100] per team per criterion per judge
const INITIAL_SCORES = {
  't1': { label: 'Meridian Strategy',   scores: { j1: { analysis:88, solution:91, feasibility:85, presentation:90 }, j2: { analysis:84, solution:88, feasibility:82, presentation:86 }, j3: { analysis:92, solution:94, feasibility:89, presentation:92 } } },
  't2': { label: 'Apex Consulting',     scores: { j1: { analysis:75, solution:78, feasibility:72, presentation:80 }, j2: { analysis:73, solution:76, feasibility:70, presentation:77 }, j3: { analysis:95, solution:97, feasibility:94, presentation:96 } } },
  't3': { label: 'NorthStar Group',     scores: { j1: { analysis:80, solution:83, feasibility:79, presentation:84 }, j2: { analysis:81, solution:84, feasibility:78, presentation:82 }, j3: { analysis:79, solution:82, feasibility:77, presentation:81 } } },
  't4': { label: 'Vertex Advisory',     scores: { j1: { analysis:70, solution:68, feasibility:65, presentation:72 }, j2: { analysis:69, solution:67, feasibility:64, presentation:71 }, j3: { analysis:71, solution:69, feasibility:66, presentation:73 } } },
  't5': { label: 'Ironclad Ventures',   scores: { j1: { analysis:85, solution:87, feasibility:83, presentation:88 }, j2: { analysis:86, solution:88, feasibility:84, presentation:89 }, j3: { analysis:84, solution:86, feasibility:82, presentation:87 } } },
  't6': { label: 'Lumen Insights',      scores: { j1: { analysis:78, solution:80, feasibility:76, presentation:79 }, j2: { analysis:40, solution:42, feasibility:38, presentation:41 }, j3: { analysis:79, solution:81, feasibility:77, presentation:80 } } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function weightedScore(judgeScores, weights) {
  return weights.reduce((sum, c) => sum + (judgeScores[c.id] || 0) * (c.weight / 100), 0);
}

function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stdDev(arr) {
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// A judge score is an outlier if it deviates > 1.5 SD from the other judges on that team
function detectOutliers(teamScores, weights) {
  const judgeWeighted = Object.fromEntries(
    JUDGES.map(j => [j.id, weightedScore(teamScores[j.id], weights)])
  );
  const vals = Object.values(judgeWeighted);
  const m = avg(vals);
  const sd = stdDev(vals);
  const outliers = {};
  JUDGES.forEach(j => {
    if (Math.abs(judgeWeighted[j.id] - m) > 1.5 * sd) outliers[j.id] = true;
  });
  return { judgeWeighted, outliers, mean: m, sd };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepBadge({ number, active, done }) {
  const base = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 shrink-0';
  if (done)   return <div className={`${base} bg-emerald-500/20 border-emerald-500/40 text-emerald-400`}><CheckCircle2 className="w-3.5 h-3.5" /></div>;
  if (active) return <div className={`${base} bg-indigo-500/20 border-indigo-500/50 text-indigo-300`}>{number}</div>;
  return       <div className={`${base} bg-white/[0.03] border-white/[0.08] text-slate-600`}>{number}</div>;
}

function SectionHeader({ step, total, icon: Icon, title, subtitle, active, done }) {
  return (
    <div className="flex items-start gap-3">
      <StepBadge number={step} active={active} done={done} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-400' : done ? 'text-emerald-400' : 'text-slate-600'}`} />
          <h2 className={`text-sm font-bold tracking-wide ${active || done ? 'text-white' : 'text-slate-600'}`}>{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 ml-6">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Step 1 — Collect Judge Scores ───────────────────────────────────────────
function CollectScores({ scores, frozen }) {
  const [expanded, setExpanded] = useState('t1');

  return (
    <div className="space-y-2 mt-4">
      {Object.entries(scores).map(([tid, { label, scores: judgeScores }]) => (
        <div key={tid} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === tid ? null : tid)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm font-semibold text-slate-200">{label}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{JUDGES.length} judges</span>
              {expanded === tid
                ? <ChevronDown className="w-4 h-4 text-slate-500" />
                : <ChevronRight className="w-4 h-4 text-slate-500" />
              }
            </div>
          </button>

          {expanded === tid && (
            <div className="px-4 pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left text-slate-500 font-semibold pb-2 pr-4">Judge</th>
                      {CRITERIA.map(c => (
                        <th key={c.id} className="text-center text-slate-500 font-semibold pb-2 px-2 whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                      <th className="text-center text-slate-500 font-semibold pb-2 pl-4">Weighted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {JUDGES.map(j => {
                      const ws = weightedScore(judgeScores[j.id], CRITERIA);
                      return (
                        <tr key={j.id} className="border-t border-white/[0.04]">
                          <td className="py-2 pr-4">
                            <p className="text-slate-300 font-medium">{j.name}</p>
                            <p className="text-slate-600">{j.role}</p>
                          </td>
                          {CRITERIA.map(c => (
                            <td key={c.id} className="py-2 px-2 text-center text-slate-300">
                              {judgeScores[j.id][c.id]}
                            </td>
                          ))}
                          <td className="py-2 pl-4 text-center font-bold text-indigo-300">
                            {ws.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 2 — Weighted Score Config ──────────────────────────────────────────
function WeightConfig({ weights, setWeights, frozen }) {
  const total = weights.reduce((s, c) => s + c.weight, 0);
  const valid = total === 100;

  return (
    <div className="mt-4 space-y-3">
      {weights.map((c, i) => (
        <div key={c.id} className="flex items-center gap-4">
          <span className="text-sm text-slate-300 w-40 shrink-0">{c.label}</span>
          <input
            type="range" min={0} max={100} step={5}
            value={c.weight}
            disabled={frozen}
            onChange={e => {
              const next = [...weights];
              next[i] = { ...c, weight: Number(e.target.value) };
              setWeights(next);
            }}
            className="flex-1 accent-indigo-500 disabled:opacity-40"
          />
          <span className={`text-sm font-bold w-10 text-right ${c.weight > 0 ? 'text-indigo-300' : 'text-slate-600'}`}>
            {c.weight}%
          </span>
        </div>
      ))}
      <div className={`flex items-center justify-between rounded-xl border px-4 py-2.5 mt-2 ${valid ? 'border-emerald-500/25 bg-emerald-500/[0.06]' : 'border-red-500/25 bg-red-500/[0.06]'}`}>
        <span className="text-xs text-slate-400">Total weight</span>
        <span className={`text-sm font-bold ${valid ? 'text-emerald-400' : 'text-red-400'}`}>
          {total}% {valid ? '✓ Valid' : '— must equal 100%'}
        </span>
      </div>
    </div>
  );
}

// ─── Step 3 — Outlier Detection ───────────────────────────────────────────────
function OutlierPanel({ scores, weights }) {
  const results = useMemo(() =>
    Object.entries(scores).map(([tid, { label, scores: judgeScores }]) => {
      const { judgeWeighted, outliers, mean, sd } = detectOutliers(judgeScores, weights);
      return { tid, label, judgeWeighted, outliers, mean, sd, hasOutlier: Object.keys(outliers).length > 0 };
    }),
    [scores, weights]
  );

  const outlierCount = results.filter(r => r.hasOutlier).length;

  return (
    <div className="mt-4 space-y-3">
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm
        ${outlierCount > 0 ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-300' : 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300'}`}>
        <Info className="w-4 h-4 shrink-0" />
        {outlierCount > 0
          ? `${outlierCount} team${outlierCount > 1 ? 's' : ''} have outlier judge scores (deviation > 1.5 SD). Review before freezing.`
          : 'No outliers detected. All judge scores are within acceptable deviation range.'}
      </div>

      {results.map(({ tid, label, judgeWeighted, outliers, mean, sd, hasOutlier }) => (
        <div key={tid} className={`rounded-xl border px-4 py-3 transition-all duration-200
          ${hasOutlier ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-white/[0.05] bg-white/[0.02]'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-200">{label}</span>
            {hasOutlier && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 rounded-full">
                <ShieldAlert className="w-3 h-3" /> Outlier
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {JUDGES.map(j => (
              <div key={j.id} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border text-xs
                ${outliers[j.id]
                  ? 'border-amber-500/30 bg-amber-500/[0.08] text-amber-300'
                  : 'border-white/[0.06] bg-white/[0.03] text-slate-400'}`}>
                <Gavel className="w-3 h-3 shrink-0" />
                <span>{j.name.split(' ')[1]}</span>
                <span className="font-bold">{judgeWeighted[j.id].toFixed(1)}</span>
                {outliers[j.id] && <AlertTriangle className="w-3 h-3 ml-0.5" />}
              </div>
            ))}
            <div className="flex items-center gap-1 rounded-lg px-3 py-1.5 border border-indigo-500/20 bg-indigo-500/[0.06] text-xs text-indigo-300">
              <TrendingUp className="w-3 h-3" />
              <span>μ {mean.toFixed(1)}</span>
              <span className="text-slate-600 mx-1">·</span>
              <span>σ {sd.toFixed(1)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 4 — Final Scores & Freeze ──────────────────────────────────────────
function FreezePanel({ scores, weights, frozen, setFrozen }) {
  const rankings = useMemo(() => {
    return Object.entries(scores)
      .map(([tid, { label, scores: judgeScores }]) => {
        const judgeWeightedScores = JUDGES.map(j => weightedScore(judgeScores[j.id], weights));
        const finalScore = avg(judgeWeightedScores);
        const { outliers } = detectOutliers(judgeScores, weights);
        return { tid, label, finalScore, hasOutlier: Object.keys(outliers).length > 0 };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((t, i) => ({ ...t, rank: i + 1 }));
  }, [scores, weights]);

  const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5">Rank</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-2.5">Team</th>
              <th className="text-right text-xs font-semibold text-slate-500 px-4 py-2.5">Final Score</th>
              <th className="text-center text-xs font-semibold text-slate-500 px-4 py-2.5">Flag</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map(({ tid, label, finalScore, rank, hasOutlier }) => (
              <tr key={tid} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className={`px-4 py-3 font-extrabold text-base ${rankColors[rank - 1] || 'text-slate-500'}`}>
                  #{rank}
                </td>
                <td className="px-4 py-3 text-slate-200 font-medium">{label}</td>
                <td className="px-4 py-3 text-right font-bold text-white">{finalScore.toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  {hasOutlier
                    ? <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 border border-amber-400/25 bg-amber-400/[0.08] px-2 py-0.5 rounded-full font-bold">
                        <AlertTriangle className="w-2.5 h-2.5" /> Outlier
                      </span>
                    : <span className="text-slate-600 text-xs">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`rounded-xl border p-4 transition-all duration-300 ${frozen ? 'border-emerald-500/30 bg-emerald-500/[0.07]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white mb-1">
              {frozen ? 'Results Frozen' : 'Freeze Results'}
            </p>
            <p className="text-xs text-slate-500">
              {frozen
                ? 'Scores are locked. No further edits to weights or judge scores are permitted. Safe to publish to Leaderboard.'
                : 'Freezing locks all scores and weights permanently. This action cannot be undone.'}
            </p>
          </div>
          <button
            onClick={() => setFrozen(!frozen)}
            className={`shrink-0 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200
              ${frozen
                ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300'
                : 'border-indigo-500/35 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'
              }`}
          >
            {frozen ? <><Lock className="w-4 h-4" /> Frozen</> : <><LockOpen className="w-4 h-4" /> Freeze Now</>}
          </button>
        </div>
        {frozen && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 border-t border-emerald-500/15 pt-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Results are ready to publish to the Leaderboard.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ScoreAggregation() {
  const [weights, setWeights] = useState(CRITERIA);
  const [frozen, setFrozen] = useState(false);
  const [scores] = useState(INITIAL_SCORES);

  const weightsValid = weights.reduce((s, c) => s + c.weight, 0) === 100;

  const outlierCount = useMemo(() =>
    Object.values(scores).filter(({ scores: js }) => {
      const { outliers } = detectOutliers(js, weights);
      return Object.keys(outliers).length > 0;
    }).length,
    [scores, weights]
  );

  // Derive pipeline step states
  const step1done = true;                         // always collected
  const step2done = weightsValid;
  const step3done = step2done;                    // outlier panel is informational
  const step4active = step2done;

  const stats = [
    { label: 'Teams Scored',    value: Object.keys(scores).length, icon: Users,    color: 'text-indigo-400' },
    { label: 'Judges',          value: JUDGES.length,               icon: Gavel,   color: 'text-violet-400' },
    { label: 'Outlier Flags',   value: outlierCount,                icon: AlertTriangle, color: outlierCount > 0 ? 'text-amber-400' : 'text-slate-500' },
    { label: 'Status',          value: frozen ? 'Frozen' : 'Open',  icon: frozen ? Lock : LockOpen, color: frozen ? 'text-emerald-400' : 'text-slate-400' },
  ];

  return (
    <div className="min-h-screen bg-[#060B16] p-6 md:p-8 text-slate-200">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Command Center</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">Score Aggregation</h1>
          <p className="text-sm text-slate-500 mt-1">Separated from Leaderboard · Source of truth for final rankings</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold
          ${frozen ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300' : 'border-slate-500/25 bg-slate-500/10 text-slate-400'}`}>
          {frozen ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
          {frozen ? 'Results Frozen' : 'Results Open'}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`${G} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-4">

        {/* Step 1 — Collect */}
        <div className={`${G} rounded-2xl p-6`}>
          <SectionHeader step={1} icon={ClipboardList} title="Collect Judge Scores"
            subtitle="Raw scores per criterion from each judge — read-only, sourced from judging portal"
            active={true} done={step1done} />
          <CollectScores scores={scores} frozen={frozen} />
        </div>

        {/* Step 2 — Weights */}
        <div className={`${G} rounded-2xl p-6 ${frozen ? 'opacity-70 pointer-events-none' : ''}`}>
          <SectionHeader step={2} icon={Calculator} title="Calculate Weighted Score"
            subtitle="Adjust criterion weights — must total 100%"
            active={!frozen} done={step2done && frozen} />
          <WeightConfig weights={weights} setWeights={setWeights} frozen={frozen} />
        </div>

        {/* Step 3 — Outliers */}
        <div className={`${G} rounded-2xl p-6`}>
          <SectionHeader step={3} icon={AlertTriangle} title="Detect Outliers"
            subtitle="Flags judges whose weighted score deviates more than 1.5 SD from the panel average"
            active={step2done} done={step3done && frozen} />
          {weightsValid
            ? <OutlierPanel scores={scores} weights={weights} />
            : <p className="text-xs text-slate-600 mt-4 ml-10">Complete weight configuration first.</p>
          }
        </div>

        {/* Step 4 — Freeze */}
        <div className={`${G} rounded-2xl p-6`}>
          <SectionHeader step={4} icon={Lock} title="Freeze Results"
            subtitle="Lock scores and publish final rankings to Leaderboard"
            active={step4active} done={frozen} />
          {step4active
            ? <FreezePanel scores={scores} weights={weights} frozen={frozen} setFrozen={setFrozen} />
            : <p className="text-xs text-slate-600 mt-4 ml-10">Complete previous steps first.</p>
          }
        </div>
      </div>
    </div>
  );
}
