import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, Sliders, Shield, Save, Clock, BookOpen } from 'lucide-react';

export default function DebateConfiguration() {
  const location = useLocation();
  const [toastMessage, setToastMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Parametrized Tournament Configuration State
  const [config, setConfig] = useState({
    architectureFormat: '',
    prepTimeAllocation: '',
    floorMinimumScore: 0,
    standardTargetAverage: 0,
    ceilingMaximumScore: 0
  });

  // Load configuration matrix payload from API environment pipelines
  useEffect(() => {
    const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    if (activeEventId) {
      fetch(`${baseURL}/api/v1/events/${activeEventId}/debate-config`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Network configuration lookup mismatch.');
        })
        .then(data => {
          setConfig({
            architectureFormat: data.architecture_format || '',
            prepTimeAllocation: String(data.prep_time_allocation || ''),
            floorMinimumScore: data.floor_min_score || 0,
            standardTargetAverage: data.target_avg_score || 0,
            ceilingMaximumScore: data.ceiling_max_score || 0
          });
        })
        .catch(err => {
          console.error('Failed to sync workspace configuration rulesets:', err);
        });
    }
  }, [location.pathname]);

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    if (!activeEventId) {
      triggerToast("❌ Error: No active Event ID profile designated in workspace.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`${baseURL}/api/v1/events/${activeEventId}/debate-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          architecture_format: config.architectureFormat,
          prep_time_allocation: parseInt(config.prepTimeAllocation, 10),
          floor_min_score: Number(config.floorMinimumScore),
          target_avg_score: Number(config.standardTargetAverage),
          ceiling_max_score: Number(config.ceilingMaximumScore)
        })
      });

      if (!response.ok) throw new Error('Write transmission failed.');
      triggerToast("✓ Structural parameters saved to dynamic database profiles.");
    } catch (error) {
      console.error(error);
      triggerToast("⚠️ Saved locally. Server workspace failed to sync network response payload.");
    } finally {
      setIsSaving(false);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white border border-indigo-400 shadow-xl">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 p-5 rounded-xl border bg-[#0b1120] border-slate-800/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-500/20 text-amber-400 border border-amber-500/35">
            System Configuration
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">Debate Tournament Architecture Parameters</h2>
          <p className="text-xs text-slate-400 mt-0.5">Adjust timing mechanisms, institutional block rulesets, and speaker threshold ranges globally.</p>
        </div>
        <button 
          onClick={handleSaveConfiguration}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-400 transition shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving Changes...' : 'Save Configuration'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Controls */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="p-5 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" /> Format & Structural Presets
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Debate Architecture Format</label>
                <select 
                  value={config.architectureFormat}
                  onChange={(e) => handleInputChange('architectureFormat', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="" disabled hidden>Select layout profile format...</option>
                  <option value="bp">British Parliamentary (BP) — 4 Team Room Configuration</option>
                  <option value="ap">Asian Parliamentary (AP) — 3v3 Format</option>
                  <option value="wsdc">World Schools Style (WSDC)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Prep-Time Duration Allocation</label>
                <select 
                  value={config.prepTimeAllocation}
                  onChange={(e) => handleInputChange('prepTimeAllocation', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="" disabled hidden>Select allocation threshold...</option>
                  <option value="15">15 Minutes (Standard BP Standard)</option>
                  <option value="20">20 Minutes Extended</option>
                  <option value="30">30 Minutes Special Motion Review</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> Speaker Score Scale Constraints
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Floor Minimum Score</label>
                <input 
                  type="number" 
                  value={config.floorMinimumScore || ''} 
                  placeholder="0"
                  onChange={(e) => handleInputChange('floorMinimumScore', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Standard Target Average</label>
                <input 
                  type="number" 
                  value={config.standardTargetAverage || ''} 
                  placeholder="0"
                  onChange={(e) => handleInputChange('standardTargetAverage', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1.5">Ceiling Maximum Score</label>
                <input 
                  type="number" 
                  value={config.ceilingMaximumScore || ''} 
                  placeholder="0"
                  onChange={(e) => handleInputChange('ceilingMaximumScore', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info Module */}
        <div>
          <div className="p-5 rounded-xl border bg-[#0f172a]/70 border-slate-800/40 sticky top-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" /> Engine Parameters Rule
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Altering minimum or maximum scale parameters dynamically changes live validation scripts inside judge ballot sub-consoles, helping prevent mathematical entry errors in the field.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}