import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Award, Search, Download, Users, 
  BarChart2, ShieldCheck, HelpCircle, CheckCircle2 
} from 'lucide-react';

export default function DebateResults() {
  const location = useLocation();
  const [toastMessage, setToastMessage] = useState('');
  const [filterDivision, setFilterDivision] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' | 'speakers'

  // Dynamic state hooks connected to asynchronous database views
  const [teamStandings, setTeamStandings] = useState([]);
  const [speakerStandings, setSpeakerStandings] = useState([]);
  const [tabulationMetrics, setTabulationMetrics] = useState({
    avgSpeakerScore: 0,
    totalBallotsCounted: 0,
    highestTeamLabel: "Loading...",
    highestTeamScore: 0,
    cleanBallotsRatio: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Extract the active event scope from local persistent caching systems
  const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Synchronize leaderboards and aggregated metrics straight from the API backend
  useEffect(() => {
    if (!activeEventId) {
      setIsLoading(false);
      return;
    }

    const fetchLiveLeaderboardsAndStats = async () => {
      try {
        setIsLoading(true);
        
        // Build analytical telemetry queries based on the active structural route state
        const queryParams = new URLSearchParams({
          division_filter: filterDivision,
          search_term: searchQuery,
          tab_type: activeTab
        });

        const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/tabulation-standings?${queryParams}`);
        if (!res.ok) throw new Error("Leaderboard distribution matrices tracing failed.");
        const data = await res.json();

        // Hydrate appropriate tables depending on the currently selected panel context
        if (activeTab === 'teams') {
          // Expected API schema shape for teams: { rank, team_name, division, win_count, loss_count, total_ballots, cumulative_speaker_points }
          const formattedTeams = (data.teams || []).map(t => ({
            rank: t.rank,
            name: t.team_name,
            division: t.division,
            wins: t.win_count,
            losses: t.loss_count,
            ballots: t.total_ballots,
            speakPoints: parseFloat(t.cumulative_speaker_points) || 0
          }));
          setTeamStandings(formattedTeams);
        } else {
          // Expected API schema shape for speakers: { rank, speaker_name, team_affiliation, division, average_points, total_points }
          const formattedSpeakers = (data.speakers || []).map(s => ({
            rank: s.rank,
            name: s.speaker_name,
            team: s.team_affiliation,
            division: s.division,
            avgPoints: parseFloat(s.average_points) || 0,
            totalPoints: parseFloat(s.total_points) || 0
          }));
          setSpeakerStandings(formattedSpeakers);
        }

        // Dynamically compute global metrics blocks from summary payloads
        if (data.metrics_summary) {
          setTabulationMetrics({
            avgSpeakerScore: parseFloat(data.metrics_summary.global_average_score) || 0,
            totalBallotsCounted: parseInt(data.metrics_summary.ballot_logs_count, 10) || 0,
            highestTeamLabel: data.metrics_summary.top_performing_team_name || "N/A",
            highestTeamScore: parseFloat(data.metrics_summary.top_performing_team_points) || 0,
            cleanBallotsRatio: parseFloat(data.metrics_summary.verified_clean_ratio) || 0
          });
        }
      } catch (err) {
        console.error("Failed to load official standings:", err);
        triggerToast("⚠️ Failed to parse structural tournament standings tables.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveLeaderboardsAndStats();
  }, [location.pathname, activeEventId, activeTab, filterDivision, searchQuery]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleExport = async () => {
    if (!activeEventId) return;
    try {
      triggerToast("📥 Initializing secure export stream for debate records package...");
      window.location.href = `${baseURL}/api/v1/events/${activeEventId}/tabulation-standings/export-csv`;
    } catch (err) {
      console.error(err);
      triggerToast("❌ Failed to compile download payload configuration.");
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl shadow-black/40 border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 p-5 rounded-xl border shadow-sm bg-[#0b1120] border-slate-800/60">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-500/20 text-purple-400 border border-purple-500/35">
              Standings & Tabulations
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">Win-Loss Records & Leaderboards</h2>
            <p className="text-xs text-slate-400 mt-0.5">Live tournament standings compiled by round wins, ballot splits, and cumulative speaker scores.</p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-200 shadow-md shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" /> Export Standings CSV
          </button>
        </div>
      </div>

      {/* Filter and Switcher Control panel */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 px-5 py-4 rounded-xl border bg-[#0b1120] border-slate-800/60">
        
        {/* Tab switchers */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-150 
              ${activeTab === 'teams' 
                ? 'bg-purple-600 text-white shadow' 
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            Team Standings
          </button>
          <button
            onClick={() => setActiveTab('speakers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-150 
              ${activeTab === 'speakers' 
                ? 'bg-purple-600 text-white shadow' 
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'}`}
          >
            Individual Speakers
          </button>
        </div>

        {/* Query filter */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors w-full md:w-[200px]"
            />
          </div>

          <select
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="All">All Divisions</option>
            <option value="Open">Open</option>
            <option value="Novice">Novice</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Standings Table */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" /> 
              {activeTab === 'teams' ? 'Official Team Leaderboard' : 'Top Individual Speakers'}
            </h3>

            {isLoading ? (
              <div className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide p-4">
                Compiling multi-divisional tracking arrays...
              </div>
            ) : activeTab === 'teams' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Team Name</th>
                      <th className="py-2.5 px-3">Division</th>
                      <th className="py-2.5 px-3 text-center">Record</th>
                      <th className="py-2.5 px-3 text-center">Ballots</th>
                      <th className="py-2.5 px-3 text-right">Speaker Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStandings.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-xs text-slate-500 italic">No corresponding records tracked in this division scope.</td>
                      </tr>
                    ) : (
                      teamStandings.map((team, idx) => (
                        <tr key={idx} className="border-b border-slate-800/35 hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-3 font-mono text-purple-400 font-bold">#{team.rank}</td>
                          <td className="py-3.5 px-3 font-semibold text-white">{team.name}</td>
                          <td className="py-3.5 px-3 text-slate-400">{team.division}</td>
                          <td className="py-3.5 px-3 text-center font-bold text-emerald-400">{team.wins}W - {team.losses}L</td>
                          <td className="py-3.5 px-3 text-center">{team.ballots}</td>
                          <td className="py-3.5 px-3 text-right font-mono text-slate-200">{team.speakPoints.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Speaker</th>
                      <th className="py-2.5 px-3">Team Affiliation</th>
                      <th className="py-2.5 px-3">Division</th>
                      <th className="py-2.5 px-3 text-center">Avg Points</th>
                      <th className="py-2.5 px-3 text-right">Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {speakerStandings.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-xs text-slate-500 italic">No corresponding records tracked in this division scope.</td>
                      </tr>
                    ) : (
                      speakerStandings.map((spk, idx) => (
                        <tr key={idx} className="border-b border-slate-800/35 hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-3 font-mono text-purple-400 font-bold">#{spk.rank}</td>
                          <td className="py-3.5 px-3 font-semibold text-white">{spk.name}</td>
                          <td className="py-3.5 px-3 text-slate-400">{spk.team}</td>
                          <td className="py-3.5 px-3 text-slate-450">{spk.division}</td>
                          <td className="py-3.5 px-3 text-center font-bold text-indigo-400">{spk.avgPoints.toFixed(1)}</td>
                          <td className="py-3.5 px-3 text-right font-mono text-slate-200">{spk.totalPoints.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Stats summary card */}
        <div className="flex flex-col gap-6">
          
          {/* Summary KPIs */}
          <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-400" /> Tabulation Metrics
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="border-b border-slate-800/45 pb-3.5">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">AVERAGE SPEAKER SCORE</span>
                <h4 className="text-lg font-bold text-white mt-1">{tabulationMetrics.avgSpeakerScore.toFixed(1)} Points</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Calculated across {tabulationMetrics.totalBallotsCounted} speaker ballot logs</p>
              </div>

              <div className="border-b border-slate-800/45 pb-3.5">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">HIGHEST TEAM SCORE</span>
                <h4 className="text-lg font-bold text-white mt-1">{tabulationMetrics.highestTeamLabel} ({tabulationMetrics.highestTeamScore.toFixed(1)})</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Top ranking standing recorded</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">CLEAN BALLOTS RATIO</span>
                <h4 className="text-lg font-bold text-white mt-1">{tabulationMetrics.cleanBallotsRatio.toFixed(1)}%</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Percentage of verified records showing zero anomalies</p>
              </div>
            </div>
          </div>

          {/* Verification check */}
          <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Tabulation Integrity
            </h3>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Ballots Audited</h4>
                <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                  All active round ballots have been audited. Standings are clean and verified for final release.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}