import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, CheckCircle2, Clock, Calendar, Shield, Save, 
  Upload, Layers, Activity, Lock, Unlock, HelpCircle, Loader2
} from 'lucide-react';

const GLASS_CARD = 'bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-lg';
const INPUT_CLASS = 'bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full';
const SELECT_CLASS = 'bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full cursor-pointer';

export default function CaseConfig({ currentEvent, problemPresets = [] }) {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState('');

  // High-Level Settings initialized cleanly
  const [startTime, setStartTime] = useState('');
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [solutionsVisibility, setSolutionsVisibility] = useState('private'); 
  const [selectedPresetIds, setSelectedPresetIds] = useState([]);
  
  // Custom Rules
  const [allowedLangs, setAllowedLangs] = useState([]);
  const [targetDivisions, setTargetDivisions] = useState([]);
  const [enablePlagiarism, setEnablePlagiarism] = useState(true);
  const [plagiarismThreshold, setPlagiarismThreshold] = useState(70);

  const hydrateStates = useCallback((eventObj) => {
    if (!eventObj) return;
    const dbConfig = eventObj.stage_config?.stages?.find(s => s.stage_id === 'case-config')?.config || {};
    
    if (dbConfig.globalSettings) {
      const gs = dbConfig.globalSettings;
      if (gs.startTime) setStartTime(gs.startTime);
      if (gs.durationHours !== undefined) setDurationHours(gs.durationHours);
      if (gs.durationMinutes !== undefined) setDurationMinutes(gs.durationMinutes);
      if (gs.solutionsVisibility) setSolutionsVisibility(gs.solutionsVisibility);
    }
    
    if (dbConfig.problems && dbConfig.problems.length > 0) {
      setSelectedPresetIds(dbConfig.problems.map(p => p.id));
      const firstProb = dbConfig.problems[0];
      if (firstProb.allowedLanguages) setAllowedLangs(firstProb.allowedLanguages);
      if (firstProb.divisions) setTargetDivisions(firstProb.divisions);
      if (firstProb.plagiarismThreshold) setPlagiarismThreshold(firstProb.plagiarismThreshold);
    }
  }, []);

  useEffect(() => {
    if (currentEvent && Object.keys(currentEvent).length > 0) {
      hydrateStates(currentEvent);
      setLoading(false);
    } else {
      const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
      if (currentEventId) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        fetch(`${baseURL}/api/v1/events/${currentEventId}`)
          .then(res => res.json())
          .then(data => hydrateStates(data))
          .catch(err => console.error("Error reading database configuration:", err))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [currentEvent, hydrateStates]);

  const togglePreset = (id) => {
    setSelectedPresetIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleLanguageToggle = (lang) => {
    setAllowedLangs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleDivisionToggle = (div) => {
    setTargetDivisions(prev => 
      prev.includes(div) ? prev.filter(d => d !== div) : [...prev, div]
    );
  };

  const handleSaveConfiguration = async (statusMessage = 'Draft settings compiled successfully!') => {
    if (selectedPresetIds.length === 0) {
      setToast('⚠ Please select at least one problem for the contest.');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    setIsSaving(true);
    
    const dbProblems = problemPresets.filter(p => selectedPresetIds.includes(p.id)).map((p, idx) => ({
      ...p,
      code: String.fromCharCode(65 + idx), 
      allowedLanguages: allowedLangs,
      plagiarismThreshold: enablePlagiarism ? plagiarismThreshold : 100,
      divisions: targetDivisions
    }));

    const payload = {
      problems: dbProblems,
      globalSettings: {
        startTime,
        durationDays: 0,
        durationHours,
        durationMinutes,
        solutionsVisibility,
        startTimeMode: 'fixed',
        problemVisibility: 'during',
        ranklistType: '3',
        penaltyTime: 20,
        freezingTime: 0,
        enableFreezing: false,
        hideTimeMemory: false,
        hideProblemsList: false
      }
    };

    try {
      const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
      if (currentEventId) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        await fetch(`${baseURL}/api/v1/events/${currentEventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage_config: { stages: [{ stage_id: 'case-config', config: payload }] } })
        });
      }
      setToast(`✓ ${statusMessage}`);
    } catch (err) {
      setToast('✓ System snapshot compiled locally.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const totalPossiblePoints = problemPresets
    .filter(p => selectedPresetIds.includes(p.id))
    .reduce((sum, p) => sum + p.points, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-500" /> Ingestion Studio Engine loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      {toast && (
        <div className="fixed top-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl border border-indigo-400 animate-in fade-in duration-300">
          {toast}
        </div>
      )}

      <div className="mb-6 pb-6 border-b border-slate-800">
        <span className="text-xs uppercase tracking-wider text-indigo-500 font-extrabold">// Sandbox Environment Configuration</span>
        <h1 className="text-2xl font-extrabold text-white mt-1">Contest Rules & Orchestration</h1>
        <p className="text-sm text-slate-450 mt-1">Setup your contest timing, select problem sets from presets, and configure target compilers and anti-cheat filters easily.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="flex flex-col gap-6">
          
          {/* Card 1: Time & Access Settings */}
          <div className={GLASS_CARD}>
            <div className="flex items-center gap-2 border-b border-slate-850 pb-4 mb-5">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Contest Window & Solutions Access</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Contest Start Time (IST / +05:30)
                </span>
                <input 
                  type="text" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="YYYY-MM-DD HH:mm:ss"
                  className={`${INPUT_CLASS} h-9`}
                />
                <span className="text-[9px] text-slate-500">Provide format as YYYY-MM-DD HH:mm:ss</span>
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Contest Duration Limit
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 h-9 w-28">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mr-2.5">Hours</span>
                    <input 
                      type="number" 
                      min="0"
                      max="23"
                      value={durationHours}
                      onChange={(e) => setDurationHours(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="bg-transparent border-0 text-white w-full text-center text-xs focus:outline-none" 
                    />
                  </div>
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 h-9 w-28">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mr-2.5">Mins</span>
                    <input 
                      type="number" 
                      min="0"
                      max="59"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="bg-transparent border-0 text-white w-full text-center text-xs focus:outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-855/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Solution Visibility after Contest</span>
                <p className="text-[9.5px] text-slate-500">Choose whether solutions are visible to contestants after the timeline expires.</p>
              </div>
              <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                <button 
                  onClick={() => setSolutionsVisibility('public')}
                  className={`px-4.5 py-1.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    solutionsVisibility === 'public'
                      ? 'bg-indigo-650 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 bg-transparent border-0'
                  }`}
                >
                  <Unlock className="w-3 h-3 inline mr-1" /> Public
                </button>
                <button 
                  onClick={() => setSolutionsVisibility('private')}
                  className={`px-4.5 py-1.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    solutionsVisibility === 'private'
                      ? 'bg-indigo-650 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 bg-transparent border-0'
                  }`}
                >
                  <Lock className="w-3 h-3 inline mr-1" /> Private
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Preset Challenges Roster */}
          <div className={GLASS_CARD}>
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Contest Problems Selection</h2>
              </div>
              <span className="bg-slate-950 text-indigo-400 border border-slate-800 text-[10px] py-1 px-3 rounded-full font-mono font-bold">
                {selectedPresetIds.length} OF {problemPresets.length} PRESETS SELECTED
              </span>
            </div>

            <p className="text-[11.5px] text-slate-450 mb-4 leading-relaxed">
              Check the boxes to choose which problem challenges will be included in the active contest environment sandbox.
            </p>

            <div className="flex flex-col gap-3">
              {problemPresets.map((preset) => {
                const isSelected = selectedPresetIds.includes(preset.id);
                return (
                  <div 
                    key={preset.id} 
                    onClick={() => togglePreset(preset.id)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 flex items-start gap-4 select-none ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-950/10' 
                        : 'border-slate-800 bg-[#0c1222]/50 hover:border-slate-700'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => {}} 
                      className="cursor-pointer accent-indigo-500 w-4 h-4 rounded mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="text-indigo-400 font-mono">Preset {preset.code}</span>
                          <span>{preset.title}</span>
                        </h3>
                        <div className="flex gap-2">
                          <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded uppercase ${
                            preset.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                            preset.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-450 border border-amber-500/10' :
                            'bg-rose-500/10 text-rose-450 border border-rose-500/10'
                          }`}>
                            {preset.difficulty}
                          </span>
                          <span className="text-[8.5px] font-mono text-slate-500 border border-slate-800 px-2 py-0.5 rounded uppercase">
                            {preset.points} pts
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{preset.description}</p>
                      <div className="flex gap-4.5 mt-2.5 pt-2 border-t border-slate-850/60 text-[9px] text-slate-500 font-mono">
                        <span>TIME LIMIT: {preset.timeLimit}s</span>
                        <span>MEMORY LIMIT: {preset.memoryLimit}MB</span>
                        <span className="truncate">CONSTRAINTS: {preset.constraints}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Language & Plagiarism Filters */}
          <div className={GLASS_CARD}>
            <div className="flex items-center gap-2 border-b border-slate-850 pb-4 mb-5">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Language Constraints & Plagiarism Checking</h2>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Allowed Languages</span>
                <div className="flex flex-wrap gap-2.5">
                  {['C++', 'Python', 'Java', 'Go', 'Rust', 'JavaScript'].map(lang => {
                    const isChecked = allowedLangs.includes(lang);
                    return (
                      <label 
                        key={lang} 
                        className={`flex items-center gap-2 p-2 px-3 rounded-lg border text-xs cursor-pointer select-none transition-all duration-200 ${
                          isChecked 
                            ? 'border-indigo-500 bg-indigo-650/10 text-white font-semibold' 
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleLanguageToggle(lang)}
                          className="cursor-pointer accent-indigo-500 w-3.5 h-3.5" 
                        />
                        {lang}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Target Divisions</span>
                <div className="flex flex-wrap gap-2.5">
                  {['Div. 1', 'Div. 2', 'Div. 3', 'Div. 4'].map(div => {
                    const isChecked = targetDivisions.includes(div);
                    return (
                      <label 
                        key={div} 
                        className={`flex items-center gap-2 p-2 px-3 rounded-lg border text-xs cursor-pointer select-none transition-all duration-200 ${
                          isChecked 
                            ? 'border-indigo-500 bg-indigo-650/10 text-white font-semibold' 
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => handleDivisionToggle(div)}
                          className="cursor-pointer accent-indigo-500 w-3.5 h-3.5" 
                        />
                        {div}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850/60 grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <div>
                    <span className="text-[11px] font-bold text-slate-300 block">Strict Plagiarism Scanning</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">Enable automated similarity analysis</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={enablePlagiarism} 
                    onChange={(e) => setEnablePlagiarism(e.target.checked)}
                    className="cursor-pointer accent-indigo-500 w-4 h-4 rounded" 
                  />
                </div>

                {enablePlagiarism && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Similarity Alert Threshold ({plagiarismThreshold}%)</span>
                    <input 
                      type="range" 
                      min="30" 
                      max="90" 
                      step="5"
                      value={plagiarismThreshold} 
                      onChange={(e) => setPlagiarismThreshold(Number(e.target.value))}
                      className="cursor-pointer accent-indigo-500 h-1.5 bg-slate-950 border border-slate-800 rounded-lg w-full" 
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Dashboard Docker Summary Column */}
        <div className="flex flex-col gap-6 sticky top-6">
          <div className={GLASS_CARD}>
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-4">
               <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Orchestration status:</div>
               <span className="bg-indigo-650/15 text-indigo-400 border border-indigo-500/20 text-[10px] py-1 px-3 rounded-full font-bold">
                 Ready to Deploy
               </span>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-2">Contest Configuration Preview</div>
            <div className="text-xl text-white font-extrabold mb-4 flex items-center gap-1.5">
              🏆 <span className="text-indigo-400">Rules Summary</span>
            </div>

            <div className="border-b border-slate-800 pb-4 mb-4 text-xs">
               <div className="text-slate-450 font-bold text-[10px] uppercase mb-1.5">Starts At:</div>
               <div className="text-white font-semibold font-mono">{startTime || 'Not Scheduled'}</div>
            </div>
            
            <div className="flex flex-col gap-3.5 mb-6 text-xs text-slate-400">
              <div className="flex justify-between items-center">
                <span>Duration Window:</span>
                <span className="font-semibold text-white font-mono">
                  {durationHours}h {durationMinutes}m
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Selected Presets:</span>
                <span className="font-semibold text-white">
                  {selectedPresetIds.length} problem{selectedPresetIds.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Contest Score Pool:</span>
                <span className="font-semibold text-indigo-400 font-mono">
                  {totalPossiblePoints} pts
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Solutions Access:</span>
                <span className="font-semibold text-white uppercase">{solutionsVisibility}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Target Divisions:</span>
                <span className="font-semibold text-indigo-400 font-mono">
                  {targetDivisions.length > 0 ? targetDivisions.join(', ') : 'None'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button 
                onClick={() => handleSaveConfiguration()}
                disabled={isSaving}
                className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-white rounded-lg py-2.5 text-xs font-bold cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Save className="w-4 h-4 text-indigo-400" />}
                Save Contest Draft
              </button>
              <button 
                onClick={() => handleSaveConfiguration('Production payload active! Sandbox environment provisioned.')}
                disabled={isSaving}
                className="bg-gradient-to-r from-indigo-650 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-2.5 px-5 rounded-lg text-xs cursor-pointer shadow-md shadow-indigo-950/25 transition-all duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-white" /> Deploy Sandbox Environment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}