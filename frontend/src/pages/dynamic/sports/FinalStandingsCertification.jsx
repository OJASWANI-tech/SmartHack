import React, { useState } from 'react';
import {
  Trophy, Medal, BadgeCheck, Download, Lock, Loader2, Award, CheckCircle2
} from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const FINAL_STANDINGS = [
  { rank: 1, team: 'Falcons', medal: '🥇', record: '8-1-0' },
  { rank: 2, team: 'Comets', medal: '🥈', record: '7-2-0' },
  { rank: 3, team: 'Sharks', medal: '🥉', record: '6-2-1' },
  { rank: 4, team: 'Titans', medal: '', record: '5-3-1' },
];

const CERTIFICATES = [
  { id: 1, name: 'Falcons', role: 'Champion', issued: false },
  { id: 2, name: 'Comets', role: 'Runner-up', issued: false },
  { id: 3, name: 'Sharks', role: 'Third Place', issued: false },
  { id: 4, name: 'N. Verma', role: 'Most Valuable Player', issued: false },
];

export default function FinalStandingsCertification() {
  const [certificates, setCertificates] = useState(CERTIFICATES);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [toast, setToast] = useState('');

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const issuedCount = certificates.filter((c) => c.issued).length;

  const issueCertificate = (id) => {
    setCertificates((prev) => prev.map((c) => (c.id === id ? { ...c, issued: true } : c)));
    const cert = certificates.find((c) => c.id === id);
    triggerToast(`Certificate issued to ${cert?.name}.`);
  };

  const issueAll = () => {
    setCertificates((prev) => prev.map((c) => ({ ...c, issued: true })));
    triggerToast('All certificates issued.');
  };

  const handlePublishFinal = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublished(true);
      triggerToast('Final standings published and locked.');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Closing Ceremony</p>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Final Standings, Awards & Certification</h1>
        </div>
        <button
          onClick={handlePublishFinal}
          disabled={isPublishing || published}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold px-4 py-2.5 text-sm transition-all duration-300"
        >
          {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : published ? <Lock className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
          {isPublishing ? 'Publishing…' : published ? 'Published & Locked' : 'Publish Final Standings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${GLASS} rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Final Tournament Standings</h2>
            {published && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">Locked</span>}
          </div>
          <div className="space-y-3">
            {FINAL_STANDINGS.map((s) => (
              <div key={s.rank} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm flex items-center justify-center">{s.rank}</span>
                  <span className="font-semibold text-white text-sm">{s.medal} {s.team}</span>
                </div>
                <span className="text-xs font-mono text-slate-400">{s.record}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${GLASS} rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Medal className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Awards & Certificate Distribution</h2>
            </div>
            <button
              onClick={issueAll}
              disabled={issuedCount === certificates.length}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <Download className="w-3.5 h-3.5" /> Issue All
            </button>
          </div>
          <div className="space-y-3">
            {certificates.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold text-white text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.role}</div>
                  </div>
                </div>
                {c.issued ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> Issued
                  </span>
                ) : (
                  <button
                    onClick={() => issueCertificate(c.id)}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold text-xs px-3 py-2 transition-all duration-300"
                  >
                    Issue Certificate
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-4">{issuedCount} of {certificates.length} certificates issued.</p>
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
