import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Sparkles, CheckCircle2, XCircle, Loader2, ShieldCheck, ArrowRight
} from 'lucide-react';
import { getTeams, approveSingleTeam, rejectSingleTeam, approveEntireStage } from '../../../services/committee';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const STATUS_STYLES = {
  approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-400',
  proposed: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
};

export default function TeamFormationResults() {
  const navigate = useNavigate();
  const [eventId, setEventId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [toast, setToast] = useState('');

  const loadTeams = useCallback(async () => {
    const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
    setEventId(currentEventId);
    if (!currentEventId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getTeams(currentEventId);
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const handleApprove = async (teamId) => {
    try {
      setProcessingId(teamId);
      await approveSingleTeam(eventId, teamId);
      setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, approval_status: 'approved' } : t)));
    } catch (err) {
      triggerToast(err.message || 'Approval failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (teamId) => {
    try {
      setProcessingId(teamId);
      await rejectSingleTeam(eventId, teamId);
      setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, approval_status: 'rejected' } : t)));
    } catch (err) {
      triggerToast(err.message || 'Rejection failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleFinalize = async () => {
    const hasUnreviewed = teams.some((t) => !t.approval_status || t.approval_status === 'proposed');
    if (hasUnreviewed && !window.confirm('Some squads are still unreviewed. Lock the roster anyway?')) return;

    try {
      setFinalizing(true);
      await approveEntireStage(eventId);
      triggerToast('Squads locked in — heading to Tournament Setup.');
      setTimeout(() => navigate('/dynamic-test/case-config'), 900);
    } catch (err) {
      triggerToast(err.message || 'Finalize failed.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading formed squads…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Step 2 of 2</p>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Squad Formation Review</h1>
        </div>
        <button
          onClick={handleFinalize}
          disabled={finalizing || teams.length === 0}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold px-5 py-3 transition-all duration-300"
        >
          {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {finalizing ? 'Locking…' : 'Lock Squads & Continue'}
          {!finalizing && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      {teams.length === 0 ? (
        <div className={`${GLASS} rounded-2xl p-12 text-center`}>
          <Users className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No squads formed yet</h3>
          <p className="text-sm text-slate-500">Go back to Intake & Formation to run the team formation engine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            const status = team.approval_status || 'proposed';
            return (
              <article key={team.id} className={`${GLASS} rounded-2xl p-6 flex flex-col transition-all duration-300 hover:border-white/20`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">{team.name}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${STATUS_STYLES[status]}`}>
                    {status}
                  </span>
                </div>

                <div className="flex-1">
                  <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Roster</h4>
                  <ul className="space-y-1 mb-4">
                    {(team.members || []).map((m, idx) => (
                      <li key={idx} className="text-sm text-slate-300 flex items-center justify-between">
                        <span>{m.name}</span>
                        {m.domain && <span className="text-xs text-slate-500">{m.domain}</span>}
                      </li>
                    ))}
                    {(!team.members || team.members.length === 0) && (
                      <li className="text-xs text-slate-500">No roster metadata linked.</li>
                    )}
                  </ul>

                  {team.llm_rationale && (
                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] p-3 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-cyan-200/90 italic">{team.llm_rationale}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleApprove(team.id)}
                    disabled={processingId !== null}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold px-3 py-2 text-sm transition-all duration-300 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(team.id)}
                    disabled={processingId !== null}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold px-3 py-2 text-sm transition-all duration-300 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-cyan-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          {toast}
        </div>
      )}
    </div>
  );
}
