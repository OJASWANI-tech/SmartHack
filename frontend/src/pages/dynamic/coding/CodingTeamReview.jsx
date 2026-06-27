import React, { useState, useMemo } from 'react';
import { 
  Users, CheckCircle2, XCircle, Search, HelpCircle, 
  ChevronDown, ChevronUp, Check, X, MessageSquare 
} from 'lucide-react';

const GLASS_CARD = 'bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-lg';

export default function CodingTeamReview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [expandedRationales, setExpandedRationales] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  // Core roster database initialized clear for dynamic runtime wiring
  const [contestants, setContestants] = useState([]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleStatusChange = (id, nextStatus) => {
    const targetUser = contestants.find(c => c.id === id)?.user || 'Contestant';
    setContestants(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
    triggerToast(`✓ @${targetUser} status set to ${nextStatus}.`);
  };

  const handleBulkStatus = (status) => {
    if (contestants.length === 0) return;
    setContestants(prev => prev.map(c => ({ ...c, status })));
    triggerToast(`✓ All contestants set to ${status}.`);
  };

  const toggleRationale = (id) => {
    setExpandedRationales(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Memoized performance metrics derived explicitly from active arrays
  const stats = useMemo(() => {
    return {
      total: contestants.length,
      approved: contestants.filter(c => c.status === 'Approved').length,
      pending: contestants.filter(c => c.status === 'Pending').length,
      rejected: contestants.filter(c => c.status === 'Rejected').length
    };
  }, [contestants]);

  // Context-aware search matching across multiple fields
  const filteredContestants = useMemo(() => {
    return contestants.filter(c => {
      const matchesSearch = 
        c.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.institution?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [contestants, searchQuery, filterStatus]);

  const statusStyles = {
    Approved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Pending: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Rejected: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  };

  return (
    <div className="min-h-screen p-6 font-sans text-slate-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Contestant Review & Verification</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review registered individual contestants, their ratings, assigned divisions, and verification status.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-800 px-3.5 py-1.5 rounded-lg text-xs">
          <span className={`h-2 w-2 rounded-full ${stats.total > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-600'}`}></span>
          <span className="text-slate-400">Total Roster: {stats.total}</span>
        </div>
      </div>

      {/* Stats Cards Bar */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        <span className="bg-[#0f172a] border border-slate-800 text-slate-300 text-xs px-3.5 py-1.5 rounded-lg font-semibold">
          {stats.total} contestants registered
        </span>
        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3.5 py-1.5 rounded-lg font-semibold">
          {stats.approved} approved
        </span>
        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3.5 py-1.5 rounded-lg font-semibold">
          {stats.pending} pending
        </span>
        <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3.5 py-1.5 rounded-lg font-semibold">
          {stats.rejected} rejected
        </span>
      </div>

      {/* Control Action Bar */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => handleBulkStatus('Approved')}
            disabled={contestants.length === 0}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 disabled:hover:bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Approve All
          </button>
          <button 
            onClick={() => handleBulkStatus('Rejected')}
            disabled={contestants.length === 0}
            className="bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 disabled:hover:bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Reject All
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search handles, names, or schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-indigo-500/50"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Contestant Cards Grid (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContestants.map((c) => {
          const isRationaleOpen = expandedRationales[c.id];
          return (
            <div key={c.id} className={`${GLASS_CARD} flex flex-col justify-between`}>
              <div>
                {/* Contestant Card Header */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white tracking-tight font-mono">@{c.user}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyles[c.status]}`}>
                    {c.status}
                  </span>
                </div>

                {/* Details List */}
                <div className="space-y-2.5 mb-5 text-xs text-slate-300">
                  <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                    <span className="text-slate-500">Full Name</span>
                    <strong className="text-white font-medium">{c.name}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                    <span className="text-slate-500">Institution</span>
                    <span className="text-slate-300 text-right truncate max-w-[180px]" title={c.institution}>{c.institution}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                    <span className="text-slate-500">CF Rating / Rank</span>
                    <span className="text-amber-400 font-bold">{c.rating} ({c.rank})</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500">Target Division</span>
                    <span className="text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10.5px]">
                      {c.division}
                    </span>
                  </div>
                </div>

                {/* AI Rationale Expansion */}
                <div className="border-t border-slate-800/60 pt-3 mb-4">
                  <button
                    onClick={() => toggleRationale(c.id)}
                    className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Auto-Allocation rationale
                    </span>
                    {isRationaleOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isRationaleOpen && (
                    <p className="text-[11px] text-slate-400 mt-2 bg-slate-950/40 p-2.5 border border-slate-800/40 rounded-lg leading-relaxed font-sans">
                      {c.rationale || 'No historical allocation records found for this registry item.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/40">
                <button
                  onClick={() => handleStatusChange(c.id, 'Approved')}
                  className="flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => handleStatusChange(c.id, 'Rejected')}
                  className="flex items-center justify-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          );
        })}

        {filteredContestants.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs italic">
            {contestants.length === 0 
              ? 'No dynamic contestants found in current deployment pipeline.' 
              : 'No contestants matching specific lookup filters.'}
          </div>
        )}
      </div>

      {/* Bottom Fixed Action Bar */}
      <div className="mt-8 pt-5 border-t border-slate-800 flex justify-between items-center text-xs">
        <span className="text-slate-500 font-mono">
          Status: {stats.approved} / {stats.total} Approved
        </span>
        <div className="flex gap-3">
          <button 
            onClick={() => triggerToast('✓ Roster approved and locked.')}
            disabled={contestants.length === 0}
            className="bg-[#0f172a] hover:bg-slate-950 disabled:opacity-40 disabled:hover:bg-[#0f172a] border border-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Finalize List
          </button>
          <button 
            onClick={() => triggerToast('✓ Credentials and contest invites broadcasted to all approved contestants.')}
            disabled={stats.approved === 0}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold px-5 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Send Communications →
          </button>
        </div>
      </div>
    </div>
  );
}