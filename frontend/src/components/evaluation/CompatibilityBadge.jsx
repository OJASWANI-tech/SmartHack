import React from 'react'

export default function CompatibilityBadge({ score, tooltipText }) {
  const getColors = (s) => {
    if (s >= 85) return { border: 'border-emerald-500/30', bg: 'bg-emerald-950/20', text: 'text-emerald-450', glow: 'shadow-emerald-500/10' }
    if (s >= 70) return { border: 'border-violet-500/30', bg: 'bg-violet-950/20', text: 'text-violet-400', glow: 'shadow-violet-500/10' }
    if (s >= 40) return { border: 'border-amber-500/30', bg: 'bg-amber-950/20', text: 'text-amber-400', glow: 'shadow-amber-500/10' }
    return { border: 'border-rose-500/30', bg: 'bg-rose-950/20', text: 'text-rose-450', glow: 'shadow-rose-500/10' }
  }

  const { border, bg, text, glow } = getColors(score)

  return (
    <div className={`relative group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${border} ${bg} ${text} ${glow} shadow-sm cursor-help transition-all duration-300 hover:scale-105`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
      <span className="text-[10px] font-bold font-mono tracking-wider">{score.toFixed(0)}% Match</span>
      
      {tooltipText && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-350 text-[10px] leading-relaxed shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-50">
          <div className="font-semibold text-white mb-1 uppercase tracking-wider text-[9px] text-slate-400">Match Logic Breakdown</div>
          {tooltipText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-800"></div>
        </div>
      )}
    </div>
  )
}
