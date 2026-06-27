import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Upload, Users, Award, ShieldAlert, CheckCircle2, 
  Trash2, Plus, AlertCircle 
} from 'lucide-react';

export default function DebateIntakeFormation() {
  const location = useLocation();
  const [toastMessage, setToastMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real database states
  const [debaters, setDebaters] = useState([]);
  const [conflictRules, setConflictRules] = useState([]);

  // Form registration states
  const [newDebater, setNewDebater] = useState({ name: '', institution: '', rolePref: 'Prime Minister', experience: 'Open', conflicts: '' });
  const [newConflict, setNewConflict] = useState({ type: 'Institutional', targetA: '', targetB: '', severity: 'High' });

  // Fallback to local storage keys depending on tournament dashboard routing architecture
  const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Fetch roster matrices on layout execution mounts
  useEffect(() => {
    if (!activeEventId) {
      setIsLoading(false);
      return;
    }

    const fetchIntakeMatrix = async () => {
      try {
        setIsLoading(true);
        const [debatersRes, conflictsRes] = await Promise.all([
          fetch(`${baseURL}/api/v1/events/${activeEventId}/debaters`),
          fetch(`${baseURL}/api/v1/events/${activeEventId}/clashes`)
        ]);

        if (!debatersRes.ok || !conflictsRes.ok) throw new Error("Data retrieval mismatch.");

        const debatersData = await debatersRes.json();
        const conflictsData = await conflictsRes.json();

        // Safe adapter mapping to structural components schema
        setDebaters(debatersData.map(d => ({
          id: d.id,
          name: d.full_name,
          institution: d.institution,
          rolePref: d.role_preference,
          experience: d.division_level,
          conflicts: d.affiliation_clashes
        })));

        setConflictRules(conflictsData.map(c => ({
          id: c.id,
          type: c.clash_type,
          targetA: c.party_a,
          targetB: c.party_b,
          severity: c.severity_level
        })));

      } catch (err) {
        console.error("Failed to parse event roster profiles:", err);
        triggerToast("⚠️ Failed to sync active event context records.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntakeMatrix();
  }, [location.pathname, activeEventId]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeEventId) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/debaters/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Processing error.");
      const updatedRoster = await res.json();
      
      setDebaters(updatedRoster.map(d => ({
        id: d.id,
        name: d.full_name,
        institution: d.institution,
        rolePref: d.role_preference,
        experience: d.division_level,
        conflicts: d.affiliation_clashes
      })));
      triggerToast("✓ Roster successfully updated via CSV source bulk ingestion.");
    } catch (err) {
      console.error(err);
      triggerToast("❌ CSV structural validation payload parse error.");
    } finally {
      setUploading(false);
    }
  };

  const handleAddDebater = async (e) => {
    e.preventDefault();
    if (!newDebater.name || !newDebater.institution) {
      triggerToast("⚠️ Name and Institution fields are required.");
      return;
    }
    if (!activeEventId) return;

    try {
      const response = await fetch(`${baseURL}/api/v1/events/${activeEventId}/debaters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newDebater.name,
          institution: newDebater.institution,
          division_level: newDebater.experience,
          role_preference: newDebater.rolePref,
          affiliation_clashes: newDebater.conflicts
        })
      });

      if (!response.ok) throw new Error("Database transaction rejected.");
      const created = await response.json();

      setDebaters(prev => [...prev, {
        id: created.id,
        name: created.full_name,
        institution: created.institution,
        rolePref: created.role_preference,
        experience: created.division_level,
        conflicts: created.affiliation_clashes
      }]);

      triggerToast(`✓ Registered debater: ${created.full_name}`);
      setNewDebater({ name: '', institution: '', rolePref: 'Prime Minister', experience: 'Open', conflicts: '' });
    } catch (err) {
      console.error(err);
      triggerToast("❌ Node generation pipeline dropped record context.");
    }
  };

  const handleAddConflict = async (e) => {
    e.preventDefault();
    if (!newConflict.targetA || !newConflict.targetB) {
      triggerToast("⚠️ Both conflict transaction boundaries are required.");
      return;
    }
    if (!activeEventId) return;

    try {
      const response = await fetch(`${baseURL}/api/v1/events/${activeEventId}/clashes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clash_type: newConflict.type,
          party_a: newConflict.targetA,
          party_b: newConflict.targetB,
          severity_level: newConflict.severity
        })
      });

      if (!response.ok) throw new Error("Conflict schema deployment rejected.");
      const created = await response.json();

      setConflictRules(prev => [...prev, {
        id: created.id,
        type: created.clash_type,
        targetA: created.party_a,
        targetB: created.party_b,
        severity: created.severity_level
      }]);

      triggerToast(`✓ Core collision restriction model instantiated.`);
      setNewConflict({ type: 'Institutional', targetA: '', targetB: '', severity: 'High' });
    } catch (err) {
      console.error(err);
      triggerToast("❌ Target execution rule pipeline collision.");
    }
  };

  const handleRemoveDebater = async (id) => {
    if (!activeEventId) return;
    try {
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/debaters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete reference rejected.");

      setDebaters(prev => prev.filter(d => d.id !== id));
      triggerToast("Debater purged from event records.");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Failed to clear registration profile context tracking nodes.");
    }
  };

  const handleRemoveConflict = async (id) => {
    if (!activeEventId) return;
    try {
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/clashes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Exclusion clearing trace execution error.");

      setConflictRules(prev => prev.filter(c => c.id !== id));
      triggerToast("Clash map validation rule removed.");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Exclusion system rule drops dropped.");
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">
      
      {/* Toast Alert Portal */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl shadow-black/40 border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Control Configuration Panel Header */}
      <div className="mb-6 p-5 rounded-xl border bg-[#0b1120] border-slate-800/60 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-500/20 text-purple-400 border border-purple-500/35">
              Registration Phase
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">Participant Intake & Division Setup</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure speaking preferences, debate levels, and institutional clashes.</p>
          </div>

          <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-200 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50">
            <Upload className="w-4 h-4" />
            {uploading ? 'Processing Sheet...' : 'Upload Ingestion CSV'}
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleCSVUpload} 
              disabled={uploading} 
            />
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide p-6">
          Synchronizing validation rosters from schema profile states...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column Controls */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Context Registration Form Container */}
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" /> Register New Debater
              </h3>
              
              <form onSubmit={handleAddDebater} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alice Vance"
                    value={newDebater.name}
                    onChange={(e) => setNewDebater(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Institution / School</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stanford University"
                    value={newDebater.institution}
                    onChange={(e) => setNewDebater(prev => ({ ...prev, institution: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Division Level</label>
                  <select
                    value={newDebater.experience}
                    onChange={(e) => setNewDebater(prev => ({ ...prev, experience: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Open">Open (Experienced)</option>
                    <option value="Novice">Novice (Beginner)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Role Preference</label>
                  <select
                    value={newDebater.rolePref}
                    onChange={(e) => setNewDebater(prev => ({ ...prev, rolePref: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Prime Minister">Prime Minister</option>
                    <option value="Leader of Opposition">Leader of Opposition</option>
                    <option value="Deputy PM">Deputy PM</option>
                    <option value="Whip">Whip</option>
                    <option value="Reply Speaker">Reply Speaker</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Affiliation Clashes</label>
                  <input
                    type="text"
                    placeholder="e.g. Harvard (Clashes)"
                    value={newDebater.conflicts}
                    onChange={(e) => setNewDebater(prev => ({ ...prev, conflicts: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    Add Debater +
                  </button>
                </div>
              </form>
            </div>

            {/* Ingestion Table Displays */}
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Active Roster ({debaters.length})
              </h3>
              
              <div className="overflow-x-auto">
                {debaters.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs italic">
                    No participants currently logged in the roster workspace.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Institution</th>
                        <th className="py-2.5 px-3">Division</th>
                        <th className="py-2.5 px-3">Role Pref</th>
                        <th className="py-2.5 px-3">Clashes</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debaters.map(deb => (
                        <tr key={deb.id} className="border-b border-slate-800/35 hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 px-3 font-semibold text-white">{deb.name}</td>
                          <td className="py-3 px-3">{deb.institution}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${deb.experience === 'Open' ? 'bg-purple-500/15 text-purple-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                              {deb.experience}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">{deb.rolePref}</td>
                          <td className="py-3 px-3 text-rose-400 font-medium">{deb.conflicts || 'None'}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleRemoveDebater(deb.id)}
                              className="p-1 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Right Column Form Layout */}
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" /> Clash Mapping Rules
              </h3>
              
              <form onSubmit={handleAddConflict} className="flex flex-col gap-3 mb-6 pb-6 border-b border-slate-800/40">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Party A / Institution</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stanford University"
                    value={newConflict.targetA}
                    onChange={(e) => setNewConflict(prev => ({ ...prev, targetA: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Party B / Adjudicator</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Harvard University"
                    value={newConflict.targetB}
                    onChange={(e) => setNewConflict(prev => ({ ...prev, targetB: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Severity</label>
                    <select
                      value={newConflict.severity}
                      onChange={(e) => setNewConflict(prev => ({ ...prev, severity: e.target.value }))}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="High">High (Warn)</option>
                      <option value="Critical">Critical (Block)</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                    >
                      Save Rule +
                    </button>
                  </div>
                </div>
              </form>

              {/* Exclusion Maps Mapping Lists */}
              <div className="flex flex-col gap-3">
                {conflictRules.length === 0 ? (
                  <div className="text-xs text-slate-500 italic text-center py-4">
                    No active conflict constraints mapped to this context window.
                  </div>
                ) : (
                  conflictRules.map(rule => (
                    <div key={rule.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-850 flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">{rule.type} Clash</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-rose-500/20 text-rose-400">{rule.severity}</span>
                        </div>
                        <p className="text-xs text-white mt-1 leading-snug">{rule.targetA} ↔ {rule.targetB}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveConflict(rule.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}