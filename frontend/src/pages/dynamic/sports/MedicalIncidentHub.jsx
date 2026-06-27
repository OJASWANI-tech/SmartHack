import React, { useState } from 'react';
import {
  HeartPulse, Siren, Stethoscope, Ambulance, CheckCircle2, Clock, MapPinned,
  TrendingUp, Plus
} from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const INITIAL_INCIDENTS = [
  { id: 'I-301', athlete: 'N. Verma', team: 'Falcons', venue: 'Court 1', injury: 'Ankle sprain', severity: 'minor', status: 'cleared', dispatched: '14:02' },
  { id: 'I-302', athlete: 'R. Joshi', team: 'Hurricanes', venue: 'Main Field', injury: 'Collision — possible concussion', severity: 'major', status: 'active', dispatched: '14:18' },
  { id: 'I-303', athlete: 'T. Das', team: 'Sharks', venue: 'Court 3', injury: 'Heat exhaustion', severity: 'moderate', status: 'monitoring', dispatched: '13:40' },
];

const SEVERITY_STYLES = {
  minor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  moderate: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  major: 'border-red-500/40 bg-red-500/10 text-red-400',
};

const STATUS_STYLES = {
  active: 'border-red-500/40 bg-red-500/10 text-red-400',
  monitoring: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  cleared: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
};

const ANALYTICS = [
  { label: 'Avg Response Time', value: '3.2 min' },
  { label: 'Incidents Today', value: '3' },
  { label: 'Return-to-Play Rate', value: '78%' },
];

export default function MedicalIncidentHub() {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [toast, setToast] = useState('');

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const activeCount = incidents.filter((i) => i.status === 'active').length;
  const monitoringCount = incidents.filter((i) => i.status === 'monitoring').length;
  const clearedCount = incidents.filter((i) => i.status === 'cleared').length;

  const dispatchAmbulance = (id) => {
    triggerToast(`Ambulance dispatched for ${id}.`);
  };

  const advanceStatus = (id) => {
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next = i.status === 'active' ? 'monitoring' : i.status === 'monitoring' ? 'cleared' : 'cleared';
        return { ...i, status: next };
      })
    );
    triggerToast(`${id} status updated.`);
  };

  const logNewIncident = () => {
    const id = `I-${300 + incidents.length + 1}`;
    setIncidents((prev) => [
      { id, athlete: 'Unassigned', team: '—', venue: 'Triage Desk', injury: 'New report — pending triage', severity: 'moderate', status: 'active', dispatched: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ...prev,
    ]);
    triggerToast(`Incident ${id} logged — first aid dispatched.`);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Health & Safety</p>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Medical & Incident Response Hub</h1>
        </div>
        <button
          onClick={logNewIncident}
          className="flex items-center gap-2 rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 font-bold px-4 py-2.5 text-sm transition-all duration-300"
        >
          <Plus className="w-4 h-4" /> Log Incident
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}>
          <Siren className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-lg font-bold text-white">{activeCount}</div>
            <div className="text-xs text-slate-500">Active Incidents</div>
          </div>
        </div>
        <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}>
          <Stethoscope className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-lg font-bold text-white">{monitoringCount}</div>
            <div className="text-xs text-slate-500">Under Monitoring</div>
          </div>
        </div>
        <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-lg font-bold text-white">{clearedCount}</div>
            <div className="text-xs text-slate-500">Cleared to Return</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${GLASS} rounded-2xl p-6 lg:col-span-2`}>
          <div className="flex items-center gap-2 mb-4">
            <HeartPulse className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-white">Incident Log</h2>
          </div>
          <div className="space-y-3">
            {incidents.map((i) => (
              <div key={i.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-white text-sm">{i.id} · {i.athlete}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[i.severity]}`}>{i.severity}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[i.status]}`}>{i.status}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-2">{i.injury}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><MapPinned className="w-3 h-3" /> {i.venue}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {i.dispatched}</span>
                  </span>
                  <div className="flex items-center gap-3">
                    {i.status !== 'cleared' && (
                      <>
                        <button onClick={() => dispatchAmbulance(i.id)} className="flex items-center gap-1 text-red-400 font-semibold hover:underline">
                          <Ambulance className="w-3.5 h-3.5" /> Dispatch
                        </button>
                        <button onClick={() => advanceStatus(i.id)} className="flex items-center gap-1 text-emerald-400 font-semibold hover:underline">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Advance Status
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${GLASS} rounded-2xl p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Health & Injury Analytics</h2>
          </div>
          <div className="space-y-2">
            {ANALYTICS.map((a) => (
              <div key={a.label} className="flex justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-900/60 items-center text-xs">
                <span className="text-slate-500">{a.label}</span>
                <span className="text-white font-bold">{a.value}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-4">Trend data aggregated across all venues for the current tournament day.</p>
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
