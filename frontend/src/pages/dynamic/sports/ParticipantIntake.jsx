import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Users, Gamepad2, Trophy, Loader2, Sliders, Shield,
  CheckCircle2, ArrowRight
} from 'lucide-react';
import {
  uploadParticipantsCsv, getParticipants, generateTeams, generateDbRationales
} from '../../../services/committee';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const MODE_COPY = {
  physical: {
    rosterLabel: 'Athlete Roster',
    unitLabel: 'Players per Team',
    skillLabel: 'Skill Tier',
    clubLabel: 'Club / School',
    tagsLabel: 'Position Tags',
    tagsHint: 'e.g. Striker, Goalkeeper, Setter',
    domainHint: 'e.g. Football, Basketball, Badminton',
  },
  esports: {
    rosterLabel: 'Player Roster',
    unitLabel: 'Players per Squad',
    skillLabel: 'Rank Tier',
    clubLabel: 'Org / Academy',
    tagsLabel: 'Role Tags',
    tagsHint: 'e.g. IGL, Entry Fragger, Support',
    domainHint: 'e.g. Valorant, League of Legends',
  }
};

export default function ParticipantIntake() {
  const navigate = useNavigate();
  const [eventId, setEventId] = useState(null);
  const [sportMode, setSportMode] = useState('physical');

  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [fileObject, setFileObject] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState('');

  const [teamSize, setTeamSize] = useState(7);
  const [randomizationFactor, setRandomizationFactor] = useState(15);
  const [balanceSkill, setBalanceSkill] = useState(true);
  const [maxAdvanced, setMaxAdvanced] = useState(2);
  const [minBeginners, setMinBeginners] = useState(1);
  const [clubLimitEnabled, setClubLimitEnabled] = useState(false);
  const [maxPerClub, setMaxPerClub] = useState(3);

  const terms = MODE_COPY[sportMode];

  const loadRoster = useCallback(async () => {
    const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
    setEventId(currentEventId);
    if (!currentEventId) {
      setLoadingRoster(false);
      return;
    }
    try {
      setLoadingRoster(true);
      const data = await getParticipants(currentEventId);
      setRoster(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) return;
    setFileObject(file);
    setFileName(file.name);
  };

  const handleUpload = async () => {
    if (!fileObject || !eventId) return;
    try {
      setIsUploading(true);
      await uploadParticipantsCsv(eventId, fileObject);
      triggerToast(`${terms.rosterLabel} imported successfully.`);
      setFileObject(null);
      setFileName('');
      await loadRoster();
    } catch (err) {
      triggerToast(err.message || 'Roster import failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const estimatedTeams = teamSize > 0 ? Math.floor(roster.length / teamSize) : 0;

  const handleGenerateTeams = async () => {
    if (!eventId || isGenerating) return;
    setIsGenerating(true);
    const configPayload = {
      team_size: parseInt(teamSize, 10) || 4,
      label: `Sports Formation (${sportMode === 'esports' ? 'E-Sports' : 'Physical'}) — ${new Date().toLocaleTimeString()}`,
      randomizationFactor,
      institutionLimitEnabled: !!clubLimitEnabled,
      max_per_institution: clubLimitEnabled ? (parseInt(maxPerClub, 10) || 1) : null,
      skills: { enabled: false, minDevelopers: 0, minDesigners: 0, minBusiness: 0 },
      experience: {
        enabled: !!balanceSkill,
        maxExperts: balanceSkill ? (parseInt(maxAdvanced, 10) || 1) : (parseInt(teamSize, 10) || 4),
        minBeginners: balanceSkill ? (parseInt(minBeginners, 10) || 0) : 0
      }
    };

    try {
      await generateTeams(eventId, configPayload);
      try { await generateDbRationales(eventId); } catch { /* background task, non-blocking */ }
      triggerToast('Teams formed — opening squad review…');
      setTimeout(() => navigate('/dynamic-test/team-review'), 900);
    } catch (err) {
      triggerToast(err.message || 'Team formation failed.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Step 1 of 2</p>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Intake & Team Formation</h1>
        </div>
        <div className={`${GLASS} flex rounded-full p-1`}>
          {[{ key: 'physical', label: 'Physical Sport', icon: Trophy }, { key: 'esports', label: 'E-Sports', icon: Gamepad2 }].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSportMode(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                sportMode === key ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Roster intake */}
        <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">{terms.rosterLabel}</h2>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] hover:border-cyan-500/40 transition-all duration-300 p-8 cursor-pointer mb-4">
            <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            <Upload className="w-6 h-6 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-200">{fileName || 'Drop CSV or browse'}</span>
            <span className="text-xs text-slate-500">first_name, last_name, email, institution ({terms.clubLabel}), domain ({terms.domainHint}), skill_tags ({terms.tagsHint}), experience_level ({terms.skillLabel})</span>
          </label>

          {fileObject && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold px-4 py-3 transition-all duration-300 disabled:opacity-50"
            >
              {isUploading ? 'Importing…' : `Import ${fileName}`}
            </button>
          )}

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] max-h-72 overflow-y-auto">
            {loadingRoster ? (
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm p-6">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading roster…
              </div>
            ) : roster.length === 0 ? (
              <p className="text-sm text-slate-500 text-center p-6">No participants imported yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900/80">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs uppercase text-slate-500 font-semibold">Name</th>
                    <th className="text-left px-4 py-2 text-xs uppercase text-slate-500 font-semibold">{terms.clubLabel}</th>
                    <th className="text-left px-4 py-2 text-xs uppercase text-slate-500 font-semibold">{terms.skillLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((p, i) => (
                    <tr key={p.id || i} className="border-t border-white/[0.04]">
                      <td className="px-4 py-2 text-slate-200">{p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim()}</td>
                      <td className="px-4 py-2 text-slate-400">{p.institution || '—'}</td>
                      <td className="px-4 py-2 text-slate-400">{p.experience_level || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">{roster.length} {sportMode === 'esports' ? 'players' : 'athletes'} imported.</p>
        </div>

        {/* Right: Team formation engine */}
        <div className={`${GLASS} rounded-2xl p-6 md:p-8 flex flex-col`}>
          <div className="flex items-center gap-2 mb-6">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Team Formation Engine</h2>
          </div>

          <div className="space-y-5 flex-1">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">{terms.unitLabel}</label>
              <input
                type="number" min="2" max="20" value={teamSize}
                onChange={(e) => setTeamSize(parseInt(e.target.value) || 4)}
                className="w-full bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none transition-all duration-300"
              />
              <p className="text-xs text-slate-500 mt-2">≈ {estimatedTeams} {sportMode === 'esports' ? 'squads' : 'teams'} will be formed from {roster.length} {sportMode === 'esports' ? 'players' : 'athletes'}.</p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Diversity Buffer</span>
                <span className="text-emerald-400 font-bold text-sm">{randomizationFactor}%</span>
              </div>
              <input
                type="range" min="0" max="50" step="5" value={randomizationFactor}
                onChange={(e) => setRandomizationFactor(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 cursor-pointer mb-3">
                <input type="checkbox" checked={balanceSkill} onChange={(e) => setBalanceSkill(e.target.checked)} className="accent-emerald-500" />
                Balance {terms.skillLabel.toLowerCase()}s across teams
              </label>
              {balanceSkill && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-slate-500">
                    Max Advanced / Team
                    <input type="number" min="0" value={maxAdvanced} onChange={(e) => setMaxAdvanced(parseInt(e.target.value) || 0)}
                      className="w-full mt-1 bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none" />
                  </label>
                  <label className="text-xs text-slate-500">
                    Min Beginners / Team
                    <input type="number" min="0" value={minBeginners} onChange={(e) => setMinBeginners(parseInt(e.target.value) || 0)}
                      className="w-full mt-1 bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none" />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 cursor-pointer mb-3">
                <input type="checkbox" checked={clubLimitEnabled} onChange={(e) => setClubLimitEnabled(e.target.checked)} className="accent-emerald-500" />
                Limit players from the same {terms.clubLabel.toLowerCase()}
              </label>
              {clubLimitEnabled && (
                <label className="text-xs text-slate-500">
                  Max per {terms.clubLabel}
                  <input type="number" min="1" value={maxPerClub} onChange={(e) => setMaxPerClub(parseInt(e.target.value) || 1)}
                    className="w-full mt-1 bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none" />
                </label>
              )}
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300/90">{terms.tagsLabel} from the CSV ({terms.tagsHint}) carry through to each squad's AI rationale, but aren't yet a hard balancing constraint.</p>
            </div>
          </div>

          <button
            onClick={handleGenerateTeams}
            disabled={isGenerating || roster.length === 0}
            className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold px-4 py-3 transition-all duration-300"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isGenerating ? 'Forming Teams…' : 'Generate Teams'}
            {!isGenerating && <ArrowRight className="w-4 h-4" />}
          </button>
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
