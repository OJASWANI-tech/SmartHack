import React, { useState } from 'react'

export default function AIInsightPanel({ summaryText, hintsText, isLoading }) {
  const [activeTab, setActiveTab] = useState('summary')

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl relative overflow-hidden">
      {/* Decorative Neon Topline */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-right from-violet-500 via-fuchsia-500 to-cyan-500 animate-pulse"></div>

      <div className="flex justify-between items-center mb-4 border-b border-slate-850 pb-3">
        <h3 className="text-white text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Co-Pilot Advisor
        </h3>

        {/* Tab triggers */}
        <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'summary' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-450 hover:text-white'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('hints')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'hints' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-450 hover:text-white'
            }`}
          >
            Rubric Hints
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-mono">Synthesizing project files...</span>
        </div>
      ) : (
        <div className="text-slate-300 text-xs leading-relaxed max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === 'summary' ? (
            <div className="whitespace-pre-line font-light">
              {summaryText || 'Click AI Summary in the workspace toolbar to generate an instant technical assessment.'}
            </div>
          ) : (
            <div className="whitespace-pre-line font-light">
              {hintsText || 'Generate dynamic tips to see custom audit metrics customized to this challenge.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
