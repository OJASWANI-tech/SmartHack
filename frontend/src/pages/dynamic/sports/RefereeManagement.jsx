import React, { useState } from 'react';
import { Flag, Award, CalendarClock, CheckCircle2, AlertTriangle } from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const REFEREES = [
  { id: 1, name: 'R. Singh', level: 'National', matchCount: 3, available: true },
  { id: 2, name: 'A. Mehta', level: 'Regional', matchCount: 2, available: true },
  { id: 3, name: 'P. Rao', level: 'National', matchCount: 2, available: true },
  { id: 4, name: 'S. Iyer', level: 'Regional', matchCount: 0, available: true },
  { id: 5, name: 'K. Das', level: 'Club', matchCount: 1, available: false },
];

const UPCOMING_FIXTURES = [
  { id: 'M-107', venue: 'Court 1', slot: '12:00', teamA: 'Eagles', teamB: 'Comets', refereeId: null },
  { id: 'M-108', venue: 'Court 2', slot: '12:00', teamA: 'Bears', teamB: 'Falcons', refereeId: null },
  { id: 'M-109', venue: 'Main Field', slot: '13:00', teamA: 'Titans', teamB: 'Raptors', refereeId: null },
];

const LEVEL_STYLES = {
  National: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  Regional: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  Club: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
};

export default function RefereeManagement() {
  const [referees, setReferees] = useState(REFEREES);
  const [fixtures, setFixtures] = useState(UPCOMING_FIXTURES);
  const [selectedRefId, setSelectedRefId] = useState(REFEREES[0].id);

  const assignReferee = (fixtureId) => {
    setFixtures((prev) => prev.map((f) => (f.id === fixtureId ? { ...f, refereeId: selectedRefId } : f)));
    setReferees((prev) => prev.map((r) => (r.id === selectedRefId ? { ...r, matchCount: r.matchCount + 1 } : r)));
  };

  const refSlotMap = (refId) =>
    fixtures.filter((f) => f.refereeId === refId).map((f) => f.slot);

  const isDoubleBooked = (refId, slot) => {
    const slots = refSlotMap(refId);
    return slots.filter((s) => s === slot).length > 1;
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Officials Allocation</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Referee Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referee directory */}
        <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
          <h2 className="text-sm font-bold text-white mb-5">Referee Directory</h2>
          <div className="space-y-3">
            {referees.map((ref) => {
              const selected = selectedRefId === ref.id;
              return (
                <button
                  key={ref.id}
                  onClick={() => setSelectedRefId(ref.id)}
                  disabled={!ref.available}
                  className={`w-full text-left rounded-xl border p-4 transition-all duration-300 ${
                    selected ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                  } ${!ref.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flag className={`w-4 h-4 ${selected ? 'text-emerald-400' : 'text-cyan-400'}`} />
                      <span className="font-bold text-white">{ref.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${LEVEL_STYLES[ref.level]}`}>
                      <Award className="w-3 h-3 inline mr-1" />{ref.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {ref.matchCount} match{ref.matchCount !== 1 ? 'es' : ''} assigned · {ref.available ? 'Available' : 'Unavailable'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Assignor interface */}
        <div className={`${GLASS} rounded-2xl p-6 md:p-8`}>
          <h2 className="text-sm font-bold text-white mb-5">Assign to Upcoming Fixtures</h2>
          <div className="space-y-3">
            {fixtures.map((fixture) => {
              const assignedRef = referees.find((r) => r.id === fixture.refereeId);
              const conflict = fixture.refereeId && isDoubleBooked(fixture.refereeId, fixture.slot);
              return (
                <div key={fixture.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">{fixture.teamA} vs {fixture.teamB}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <CalendarClock className="w-3 h-3" /> {fixture.venue} · {fixture.slot}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {assignedRef ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> {assignedRef.name}
                      </span>
                    ) : (
                      <button
                        onClick={() => assignReferee(fixture.id)}
                        className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-semibold text-xs px-3 py-2 transition-all duration-300"
                      >
                        Assign Selected Referee
                      </button>
                    )}
                    {conflict && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400" title="Referee already booked this slot">
                        <AlertTriangle className="w-4 h-4" /> Conflict
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
