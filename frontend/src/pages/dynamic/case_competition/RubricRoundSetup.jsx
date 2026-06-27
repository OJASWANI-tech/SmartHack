import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, SlidersHorizontal, Plus, Trash2, Loader2, CircleDot, CheckCircle2, AlertTriangle
} from 'lucide-react';

const GLASS = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]';

export default function RubricRoundSetup() {
  const [eventName, setEventName] = useState('Case Competition');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [step, setStep] = useState(1);

  const [rounds, setRounds] = useState([
    { id: 1, name: 'Elimination', teams: 32 },
    { id: 2, name: 'Semi-Finals', teams: 8 },
    { id: 3, name: 'Grand Finale', teams: 3 }
  ]);

  const [criteria, setCriteria] = useState([
    { id: 'feasibility', label: 'Feasibility', weight: 30 },
    { id: 'innovation', label: 'Innovation', weight: 40 },
    { id: 'presentation', label: 'Presentation', weight: 30 }
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

  const addRound = () => {
    setRounds((prev) => [...prev, { id: Date.now(), name: `Round ${prev.length + 1}`, teams: 0 }]);
  };

  const removeRound = (id) => {
    setRounds((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRound = (id, field, value) => {
    setRounds((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const updateWeight = (id, value) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, weight: Number(value) } : c)));
  };

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const isBalanced = totalWeight === 100;

  const saveConfig = () => {
    if (!isBalanced) {
      triggerToast(`Rubric weights must total 100% (currently ${totalWeight}%).`);
      return;
    }
    triggerToast('Round structure and rubric weights saved for this event.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060B16] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading configuration…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B16] p-6 md:p-8 text-slate-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Rounds &amp; Rubric Setup</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{eventName}</h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-semibold">
          <CircleDot className="w-4 h-4 animate-pulse" /> Step {step} of 2
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-300 ${
            step === 1 ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300' : 'border-white/[0.06] bg-white/[0.02] text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" /> 1. Tournament Rounds
        </button>
        <button
          onClick={() => setStep(2)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-300 ${
            step === 2 ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-white/[0.06] bg-white/[0.02] text-slate-400'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" /> 2. Weighted Rubric
        </button>
      </div>

      {step === 1 && (
        <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Consecutive Presentation Rounds</h2>
            <button
              onClick={addRound}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-sm font-semibold transition-all duration-300"
            >
              <Plus className="w-4 h-4" /> Add Round
            </button>
          </div>
          <div className="space-y-3">
            {rounds.map((round, idx) => (
              <div key={round.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-4">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-bold shrink-0">
                  {idx + 1}
                </span>
                <input
                  value={round.name}
                  onChange={(e) => updateRound(round.id, 'name', e.target.value)}
                  className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/40"
                />
                <input
                  type="number"
                  value={round.teams}
                  onChange={(e) => updateRound(round.id, 'teams', Number(e.target.value))}
                  className="w-28 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/40"
                />
                <span className="text-xs text-slate-500 w-20">teams</span>
                <button
                  onClick={() => removeRound(round.id)}
                  className="text-slate-500 hover:text-red-400 transition-colors duration-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">Weighted Scoring Rubric</h2>
            <span className={`flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border ${
              isBalanced ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-300 border-amber-400/30 bg-amber-400/10'
            }`}>
              {isBalanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Total: {totalWeight}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-6">Weights must sum to 100% across all judging dimensions.</p>
          <div className="space-y-6">
            {criteria.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">{c.label}</span>
                  <span className="text-sm font-bold text-violet-300">{c.weight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={c.weight}
                  onChange={(e) => updateWeight(c.id, e.target.value)}
                  className="w-full accent-violet-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={saveConfig}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-indigo-500/30 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-sm font-bold transition-all duration-300"
        >
          Save Configuration
        </button>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-indigo-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-indigo-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
