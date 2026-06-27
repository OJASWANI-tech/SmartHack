import React, { useState } from 'react';
import {
  BadgeCheck, FileWarning, ShieldCheck, ShieldX, FileText, CheckSquare, Square,
  UserCheck, AlertTriangle, Loader2
} from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const INITIAL_ATHLETES = [
  { id: 1, name: 'Aarav Mehta', team: 'Falcons', idDoc: 'Verified', medicalWaiver: 'Signed', ageProof: 'Verified', flags: [], status: 'eligible' },
  { id: 2, name: 'Diya Kapoor', team: 'Titans', idDoc: 'Pending', medicalWaiver: 'Signed', ageProof: 'Verified', flags: ['ID document mismatch'], status: 'review' },
  { id: 3, name: 'Rohan Iyer', team: 'Wolves', idDoc: 'Verified', medicalWaiver: 'Missing', ageProof: 'Verified', flags: ['Medical waiver not submitted'], status: 'blocked' },
  { id: 4, name: 'Sara Khan', team: 'Sharks', idDoc: 'Verified', medicalWaiver: 'Signed', ageProof: 'Pending', flags: ['Age proof under review'], status: 'review' },
  { id: 5, name: 'Vikram Nair', team: 'Eagles', idDoc: 'Verified', medicalWaiver: 'Signed', ageProof: 'Verified', flags: [], status: 'eligible' },
];

const STATUS_STYLES = {
  eligible: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  review: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  blocked: 'border-red-500/40 bg-red-500/10 text-red-400',
};

const DOC_STYLES = {
  Verified: 'text-emerald-400',
  Signed: 'text-emerald-400',
  Pending: 'text-amber-400',
  Missing: 'text-red-400',
};

export default function AthleteEligibilityWaivers() {
  const [athletes, setAthletes] = useState(INITIAL_ATHLETES);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState('');

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reviewable = athletes.filter((a) => a.status !== 'eligible');

  const toggleSelectAll = () => {
    if (selectedIds.length === reviewable.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reviewable.map((a) => a.id));
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    setTimeout(() => {
      setAthletes((prev) =>
        prev.map((a) => (selectedIds.includes(a.id) ? { ...a, status: 'eligible', flags: [] } : a))
      );
      triggerToast(`${selectedIds.length} waiver${selectedIds.length > 1 ? 's' : ''} approved.`);
      setSelectedIds([]);
      setIsProcessing(false);
    }, 700);
  };

  const handleSingleAction = (id, status) => {
    setAthletes((prev) => prev.map((a) => (a.id === id ? { ...a, status, flags: status === 'eligible' ? [] : a.flags } : a)));
    triggerToast(status === 'eligible' ? 'Athlete marked eligible.' : 'Athlete blocked from competition.');
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const eligibleCount = athletes.filter((a) => a.status === 'eligible').length;
  const blockedCount = athletes.filter((a) => a.status === 'blocked').length;
  const reviewCount = athletes.filter((a) => a.status === 'review').length;

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Compliance Gate</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Athlete Eligibility & Waiver Verification</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}>
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-lg font-bold text-white">{eligibleCount}</div>
            <div className="text-xs text-slate-500">Eligible Athletes</div>
          </div>
        </div>
        <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}>
          <FileWarning className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-lg font-bold text-white">{reviewCount}</div>
            <div className="text-xs text-slate-500">Pending Review</div>
          </div>
        </div>
        <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}>
          <ShieldX className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-lg font-bold text-white">{blockedCount}</div>
            <div className="text-xs text-slate-500">Blocked / Ineligible</div>
          </div>
        </div>
      </div>

      <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Eligibility & Waiver Roster</h2>
          </div>
          <button
            onClick={handleBulkApprove}
            disabled={selectedIds.length === 0 || isProcessing}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-400 font-semibold text-xs px-3 py-2 transition-all duration-300"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
            Bulk Approve Selected ({selectedIds.length})
          </button>
        </div>

        <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="text-left px-4 py-2.5">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-300">
                    {selectedIds.length === reviewable.length && reviewable.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-4 py-2.5 text-xs uppercase text-slate-500 font-semibold">Athlete</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase text-slate-500 font-semibold">ID Doc</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase text-slate-500 font-semibold">Medical Waiver</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase text-slate-500 font-semibold">Age Proof</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase text-slate-500 font-semibold">Status</th>
                <th className="text-right px-4 py-2.5 text-xs uppercase text-slate-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    {a.status !== 'eligible' && (
                      <button onClick={() => toggleSelect(a.id)} className="text-slate-500 hover:text-slate-300">
                        {selectedIds.includes(a.id) ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white text-sm">{a.name}</div>
                    <div className="text-xs text-slate-500">{a.team}</div>
                    {a.flags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-400">
                        <AlertTriangle className="w-3 h-3" /> {a.flags[0]}
                      </div>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-xs font-semibold ${DOC_STYLES[a.idDoc]}`}>{a.idDoc}</td>
                  <td className={`px-4 py-3 text-xs font-semibold ${DOC_STYLES[a.medicalWaiver]}`}>{a.medicalWaiver}</td>
                  <td className={`px-4 py-3 text-xs font-semibold ${DOC_STYLES[a.ageProof]}`}>{a.ageProof}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${STATUS_STYLES[a.status]}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status !== 'eligible' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleSingleAction(a.id, 'eligible')} className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline">
                          <UserCheck className="w-3.5 h-3.5" /> Clear
                        </button>
                        <button onClick={() => handleSingleAction(a.id, 'blocked')} className="flex items-center gap-1 text-xs font-semibold text-red-400 hover:underline">
                          <ShieldX className="w-3.5 h-3.5" /> Block
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center justify-end gap-1 text-xs text-slate-500">
                        <FileText className="w-3.5 h-3.5" /> Documents on file
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
