import React from 'react'

export default function SubmissionArtifacts({ pptUrl, githubUrl, demoVideoUrl, notes }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl">
      <h3 className="text-white text-sm font-semibold mb-4 uppercase tracking-wider text-slate-350">Submission Materials</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* GitHub Link */}
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
            githubUrl 
              ? 'bg-slate-900/60 border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-950/10 group' 
              : 'bg-slate-900/20 border-slate-900 opacity-50 cursor-not-allowed'
          }`}
          onClick={(e) => !githubUrl && e.preventDefault()}
        >
          <div className={`p-2.5 rounded-lg ${githubUrl ? 'bg-emerald-950/50 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black' : 'bg-slate-800 text-slate-500'} transition-all`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Source Code</span>
            <h4 className="text-white text-sm font-medium mt-0.5 group-hover:text-emerald-400 transition-colors">
              {githubUrl ? 'GitHub Repository' : 'Not Provided'}
            </h4>
          </div>
        </a>

        {/* Pitch Slides Link */}
        <a
          href={pptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
            pptUrl 
              ? 'bg-slate-900/60 border-slate-800 hover:border-blue-500/50 hover:bg-blue-950/10 group' 
              : 'bg-slate-900/20 border-slate-900 opacity-50 cursor-not-allowed'
          }`}
          onClick={(e) => !pptUrl && e.preventDefault()}
        >
          <div className={`p-2.5 rounded-lg ${pptUrl ? 'bg-blue-950/50 text-blue-400 group-hover:bg-blue-500 group-hover:text-white' : 'bg-slate-800 text-slate-500'} transition-all`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Presentation</span>
            <h4 className="text-white text-sm font-medium mt-0.5 group-hover:text-blue-400 transition-colors">
              {pptUrl ? 'Pitch Deck Slides' : 'Not Provided'}
            </h4>
          </div>
        </a>

        {/* Demo Video Link */}
        <a
          href={demoVideoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
            demoVideoUrl 
              ? 'bg-slate-900/60 border-slate-800 hover:border-amber-500/50 hover:bg-amber-950/10 group' 
              : 'bg-slate-900/20 border-slate-900 opacity-50 cursor-not-allowed'
          }`}
          onClick={(e) => !demoVideoUrl && e.preventDefault()}
        >
          <div className={`p-2.5 rounded-lg ${demoVideoUrl ? 'bg-amber-950/50 text-amber-400 group-hover:bg-amber-500 group-hover:text-black' : 'bg-slate-800 text-slate-500'} transition-all`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Video Clip</span>
            <h4 className="text-white text-sm font-medium mt-0.5 group-hover:text-amber-400 transition-colors">
              {demoVideoUrl ? 'Product Walkthrough' : 'Not Provided'}
            </h4>
          </div>
        </a>
      </div>

      {notes && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-2">Participant Notes & README Summary</span>
          <div className="text-slate-350 text-sm leading-relaxed whitespace-pre-line font-light">
            {notes}
          </div>
        </div>
      )}
    </div>
  )
}
