import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, Loader2, ListChecks
} from 'lucide-react';

const GLASS = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]';

export default function TeamFormationApproval() {
  const [eventName, setEventName] = useState('Case Competition');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [teams, setTeams] = useState([
    { id: 1, name: 'Meridian Strategy', track: 'Track A', members: 4, status: 'Approved' },
    { id: 2, name: 'NorthStar Group', track: 'Track A', members: 3, status: 'Approved' },
    { id: 3, name: 'Catalyst Partners', track: 'Track A', members: 4, status: 'Pending Review' },
    { id: 4, name: 'Apex Consulting', track: 'Track A', members: 4, status: 'Pending Review' },
    { id: 5, name: 'Vertex Advisory', track: 'Track B', members: 4, status: 'Pending Review' },
    { id: 6, name: 'Ironclad Ventures', track: 'Track B', members: 4, status: 'Approved' },
    { id: 7, name: 'Summit Collective', track: 'Track B', members: 3, status: 'Rejected', reason: 'Below minimum team size after withdrawal' },
    { id: 8, name: 'Lumen Insights', track: 'Track C', members: 3, status: 'Pending Review' }
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

  const setStatus = (id, status) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    triggerToast(`Team ${status === 'Approved' ? 'approved' : 'rejected'} and roster finalized.`);
  };

  const approveAllPending = () => {
    setTeams((prev) => prev.map((t) => (t.status === 'Pending Review' ? { ...t, status: 'Approved' } : t)));
    triggerToast('All pending teams approved in this batch.');
  };

  const approvedCount = teams.filter((t) => t.status === 'Approved').length;
  const pendingCount = teams.filter((t) => t.status === 'Pending Review').length;
  const rejectedCount = teams.filter((t) => t.status === 'Rejected').length;

  const statusStyles = {
    Approved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'Pending Review': 'text-amber-300 bg-amber-400/10 border-amber-400/30',
    Rejected: 'text-red-400 bg-red-500/10 border-red-500/30'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060B16] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading team approvals…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B16] p-6 md:p-8 text-slate-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Team Formation &amp; Approval</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{eventName}</h1>
        </div>
        <button
          onClick={approveAllPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-semibold transition-all duration-300"
        >
          <ListChecks className="w-4 h-4" /> Approve All Pending
        </button>
      </div>

      {/* Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Approved Teams', value: approvedCount, accent: 'text-emerald-400', icon: CheckCircle2 },
          { label: 'Pending Review', value: pendingCount, accent: 'text-amber-300', icon: Clock },
          { label: 'Rejected', value: rejectedCount, accent: 'text-red-400', icon: XCircle }
        ].map(({ label, value, accent, icon: Icon }) => (
          <div key={label} className={`${GLASS} rounded-2xl p-6 transition-all duration-300 hover:border-white/20`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
              <Icon className={`w-5 h-5 ${accent}`} />
            </div>
            <div className="text-3xl font-extrabold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Roster review list */}
      <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">Finalized Roster Review</h2>
        </div>
        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100 truncate">{team.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 border border-white/[0.08] rounded-full px-2 py-0.5">{team.track}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{team.members} members{team.reason ? ` · ${team.reason}` : ''}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${statusStyles[team.status]}`}>
                  {team.status}
                </span>
                {team.status === 'Pending Review' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStatus(team.id, 'Approved')}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg px-3 py-1.5 transition-all duration-300"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setStatus(team.id, 'Rejected')}
                      className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 rounded-lg px-3 py-1.5 transition-all duration-300"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
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
