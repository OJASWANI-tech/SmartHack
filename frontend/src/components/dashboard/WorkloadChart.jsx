import React from 'react'

export default function WorkloadChart({ workloadData }) {
  const keys = Object.keys(workloadData)
  const maxVal = Math.max(...Object.values(workloadData), 1)

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl">
      <h3 className="text-white text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
        Evaluator Workload Balance
      </h3>
      
      <div className="space-y-4">
        {keys.map(name => {
          const val = workloadData[name]
          const percentage = (val / maxVal) * 100
          
          return (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white font-medium">{name}</span>
                <span className="text-violet-400 font-bold font-mono">{val} assigned teams</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                <div 
                  className="h-full bg-gradient-to-right from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
