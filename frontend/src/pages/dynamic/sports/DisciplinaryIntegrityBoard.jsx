import React, { useState } from 'react';
import {
  Gavel, FlaskConical, FileSearch, AlertOctagon, ShieldAlert, CheckCircle2,
  XCircle, Clock, ChevronRight
} from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const INITIAL_CASES = [
  { id: 'C-201', type: 'Code of Conduct', athlete: 'M. Reddy', team: 'Hurricanes', summary: 'Verbal altercation with official after disputed call.', severity: 'high', status: 'open', filedAgo: '12m ago' },
  { id: 'C-202', type: 'Protest', athlete: '—', team: 'Bears', summary: 'Formal protest filed over eligibility of an opposing player.', severity: 'medium', status: 'open', filedAgo: '34m ago' },
  { id: 'C-203', type: 'Anti-Doping', athlete: 'K. Fernandes', team: 'Vipers', summary: 'Routine sample collection flagged for follow-up confirmatory test.', severity: 'high', status: 'review', filedAgo: '1h ago' },
  { id: 'C-204', type: 'Code of Conduct', athlete: 'J. Thomas', team: 'Raptors', summary: 'Unsporting conduct — excessive celebration penalty.', severity: 'low', status: 'resolved', filedAgo: '3h ago' },
];

const SEVERITY_STYLES = {
  high: 'border-red-500/40 bg-red-500/10 text-red-400',
  medium: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  low: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
};

const STATUS_STYLES = {
  open: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  review: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  resolved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
};

const TYPE_ICON = {
  'Code of Conduct': ShieldAlert,
  Protest: FileSearch,
  'Anti-Doping': FlaskConical,
};

export default function DisciplinaryIntegrityBoard() {
  const [cases, setCases] = useState(INITIAL_CASES);
  const [activeCase, setActiveCase] = useState(null);
  const [ruling, setRuling] = useState('');
  const [toast, setToast] = useState('');

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const openCount = cases.filter((c) => c.status === 'open').length;
  const reviewCount = cases.filter((c) => c.status === 'review').length;
  const resolvedCount = cases.filter((c) => c.status === 'resolved').length;

  const handleAdvance = (id) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status: c.status === 'open' ? 'review' : c.status } : c)));
    triggerToast(`Case ${id} moved to jury review.`);
  };

  const handleRule = (id, verdict) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'resolved', verdict } : c)));
    triggerToast(`Case ${id} resolved — ${verdict}.`);
    setActiveCase(null);
    setRuling('');
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Integrity Office</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Disciplinary, Anti-Doping & Grievance Board</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}>
          <AlertOctagon className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-lg font-bold text-white">{openCount}</div>
            <div className="text-xs text-slate-500">Open Incidents</div>
          </div>
        </div>
        <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}>
          <Gavel className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-lg font-bold text-white">{reviewCount}</div>
            <div className="text-xs text-slate-500">In Jury Review</div>
          </div>
        </div>
        <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-lg font-bold text-white">{resolvedCount}</div>
            <div className="text-xs text-slate-500">Resolved Cases</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${GLASS} rounded-2xl p-6 lg:col-span-2`}>
          <h2 className="text-sm font-bold text-white mb-4">Case File Register</h2>
          <div className="space-y-3">
            {cases.map((c) => {
              const Icon = TYPE_ICON[c.type] || FileSearch;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCase(c)}
                  className={`w-full text-left rounded-xl border p-4 transition-all duration-300 ${
                    activeCase?.id === c.id ? 'border-indigo-500/50 bg-indigo-500/[0.06]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-white text-sm">{c.id} · {c.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[c.severity]}`}>{c.severity}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-1.5">{c.summary}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{c.athlete !== '—' ? `${c.athlete} · ` : ''}{c.team}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.filedAgo}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${GLASS} rounded-2xl p-6`}>
          <h2 className="text-sm font-bold text-white mb-4">Adjudication Panel</h2>
          {!activeCase ? (
            <p className="text-xs text-slate-500">Select a case file from the register to begin adjudication.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="text-sm font-bold text-white mb-1">{activeCase.id} · {activeCase.type}</div>
                <p className="text-xs text-slate-400">{activeCase.summary}</p>
              </div>

              {activeCase.status === 'open' && (
                <button
                  onClick={() => { handleAdvance(activeCase.id); setActiveCase({ ...activeCase, status: 'review' }); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold text-xs px-4 py-2.5 transition-all duration-300"
                >
                  Escalate to Jury of Appeal <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {activeCase.status === 'review' && (
                <>
                  <textarea
                    value={ruling}
                    onChange={(e) => setRuling(e.target.value)}
                    placeholder="Jury ruling notes (optional)…"
                    className="w-full bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition-all duration-300 min-h-[72px]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRule(activeCase.id, 'Sanction upheld')}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs px-3 py-2 transition-all duration-300"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Uphold Sanction
                    </button>
                    <button
                      onClick={() => handleRule(activeCase.id, 'Dismissed')}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs px-3 py-2 transition-all duration-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Dismiss Case
                    </button>
                  </div>
                </>
              )}

              {activeCase.status === 'resolved' && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3.5 text-xs text-emerald-300">
                  Resolved: {activeCase.verdict || 'Closed by board.'}
                </div>
              )}
            </div>
          )}
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
