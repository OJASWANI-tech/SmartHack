import React from 'react'
import CompatibilityBadge from '../evaluation/CompatibilityBadge'

export default function AssignmentExplainer({ evaluatorName, evaluatorDomain, teamName, challenge, score, reasoning, workload }) {
  return (
    <div className="assignment-explainer p-4 rounded-xl border border-slate-800 bg-slate-950/60 transition-all duration-300 hover:border-slate-700">
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <h4 className="text-white font-bold text-sm leading-snug">{evaluatorName}</h4>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Primary Focus: {evaluatorDomain || 'Expert'}</span>
        </div>
        <CompatibilityBadge score={score} tooltipText={reasoning} />
      </div>

      <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-3 mb-3">
        <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Target Assessment</div>
        <h5 className="text-white text-xs font-semibold">{teamName}</h5>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed truncate">{challenge}</p>
      </div>

      <div className="flex justify-between items-center text-[10px]">
        <div className="text-slate-450 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Current Workload: <span className="text-white font-bold font-mono">{workload} teams</span>
        </div>
        <div className="text-slate-450 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-emerald-450 font-semibold uppercase text-[9px] tracking-wider">No Conflicts Verified</span>
        </div>
      </div>
    </div>
  )
}
