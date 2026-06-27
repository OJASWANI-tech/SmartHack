import React from 'react'

export default function ScheduleGrid({ schedules }) {
  // Extract unique rooms and unique slots
  const rooms = Array.from(new Set(schedules.map(s => s.room))).sort()
  const timeSlots = Array.from(new Set(schedules.map(s => s.time_slot))).sort()

  // Map slot × room -> session details
  const getSession = (slot, room) => {
    return schedules.find(s => s.time_slot === slot && s.room === room)
  }

  if (schedules.length === 0) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500 font-light">
        No active scheduled sessions found. Generate schedule to populate the timetable matrix.
      </div>
    )
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl overflow-x-auto">
      <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Evaluation Schedule Timetable Matrix
      </h3>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Time Slot</th>
            {rooms.map(room => (
              <th key={room} className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {room}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-850">
          {timeSlots.map(slot => (
            <tr key={slot} className="hover:bg-slate-900/10 transition-colors">
              <td className="py-4 px-4 text-xs text-slate-400 font-mono font-semibold whitespace-nowrap">
                {slot}
              </td>
              {rooms.map(room => {
                const session = getSession(slot, room)
                return (
                  <td key={`${slot}-${room}`} className="py-4 px-4">
                    {session ? (
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 transition-all duration-300 hover:border-violet-500/40 hover:bg-slate-900/60 max-w-[200px]">
                        <h4 className="text-white font-bold text-xs leading-snug">{session.team_name}</h4>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                          <span>{session.evaluator_name}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 block mt-1.5 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850/50 w-max">
                          Seq: #{session.sequence_order}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-650 italic font-light">
                        Empty Slot
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
