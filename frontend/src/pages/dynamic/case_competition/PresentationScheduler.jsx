import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, AlertTriangle, Loader2, CircleDot, Tv, GripVertical
} from 'lucide-react';

const GLASS = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]';

const ROOMS = ['Room 1 — Track A', 'Room 2 — Track A', 'Room 3 — Track B', 'Room 4 — Track C'];
const TIME_BLOCKS = ['09:30', '10:00', '10:30', '11:00'];

const INITIAL_SLOTS = {
  'Room 1 — Track A|09:30': { team: 'Meridian Strategy', judge: 'Dana Whitfield' },
  'Room 1 — Track A|10:00': { team: 'Apex Consulting', judge: 'Marcus Cole' },
  'Room 2 — Track A|09:30': { team: 'NorthStar Group', judge: 'Marcus Cole' },
  'Room 2 — Track A|10:30': { team: 'Catalyst Partners', judge: 'Priya Anand' },
  'Room 3 — Track B|10:00': { team: 'Vertex Advisory', judge: 'Jonathan Reeve' },
  'Room 4 — Track C|11:00': { team: 'Lumen Insights', judge: 'Elliot Park' }
};

export default function PresentationScheduler() {
  const navigate = useNavigate();
  const [eventName, setEventName] = useState('Case Competition');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [slots, setSlots] = useState(INITIAL_SLOTS);
  const [draggedKey, setDraggedKey] = useState(null);

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

  const handleDrop = (targetKey) => {
    if (!draggedKey || draggedKey === targetKey) return;
    setSlots((prev) => {
      const next = { ...prev };
      const moved = next[draggedKey];
      const displaced = next[targetKey];
      next[targetKey] = moved;
      if (displaced) next[draggedKey] = displaced;
      else delete next[draggedKey];
      return next;
    });
    triggerToast('Presentation slot rescheduled.');
    setDraggedKey(null);
  };

  const doubleBookedJudges = useMemo(() => {
    const byTimeBlock = {};
    Object.entries(slots).forEach(([key, slot]) => {
      const [, time] = key.split('|');
      byTimeBlock[time] = byTimeBlock[time] || [];
      byTimeBlock[time].push(slot.judge);
    });
    const conflicts = new Set();
    Object.values(byTimeBlock).forEach((judgeList) => {
      const seen = new Set();
      judgeList.forEach((judge) => {
        if (seen.has(judge)) conflicts.add(judge);
        seen.add(judge);
      });
    });
    return conflicts;
  }, [slots]);

  const launchLiveHud = (room, slot) => {
    sessionStorage.setItem('live_pitch_hud_context', JSON.stringify({ room, ...slot }));
    navigate('/dynamic-test/live-pitch-hud');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060B16] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading presentation schedule…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B16] p-6 md:p-8 text-slate-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Presentation Scheduler</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{eventName}</h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-semibold">
          <CalendarDays className="w-4 h-4" /> {Object.keys(slots).length} Slots Scheduled
        </div>
      </div>

      {doubleBookedJudges.size > 0 && (
        <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/[0.08] text-amber-300 px-4 py-3 flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Double-booked judge{doubleBookedJudges.size > 1 ? 's' : ''}: {Array.from(doubleBookedJudges).join(', ')} — appears in two rooms during the same time block.
        </div>
      )}

      <div className={`${GLASS} rounded-2xl p-6 md:p-8 overflow-x-auto`}>
        <div className="grid" style={{ gridTemplateColumns: `160px repeat(${TIME_BLOCKS.length}, minmax(180px, 1fr))` }}>
          <div />
          {TIME_BLOCKS.map((time) => (
            <div key={time} className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 pb-3">{time}</div>
          ))}

          {ROOMS.map((room) => (
            <React.Fragment key={room}>
              <div className="text-sm font-semibold text-slate-200 flex items-center pr-3 py-2">{room}</div>
              {TIME_BLOCKS.map((time) => {
                const key = `${room}|${time}`;
                const slot = slots[key];
                const isConflict = slot && doubleBookedJudges.has(slot.judge);
                return (
                  <div
                    key={key}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(key)}
                    className="p-1.5"
                  >
                    {slot ? (
                      <div
                        draggable
                        onDragStart={() => setDraggedKey(key)}
                        className={`rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all duration-300 ${
                          isConflict ? 'border-amber-400/50 bg-amber-400/[0.08]' : 'border-indigo-500/30 bg-indigo-500/[0.08]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-100 truncate">{slot.team}</span>
                          <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{slot.judge}</p>
                        <button
                          onClick={() => launchLiveHud(room, slot)}
                          className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-300 hover:text-violet-200"
                        >
                          <Tv className="w-3 h-3" /> Launch Live HUD
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/[0.08] h-[72px] flex items-center justify-center text-[10px] text-slate-600 uppercase tracking-wider">
                        Open
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
        <CircleDot className="w-3 h-3" /> Drag any slot card onto another time block to reschedule.
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-indigo-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-indigo-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
