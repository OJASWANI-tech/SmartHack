import React, { useState } from 'react'

export default function AnomalyCard({ anomaly, onResolve, onEscalate, getAIDivergence }) {
  const [isExpanding, setIsExpanding] = useState(false)
  const [aiReport, setAiReport] = useState('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [committeeNote, setCommitteeNote] = useState('')
  const [resolvingAction, setResolvingAction] = useState('') // 'override_average', 're_evaluation', 'accepted'

  const severityColors = (sev) => {
    if (sev === 'high') return 'border-rose-500/40 bg-rose-950/10 text-rose-400 shadow-rose-900/10'
    if (sev === 'medium') return 'border-amber-500/40 bg-amber-950/10 text-amber-400 shadow-amber-900/10'
    return 'border-blue-500/40 bg-blue-950/10 text-blue-400 shadow-blue-900/10'
  }

  const handleFetchAIReport = async () => {
    if (aiReport) {
      setIsExpanding(!isExpanding)
      return
    }
    setLoadingAi(true)
    setIsExpanding(true)
    try {
      const res = await getAIDivergence(anomaly.team_id)
      setAiReport(res.divergence_summary)
    } catch (e) {
      setAiReport('Failed to fetch AI Divergence Audit Report. Fallback generated internally.')
    } finally {
      setLoadingAi(false)
    }
  }

  const handleResolveSubmit = (action) => {
    onResolve(anomaly.id, action, committeeNote)
  }

  return (
    <div className={`anomaly-card p-5 rounded-xl border mb-5 transition-all duration-300 ${severityColors(anomaly.severity)}`}>
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/40 border border-current">
              {anomaly.severity} Severity
            </span>
            <span className="text-[10px] font-mono opacity-80">
              Divergence Spread: {anomaly.divergence_score.toFixed(2)} pts
            </span>
          </div>
          <h3 className="text-white text-lg font-bold mt-2">{anomaly.team_name}</h3>
          <p className="text-slate-350 text-xs mt-1 leading-relaxed max-w-2xl">{anomaly.ai_reasoning}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFetchAIReport}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            {loadingAi ? 'Auditing...' : isExpanding ? 'Hide Audit' : 'AI Divergence Report'}
          </button>
          
          {anomaly.resolution_status === 'pending' ? (
            <button
              onClick={() => onEscalate(anomaly.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-650/20 border border-red-800/40 text-red-400 hover:bg-red-950/30 transition-colors"
            >
              Escalate Rescore
            </button>
          ) : (
            <span className="text-xs text-emerald-400 font-mono capitalize flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/20 border border-emerald-900/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Resolved: {anomaly.resolution_action}
            </span>
          )}
        </div>
      </div>

      {isExpanding && (
        <div className="mt-5 border-t border-slate-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-5 animate-slideDown">
          {/* Left: AI Report */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-850">
            <h4 className="text-white text-xs font-semibold mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
              AI Score Audit Report
            </h4>
            {loadingAi ? (
              <div className="py-8 flex justify-center"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <div className="text-slate-350 text-xs whitespace-pre-line font-light leading-relaxed max-h-[220px] overflow-y-auto pr-1">
                {aiReport}
              </div>
            )}
          </div>

          {/* Right: Resolution Control */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 flex flex-col justify-between">
            <div>
              <h4 className="text-white text-xs font-semibold mb-2">Governance Resolution Center</h4>
              {anomaly.resolution_status === 'pending' ? (
                <>
                  <textarea
                    placeholder="Enter resolution notes or explanation for audit logs (mandatory)..."
                    value={committeeNote}
                    onChange={(e) => setCommitteeNote(e.target.value)}
                    className="w-full h-16 p-2 text-xs rounded bg-slate-900 border border-slate-850 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <button
                      onClick={() => handleResolveSubmit('accepted')}
                      disabled={!committeeNote}
                      className="px-2 py-2 rounded font-medium text-xs border border-violet-800 text-violet-400 bg-violet-950/20 hover:bg-violet-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Accept Spread
                    </button>
                    <button
                      onClick={() => handleResolveSubmit('override_average')}
                      disabled={!committeeNote}
                      className="px-2 py-2 rounded font-medium text-xs border border-cyan-800 text-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Use Average
                    </button>
                    <button
                      onClick={() => handleResolveSubmit('re_evaluation')}
                      disabled={!committeeNote}
                      className="px-2 py-2 rounded font-medium text-xs border border-amber-800 text-amber-400 bg-amber-950/20 hover:bg-amber-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Hold rescore
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-slate-400 text-xs font-light mt-2 leading-relaxed">
                  <span className="text-white font-medium block">Resolution Audit Trail Note:</span>
                  "{anomaly.committee_note || 'Resolved without direct notes.'}"
                  <span className="block text-[10px] text-slate-500 mt-2 font-mono">Resolved on {new Date(anomaly.resolved_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
