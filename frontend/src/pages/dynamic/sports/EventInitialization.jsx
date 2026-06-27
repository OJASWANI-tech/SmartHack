import { useEffect, useState } from 'react';
import { Upload, Users, Shield, Trophy, Loader2, CheckCircle2, KeyRound, AlertTriangle } from 'lucide-react';
import { uploadTeamsCsv, uploadRefereesCsv, generateBracket, getMatches } from '../../../api/dynamicSports';
import { resolveEventId } from '../../../api/dynamicRuntime';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

function FileDrop({ label, hint, file, onChange }) {
  return (
    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] hover:border-cyan-500/40 transition-all duration-300 p-8 cursor-pointer">
      <input type="file" accept=".csv" className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      <Upload className="w-6 h-6 text-cyan-400" />
      <span className="text-sm font-semibold text-slate-200">{file ? file.name : label}</span>
      <span className="text-xs text-slate-500 text-center">{hint}</span>
    </label>
  );
}

/*
 * EventInitialization — the Committee Portal Extension's "Event Initialization"
 * tab: deterministic CSV-based team/referee provisioning followed by automated
 * bracket generation, all chained from one action. Isolated under
 * /dynamic/sports/; does not touch /committee, /participant or /evaluator.
 */
export default function EventInitialization() {
  const eventId = resolveEventId();
  const [teamsFile, setTeamsFile] = useState(null);
  const [refereesFile, setRefereesFile] = useState(null);
  const [format, setFormat] = useState('single_elim');
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [result, setResult] = useState(null);
  const [matchCount, setMatchCount] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    getMatches(eventId).then((m) => setMatchCount(m.length)).catch(() => {});
  }, [eventId]);

  function pushLog(line) {
    setLog((prev) => [...prev, line]);
  }

  async function handleProvision() {
    if (!eventId) { pushLog('⚠️ No active event found in this browser.'); return; }
    setRunning(true);
    setLog([]);
    setResult(null);

    let teamsResult = null;
    let refereesResult = null;

    try {
      if (teamsFile) {
        pushLog('Uploading team roster CSV…');
        teamsResult = await uploadTeamsCsv(eventId, teamsFile);
        pushLog(`✓ ${teamsResult.teams_created} team(s), ${teamsResult.players_created} player(s) created.`);
        if (teamsResult.skipped?.length) pushLog(`⚠️ ${teamsResult.skipped.length} row(s) skipped — see details below.`);
      }

      if (refereesFile) {
        pushLog('Uploading referee CSV…');
        refereesResult = await uploadRefereesCsv(eventId, refereesFile);
        pushLog(`✓ ${refereesResult.created.length} referee(s) provisioned with access codes.`);
        if (refereesResult.skipped?.length) pushLog(`⚠️ ${refereesResult.skipped.length} row(s) skipped — see details below.`);
      }

      if (teamsResult?.teams?.length >= 2) {
        pushLog(`Generating ${format === 'round_robin' ? 'round robin' : 'single elimination'} bracket…`);
        const bracket = await generateBracket(eventId, format);
        pushLog(`✓ ${bracket.length} fixture(s) created.`);
        setMatchCount(bracket.length);
      } else if (teamsFile) {
        pushLog('Skipped bracket generation — need at least 2 teams.');
      }

      setResult({ teams: teamsResult, referees: refereesResult });
    } catch (err) {
      pushLog(`✗ ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  const canRun = (teamsFile || refereesFile) && !running;

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Event Initialization</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">CSV Provisioning &amp; Bracket Generator</h1>
        <p className="text-sm text-slate-500 mt-2">
          Upload a team roster CSV and a referee CSV, then provision teams, referee access codes, and the tournament
          bracket in a single pass. {matchCount !== null && `Currently ${matchCount} fixture(s) on record.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Team Roster CSV</h2>
          </div>
          <FileDrop
            label="Drop CSV or browse"
            hint="Columns: team_name, player_name, email (optional), institution (optional)"
            file={teamsFile}
            onChange={setTeamsFile}
          />
        </div>

        <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Referee CSV</h2>
          </div>
          <FileDrop
            label="Drop CSV or browse"
            hint="Columns: name, email (optional), assigned_sport (optional)"
            file={refereesFile}
            onChange={setRefereesFile}
          />
        </div>
      </div>

      <div className={`${GLASS} rounded-2xl p-6 md:p-8 mb-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white">Bracket Format</h2>
        </div>
        <div className="flex gap-3 mb-6">
          {[{ key: 'single_elim', label: 'Single Elimination' }, { key: 'round_robin', label: 'Round Robin' }].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFormat(opt.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-300 ${
                format === opt.key ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-white/[0.08] hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleProvision}
          disabled={!canRun}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold px-4 py-3 transition-all duration-300"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {running ? 'Provisioning…' : 'Provision Tournament'}
        </button>
      </div>

      {log.length > 0 && (
        <div className={`${GLASS} rounded-2xl p-6 mb-6 font-mono text-xs text-slate-300 space-y-1`}>
          {log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}

      {result?.teams?.skipped?.length > 0 && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4 mb-6 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-300/90 space-y-1">
            {result.teams.skipped.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
      )}

      {result?.referees?.created?.length > 0 && (
        <div className={`${GLASS} rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Referee Access Codes — distribute these securely</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-xs uppercase text-slate-500 font-semibold">Name</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-slate-500 font-semibold">Assigned</th>
                <th className="text-left px-3 py-2 text-xs uppercase text-slate-500 font-semibold">Access Code</th>
              </tr>
            </thead>
            <tbody>
              {result.referees.created.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.04]">
                  <td className="px-3 py-2 text-slate-200">{r.name}</td>
                  <td className="px-3 py-2 text-slate-400">{r.assigned_sport || '—'}</td>
                  <td className="px-3 py-2 font-mono text-cyan-400 font-bold">{r.access_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
