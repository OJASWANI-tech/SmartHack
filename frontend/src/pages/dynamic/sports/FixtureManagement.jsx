import React, { useState, useMemo } from 'react';
import { AlertTriangle, UserCheck, Radio, MapPinned } from 'lucide-react';
import LiveScoreResults from './LiveScoreResults';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

const VENUES = ['Court 1', 'Court 2', 'Court 3', 'Main Field'];
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00'];

const INITIAL_MATCHES = [
  { id: 'M-101', venue: 'Court 1', slot: '09:00', teamA: 'Falcons', teamB: 'Titans', referee: 'R. Singh', durationMinutes: 40 },
  { id: 'M-102', venue: 'Court 2', slot: '09:00', teamA: 'Wolves', teamB: 'Hurricanes', referee: 'A. Mehta', durationMinutes: 40 },
  { id: 'M-103', venue: 'Court 1', slot: '10:00', teamA: 'Sharks', teamB: 'Eagles', referee: 'R. Singh', durationMinutes: 40 },
  { id: 'M-104', venue: 'Main Field', slot: '10:00', teamA: 'Comets', teamB: 'Vipers', referee: 'P. Rao', durationMinutes: 40 },
  { id: 'M-105', venue: 'Court 3', slot: '11:00', teamA: 'Raptors', teamB: 'Bears', referee: 'A. Mehta', durationMinutes: 40 },
  { id: 'M-106', venue: 'Court 2', slot: '11:00', teamA: 'Falcons', teamB: 'Wolves', referee: 'P. Rao', durationMinutes: 40 },
];

export default function FixtureManagement() {
  const [matches] = useState(INITIAL_MATCHES);
  const [activeMatch, setActiveMatch] = useState(null);

  const conflicts = useMemo(() => {
    const seen = new Map();
    const flagged = new Set();
    matches.forEach((m) => {
      [m.teamA, m.teamB].forEach((team) => {
        const key = `${team}__${m.slot}`;
        if (seen.has(key) && seen.get(key) !== m.venue) {
          flagged.add(team);
        }
        seen.set(key, m.venue);
      });
    });
    return Array.from(flagged);
  }, [matches]);

  const matchAt = (venue, slot) => matches.find((m) => m.venue === venue && m.slot === slot);

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Venue & Timeline</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Fixture Management</h1>
      </div>

      {conflicts.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/[0.08] px-5 py-3 flex items-center gap-3 transition-all duration-300">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300 font-medium">
            Scheduling conflict: {conflicts.join(', ')} {conflicts.length === 1 ? 'is' : 'are'} booked on multiple venues in the same slot.
          </p>
        </div>
      )}

      <div className={`${GLASS} rounded-2xl p-6 md:p-8 overflow-x-auto`}>
        <div className="min-w-[760px]">
          {/* Time header */}
          <div className="grid mb-3" style={{ gridTemplateColumns: `140px repeat(${TIME_SLOTS.length}, 1fr)` }}>
            <div />
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="text-center text-xs uppercase tracking-wider text-slate-500 font-semibold py-2">{slot}</div>
            ))}
          </div>

          {/* Venue lanes */}
          {VENUES.map((venue) => (
            <div key={venue} className="grid items-stretch mb-3" style={{ gridTemplateColumns: `140px repeat(${TIME_SLOTS.length}, 1fr)` }}>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 pr-3">
                <MapPinned className="w-4 h-4 text-cyan-400" /> {venue}
              </div>
              {TIME_SLOTS.map((slot) => {
                const match = matchAt(venue, slot);
                return (
                  <div key={slot} className="px-1.5">
                    {match ? (
                      <button
                        onClick={() => setActiveMatch(match)}
                        className={`w-full text-left rounded-xl border p-3 transition-all duration-300 hover:border-emerald-500/40 ${
                          conflicts.includes(match.teamA) || conflicts.includes(match.teamB)
                            ? 'border-amber-400/50 bg-amber-400/[0.08]'
                            : 'border-white/[0.08] bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-500">{match.id}</span>
                          <Radio className="w-3 h-3 text-emerald-400" />
                        </div>
                        <p className="text-xs font-bold text-white truncate">{match.teamA} vs {match.teamB}</p>
                        <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 truncate">
                          <UserCheck className="w-3 h-3" /> {match.referee}
                        </p>
                      </button>
                    ) : (
                      <div className="w-full h-full min-h-[68px] rounded-xl border border-dashed border-white/[0.06]" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {activeMatch && (
        <LiveScoreResults match={activeMatch} onClose={() => setActiveMatch(null)} />
      )}
    </div>
  );
}
