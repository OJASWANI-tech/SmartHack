import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, GraduationCap, Radio, CheckCircle2, UserPlus, Clock,
  ShieldCheck, Mail, Loader2, Award, BookOpen
} from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

export default function CodingMentorAssignment() {
  const [eventName, setEventName] = useState('Coding Contest');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Cleared state arrays ready for active API or WebSocket consumption
  const [mentors, setMentors] = useState([]);
  const [unassignedTeams, setUnassignedTeams] = useState([]);

  const [selectedMentor, setSelectedMentor] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
      if (currentEventId) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseURL}/api/v1/events/${currentEventId}`);
        if (res.ok) {
          const data = await res.json();
          setEventName(data.name || 'Coding Contest');
          // Add your state setters here once backend schema matches:
          // setMentors(data.mentors || []);
          // setUnassignedTeams(data.unassigned_teams || []);
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

  const handleAssign = () => {
    if (!selectedMentor || !selectedTeam) {
      triggerToast('⚠️ Please select both a mentor and a team.');
      return;
    }

    const mentorObj = mentors.find(m => m.id === selectedMentor);
    const teamObj = unassignedTeams.find(t => t.id === selectedTeam);

    if (!mentorObj || !teamObj) return;

    if (mentorObj.workload >= mentorObj.maxWorkload) {
      triggerToast(`⚠️ ${mentorObj.name} has reached maximum workload.`);
      return;
    }

    // Dynamic Assignment Update
    setMentors(prev => prev.map(m => {
      if (m.id === selectedMentor) {
        return {
          ...m,
          workload: (m.workload || 0) + 1,
          assigned: [...(m.assigned || []), teamObj.leader]
        };
      }
      return m;
    }));

    setUnassignedTeams(prev => prev.filter(t => t.id !== selectedTeam));
    triggerToast(`✓ Assigned ${mentorObj.name} to team "${teamObj.name}".`);
    setSelectedTeam(null);
  };

  // Safely compute real-time metrics based on live arrays
  const allocationStats = useMemo(() => {
    if (mentors.length === 0) {
      return { totalAllocated: 0, availableMentors: 0, avgWorkload: '0%' };
    }
    const available = mentors.filter(m => m.status !== 'Offline').length;
    const runningWorkload = mentors.reduce((acc, curr) => acc + (curr.workload || 0), 0);
    const totalCapacity = mentors.reduce((acc, curr) => acc + (curr.maxWorkload || 1), 0);
    const avgWorkload = totalCapacity > 0 ? `${Math.round((runningWorkload / totalCapacity) * 100)}%` : '0%';

    return {
      totalAllocated: runningWorkload,
      availableMentors: available,
      avgWorkload
    };
  }, [mentors]);

  const mentorStatusStyles = {
    Active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    Busy: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    Offline: 'text-slate-400 bg-slate-400/10 border-slate-400/20'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Syncing proctor registry…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Proctor Operations</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{eventName} Mentor Desk</h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-semibold">
          <GraduationCap className="w-4 h-4" /> Mentor Assignment Active
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Mentor Directory List */}
        <div className="lg:col-span-8 space-y-4">
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Coding Mentors Directory</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Active Pool: {allocationStats.availableMentors} / {mentors.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mentors.map((m) => {
                const isSelected = selectedMentor === m.id;
                const pct = Math.round(((m.workload || 0) / (m.maxWorkload || 1)) * 100);
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMentor(isSelected ? null : m.id)}
                    className={`rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-white">{m.name}</h3>
                        <span className="text-xs text-cyan-400 font-medium">{m.specialty}</span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${mentorStatusStyles[m.status] || mentorStatusStyles.Offline}`}>
                        {m.status || 'Offline'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-3">
                      <Mail className="w-3 h-3" />
                      <span>{m.email}</span>
                    </div>

                    {/* Progress Bar for Workload */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Workload Load</span>
                        <span>{m.workload} / {m.maxWorkload} Teams ({pct}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-cyan-500'
                          }`} 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>

                    {m.assigned && m.assigned.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.04] flex flex-wrap gap-1.5 items-center">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Assigned handles:</span>
                        {m.assigned.map(h => (
                          <span key={h} className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-white/[0.05]">
                            @{h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {mentors.length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/[0.04] rounded-xl text-slate-500 text-xs italic">
                Awaiting active mentor network records stream...
              </div>
            )}
          </div>
        </div>

        {/* Action Panel Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Assignment Controls */}
          <div className={`${GLASS} rounded-2xl p-6 space-y-4`}>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Routing Panel</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">1. Selected Mentor</label>
                <div className="rounded-xl border border-white/[0.08] bg-[#070c1a] p-3 text-xs font-mono text-slate-300 min-h-[40px] flex items-center">
                  {selectedMentor 
                    ? mentors.find(m => m.id === selectedMentor)?.name 
                    : <span className="text-slate-600">Click a mentor from the directory</span>}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">2. Target Unassigned Team</label>
                <select
                  value={selectedTeam || ''}
                  onChange={(e) => setSelectedTeam(e.target.value || null)}
                  disabled={unassignedTeams.length === 0}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#070c1a] p-3 text-xs text-slate-300 outline-none cursor-pointer focus:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{unassignedTeams.length === 0 ? 'No teams requiring mapping' : '-- Choose team --'}</option>
                  {unassignedTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (CF Leader: @{t.leader} | {t.rating} rating)</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAssign}
                disabled={!selectedMentor || !selectedTeam}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500/10 font-bold px-4 py-3.5 transition-all duration-300 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> Finalize Proctor Mapping
              </button>
            </div>
          </div>

          {/* Allocation Statistics */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Verification Status</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs p-2 rounded bg-slate-900/50">
                <span className="text-slate-400">Total Teams Allocated</span>
                <span className="font-mono font-bold text-white">{allocationStats.totalAllocated} Active</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded bg-slate-900/50">
                <span className="text-slate-400">Available Mentors</span>
                <span className="font-mono font-bold text-cyan-400">{allocationStats.availableMentors} Mentors</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded bg-slate-900/50">
                <span className="text-slate-400">General Workload Load</span>
                <span className="font-mono font-bold text-emerald-400">{allocationStats.avgWorkload} Average</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-cyan-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}