import React, { useState, useMemo } from 'react';
import { 
  Terminal, ShieldAlert, CheckCircle2, XCircle, Clock, Cpu, 
  Search, RefreshCw, Eye, AlertTriangle, ShieldCheck, Zap
} from 'lucide-react';

const GLASS_CARD = 'bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-lg';

export default function CodingSubmissions() {
  const [toastMessage, setToastMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRejudging, setIsRejudging] = useState({});
  const [selectedSubCode, setSelectedSubCode] = useState(null);

  // Core databases initialized clear for database/live telemetry wiring
  const [submissions, setSubmissions] = useState([]);
  const [plagAlerts, setPlagAlerts] = useState([]);

  // Aggregate stats metrics fallback configuration
  const metrics = useMemo(() => {
    if (submissions.length === 0) {
      return { total: 0, ac: 0, wa: 0, tle: 0, mle: 0, plag: 0 };
    }
    return submissions.reduce((acc, sub) => {
      acc.total++;
      if (sub.status === 'Answered') acc.ac++;
      else if (sub.status === 'Wrong Answer') acc.wa++;
      else if (sub.status === 'TLE') acc.tle++;
      else if (sub.status === 'MLE') acc.mle++;
      else if (sub.status === 'Plag') acc.plag++;
      return acc;
    }, { total: 0, ac: 0, wa: 0, tle: 0, mle: 0, plag: 0 });
  }, [submissions]);

  // Dynamic distribution width calculations
  const distributionPercentages = useMemo(() => {
    const total = metrics.total || 1;
    return {
      ac: ((metrics.ac / total) * 100).toFixed(1),
      wa: ((metrics.wa / total) * 100).toFixed(1),
      tle: ((metrics.tle / total) * 100).toFixed(1),
      mle: ((metrics.mle / total) * 100).toFixed(1),
      plag: ((metrics.plag / total) * 100).toFixed(1),
    };
  }, [metrics]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleRejudge = (subId) => {
    setIsRejudging(prev => ({ ...prev, [subId]: true }));
    triggerToast(`🔄 Rejudging submission ${subId} against compiler testcases...`);
    setTimeout(() => {
      setIsRejudging(prev => ({ ...prev, [subId]: false }));
      triggerToast(`✓ Submission ${subId} successfully updated.`);
    }, 1500);
  };

  const handleDismissPlag = (alertId, user1, user2) => {
    setPlagAlerts(prev => prev.filter(a => a.id !== alertId));
    triggerToast(`✓ Plagiarism flag dismissed between @${user1} and @${user2}.`);
  };

  const handleDisqualify = (alertId, user) => {
    triggerToast(`⚠️ Contestant @${user} disqualified for plagiarism.`);
    setPlagAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
      const matchesSearch = sub.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sub.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            sub.id.includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [submissions, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen p-6 font-sans text-slate-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-400 font-extrabold">// Contest Telemetry Core</span>
          <h1 className="text-2xl font-black text-white mt-1 tracking-tight">Submission Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Audit runs, TLE/MLE diagnostics, plagiarism index scanners, and memory profiling.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f172a] border border-slate-800 text-xs">
          <span className={`h-2 w-2 rounded-full ${submissions.length > 0 ? 'bg-cyan-500 animate-pulse' : 'bg-slate-600'}`}></span>
          <span className="text-slate-400 font-mono">{submissions.length > 0 ? 'Real-time compiler link' : 'Link idle'}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-[#0f172a]/60 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Runs</span>
          <span className="text-2xl font-black text-white font-mono block mt-1">{metrics.total}</span>
        </div>
        <div className="bg-[#0f172a]/60 border border-emerald-950/40 rounded-xl p-4 text-center">
          <span className="text-[10px] text-emerald-500 font-bold uppercase block">Answered (AC)</span>
          <span className="text-2xl font-black text-emerald-400 font-mono block mt-1">{metrics.ac}</span>
        </div>
        <div className="bg-[#0f172a]/60 border border-red-950/40 rounded-xl p-4 text-center">
          <span className="text-[10px] text-red-500 font-bold uppercase block">Wrong Answer</span>
          <span className="text-2xl font-black text-red-400 font-mono block mt-1">{metrics.wa}</span>
        </div>
        <div className="bg-[#0f172a]/60 border border-amber-950/40 rounded-xl p-4 text-center">
          <span className="text-[10px] text-amber-500 font-bold uppercase block">TLE Cases</span>
          <span className="text-2xl font-black text-amber-400 font-mono block mt-1">{metrics.tle}</span>
        </div>
        <div className="bg-[#0f172a]/60 border border-purple-950/40 rounded-xl p-4 text-center">
          <span className="text-[10px] text-purple-500 font-bold uppercase block">MLE Cases</span>
          <span className="text-2xl font-black text-purple-400 font-mono block mt-1">{metrics.mle}</span>
        </div>
        <div className="bg-[#0f172a]/60 border border-pink-950/40 rounded-xl p-4 text-center text-rose-400 bg-pink-500/5">
          <span className="text-[10px] text-rose-450 font-bold uppercase block">Plag Flags</span>
          <span className="text-2xl font-black text-pink-400 font-mono block mt-1">{metrics.plag}</span>
        </div>
      </div>

      {/* Mid Section: Distribution bar and plagiarism review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Status Distribution */}
        <div className={`${GLASS_CARD} lg:col-span-2`}>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-400" /> Compiler Status Distribution
          </h3>

          <div className="h-6 w-full rounded-lg bg-slate-950 overflow-hidden flex border border-slate-800 p-0.5 mb-6">
            {metrics.total === 0 ? (
              <div className="w-full h-full bg-slate-900 rounded flex items-center justify-center text-[10px] text-slate-600 font-mono">No compiler logs available</div>
            ) : (
              <>
                <div style={{ width: `${distributionPercentages.ac}%` }} className="h-full bg-emerald-500 rounded-l" title={`Accepted: ${distributionPercentages.ac}%`} />
                <div style={{ width: `${distributionPercentages.wa}%` }} className="h-full bg-red-500" title={`Wrong Answer: ${distributionPercentages.wa}%`} />
                <div style={{ width: `${distributionPercentages.tle}%` }} className="h-full bg-amber-500" title={`TLE: ${distributionPercentages.tle}%`} />
                <div style={{ width: `${distributionPercentages.mle}%` }} className="h-full bg-purple-500" title={`MLE: ${distributionPercentages.mle}%`} />
                <div style={{ width: `${distributionPercentages.plag}%` }} className="h-full bg-pink-500 rounded-r" title={`Plagiarism: ${distributionPercentages.plag}%`} />
              </>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-lg text-center">
              <span className="text-[10px] font-bold text-emerald-400 block">Accepted</span>
              <span className="text-sm font-black font-mono text-white block mt-0.5">{metrics.total > 0 ? `${distributionPercentages.ac}%` : '0%'}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-lg text-center">
              <span className="text-[10px] font-bold text-red-400 block">Wrong</span>
              <span className="text-sm font-black font-mono text-white block mt-0.5">{metrics.total > 0 ? `${distributionPercentages.wa}%` : '0%'}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-lg text-center">
              <span className="text-[10px] font-bold text-amber-400 block">TLE</span>
              <span className="text-sm font-black font-mono text-white block mt-0.5">{metrics.total > 0 ? `${distributionPercentages.tle}%` : '0%'}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-lg text-center">
              <span className="text-[10px] font-bold text-purple-400 block">MLE</span>
              <span className="text-sm font-black font-mono text-white block mt-0.5">{metrics.total > 0 ? `${distributionPercentages.mle}%` : '0%'}</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-lg text-center">
              <span className="text-[10px] font-bold text-pink-400 block">Plagiarism</span>
              <span className="text-sm font-black font-mono text-white block mt-0.5">{metrics.total > 0 ? `${distributionPercentages.plag}%` : '0%'}</span>
            </div>
          </div>
        </div>

        {/* Plagiarism Radar Audit */}
        <div className={GLASS_CARD}>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Plagiarism Scanner Flags
          </h3>

          <div className="space-y-4 max-h-[160px] overflow-y-auto pr-1">
            {plagAlerts.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500/50" />
                No pending plagiarism audits remaining.
              </div>
            ) : (
              plagAlerts.map(alert => (
                <div key={alert.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg flex flex-col justify-between gap-2.5 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white block">{alert.problem}</span>
                      <span className="text-[10px] text-slate-500">@{alert.user1} vs @{alert.user2}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-450">
                      {alert.similarity} Match
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-900">
                    <button
                      onClick={() => handleDismissPlag(alert.id, alert.user1, alert.user2)}
                      className="px-2 py-1 rounded bg-[#102030] hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-[9px] cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleDisqualify(alert.id, alert.user1)}
                      className="px-2 py-1 rounded bg-rose-550 hover:bg-rose-500 text-white font-bold text-[9px] cursor-pointer"
                    >
                      Disqualify @{alert.user1}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bottom section: Log view with search and filters */}
      <div className={GLASS_CARD}>
        
        {/* Controls Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Submission Records</h2>
            <span className="text-[10px] text-slate-500 font-mono">Showing {filteredSubmissions.length} results</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search competitor, problem..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
              {['All', 'Answered', 'Wrong Answer', 'TLE', 'MLE', 'Plag'].map(status => {
                const isActive = statusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-indigo-650 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-200 bg-transparent'
                    }`}
                  >
                    {status === 'Answered' ? 'Answered (AC)' : status}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#0f172a] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <th className="p-4 w-20">Sub ID</th>
                <th className="p-4">Time</th>
                <th className="p-4">Contestant</th>
                <th className="p-4">Problem</th>
                <th className="p-4">Language</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Runtime</th>
                <th className="p-4 text-center">Memory</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-slate-350">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                    No active sandbox records matching criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/10">
                    <td className="p-4 font-mono font-bold text-slate-450">{row.id}</td>
                    <td className="p-4 text-slate-500 font-mono text-[11px]">{row.time}</td>
                    <td className="p-4 font-bold text-white font-mono">@{row.user}</td>
                    <td className="p-4 text-slate-400">{row.problem}</td>
                    <td className="p-4 font-semibold text-slate-400 font-mono">{row.lang}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        row.status === 'Answered' 
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                          : row.status === 'Wrong Answer' 
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                          : row.status === 'TLE'
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          : row.status === 'MLE'
                          ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-450'
                      }`}>
                        {row.status === 'Answered' ? 'Answered' : row.status === 'Plag' ? 'Plagiarism Flag' : row.status}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-[11px] text-slate-400">{row.runtime}</td>
                    <td className="p-4 text-center font-mono text-[11px] text-slate-400">{row.memory}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedSubCode(row)}
                          className="flex items-center gap-1 bg-[#102030] hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-1 px-2.5 rounded text-[10px] cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View Code
                        </button>
                        <button
                          onClick={() => handleRejudge(row.id)}
                          disabled={isRejudging[row.id]}
                          className="flex items-center gap-1 bg-[#152e25] hover:bg-slate-900 border border-slate-800 text-emerald-450 font-bold py-1 px-2.5 rounded text-[10px] cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRejudging[row.id] ? 'animate-spin' : ''}`} /> Rejudge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Code Viewer Modal */}
      {selectedSubCode && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Submission Code Viewer ({selectedSubCode.id})</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Competitor: @{selectedSubCode.user} | Problem: {selectedSubCode.problem} | Lang: {selectedSubCode.lang}</p>
              </div>
              <button 
                onClick={() => setSelectedSubCode(null)}
                className="text-slate-500 hover:text-white font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <pre className="bg-slate-950 p-4 border border-slate-900 rounded-lg text-slate-350 text-xs font-mono overflow-auto max-h-[300px] leading-relaxed">
              <code>{selectedSubCode.code}</code>
            </pre>
            <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => setSelectedSubCode(null)}
                className="px-4 py-1.5 rounded bg-[#102030] hover:bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}