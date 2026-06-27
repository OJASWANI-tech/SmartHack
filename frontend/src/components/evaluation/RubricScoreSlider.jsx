import React from 'react'

export default function RubricScoreSlider({ criterion, weight, description, value, onChange }) {
  return (
    <div className="rubric-slider p-4 bg-slate-900/50 border border-slate-800 rounded-xl mb-4 transition-all duration-300 hover:border-violet-500/50 hover:bg-slate-900/80">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="text-white font-medium flex items-center gap-2">
            {criterion}
            <span className="text-xs text-violet-400 font-mono bg-violet-950/50 border border-violet-850/50 px-2 py-0.5 rounded-full">
              Weight: {weight}%
            </span>
          </h4>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-xl">{description}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold font-mono text-violet-400 bg-violet-950/20 border border-violet-900/30 px-3 py-1 rounded-lg">
            {value.toFixed(1)}
          </span>
          <span className="text-xs text-slate-500 block mt-1 font-mono">/ 10.0</span>
        </div>
      </div>
      
      <div className="relative mt-4">
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500 outline-none transition-all focus:ring-2 focus:ring-violet-500/30"
          style={{
            background: `linear-gradient(to right, rgb(139, 92, 246) ${value * 10}%, rgb(30, 41, 59) ${value * 10}%)`
          }}
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-0.5">
          <span>0 (Incomplete)</span>
          <span>5 (Average)</span>
          <span>10 (Exemplary)</span>
        </div>
      </div>
    </div>
  )
}
