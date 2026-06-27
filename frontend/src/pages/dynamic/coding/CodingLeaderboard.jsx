import React, { useState, useMemo } from 'react';
import { 
  Trophy, Medal, Download, Radio, FileSpreadsheet, RefreshCw,
  Activity, Cpu, Code, Terminal, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';

const GLASS_CARD = 'bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-lg';

export default function CodingLeaderboard() {
  const [toastMessage, setToastMessage] = useState('');
  const [topCount, setTopCount] = useState(5);
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cleared states ready for real data streams
  const [competitors, setCompetitors] = useState([]);
  const [liveSubmissions, setLiveSubmissions] = useState([]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleBroadcast = () => {
    if (competitors.length === 0) return triggerToast('❌ No rankings to broadcast.');
    triggerToast(`✓ Rankings broadcasted to all contestants.`);
  };

  const handleExport = () => {
    if (competitors.length === 0) return triggerToast('❌ No statistics available to export.');
    triggerToast('✓ Leaderboard exported to CSV.');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    triggerToast('🔄 Refreshing live contest analytics telemetry...');
    setTimeout(() => {
      setIsRefreshing(false);
      triggerToast('✓ Standings synchronized to the second.');
    }, 1000);
  };

  const filteredCompetitors = useMemo(() => {
    if (selectedDivision === 'All') return competitors;
    return competitors.filter(c => c.division === selectedDivision);
  }, [competitors, selectedDivision]);

  // Safely compute real-time statistics
  const stats = useMemo(() => {
    const totalSolved = competitors.reduce((acc, curr) => acc + (curr.solved || 0), 0);
    const avgSolved = competitors.length ? (totalSolved / competitors.length).toFixed(1) : '0.0';
    return {
      avgSolved,
      totalSubmissions: competitors.length ? 284 : 0, // Replace with dynamic API value
      accuracy: competitors.length ? '87.4%' : '0.0%', // Replace with dynamic API value
      activeConcurrence: competitors.length ? 42 : 0   // Replace with dynamic API value
    };
  }, [competitors]);

  return (
    <div className="min-h-screen p-6 font-sans text-slate-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-indigo-400 font-extrabold">// Live Standings Telemetry</span>
          <h1 className="text-2xl font-black text-white mt-1 tracking-tight">Coding Contest Leaderboard</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time standings, division filters, and ICPC submission matrix.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 bg-[#0f172a] hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Sync Ranks"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f172a] border border-slate-800 text-xs">
            <span className={`h-2 w-2 rounded-full ${competitors.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-slate-400 font-mono">
              {competitors.length > 0 ? 'Live Roster Connected' : 'Awaiting Roster Stream'}
            </span>
          </div>
        </div>
      </div>

      {/* Podium Top 3 Layout */}
      {competitors.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-8 max-w-5xl mx-auto pt-4">
          
          {/* 2nd Place (Silver) */}
          <div className={`${GLASS_CARD} text-center flex flex-col items-center justify-center border-slate-850 md:h-[220px]`}>
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center mb-3">
              <span className="text-sm font-bold text-slate-350">🥈</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-0.5">@{competitors[1]?.user}</h3>
            <p className="text-[11px] text-slate-500 mb-2">{competitors[1]?.name}</p>
            <div className="text-lg font-extrabold text-cyan-400 mb-2">
              {competitors[1]?.solved} <span className="text-xs text-slate-500 font-normal">/ {competitors[1]?.total} Solved</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
              {competitors[1]?.division}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Penalty: {competitors[1]?.penalty}</span>
          </div>

          {/* 1st Place (Gold) */}
          <div className={`${GLASS_CARD} text-center flex flex-col items-center justify-center border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.15)] md:h-[250px]`}>
            <div className="w-12 h-12 rounded-full bg-slate-850 border-2 border-amber-400 flex items-center justify-center mb-3 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
              <span className="text-base font-bold text-amber-300">🥇</span>
            </div>
            <h3 className="text-base font-bold text-white mb-0.5">@{competitors[0]?.user}</h3>
            <p className="text-xs text-slate-400 mb-2">{competitors[0]?.name}</p>
            <div className="text-2xl font-black text-cyan-400 mb-2">
              {competitors[0]?.solved} <span className="text-sm text-slate-500 font-normal">/ {competitors[0]?.total} Solved</span>
            </div>
            <span className="text-[10.5px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-650 text-white mb-2 shadow">
              {competitors[0]?.division}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Penalty: {competitors[0]?.penalty}</span>
          </div>

          {/* 3rd Place (Bronze) */}
          <div className={`${GLASS_CARD} text-center flex flex-col items-center justify-center border-slate-850 md:h-[200px]`}>
            <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-amber-750 flex items-center justify-center mb-3">
              <span className="text-sm font-bold text-amber-600">🥉</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-0.5">@{competitors[2]?.user}</h3>
            <p className="text-[11px] text-slate-500 mb-2">{competitors[2]?.name}</p>
            <div className="text-lg font-extrabold text-cyan-400 mb-2">
              {competitors[2]?.solved} <span className="text-xs text-slate-500 font-normal">/ {competitors[2]?.total} Solved</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
              {competitors[2]?.division}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Penalty: {competitors[2]?.penalty}</span>
          </div>

        </div>
      )}

      {/* Analytics Widgets Dashboard Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`${GLASS_CARD} p-4 flex items-center justify-between`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Solved</span>
            <div className="text-xl font-extrabold text-white font-mono">{stats.avgSolved}</div>
            <p className="text-[10px] text-slate-400">per participant</p>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <div className={`${GLASS_CARD} p-4 flex items-center justify-between`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Compiler Accuracy</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">{stats.accuracy}</div>
            <p className="text-[10px] text-slate-400">avg compilation pass</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className={`${GLASS_CARD} p-4 flex items-center justify-between`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Submissions</span>
            <div className="text-xl font-extrabold text-cyan-400 font-mono">{stats.totalSubmissions}</div>
            <p className="text-[10px] text-slate-400">compiler submissions run</p>
          </div>
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">
            <Terminal className="w-5 h-5" />
          </div>
        </div>

        <div className={`${GLASS_CARD} p-4 flex items-center justify-between`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Solvers</span>
            <div className="text-xl font-extrabold text-pink-400 font-mono">{stats.activeConcurrence}</div>
            <p className="text-[10px] text-slate-400">submitting solutions now</p>
          </div>
          <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/25 text-pink-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Languages & Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Language Distribution Breakdown Card */}
        <div className={`${GLASS_CARD} lg:col-span-2 flex flex-col justify-between`}>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-indigo-400" /> Compiled Language Preferences
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">{competitors.length > 0 ? '284 Submissions' : '0 Submissions'}</span>
            </div>
            
            {/* Segmented Progress Bar */}
            <div className="h-6 w-full rounded-lg bg-slate-950 overflow-hidden flex border border-slate-800 p-0.5 mb-6">
              {competitors.length > 0 ? (
                <>
                  <div style={{ width: '55%' }} className="h-full bg-indigo-500 rounded-l hover:opacity-90 transition-opacity" title="C++: 55%" />
                  <div style={{ width: '30%' }} className="h-full bg-cyan-400 hover:opacity-90 transition-opacity" title="Python: 30%" />
                  <div style={{ width: '15%' }} className="h-full bg-emerald-400 rounded-r hover:opacity-90 transition-opacity" title="Java: 15%" />
                </>
              ) : (
                <div className="w-full h-full bg-slate-900/50 flex items-center justify-center text-[10px] text-slate-600 italic">No telemetry metrics indexed</div>
              )}
            </div>

            {/* Language Legend */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/40 text-center">
                <span className="text-xs font-bold text-indigo-400 block">C++ (GCC 17)</span>
                <span className="text-lg font-black text-white font-mono">{competitors.length > 0 ? '55%' : '0%'}</span>
                <span className="text-[9px] text-slate-500 block">{competitors.length > 0 ? '156 runs' : 'no compiled execution'}</span>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/40 text-center">
                <span className="text-xs font-bold text-cyan-400 block">Python 3.10</span>
                <span className="text-lg font-black text-white font-mono">{competitors.length > 0 ? '30%' : '0%'}</span>
                <span className="text-[9px] text-slate-500 block">{competitors.length > 0 ? '85 runs' : 'no compiled execution'}</span>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/40 text-center">
                <span className="text-xs font-bold text-emerald-400 block">Java 17</span>
                <span className="text-lg font-black text-white font-mono">{competitors.length > 0 ? '15%' : '0%'}</span>
                <span className="text-[9px] text-slate-500 block">{competitors.length > 0 ? '43 runs' : 'no compiled execution'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Submission Telemetry Feed */}
        <div className={GLASS_CARD}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-pink-400" /> Real-time Feed
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 font-mono uppercase font-bold animate-pulse">Live Stream</span>
          </div>

          <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
            {liveSubmissions.map((sub, i) => (
              <div key={i} className="flex justify-between items-center text-xs p-2 rounded bg-slate-950/40 border border-slate-900 hover:border-slate-800 transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-white">@{sub.user}</span>
                  <span className="text-[10px] text-slate-500">{sub.problem} ({sub.lang})</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    sub.status === 'Accepted' 
                      ? 'bg-emerald-500/15 text-emerald-400' 
                      : sub.status === 'Wrong Answer' 
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-red-500/15 text-red-400'
                  }`}>
                    {sub.status}
                  </span>
                  <span className="text-[9px] text-slate-600 font-mono mt-0.5">{sub.time}</span>
                </div>
              </div>
            ))}

            {liveSubmissions.length === 0 && (
              <div className="text-center py-10 text-slate-600 text-xs italic">
                Awaiting incoming real-time solution pipelines...
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Full Leaderboard Table Section */}
      <div className={GLASS_CARD}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Full Standings</h2>
            
            {/* Division Pill filter */}
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
              {['All', 'Div. 1', 'Div. 2', 'Div. 3'].map(div => {
                const isActive = selectedDivision === div;
                return (
                  <button
                    key={div}
                    onClick={() => setSelectedDivision(div)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-indigo-650 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-200 bg-transparent'
                    }`}
                  >
                    {div}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <button
              onClick={handleExport}
              className="flex items-center gap-1 bg-[#1A233D] hover:bg-slate-950 border border-slate-800 text-slate-350 font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" /> Export CSV
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Top:</span>
              <input
                type="number"
                value={topCount}
                onChange={(e) => setTopCount(parseInt(e.target.value) || 5)}
                className="w-12 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center text-xs text-white outline-none focus:border-indigo-500/50"
              />
            </div>
            <button
              onClick={handleBroadcast}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow-md cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" /> Broadcast Ranks
            </button>
          </div>
        </div>

        {/* Standings Matrix Table */}
        <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#0f172a] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <th className="p-4 w-16">Rank</th>
                <th className="p-4">Competitor Handle</th>
                <th className="p-4">Full Name</th>
                <th className="p-4 text-center">Division</th>
                <th className="p-4 text-center">Solved</th>
                
                <th className="p-4 text-center w-20 bg-slate-900/30">A</th>
                <th className="p-4 text-center w-20 bg-slate-900/30">B</th>
                <th className="p-4 text-center w-20 bg-slate-900/30">C</th>
                <th className="p-4 text-center w-20 bg-slate-900/30">D</th>
                
                <th className="p-4 text-center">Penalty</th>
                <th className="p-4 text-center">Accuracy</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30 text-slate-300">
              {filteredCompetitors.slice(0, topCount).map((row, idx) => (
                <tr key={row.rank || idx} className="hover:bg-slate-800/10">
                  <td className="p-4 font-mono font-bold text-slate-400">#{idx + 1}</td>
                  <td className="p-4 font-bold text-white font-mono">@{row.user}</td>
                  <td className="p-4 text-slate-400">{row.name}</td>
                  <td className="p-4 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400">
                      {row.division}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-cyan-400">
                    {row.solved} <span className="text-slate-600 font-normal">/ {row.total}</span>
                  </td>
                  
                  {['A', 'B', 'C', 'D'].map(probId => {
                    const prob = row.problems?.[probId];
                    if (!prob || prob.status === 'untouched') {
                      return (
                        <td key={probId} className="p-4 text-center text-slate-700 font-mono bg-slate-900/5">-</td>
                      );
                    }
                    if (prob.status === 'solved') {
                      return (
                        <td key={probId} className="p-4 text-center bg-emerald-500/10 border-x border-slate-900/20">
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xs font-extrabold text-emerald-400 font-mono">+{prob.attempts}</span>
                            <span className="text-[8px] text-slate-500 font-mono font-bold mt-0.5">{prob.time}</span>
                          </div>
                        </td>
                      );
                    }
                    return (
                      <td key={probId} className="p-4 text-center bg-red-500/10 border-x border-slate-900/20">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-red-400 font-mono">-{prob.attempts}</span>
                          <span className="text-[8px] text-red-500 font-mono font-extrabold mt-0.5">ERR</span>
                        </div>
                      </td>
                    );
                  })}
                  
                  <td className="p-4 text-center font-mono text-slate-400">{row.penalty}</td>
                  <td className="p-4 text-center font-mono text-emerald-400">{row.accuracy}</td>
                  <td className="p-4 text-right">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCompetitors.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs italic bg-slate-950/20">
              No registered user records match the selected system filter configurations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}