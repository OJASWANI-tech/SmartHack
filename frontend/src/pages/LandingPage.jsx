import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Robot mascot assets (drop transparent-background PNGs in frontend/public/)
const ROBOT_HERO = '/robot-hero.png';        // hero floating mascot
const ROBOT_FEATURE = '/robot-feature.png';  // Feature Engine mascot

// Framer Motion variants for the Feature Engine staggered timeline entry
const stageContainerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 }
  }
};
const stageItemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

// Live terminal typewriter line: types out its text, optional blinking block cursor
function TypewriterLine({ text, className, showCursor }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return (
    <span className={className}>
      {displayed}
      {showCursor && <span className="tw-cursor">▌</span>}
    </span>
  );
}

// Pre-defined console logs for visualizer stages
const nodeLogs = [
  [
    'INFO: Initializing flow_engine_core.py...',
    'INFO: Ingesting participant records from Google Form API...',
    'SUCCESS: 512 intake records parsed and validated.'
  ],
  [
    'INFO: Computing skill-matching density matrices...',
    'INFO: Running team formation matching algorithm...',
    'SUCCESS: 100 balanced teams matched and staged.'
  ],
  [
    'INFO: Syncing consensus grading guides (n=5)...',
    'INFO: Verifying scorecards and evaluator keys...',
    'SUCCESS: Consensus scorecards locked.'
  ],
  [
    'WARN: Outlier detection engine scan triggered...',
    'ALERT: Grader #12 deviation exceeds threshold (Z=3.14)...',
    'WARN: Block phase: audit review required for node 04.'
  ],
  [
    'INFO: Finalizing leaderboard consensus scores...',
    'INFO: Generating cryptographic consensus hashes...',
    'SUCCESS: Leaderboard published & notifications sent.'
  ]
];

export default function LandingPage() {
  const navigate = useNavigate();

  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Sync theme changes to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new CustomEvent('eventflow-theme-change', { detail: theme }));
  }, [theme]);

  // Sync theme changes from other portals/tabs
  useEffect(() => {
    const handleExternalTheme = (e) => {
      if (e.detail && e.detail !== theme) {
        setTheme(e.detail);
      }
    };
    window.addEventListener('eventflow-theme-change', handleExternalTheme);
    return () => window.removeEventListener('eventflow-theme-change', handleExternalTheme);
  }, [theme]);

  // Splash States
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  // Interaction States
  const [activePipelineStage, setActivePipelineStage] = useState(0);
  const [hoveredEventCard, setHoveredEventCard] = useState(null);
  const [showWorkflowVideo, setShowWorkflowVideo] = useState(false);

  // Hero Visualizer Simulation States
  const [visActiveNode, setVisActiveNode] = useState(0);
  const [visIsPaused, setVisIsPaused] = useState(false);
  const [visSpeed, setVisSpeed] = useState(4500);
  const [visLogs, setVisLogs] = useState([]);

  // 3D Tilt Interaction Handlers (Direct DOM transform for high performance)
  const handleCardTilt = (e) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    const px = x / (box.width / 2);
    const py = y / (box.height / 2);
    const maxRot = 6; // Max 3D tilt degree rotation
    card.style.transition = 'transform 0.08s ease-out, border-color 0.3s ease, box-shadow 0.3s ease';
    card.style.transform = `perspective(1000px) rotateX(${-py * maxRot}deg) rotateY(${px * maxRot}deg) scale3d(1.015, 1.015, 1.015)`;
  };

  const handleCardReset = (e) => {
    const card = e.currentTarget;
    card.style.transition = 'transform 0.4s ease-out, border-color 0.3s ease, box-shadow 0.3s ease';
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Pricing & Billing States
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'annual'
  const [activePlan, setActivePlan] = useState('free'); // 'free' | 'pro' | 'enterprise'
  const [upgradingTo, setUpgradingTo] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleUpgrade = (planId) => {
    if (planId === activePlan) return;
    setUpgradingTo(planId);
    setTimeout(() => {
      setActivePlan(planId);
      setUpgradingTo(null);
      showToast(`Successfully upgraded to the ${planId.toUpperCase()} Plan!`, 'success');
    }, 1500);
  };

  // Interactive Mockups States
  const [intakeApplicants, setIntakeApplicants] = useState([
    { id: 1, name: 'Aarav Sharma', email: 'aarav@inst.edu', status: 'Pending' },
    { id: 2, name: 'Priya Patel', email: 'priya@univ.edu', status: 'Sent' },
    { id: 3, name: 'Kabir Dev', email: 'kabir@college.edu', status: 'Approved' }
  ]);
  const [matchingStatus, setMatchingStatus] = useState('idle');
  const [matchedTeams, setMatchedTeams] = useState([]);
  const [selectedFile, setSelectedFile] = useState('README.md');
  const [gradingScores, setGradingScores] = useState({ feasibility: 8, codeQuality: 9, pitchDeck: 7 });
  const [anomalyResolved, setAnomalyResolved] = useState(false);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  // Sandbox states for Stakeholder Portals (Section 5)
  const [sandboxCommitteeStage, setSandboxCommitteeStage] = useState(0); // 0: Intake, 1: Matching, 2: Governance
  const [sandboxCommitteeMatch, setSandboxCommitteeMatch] = useState('idle'); // 'idle' | 'matching' | 'matched'
  const [sandboxCommitteeOverride, setSandboxCommitteeOverride] = useState('idle'); // 'idle' | 'overriding' | 'overridden'
  const [sandboxEvaluatorScore, setSandboxEvaluatorScore] = useState(7.5);
  const [sandboxTeammateStatus, setSandboxTeammateStatus] = useState('idle'); // 'idle' | 'searching' | 'matched' | 'connected'
  const [sandboxTeammateName, setSandboxTeammateName] = useState('');

  // Sandbox states for Event Classes (Section 7)
  const [selectedEventClass, setSelectedEventClass] = useState(0); // active event type index
  const [eventSimulating, setEventSimulating] = useState(false);
  const [eventSimStep, setEventSimStep] = useState(-1);
  const [eventSimLogs, setEventSimLogs] = useState([]);

  // Simulation execution controller for Event Classes
  const runEventSimulation = (eventName) => {
    if (eventSimulating) return;
    setEventSimulating(true);
    setEventSimStep(0);
    
    const pipeline = eventPipelines[eventName] || [];
    const logsList = [
      `[INFO] Initializing dynamic pipeline constructor for ${eventName}...`,
      `[INFO] Ingesting dynamic event schemas...`,
      `[SUCCESS] Step 1: ${pipeline[0]?.name || 'Ingestion'} node active - ${pipeline[0]?.detail || ''}`,
      `[SUCCESS] Step 2: ${pipeline[1]?.name || 'Matching'} node active - ${pipeline[1]?.detail || ''}`,
      `[SUCCESS] Step 3: ${pipeline[2]?.name || 'Staging'} node active - ${pipeline[2]?.detail || ''}`,
      `[SUCCESS] Step 4: ${pipeline[3]?.name || 'Audit'} node active - ${pipeline[3]?.detail || ''}`,
      `[SUCCESS] Step 5: ${pipeline[4]?.name || 'Release'} node active - ${pipeline[4]?.detail || ''}`,
      `[SUCCESS] Consensus confirmed. Pipeline execution succeeded in 1.4s.`
    ];

    setEventSimLogs([logsList[0]]);
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < logsList.length) {
        setEventSimLogs(prev => [...prev, logsList[currentStep]]);
        if (currentStep >= 2 && currentStep <= 6) {
          setEventSimStep(currentStep - 2);
        }
      } else {
        clearInterval(interval);
        setEventSimulating(false);
      }
    }, 700);
  };

  // Stream logs for the active simulation node
  useEffect(() => {
    setVisLogs([]);
    const lines = nodeLogs[visActiveNode];
    let currentLine = 0;
    
    setVisLogs([lines[0]]);
    
    const streamInterval = setInterval(() => {
      currentLine++;
      if (currentLine < lines.length) {
        setVisLogs(prev => [...prev, lines[currentLine]]);
      } else {
        clearInterval(streamInterval);
      }
    }, 600);

    return () => clearInterval(streamInterval);
  }, [visActiveNode]);

  // Auto-simulation progression
  useEffect(() => {
    if (showSplash || visIsPaused) return;

    const cycleInterval = setInterval(() => {
      setVisActiveNode(prev => (prev + 1) % 5);
    }, visSpeed);

    return () => clearInterval(cycleInterval);
  }, [showSplash, visIsPaused, visSpeed]);

  const renderTimelineMockup = () => {
    switch (activePipelineStage) {
      case 0: // Intake Ingestion
        return (
          <div className="w-full h-full flex flex-col gap-3 justify-center">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-550 mb-1 flex items-center justify-between font-mono">
              <span>LIVE PARTICIPANT QUEUE</span>
              <span className="text-indigo-500 dark:text-indigo-400">3 applicants</span>
            </div>
            <div className="flex flex-col gap-2">
              {intakeApplicants.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{app.name}</span>
                    <span className="text-[10px] text-slate-500">{app.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      app.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450' :
                      app.status === 'Sent' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {app.status}
                    </span>
                    {app.status === 'Pending' && (
                      <button 
                        onClick={() => {
                          setIntakeApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status: 'Sent' } : a));
                        }}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                      >
                        Send Link
                      </button>
                    )}
                    {app.status === 'Sent' && (
                      <button 
                        onClick={() => {
                          setIntakeApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status: 'Approved' } : a));
                        }}
                        className="px-2 py-1 bg-emerald-650 hover:bg-emerald-500 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 1: // Team Formation
        return (
          <div className="w-full h-full flex flex-col gap-3 justify-center text-center">
            {matchingStatus === 'idle' && (
              <div className="flex flex-col items-center gap-3">
                <div className="text-3xl animate-bounce">👥</div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">Algorithmic Matchmaker</span>
                  <span className="text-[10px] text-slate-500 max-w-xs leading-relaxed">Cluster participants by cross-functional skills, institution caps, and experience levels.</span>
                </div>
                <button
                  onClick={() => {
                    setMatchingStatus('running');
                    setTimeout(() => {
                      setMatchingStatus('completed');
                      setMatchedTeams([
                        { name: 'Team Alpha', members: ['Aarav S.', 'Priya P.'], skill: 96 },
                        { name: 'Team Beta', members: ['Kabir D.', 'Nisha K.'], skill: 92 }
                      ]);
                    }, 1800);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-500/10 cursor-pointer transition-colors"
                >
                  Run Matchmaker
                </button>
              </div>
            )}
            {matchingStatus === 'running' && (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                <span className="text-[11px] font-mono text-indigo-500">Matching nodes... density = 0.85</span>
              </div>
            )}
            {matchingStatus === 'completed' && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-550 flex justify-between items-center mb-1 font-mono">
                  <span>STAGED TEAMS GENERATED</span>
                  <button onClick={() => setMatchingStatus('idle')} className="text-indigo-500 text-[9px] hover:underline cursor-pointer">Reset</button>
                </div>
                {matchedTeams.map((team, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{team.name}</span>
                      <span className="text-[9px] text-slate-500">Members: {team.members.join(', ')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Skill: {team.skill}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 2: // Submission Phase
        return (
          <div className="w-full h-full flex flex-col gap-3 justify-center">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-550 mb-1 flex justify-between items-center font-mono">
              <span>PROJECT DELIVERABLES</span>
              <span className="text-indigo-500 dark:text-indigo-400 font-mono text-[10px]">main-branch</span>
            </div>
            <div className="flex border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs bg-slate-50/20 dark:bg-slate-900/10">
              {/* Sidebar file explorer */}
              <div className="w-1/3 bg-slate-100/50 dark:bg-slate-950/40 border-r border-slate-200 dark:border-slate-800 p-2 flex flex-col gap-1 text-left">
                {['README.md', 'main.py', 'schema.sql'].map((file) => (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`px-2 py-1 rounded text-left font-mono text-[10px] cursor-pointer transition-colors ${
                      selectedFile === file ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-450 font-bold' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    📄 {file}
                  </button>
                ))}
              </div>
              {/* File Viewer */}
              <div className="w-2/3 p-3 font-mono text-left text-[10px] text-slate-600 dark:text-slate-400 overflow-x-hidden min-h-[90px]">
                {selectedFile === 'README.md' && (
                  <div>
                    <span className="text-indigo-500 font-bold"># eFlow Orchestration</span><br/>
                    <span>Automate entire workflow...</span><br/>
                    <span className="text-emerald-500">✓ Linter checks passed</span>
                  </div>
                )}
                {selectedFile === 'main.py' && (
                  <div>
                    <span className="text-purple-400">import</span><span> uvicorn</span><br/>
                    <span className="text-purple-400">def</span> <span className="text-blue-400">run_engine</span><span>():</span><br/>
                    <span className="text-slate-500">  # triggers pipelines</span>
                  </div>
                )}
                {selectedFile === 'schema.sql' && (
                  <div>
                    <span className="text-amber-500">CREATE TABLE</span><span> teams (</span><br/>
                    <span>  id UUID PRIMARY KEY,</span><br/>
                    <span>  score FLOAT</span><br/>
                    <span>);</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 3: // Evaluation Phase
        return (
          <div className="w-full h-full flex flex-col gap-3 justify-center">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-550 mb-1 flex justify-between items-center font-mono">
              <span>ACTIVE SCORESHEET</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Weighted: {((gradingScores.feasibility * 0.4) + (gradingScores.codeQuality * 0.4) + (gradingScores.pitchDeck * 0.2)).toFixed(1)}/10
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { key: 'feasibility', label: 'Feasibility (40%)', max: 10 },
                { key: 'codeQuality', label: 'Code Quality (40%)', max: 10 },
                { key: 'pitchDeck', label: 'Pitch Deck (20%)', max: 10 }
              ].map((criteria) => (
                <div key={criteria.key} className="flex flex-col gap-1 text-left">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">{criteria.label}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{gradingScores[criteria.key]} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={gradingScores[criteria.key]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setGradingScores(prev => ({ ...prev, [criteria.key]: val }));
                    }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      case 4: // Anomaly Resolution (Governance)
        return (
          <div className="w-full h-full flex flex-col gap-3 justify-center items-center text-center">
            {!anomalyResolved ? (
              <div className="flex flex-col items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 text-lg">
                  ⚠️
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-455">Deviation Block Detected</span>
                  <span className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                    Evaluator #4 scorecard deviates from mean by Z=3.14. Results locked.
                  </span>
                </div>
                <button
                  onClick={() => setAnomalyResolved(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-md shadow-rose-500/10 cursor-pointer transition-colors"
                >
                  Override Grader Outlier
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 text-lg">
                  ✓
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">Deviation Resolved</span>
                  <span className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                    Override code `CORE_OVR_99` accepted. Audit trail stored in consensus DB.
                  </span>
                </div>
                <button
                  onClick={() => setAnomalyResolved(false)}
                  className="text-indigo-500 text-[9px] hover:underline cursor-pointer"
                >
                  Reset Block Trigger
                </button>
              </div>
            )}
          </div>
        );
      case 5: // Results Publication
        return (
          <div className="w-full h-full flex flex-col gap-2.5 justify-center">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-550 flex justify-between items-center mb-1 font-mono">
              <span>FINAL CONSENSUS RANKINGS</span>
              <input
                type="text"
                placeholder="Search team..."
                value={leaderboardSearch}
                onChange={(e) => setLeaderboardSearch(e.target.value)}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] outline-none w-24 text-slate-700 dark:text-slate-300 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { rank: '1st', name: 'Team Alpha', score: 9.6, color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
                { rank: '2nd', name: 'Team Gamma', score: 9.2, color: 'bg-slate-350/15 text-slate-600 dark:text-slate-400 border-slate-300/30' },
                { rank: '3rd', name: 'Team Beta', score: 8.8, color: 'bg-amber-600/10 text-amber-700 dark:text-amber-500 border-amber-600/20' }
              ]
                .filter(t => t.name.toLowerCase().includes(leaderboardSearch.toLowerCase()))
                .map((team) => (
                  <div key={team.rank} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${team.color}`}>
                        {team.rank}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{team.name}</span>
                    </div>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{team.score}</span>
                  </div>
                ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render custom interactive sandboxes inside each Stakeholder Card in Section 5
  const renderSandboxWidget = (role) => {
    switch (role) {
      case 'Committee Control Center':
        return (
          <div className="flex flex-col gap-3 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/40 rounded-xl p-4 text-xs select-none">
            <div className="flex justify-between items-center border-b border-slate-200/40 dark:border-slate-800/30 pb-2">
              <span className="font-bold text-slate-700 dark:text-slate-350 font-mono">SANDBOX CONFIG</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                sandboxCommitteeStage === 0 ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400' :
                sandboxCommitteeStage === 1 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-455'
              }`}>
                {sandboxCommitteeStage === 0 ? 'Intake' : sandboxCommitteeStage === 1 ? 'Matching' : 'Governance'}
              </span>
            </div>
            
            <div className="flex gap-1">
              {[0, 1, 2].map((s) => (
                <button
                  key={s}
                  onClick={(e) => { e.stopPropagation(); setSandboxCommitteeStage(s); }}
                  className={`flex-1 py-1 rounded font-mono text-[9px] font-bold cursor-pointer transition-all border ${
                    sandboxCommitteeStage === s
                      ? 'bg-indigo-650 text-white border-indigo-650'
                      : 'bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700/60'
                  }`}
                >
                  Stage {s + 1}
                </button>
              ))}
            </div>

            <div className="bg-white/80 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/60 text-left font-mono text-[10px] text-slate-600 dark:text-slate-400 min-h-[60px] flex flex-col justify-center transition-colors">
              {sandboxCommitteeStage === 0 && (
                <div>
                  <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-1">● Intake Ingestion</div>
                  <div>Applications: 189 total</div>
                  <div>Spam detector rating: 100% OK</div>
                </div>
              )}
              {sandboxCommitteeStage === 1 && (
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">● Matchmaking</span>
                    <span className="text-[9px] text-slate-450">45 participants</span>
                  </div>
                  {sandboxCommitteeMatch === 'matched' ? (
                    <div className="text-emerald-600 dark:text-emerald-450 font-bold">✓ 12 optimal teams formed</div>
                  ) : sandboxCommitteeMatch === 'matching' ? (
                    <div className="flex items-center gap-1.5 text-blue-500 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                      <span>Staging nodes...</span>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSandboxCommitteeMatch('matching');
                        setTimeout(() => setSandboxCommitteeMatch('matched'), 1500);
                      }}
                      className="w-full py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold rounded cursor-pointer transition-colors shadow shadow-indigo-500/10"
                    >
                      Trigger Team Formation
                    </button>
                  )}
                </div>
              )}
              {sandboxCommitteeStage === 2 && (
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex justify-between items-center">
                    <span className="text-rose-600 dark:text-rose-455 font-bold">● Outlier Lock</span>
                    <span className="text-[9px] text-rose-500/80 font-bold">3.12σ Detected</span>
                  </div>
                  {sandboxCommitteeOverride === 'overridden' ? (
                    <div className="text-emerald-600 dark:text-emerald-450 font-bold">✓ Consensus bypass logged</div>
                  ) : sandboxCommitteeOverride === 'overriding' ? (
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                      <span>Applying override...</span>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSandboxCommitteeOverride('overriding');
                        setTimeout(() => setSandboxCommitteeOverride('overridden'), 1200);
                      }}
                      className="w-full py-1 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold rounded cursor-pointer transition-colors shadow shadow-rose-500/10"
                    >
                      Consensus Override Bypass
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'Evaluator Workspace':
        const z = ((sandboxEvaluatorScore - 6.5) / 1.5);
        let zBadgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20';
        let zLabel = 'Score Approved';
        if (z > 1.8) {
          zBadgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
          zLabel = 'Outlier Check (High)';
        } else if (z < -1.8) {
          zBadgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20';
          zLabel = 'Outlier Alert (Low)';
        }
        return (
          <div className="flex flex-col gap-3 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/40 rounded-xl p-4 text-xs select-none">
            <div className="flex justify-between items-center border-b border-slate-200/40 dark:border-slate-800/30 pb-2">
              <span className="font-bold text-slate-700 dark:text-slate-350 font-mono">LIVE GRADER</span>
              <span className="text-cyan-600 dark:text-cyan-405 font-bold font-mono">Team Gamma</span>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                <span>AI Innovation Score</span>
                <span className="text-cyan-600 dark:text-cyan-405 font-bold font-mono">{sandboxEvaluatorScore.toFixed(1)} / 10</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={sandboxEvaluatorScore}
                onChange={(e) => {
                  e.stopPropagation();
                  setSandboxEvaluatorScore(parseFloat(e.target.value));
                }}
                className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="bg-white/80 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800/60 flex flex-col gap-1 text-left font-mono text-[10px] text-slate-600 dark:text-slate-400 transition-colors">
              <div className="flex justify-between items-center">
                <span>Z-Score Deviation:</span>
                <span className={`font-bold font-mono ${z > 0 ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-500'}`}>{z > 0 ? '+' : ''}{z.toFixed(2)}σ</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Audit Status:</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${zBadgeColor} transition-colors`}>
                  {zLabel}
                </span>
              </div>
            </div>
          </div>
        );
      case 'Participant Portal':
        return (
          <div className="flex flex-col gap-3 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/40 rounded-xl p-4 text-xs select-none">
            <div className="flex justify-between items-center border-b border-slate-200/40 dark:border-slate-800/30 pb-2">
              <span className="font-bold text-slate-700 dark:text-slate-350 font-mono">AFFINITY MATCHER</span>
              <span className="text-emerald-600 dark:text-emerald-450 font-bold font-mono">Frontend Dev</span>
            </div>

            <div className="bg-white/80 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/60 text-left font-mono text-[10px] text-slate-600 dark:text-slate-400 min-h-[60px] flex flex-col justify-center transition-colors">
              {sandboxTeammateStatus === 'idle' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSandboxTeammateStatus('searching');
                    const names = ['Sarah Jenkins (UI/UX)', 'Daniel Feng (Data)', 'Liam O\'Connor (Backend)'];
                    const chosen = names[Math.floor(Math.random() * names.length)];
                    setSandboxTeammateName(chosen);
                    setTimeout(() => setSandboxTeammateStatus('matched'), 1500);
                  }}
                  className="w-full py-1.5 bg-emerald-650 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer transition-colors shadow shadow-emerald-500/10"
                >
                  Scan for Teammate Match
                </button>
              )}
              {sandboxTeammateStatus === 'searching' && (
                <div className="flex items-center justify-center gap-2 py-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Scanning affinity matrix...</span>
                </div>
              )}
              {sandboxTeammateStatus === 'matched' && (
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-sans truncate pr-1">{sandboxTeammateName}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 rounded font-bold font-mono shrink-0">98% Match</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSandboxTeammateStatus('connected');
                    }}
                    className="w-full py-1 bg-emerald-650 hover:bg-emerald-500 text-white text-[9px] font-bold rounded cursor-pointer transition-colors"
                  >
                    Accept Match
                  </button>
                </div>
              )}
              {sandboxTeammateStatus === 'connected' && (
                <div className="text-center flex flex-col gap-0.5">
                  <span className="text-emerald-600 dark:text-emerald-450 font-bold">🎉 Team formed!</span>
                  <span className="text-[9px] text-slate-500 leading-tight">Sarah J., Aarav S., Priya P. locked in.</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSandboxTeammateStatus('idle');
                    }}
                    className="text-[9px] text-indigo-500 hover:underline mt-1 bg-transparent border-0 cursor-pointer font-bold"
                  >
                    Reset Search
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };



  // Canvas particle background ref
  const canvasRef = useRef(null);
  const eventTypesScrollRef = useRef(null);

  const handleScrollCarousel = (direction) => {
    const container = eventTypesScrollRef.current;
    if (!container) return;
    const scrollAmount = 340; // Card width (320) + gap (20)
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // 1. Splash Screen Timer
  useEffect(() => {
    // Start fading out the splash screen at 3.0s
    const fadeTimer = setTimeout(() => {
      setFadeSplash(true);
    }, 3000);

    // Completely unmount splash screen at 3.5s
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);



  // 3. Canvas Interactive Particles (Deep space glow effect)
  useEffect(() => {
    if (showSplash) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let particles = [];
    const particleCount = 65; // slightly increased for richer fidelity

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background nebulas
      const gradient1 = ctx.createRadialGradient(
        canvas.width * 0.2,
        canvas.height * 0.3,
        10,
        canvas.width * 0.2,
        canvas.height * 0.3,
        canvas.width * 0.4
      );
      gradient1.addColorStop(0, theme === 'dark' ? 'rgba(79, 70, 229, 0.08)' : 'rgba(99, 102, 241, 0.04)'); // indigo
      gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradient2 = ctx.createRadialGradient(
        canvas.width * 0.8,
        canvas.height * 0.7,
        10,
        canvas.width * 0.8,
        canvas.height * 0.7,
        canvas.width * 0.4
      );
      gradient2.addColorStop(0, theme === 'dark' ? 'rgba(6, 182, 212, 0.06)' : 'rgba(6, 182, 212, 0.03)'); // cyan
      gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render connected lines
      particles.forEach((p, idx) => {
        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'dark'
          ? `rgba(129, 140, 248, ${p.alpha})`
          : `rgba(99, 102, 241, ${p.alpha * 0.6})`;
        ctx.fill();

        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Bounce borders
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw connections
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 125) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - dist / 125) * 0.15;
            ctx.strokeStyle = theme === 'dark'
              ? `rgba(139, 92, 246, ${lineAlpha})`
              : `rgba(99, 102, 241, ${lineAlpha * 0.7})`;
            ctx.lineWidth = 0.55;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    drawParticles();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [showSplash, theme]);

  // Splash Screen Style Injection
  useEffect(() => {
    const styleId = 'splash-screen-injected-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.innerHTML = `
        .splash-stage {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          --ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
          --spring-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .splash-logoRow { display: flex; align-items: center; justify-content: center; gap: 24px; }
        .splash-iconWrap { position: relative; width: 120px; height: 120px; flex-shrink: 0; animation: dropIn 0.9s var(--ease-out-quart) forwards; }
        .splash-iconWrap svg { overflow: visible; }
        .splash-svg-state { transform-origin: 65px 65px; opacity: 0; animation: popIn 0.4s var(--ease-out-quart) 0.3s forwards; }
        .splash-svg-t { transform-origin: 56px 55px; opacity: 0; animation: slamDown 0.5s var(--ease-out-quart) 0.5s forwards; }
        .splash-svg-i { transform-origin: 76px 70px; opacity: 0; animation: springDown 0.7s var(--spring-bounce) 0.75s forwards; }
        .splash-textSide { display: flex; flex-direction: column; line-height: 1; overflow: hidden; }
        .splash-line-wrap { overflow: hidden; display: block; }
        .splash-txt { display: block; font-family: Georgia, 'Times New Roman', serif; font-weight: 700; font-size: 52px; color: #111111; letter-spacing: 3px; opacity: 0; }
        .splash-txt-texas { animation: slideUp 0.6s var(--ease-out-quart) 0.9s forwards; }
        .splash-txt-inst { animation: slideUp 0.6s var(--ease-out-quart) 1.05s forwards; }
        .splash-redLine { width: 0; height: 3px; background: #CC0000; margin-top: 6px; border-radius: 2px; animation: sweepRight 0.5s var(--ease-out-quart) 1.3s forwards; }
        .splash-tagline { margin-top: 18px; font-size: 12px; letter-spacing: 5px; color: #666666; text-transform: uppercase; opacity: 0; animation: fadeRise 0.5s var(--ease-out-quart) 1.6s forwards; }
        
        @keyframes dropIn { 0% { transform: translateY(-300px) rotate(-20deg) scale(0.4); opacity: 0; } 100% { transform: translateY(0) rotate(0) scale(1); opacity: 1; } }
        @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slamDown { 0% { transform: translateY(-60px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes springDown { 0% { transform: translateY(-80px) rotate(-15deg); opacity: 0; } 100% { transform: translateY(0) rotate(0); opacity: 1; } }
        @keyframes slideUp { 0% { transform: translateY(100%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes sweepRight { 0% { width: 0; } 100% { width: 100%; } }
        @keyframes fadeRise { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }

        /* Marquee Animation */
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }

        /* Ambient glow spots */
        .ambient-orb {
          filter: blur(140px);
          pointer-events: none;
        }

        /* Flow connection line animation */
        @keyframes dash {
          to {
            stroke-dashoffset: -40;
          }
        }
        .flow-line {
          stroke-dasharray: 8, 4;
          animation: dash 1.5s linear infinite;
        }

        /* Hero Pulse Travel Animation */
        @keyframes pulseTravel {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(36px); opacity: 0; }
        }

        /* Visualizer Glow Animation */
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(99, 102, 241, 0.2); box-shadow: 0 0 15px rgba(99, 102, 241, 0.04); }
          50% { border-color: rgba(99, 102, 241, 0.45); box-shadow: 0 0 25px rgba(99, 102, 241, 0.15); }
        }

        .border-glowing-card {
          animation: borderGlow 6s infinite ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.35s ease-out forwards;
        }

        /* Neon pink/purple CTA button */
        .neon-cta {
          background-image: linear-gradient(110deg, #7c3aed 0%, #db2777 50%, #7c3aed 100%);
          background-size: 200% auto;
          background-position: left center;
          box-shadow: 0 8px 20px -8px rgba(219, 39, 119, 0.45);
          transition: background-position 0.3s ease, box-shadow 0.3s ease;
        }
        .neon-cta:hover {
          background-position: right center;
          box-shadow: 0 10px 25px -5px rgba(219, 39, 119, 0.5);
        }

        /* Live terminal blinking block cursor */
        @keyframes twBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .tw-cursor {
          display: inline-block;
          margin-left: 1px;
          color: currentColor;
          animation: twBlink 0.8s steps(1) infinite;
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  const technologySponsors = [
    {
      name: 'React',
      hoverStyle: 'hover:border-cyan-500/45 dark:hover:border-cyan-500/35 hover:bg-cyan-500/5 dark:hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.12)]',
      icon: (
        <svg className="w-5 h-5 fill-none stroke-current text-cyan-500 dark:text-cyan-400" strokeWidth="2" viewBox="0 0 24 24">
          <ellipse rx="10" ry="4.5" transform="rotate(0 12 12)" cx="12" cy="12" />
          <ellipse rx="10" ry="4.5" transform="rotate(60 12 12)" cx="12" cy="12" />
          <ellipse rx="10" ry="4.5" transform="rotate(120 12 12)" cx="12" cy="12" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      )
    },
    {
      name: 'FastAPI',
      hoverStyle: 'hover:border-teal-500/45 dark:hover:border-teal-500/35 hover:bg-teal-500/5 dark:hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 hover:shadow-[0_0_20px_rgba(20,184,166,0.12)]',
      icon: (
        <svg className="w-5 h-5 fill-current text-emerald-600 dark:text-teal-400" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm2 11h-3v5l-4-6.5h3v-5z" />
        </svg>
      )
    },
    {
      name: 'Redis',
      hoverStyle: 'hover:border-rose-500/45 dark:hover:border-rose-500/35 hover:bg-rose-500/5 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.12)]',
      icon: (
        <svg className="w-5 h-5 fill-none stroke-current text-red-650 dark:text-red-500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      )
    },
    {
      name: 'Celery',
      hoverStyle: 'hover:border-lime-500/45 dark:hover:border-lime-500/35 hover:bg-lime-500/5 dark:hover:bg-lime-500/10 hover:text-lime-600 dark:hover:text-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.12)]',
      icon: (
        <svg className="w-5 h-5 fill-current text-lime-600 dark:text-lime-450" viewBox="0 0 24 24">
          <path d="M17 11.5c.7-.7.9-1.8.4-2.6-.7-.8-1.9-.8-2.6-.1L13 10.6V5c0-1.1-.9-2-2-2S9 3.9 9 5v5.6L7.2 8.8c-.7-.7-1.9-.7-2.6.1-.5.8-.3 1.9.4 2.6l4 4V21h6v-5.5l4-4z" />
        </svg>
      )
    },
    {
      name: 'Resend',
      hoverStyle: 'hover:border-slate-500/45 dark:hover:border-slate-400/35 hover:bg-slate-500/5 dark:hover:bg-slate-500/10 hover:text-slate-900 dark:hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]',
      icon: (
        <svg className="w-5 h-5 fill-none stroke-current text-slate-800 dark:text-slate-200" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      )
    },
    {
      name: 'PostgreSQL',
      hoverStyle: 'hover:border-sky-500/45 dark:hover:border-sky-500/35 hover:bg-sky-500/5 dark:hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 hover:shadow-[0_0_20px_rgba(14,165,233,0.12)]',
      icon: (
        <svg className="w-5 h-5 fill-current text-sky-600 dark:text-sky-400" viewBox="0 0 24 24">
          <path d="M19.34 11.23a4.72 4.72 0 0 0-4.66-4.67h-1.55A3.11 3.11 0 0 0 10 9.67c0 .24.03.47.08.7-.35-.22-.76-.36-1.2-.36H6.22c-1.22 0-2.22 1-2.22 2.22 0 .9.54 1.67 1.3 2.02A3.1 3.1 0 0 0 10 17.5h1.55c1.87 0 3.5-1.1 4.25-2.7a4.72 4.72 0 0 0 3.54-3.57zM6.22 11.33h2.66a.89.89 0 0 1 0 1.78H6.22a.89.89 0 1 1 0-1.78zm5.33 4.44H10A1.33 1.33 0 0 1 8.67 14.4c0-.74.6-1.33 1.33-1.33h1.55c.74 0 1.33.6 1.33 1.33s-.6 1.34-1.33 1.34z" />
        </svg>
      )
    },
    {
      name: 'Tailwind CSS',
      hoverStyle: 'hover:border-cyan-400/45 dark:hover:border-cyan-400/35 hover:bg-cyan-500/5 dark:hover:bg-cyan-500/10 hover:text-cyan-550 dark:hover:text-cyan-300 hover:shadow-[0_0_20px_rgba(56,189,248,0.12)]',
      icon: (
        <svg className="w-5 h-5 fill-current text-cyan-500 dark:text-cyan-400" viewBox="0 0 24 24">
          <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C7.666 17.818 9.027 19 12.001 19c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" />
        </svg>
      )
    },
    {
      name: 'Vite',
      hoverStyle: 'hover:border-purple-500/45 dark:hover:border-purple-500/35 hover:bg-purple-500/5 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]',
      icon: (
        <svg className="w-5 h-5 fill-current text-purple-600 dark:text-purple-400" viewBox="0 0 24 24">
          <path d="M19.78 10.12l-7 12a1 1 0 0 1-1.66-.12l-3-6a1 1 0 0 1 .12-1.12l7-12a1 1 0 0 1 1.66.12l3 6a1 1 0 0 1-.12 1.12z" />
          <path className="text-amber-500" d="M12.78 2.12l-7 12a1 1 0 0 0 .88 1.5h4.68l-1.34 6.26a1 1 0 0 0 1.78.88l7-12a1 1 0 0 0-.88-1.5h-4.68l1.34-6.26a1 1 0 0 0-1.78-.88z" />
        </svg>
      )
    },
    {
      name: 'Google Gemini',
      hoverStyle: 'hover:border-blue-500/45 dark:hover:border-blue-500/35 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.12)]',
      icon: (
        <svg className="w-5 h-5 fill-current text-blue-500 dark:text-blue-400" viewBox="0 0 24 24">
          <path d="M12 2c-.3 2.8-2.2 4.7-5 5 2.8.3 4.7 2.2 5 5 .3-2.8 2.2-4.7 5-5-2.8-.3-4.7-2.2-5-5z" />
          <path d="M17 14c-.2 1.9-1.5 3.2-3.4 3.4 1.9.2 3.2 1.5 3.4 3.4.2-1.9 1.5-3.2 3.4-3.4-1.9-.2-3.2-1.5-3.4-3.4z" />
        </svg>
      )
    },
    {
      name: 'GitHub',
      hoverStyle: 'hover:border-purple-500/45 dark:hover:border-purple-500/35 hover:bg-purple-500/5 dark:hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]',
      icon: (
        <svg className="w-5 h-5 fill-current text-slate-800 dark:text-slate-200" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      )
    }
  ];

  const pipelineStages = [
    {
      title: 'Participant Intake',
      description: 'Collect student applications, resumes, preferences, and confirm participant onboarding via secure magic links.',
      icon: '📥',
      badge: 'Step 1: Ingestion'
    },
    {
      title: 'Team Formation',
      description: 'Algorithmic grouping matches teammates by cross-functional skills, balanced experience levels, and institution caps.',
      icon: '👥',
      badge: 'Step 2: Matching'
    },
    {
      title: 'Submission Phase',
      description: 'Participants publish active deliverable repositories, documents, and slides with automated timestamp validation.',
      icon: '🚀',
      badge: 'Step 3: Staging'
    },
    {
      title: 'Evaluation Phase',
      description: 'Panel judges assign scorecards across multi-dimensional criteria using custom templates and AI-generated assessment guides.',
      icon: '⚖️',
      badge: 'Step 4: Grading'
    },
    {
      title: 'Anomaly Resolution',
      description: 'Real-time outlier analysis flags score deviations, blocking phase progression until audited by the committee.',
      icon: '🛡️',
      badge: 'Step 5: Governance'
    },
    {
      title: 'Results Publication',
      description: 'Unlocks consensus rankings, transparent score audit logs, and triggers automated email summaries to all contestants.',
      icon: '🏆',
      badge: 'Step 6: Release'
    }
  ];

  const eventTypes = [
    { name: 'Hackathons', desc: 'Accelerated software sprints featuring team formation algorithms and consensus scoring.', icon: '💻', color: 'from-blue-500/20 to-indigo-500/10' },
    { name: 'Case Competitions', desc: 'Strategy challenges analyzing business solutions with structured review rubrics.', icon: '📊', color: 'from-indigo-500/20 to-purple-500/10' },
    { name: 'Innovation Challenges', desc: 'Multi-phased product designs and pitches backed by LLM evaluation assistants.', icon: '💡', color: 'from-cyan-500/20 to-blue-500/10' },
    { name: 'Debates', desc: 'Dynamic speaker matchups, timing systems, and scoring metrics for competitive arguments.', icon: '🗣️', color: 'from-purple-500/20 to-violet-500/10' },
    { name: 'Sports Competitions', desc: 'Tournament bracket orchestration, rule sets, and real-time leaderboard management.', icon: '⚽', color: 'from-violet-500/20 to-fuchsia-500/10' },
    { name: 'Research Showcases', desc: 'Academic panel evaluations, abstract intakes, and peer-to-peer voting tools.', icon: '🔬', color: 'from-sky-500/20 to-cyan-500/10' },
    { name: 'Future Dynamic Events', desc: 'Fully customizable workflow engine allowing bespoke phases and grading constraints.', icon: '✨', color: 'from-fuchsia-500/20 to-blue-500/10' }
  ];

  // Pipeline Blueprints config for Section 7
  const eventPipelines = {
    'Hackathons': [
      { name: 'Onboarding', icon: '📥', detail: 'Magic links, resume intakes' },
      { name: 'Group Matching', icon: '👥', detail: 'Skill-balanced optimizer' },
      { name: 'Linter Check', icon: '⚙️', detail: 'Static code analysis' },
      { name: 'Outlier Filter', icon: '⚖️', detail: 'Z-score deviation block' },
      { name: 'Consensus Publish', icon: '🏆', detail: 'Public leaderboard release' }
    ],
    'Case Competitions': [
      { name: 'Case Delivery', icon: '📄', detail: 'Problem statement ingestion' },
      { name: 'Group Lock', icon: '🔒', detail: 'Team composition sign-off' },
      { name: 'Pitch Upload', icon: '📤', detail: 'Deliverable validation' },
      { name: 'Criteria Rubric', icon: '📋', detail: 'Structured scorecards' },
      { name: 'Podium Release', icon: '🥇', detail: 'Rankings audit' }
    ],
    'Innovation Challenges': [
      { name: 'Ideation Intake', icon: '💡', detail: 'Proposal draft ingestion' },
      { name: 'LLM Evaluator', icon: '🧠', detail: 'AI criteria assessments' },
      { name: 'Peer voting', icon: '🗳️', detail: 'Quadratic voter tallies' },
      { name: 'Outlier Gate', icon: '🛡️', detail: 'AI/Human alignment checks' },
      { name: 'Award Publish', icon: '✨', detail: 'Publish wrap summaries' }
    ],
    'Debates': [
      { name: 'Speaker Intake', icon: '🗣️', detail: 'Speaker slot seeding' },
      { name: 'Bracket Matching', icon: '⚔️', detail: '1v1 Elo-based seeding' },
      { name: 'Timing Gate', icon: '⏱️', detail: 'Speech length tracker' },
      { name: 'Ballot Auditor', icon: '⚖️', detail: 'Consensus score validation' },
      { name: 'Elo Ledger', icon: '📊', detail: 'Leaderboard update' }
    ],
    'Sports Competitions': [
      { name: 'Player Intake', icon: '🏃', detail: 'Player/Seed enrollment' },
      { name: 'Bracket Matcher', icon: '🏆', detail: 'Single/Double elimination solver' },
      { name: 'Score Logging', icon: '⚽', detail: 'Point input gateways' },
      { name: 'Anti-Collusion', icon: '🛡️', detail: 'Variance audits' },
      { name: 'Medal Podium', icon: '🥇', detail: 'Gold, Silver, Bronze releases' }
    ],
    'Research Showcases': [
      { name: 'Abstract Upload', icon: '🔬', detail: 'Blind peer-review intake' },
      { name: 'Reviewer Matching', icon: '👥', detail: 'Expertise index matching' },
      { name: 'Outlier Grading', icon: '⚖️', detail: 'Reviewer bias filtering' },
      { name: 'Consensus Gate', icon: '🤝', detail: 'Final board approval' },
      { name: 'Consensus Release', icon: '🎓', detail: 'Audited abstracts release' }
    ],
    'Future Dynamic Events': [
      { name: 'Custom Intake', icon: '✨', detail: 'Any schema intake' },
      { name: 'Stage Config', icon: '🔧', detail: 'Bespoke script nodes' },
      { name: 'Dynamic Auditor', icon: '🛡️', detail: 'Z-Score configuration' },
      { name: 'API Webhook', icon: '🔗', detail: 'Webhook payloads' }
    ]
  };

  const workspaceDetails = [
    {
      role: 'Committee Control Center',
      desc: 'The central operation node for organizers to design workflows, configure criteria, review anomalies, and direct communications.',
      bullets: [
        'Seed customizable pipelines and deadlines.',
        'Launch and review automated team formations.',
        'Enforce governance gates on outlier scorecards.',
        'Blast notifications to Slack, Discord, and Email.'
      ],
      icon: '🏛️',
      accent: 'border-indigo-500/30 text-indigo-400'
    },
    {
      role: 'Evaluator Workspace',
      desc: 'An optimized interface for judges and industry experts to score team submissions with maximum efficiency.',
      bullets: [
        'Access assigned team deliverables instantly.',
        'Utilize AI-guided score rubrics.',
        'Provide structured, constructive text feedback.',
        'Submit consensus card drafts securely.'
      ],
      icon: '⚖️',
      accent: 'border-cyan-500/30 text-cyan-400'
    },
    {
      role: 'Participant Portal',
      desc: 'A unified landing page for competitors to access event resources, coordinate with teammates, and submit deliverables.',
      bullets: [
        'Complete profiles and skills verification.',
        'Connect with algorithmically recommended matches.',
        'Deliver active project links and pitch decks.',
        'Review scoresheets and performance metrics.'
      ],
      icon: '🎓',
      accent: 'border-purple-500/30 text-purple-400'
    }
  ];

  if (showSplash) {
    return (
      <div className={`splash-stage transition-opacity duration-500 ${fadeSplash ? 'opacity-0' : 'opacity-100'}`}>
        <div className="splash-logoRow">
          <div className="splash-iconWrap">
            <svg viewBox="0 0 130 130" width="120" height="120">
              <g className="splash-svg-state">
                <path d="M18 26 L70 16 L112 28 L114 72 L96 92 L80 120 L65 109 L49 120 L28 92 L16 72 Z" fill="#CC0000"/>
              </g>
              <g className="splash-svg-t">
                <rect x="30" y="32" width="50" height="11" rx="2.5" fill="black"/>
                <rect x="50" y="32" width="12" height="44" rx="2.5" fill="black"/>
              </g>
              <g className="splash-svg-i">
                <rect x="66" y="54" width="11" height="9"  rx="2"   fill="black"/>
                <rect x="63" y="65" width="24" height="9"  rx="2"   fill="black"/>
                <rect x="68" y="63" width="6"  height="22" rx="1.5" fill="black"/>
                <rect x="63" y="85" width="24" height="9"  rx="2"   fill="black"/>
              </g>
            </svg>
          </div>
          <div className="splash-textSide">
            <span className="splash-line-wrap"><span className="splash-txt splash-txt-texas">TEXAS</span></span>
            <span className="splash-line-wrap"><span className="splash-txt splash-txt-inst">INSTRUMENTS</span></span>
            <div className="splash-redLine"></div>
          </div>
        </div>
        <div className="splash-tagline">Think innovation. Think TI.</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 overflow-x-hidden font-sans selection:bg-indigo-500/30 selection:text-white transition-colors duration-300">
      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-none {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes border-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .btn-animated-cool {
          position: relative;
          background: linear-gradient(135deg, #4f46e5, #9333ea, #ec4899, #4f46e5);
          background-size: 300% 300%;
          animation: border-shimmer 6s infinite linear;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
        }
        .btn-animated-cool::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
          transition: 0.6s;
        }
        .btn-animated-cool:hover::before {
          left: 100%;
        }
        .btn-animated-cool:hover {
          transform: translateY(-3px) scale(1.025);
          box-shadow: 0 12px 30px rgba(147, 51, 234, 0.45), 0 0 0 2px rgba(255, 255, 255, 0.3) inset;
        }
        .btn-animated-cool:active {
          transform: translateY(0.5px) scale(0.98);
        }
      `}</style>
      {/* Particle Background Layer */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Ambient Glow Orbs Wrapper (prevents page layout overflow) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="ambient-orb absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10"></div>
        <div className="ambient-orb absolute top-[40%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-purple-900/10"></div>
        <div className="ambient-orb absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10"></div>
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/40 backdrop-blur-md bg-slate-50/30 dark:bg-[#030712]/30 transition-colors duration-300">
        <div className="flex items-center gap-2 select-none" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          <img src="/favicon.svg" className="w-8 h-8 object-contain" alt="eFlow Icon" />
          <span className="text-xl font-bold tracking-wider text-slate-800 dark:text-slate-100">
            <span className="text-[#00b87c]">e</span>Flow
          </span>
        </div>

        {/* Center navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-650 dark:text-slate-350">
          <button 
            onClick={() => scrollToSection('features')} 
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Features
          </button>
          <button 
            onClick={() => scrollToSection('timeline')} 
            className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            How It Works
          </button>
          <button 
            onClick={() => scrollToSection('workspaces')} 
            className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Workspaces
          </button>
          <button 
            onClick={() => scrollToSection('event-types')} 
            className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Event Classes
          </button>
          <button 
            onClick={() => scrollToSection('pricing')} 
            className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Pricing
          </button>
        </nav>

        <nav className="flex items-center gap-4">
          {/* Light/Dark mode toggle button */}
          <button
            onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:text-slate-900 dark:hover:text-white transition-all duration-300 shadow-sm"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </nav>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col gap-32">
        {/* ── SECTION 1: HERO ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[70vh]">
          {/* Hero details */}
          <div className="flex flex-col gap-6 lg:col-span-6 text-left">
            <div className="flex items-center gap-3 select-none mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <img src="/favicon.svg" className="h-14 w-14 object-contain filter drop-shadow-[0_0_15px_rgba(56,189,248,0.25)]" alt="eFlow Icon" />
              <span className="text-5xl font-black tracking-widest text-slate-900 dark:text-slate-100 filter drop-shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <span className="text-[#00b87c]">e</span>Flow
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 w-fit">
              <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse"></span>
              Enterprise Event Orchestration
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Orchestrate Events.{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                Not Chaos.
              </span>
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Manage participant intake, team formation, evaluations, communications, anomaly detection, and results from one intelligent workflow engine.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <motion.button
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="group neon-cta transform-gpu px-8 py-4 text-white font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enter eventFlow</span>
                <span className="transition-transform duration-300 transform group-hover:translate-x-1.5 text-lg">→</span>
              </motion.button>
            </div>
          </div>

          {/* Hero Mascot — idle floating robot + speech bubble */}
          <div className="lg:col-span-6 w-full flex justify-center lg:justify-end">
            <div className="relative flex items-center justify-center" style={{ perspective: 1000 }}>
              {/* Ambient glow behind mascot */}
              <div className="absolute inset-0 m-auto w-72 h-72 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-cyan-500/20 blur-3xl pointer-events-none"></div>

              {/* Idle floating robot */}
              <motion.img
                src={ROBOT_HERO}
                alt="eFlow mascot"
                draggable={false}
                onError={(e) => { e.currentTarget.style.opacity = '0.12'; }}
                animate={{ y: [-10, 10, -10], rotate: [-1, 1, -1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-10 w-64 sm:w-80 lg:w-[22rem] max-w-full object-contain drop-shadow-[0_25px_45px_rgba(99,102,241,0.25)] transform-gpu select-none"
              />
            </div>
          </div>
        </section>

        {/* ── SECTION 1.5: FEATURE ENGINE ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Feature copy + mascot (slides in from the left) */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-5 flex flex-col gap-6 text-left transform-gpu"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              eventFlow thinks{' '}
              <span className="text-slate-900 dark:text-white">
                through every stage.
              </span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
              From registration to final results, every step is automated and coordinated by one intelligent workflow engine — surfacing anomalies before they ever become disputes.
            </p>
            <motion.img
              src={ROBOT_FEATURE}
              alt="eFlow mascot"
              draggable={false}
              onError={(e) => { e.currentTarget.style.opacity = '0.12'; }}
              animate={{ y: [-8, 8, -8] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-64 lg:w-80 object-contain drop-shadow-[0_20px_35px_rgba(99,102,241,0.2)] transform-gpu select-none mt-2"
            />
          </motion.div>

          {/* Terminal Simulator card (slides up into view) */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-7 w-full flex justify-center lg:justify-end transform-gpu"
          >
            <div
              onMouseMove={handleCardTilt}
              onMouseLeave={handleCardReset}
              className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/40 backdrop-blur-md p-8 flex flex-col justify-between overflow-visible shadow-2xl shadow-indigo-100/30 dark:shadow-indigo-950/10 border-glowing-card transition-colors duration-300"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Outer grid patterns */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none rounded-2xl"></div>

              <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-550 font-mono ml-2">flow_engine_core.py</span>
                </div>
                
                {/* Advanced Simulation Controls */}
                <div className="flex items-center gap-2 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-[9px] font-mono text-slate-500 dark:text-slate-400 select-none">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisIsPaused(p => !p);
                    }}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-bold transition-colors mr-0.5"
                    title={visIsPaused ? 'Resume auto-simulation' : 'Pause simulation'}
                  >
                    {visIsPaused ? '▶ Run' : '❚❚ Pause'}
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisSpeed(s => s === 4500 ? 1800 : 4500);
                    }}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                    title="Toggle simulation speed"
                  >
                    Speed: {visSpeed === 4500 ? '1x' : '2x.⚡'}
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVisActiveNode(0);
                      setVisIsPaused(false);
                    }}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                    title="Reset simulation loop"
                  >
                    Reset ↻
                  </button>
                </div>
              </div>

              {/* Glowing core animation */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>

              {/* The Pipeline Node Tree — staggered timeline entry */}
              <motion.div
                variants={stageContainerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                className="flex flex-col gap-5 w-full mt-10 relative z-10"
              >
                {[
                  { label: 'Participant Intake', state: 'active', desc: 'Secure profile collection & credential validation', color: 'from-blue-500 to-indigo-500', num: '01' },
                  { label: 'Team Formation', state: 'idle', desc: 'Skill balancing algorithm matching teams', color: 'from-indigo-500 to-purple-500', num: '02' },
                  { label: 'Evaluation Phase', state: 'idle', desc: 'Consensus grading guides & scoresheets', color: 'from-purple-500 to-cyan-500', num: '03' },
                  { label: 'Anomaly Review', state: 'alert', desc: 'Outlier engine auditing grader deviations', color: 'from-pink-500 to-rose-500', num: '04' },
                  { label: 'Results Publication', state: 'idle', desc: 'Finalized leaderboard distribution', color: 'from-emerald-500 to-teal-500', num: '05' },
                ].map((node, i, arr) => {
                  const isNodeActive = visActiveNode === i;
                  const isAlert = node.num === '04' && isNodeActive;
                  const isAnomaly = node.num === '04';

                  return (
                    <motion.div
                      key={node.label}
                      variants={stageItemVariants}
                      onClick={() => {
                        setVisActiveNode(i);
                        setVisIsPaused(true);
                      }}
                      className="relative flex items-start gap-4 cursor-pointer group/node"
                    >
                      {/* Connecting line */}
                      {i < arr.length - 1 && (
                        <div className="absolute left-[18px] top-9 w-[2px] h-[24px] bg-slate-200 dark:bg-slate-800">
                          {isNodeActive && (
                            <div className="pulse-dot"></div>
                          )}
                        </div>
                      )}

                      {/* Glowing Node Dot */}
                      <div className="relative">
                        {/* Perpetual anomaly alert ring around node 04 */}
                        {isAnomaly && (
                          <motion.span
                            aria-hidden="true"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute -inset-1 rounded-xl border-2 border-rose-500 pointer-events-none"
                          />
                        )}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold border transition-all duration-300 ${
                          isNodeActive
                            ? isAlert
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                              : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                            : isAnomaly
                              ? 'border-rose-500/60 bg-rose-50/60 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 group-hover/node:border-indigo-500/50 group-hover/node:text-indigo-500 dark:group-hover/node:text-indigo-400'
                        }`}>
                          {node.num}
                        </div>
                      </div>

                      {/* Node Text details */}
                      <div className="flex flex-col text-left">
                        <span className={`text-sm font-bold transition-colors duration-200 ${
                          isNodeActive 
                            ? isAlert 
                              ? 'text-rose-600 dark:text-rose-400' 
                              : 'text-indigo-600 dark:text-indigo-400' 
                            : 'text-slate-700 dark:text-slate-300 group-hover/node:text-indigo-600 dark:group-hover/node:text-indigo-400'
                        }`}>
                          {node.label}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5">{node.desc}</span>
                      </div>

                      {/* Status badge */}
                      <div className="ml-auto mt-1">
                        <motion.span
                          animate={isAnomaly ? { opacity: [0.3, 1, 0.3] } : { opacity: 1 }}
                          transition={isAnomaly ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}
                          className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider transition-colors duration-200 ${
                            isAnomaly
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                              : isNodeActive
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.1)]'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-600 border border-slate-200 dark:border-slate-800/40'
                          }`}
                        >
                          {isAnomaly ? 'AUDIT REQD' : isNodeActive ? 'PROCESSING' : 'STAGED'}
                        </motion.span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Terminal Logs Display */}
              <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/80 p-4 font-mono text-left relative overflow-hidden mt-4 transition-colors duration-300">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/50 dark:border-slate-900/50 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                  <span>TERMINAL SIMULATOR</span>
                  <span>FLOW STATUS</span>
                </div>
                <div className="flex flex-col gap-1.5 min-h-[56px] justify-end">
                  {visLogs.map((log, idx) => {
                    const isSuccess = log.includes('SUCCESS');
                    const isAlert = log.includes('ALERT');
                    const isWarn = log.includes('WARN');
                    let textColor = 'text-slate-600 dark:text-slate-400';
                    if (isSuccess) textColor = 'text-emerald-600 dark:text-emerald-400';
                    else if (isAlert) textColor = 'text-rose-600 dark:text-rose-400 font-bold';
                    else if (isWarn) textColor = 'text-amber-600 dark:text-amber-500';

                    return (
                      <div key={idx} className={`text-[11px] transition-all duration-300 ${textColor}`}>
                        <span className="text-indigo-500 dark:text-indigo-400 mr-2 font-bold">&gt;</span>
                        <TypewriterLine text={log} showCursor={idx === visLogs.length - 1} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── SECTION 2: SPONSOR / TECHNOLOGY MARQUEE ── */}
        <section className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden border-y border-slate-200 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-950/20 py-8 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 mb-5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-450/80 dark:text-slate-500/80 font-mono">
              POWERED BY ENTERPRISE STACK LOGIC
            </span>
          </div>

          <div 
            className="relative flex items-center overflow-x-hidden w-full"
            style={{ 
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', 
              maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' 
            }}
          >
            {/* Scrolling Banner */}
            <div className="animate-marquee flex items-center py-3">
              {/* First loop */}
              {technologySponsors.map((sponsor, i) => (
                <div 
                  key={`logo-1-${i}`} 
                  className={`mx-7 flex items-center gap-3.5 px-6 py-3.5 rounded-full border border-slate-250/65 dark:border-slate-800/40 bg-white/50 dark:bg-slate-900/10 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-350 hover:scale-[1.06] hover:opacity-100 cursor-default shrink-0 group ${sponsor.hoverStyle}`}
                >
                  <div className="flex items-center justify-center shrink-0 w-6 h-6 scale-[1.15] opacity-75 group-hover:opacity-100 group-hover:scale-[1.25] transition-all duration-300">
                    {sponsor.icon}
                  </div>
                  <span className="text-sm font-bold tracking-tight text-slate-750 dark:text-slate-200 transition-colors duration-300">{sponsor.name}</span>
                </div>
              ))}
              {/* Second loop for infinite scroll effect */}
              {technologySponsors.map((sponsor, i) => (
                <div 
                  key={`logo-2-${i}`} 
                  className={`mx-7 flex items-center gap-3.5 px-6 py-3.5 rounded-full border border-slate-250/65 dark:border-slate-800/40 bg-white/50 dark:bg-slate-900/10 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-350 hover:scale-[1.06] hover:opacity-100 cursor-default shrink-0 group ${sponsor.hoverStyle}`}
                >
                  <div className="flex items-center justify-center shrink-0 w-6 h-6 scale-[1.15] opacity-75 group-hover:opacity-100 group-hover:scale-[1.25] transition-all duration-300">
                    {sponsor.icon}
                  </div>
                  <span className="text-sm font-bold tracking-tight text-slate-750 dark:text-slate-200 transition-colors duration-300">{sponsor.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 3: WHY EFLOW ── */}
        <section id="features" className="flex flex-col gap-12 scroll-mt-24">
          <div className="text-center flex flex-col gap-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              Designed for Operational Excellence
            </h2>
            <p className="text-slate-650 dark:text-slate-400 max-w-xl mx-auto">
              eFlow transforms manual spreadsheets and fragmented forms into a unified, high-integrity pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'Workflow Orchestration',
                desc: 'Coordinate participants, evaluators, and organizers through a single, automated event lifecycle.',
                icon: '🔄',
                tag: 'Lifecycle'
              },
              {
                title: 'AI-Assisted Operations',
                desc: 'Generate customized evaluation guides, criteria scoring rationales, and automated event wrap reports using LLMs.',
                icon: '🧠',
                tag: 'Intelligence'
              },
              {
                title: 'Governance & Transparency',
                desc: 'Detect judge scores anomalies in real time, enforce secure approval gates, and maintain fair, audited evaluations.',
                icon: '🛡️',
                tag: 'Compliance'
              }
            ].map((card, i) => (
              <div
                key={card.title}
                onMouseMove={handleCardTilt}
                onMouseLeave={handleCardReset}
                className="group relative flex flex-col justify-between p-8 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/20 backdrop-blur-md hover:border-indigo-500/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.06)] dark:hover:shadow-[0_0_30px_rgba(99,102,241,0.08)] transition-colors duration-300 overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center text-2xl shadow-inner transition-colors">
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      {card.tag}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 text-left">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors duration-200">
                  <span>Explore features</span>
                  <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform duration-200">→</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 4: LIVE EVENT PIPELINE (Interactive Timeline) ── */}
        <section id="timeline" className="flex flex-col gap-12 bg-slate-100/30 dark:bg-slate-950/10 border border-slate-200 dark:border-slate-800/30 rounded-3xl p-8 md:p-12 relative overflow-hidden scroll-mt-24 transition-colors duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-purple-650/5 blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 dark:border-slate-800/50 pb-8">
            <div className="text-left flex flex-col gap-3">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Interactive journey engine</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">The Live Event Timeline</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-sm text-left text-sm leading-relaxed">
              Explore how participant deliverables flow seamlessly from intake registration into finalized leaderboards. Click any node to preview its parameters.
            </p>
          </div>

          {/* Timeline Nodes */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative z-10">
            {pipelineStages.map((stage, idx) => {
              const isActive = activePipelineStage === idx;
              return (
                <button
                  key={stage.title}
                  onClick={() => setActivePipelineStage(idx)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all duration-300 ${
                    isActive 
                      ? 'bg-white dark:bg-slate-900 border-indigo-500/80 shadow-[0_0_20px_rgba(99,102,241,0.12)] dark:shadow-[0_0_20px_rgba(99,102,241,0.15)] text-slate-900 dark:text-white scale-[1.03]' 
                      : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/60 hover:border-slate-350 dark:hover:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-transform duration-300 ${
                    isActive ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-white scale-110' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                  }`}>
                    {stage.icon}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400/80 uppercase font-bold tracking-wider">{stage.badge.split(':')[0]}</span>
                    <span className="text-xs font-bold tracking-tight">{stage.title}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Detail Display split-screen */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative mt-4 z-10">
            {/* Left Column: textual info */}
            <div className="lg:col-span-5 p-8 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/40 backdrop-blur-md flex flex-col justify-between text-left transition-colors duration-300">
              <div className="flex flex-col gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-indigo-100/20 dark:shadow-indigo-950/30">
                  {pipelineStages[activePipelineStage].icon}
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded w-fit">
                    {pipelineStages[activePipelineStage].badge}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {pipelineStages[activePipelineStage].title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {pipelineStages[activePipelineStage].description}
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex flex-wrap gap-2.5 border-t border-slate-200/50 dark:border-slate-900/50 pt-4">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded border border-slate-200 dark:border-slate-800">
                  SYSTEM RELAY: ACTIVE
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded border border-slate-200 dark:border-slate-800">
                  LATENCY SECURE: &lt;1.8s
                </span>
              </div>
            </div>

            {/* Right Column: live interactive dashboard mockup */}
            <div className="lg:col-span-7 p-8 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-slate-950/40 backdrop-blur-md flex flex-col justify-center transition-colors duration-300 min-h-[260px] relative overflow-hidden">
              {/* Subtle background grid on mockup */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none rounded-2xl"></div>
              
              <div className="relative z-10 w-full h-full flex flex-col justify-center">
                {renderTimelineMockup()}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: ROLE-BASED WORKSPACES ── */}
        <section id="workspaces" className="flex flex-col gap-12 scroll-mt-24">
          <div className="text-center flex flex-col gap-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              Targeted Environments for Key Stakeholders
            </h2>
            <p className="text-slate-650 dark:text-slate-400 max-w-xl mx-auto">
              Each portal provides dedicated views built around specific constraints and objectives, ensuring clear segregation of responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {workspaceDetails.map((ws) => (
              <div
                key={ws.role}
                onMouseMove={handleCardTilt}
                onMouseLeave={handleCardReset}
                className={`flex flex-col justify-between p-8 rounded-2xl border bg-white/40 dark:bg-slate-950/20 backdrop-blur-md relative overflow-hidden transition-all duration-350 select-none group ${
                  ws.role === 'Committee Control Center' 
                    ? 'border-slate-200 dark:border-slate-800/60 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.12)]' 
                    : ws.role === 'Evaluator Workspace'
                    ? 'border-slate-200 dark:border-slate-800/60 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]'
                    : 'border-slate-200 dark:border-slate-800/60 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.12)]'
                }`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="flex flex-col gap-6 text-left">
                  <div className="flex justify-between items-center">
                    <span className={`text-3xl transition-transform duration-300 ${
                      ws.role === 'Committee Control Center' ? 'group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' :
                      ws.role === 'Evaluator Workspace' ? 'group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' :
                      'group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    }`}>{ws.icon}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold tracking-widest transition-colors duration-300 ${
                      ws.role === 'Committee Control Center' ? 'border-slate-200 dark:border-slate-800 text-slate-500 group-hover:border-indigo-500/30 group-hover:text-indigo-655 dark:group-hover:text-indigo-400' :
                      ws.role === 'Evaluator Workspace' ? 'border-slate-200 dark:border-slate-800 text-slate-500 group-hover:border-cyan-500/30 group-hover:text-cyan-655 dark:group-hover:text-cyan-405' :
                      'border-slate-200 dark:border-slate-800 text-slate-500 group-hover:border-emerald-500/30 group-hover:text-emerald-655 dark:group-hover:text-emerald-450'
                    }`}>
                      ROLE PORTAL
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {ws.role}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[48px]">
                      {ws.desc}
                    </p>
                  </div>

                  {/* Render Sandbox Widget */}
                  {renderSandboxWidget(ws.role)}

                  <div className="h-[1px] bg-slate-200/60 dark:bg-slate-800/40 my-1"></div>

                  <ul className="flex flex-col gap-2.5">
                    {ws.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <span className={`flex items-center justify-center w-4 h-4 rounded-full border text-[9px] shrink-0 mt-0.5 transition-colors duration-300 ${
                          ws.role === 'Committee Control Center' ? 'border-indigo-500/30 text-indigo-500 group-hover:bg-indigo-500/10' :
                          ws.role === 'Evaluator Workspace' ? 'border-cyan-500/30 text-cyan-500 group-hover:bg-cyan-500/10' :
                          'border-emerald-500/30 text-emerald-500 group-hover:bg-emerald-500/10'
                        }`}>
                          ✓
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 7: EVENT TYPES ── */}
        <section id="event-types" className="flex flex-col gap-12 scroll-mt-24 select-none">
          <div className="text-center flex flex-col gap-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              Capable of Scaling Any Event Class
            </h2>
            <p className="text-slate-655 dark:text-slate-400 max-w-xl mx-auto">
              eFlow is agnostic to topic domains. Click any card below to dynamically construct and simulate its secure workflow pipeline.
            </p>
          </div>

          <div className="relative group/carousel">
            {/* Carousel Navigation Buttons */}
            <div className="absolute top-[-52px] right-2 flex gap-2">
              <button
                onClick={() => handleScrollCarousel('left')}
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/30 flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer z-10"
                title="Scroll Left"
              >
                ←
              </button>
              <button
                onClick={() => handleScrollCarousel('right')}
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/30 flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer z-10"
                title="Scroll Right"
              >
                →
              </button>
            </div>

            {/* Horizontal Scrollable Container */}
            <div
              ref={eventTypesScrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory gap-6 scrollbar-none pb-6 px-1.5 scroll-smooth"
            >
              {eventTypes.map((event, idx) => {
                const isSelected = selectedEventClass === idx;
                const pipeline = eventPipelines[event.name] || [];
                return (
                  <div
                    key={event.name}
                    className="snap-start shrink-0 w-[290px] sm:w-[315px] h-[220px] perspective-1000"
                    onClick={() => {
                      if (!eventSimulating) {
                        setSelectedEventClass(idx);
                        setEventSimStep(-1);
                        setEventSimLogs([]);
                      }
                    }}
                  >
                    {/* Inner Flipper Card Container */}
                    <div
                      className={`relative w-full h-full preserve-3d duration-500 cursor-pointer rounded-2xl border transition-all ${
                        isSelected 
                          ? 'rotate-y-180 border-indigo-500/80 shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-2 ring-indigo-500/25 scale-[1.02]' 
                          : hoveredEventCard === idx
                          ? 'border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.06)]'
                          : 'border-slate-200 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700/60'
                      }`}
                      onMouseEnter={() => setHoveredEventCard(idx)}
                      onMouseLeave={() => setHoveredEventCard(null)}
                    >
                      {/* FRONT FACE */}
                      <div className="absolute inset-0 backface-hidden p-6 rounded-2xl flex flex-col justify-between text-left bg-gradient-to-br bg-white/70 dark:bg-slate-900/60" style={{ backgroundClip: 'padding-box' }}>
                        <div className="flex justify-between items-start">
                          <span className="text-3.5xl shrink-0 p-2.5 rounded-xl bg-slate-100/50 dark:bg-slate-950/40">{event.icon}</span>
                          <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-550 dark:text-indigo-400 bg-indigo-500/5 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase">
                            Front
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5 mt-2">
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-[15px]">{event.name}</h3>
                          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-normal line-clamp-3">{event.desc}</p>
                        </div>
                        <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-1 font-mono uppercase tracking-wider">
                          Click to Load Blueprint ➔
                        </div>
                      </div>

                      {/* BACK FACE (Flipped State) */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 p-5 rounded-2xl flex flex-col justify-between text-left bg-slate-950/95 border border-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)]">
                        <div className="flex justify-between items-center border-b border-indigo-500/15 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{event.icon}</span>
                            <h4 className="font-bold text-indigo-400 text-xs tracking-wider uppercase font-mono">{event.name} Stages</h4>
                          </div>
                          <span className="text-[9px] font-mono font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase animate-pulse shrink-0">
                            Active
                          </span>
                        </div>

                        {/* Compact pipeline visualization */}
                        <div className="flex flex-col gap-2 mt-2 w-full">
                          {pipeline.slice(0, 4).map((step, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2 text-[11px] text-slate-300">
                              <span className="text-[11px] shrink-0 text-slate-400">{step.icon}</span>
                              <span className="truncate font-semibold">{step.name}</span>
                              <span className="ml-auto text-[9px] font-mono text-slate-500 font-bold">Stage {sIdx + 1}</span>
                            </div>
                          ))}
                          {pipeline.length > 4 && (
                            <div className="text-[9.5px] font-semibold text-slate-500 text-center italic">
                              + {pipeline.length - 4} more stages inside engine below
                            </div>
                          )}
                        </div>

                        <div className="text-[9px] font-bold text-slate-400 text-center border-t border-indigo-500/10 pt-2 w-full font-mono uppercase tracking-wider flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          Loaded In Sandbox Blueprint
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Pipeline Constructor Sandbox */}
          <div className="w-full mt-4 p-8 rounded-3xl border border-slate-200 dark:border-slate-800/65 bg-white/40 dark:bg-slate-950/20 backdrop-blur-md flex flex-col gap-6 text-left relative overflow-hidden transition-all duration-300">
            {/* Ambient subtle grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-4 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-655 dark:text-indigo-400 font-mono">
                  LIVE PIPELINE CONSTRUCTOR
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Blueprint: {eventTypes[selectedEventClass].name}
                </h3>
              </div>
              <button
                disabled={eventSimulating}
                onClick={() => runEventSimulation(eventTypes[selectedEventClass].name)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all duration-200 cursor-pointer flex items-center gap-1.5"
              >
                {eventSimulating ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                    Running Build...
                  </>
                ) : (
                  <>
                    <span>⚙️</span>
                    Build & Run Blueprint
                  </>
                )}
              </button>
            </div>

            {/* Step visualization row */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-2 py-4 relative z-10 w-full overflow-x-auto">
              {(eventPipelines[eventTypes[selectedEventClass].name] || []).map((step, sIdx) => {
                const isActive = eventSimStep === sIdx;
                const isCompleted = eventSimStep > sIdx;
                return (
                  <React.Fragment key={step.name}>
                    {/* Step Card */}
                    <div className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all duration-300 min-w-[135px] flex-1 bg-white/60 dark:bg-slate-950/40 ${
                      isActive 
                        ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.05]'
                        : isCompleted
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-slate-200 dark:border-slate-800/60'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                        isActive 
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-105 dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                      }`}>
                        {isCompleted ? '✓' : step.icon}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">NODE {sIdx + 1}</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{step.name}</span>
                        <span className="text-[9px] text-slate-550 dark:text-slate-450 leading-tight mt-1">{step.detail}</span>
                      </div>
                    </div>

                    {/* Dotted separator line */}
                    {sIdx < 4 && (
                      <div className="hidden md:block w-8 h-[2px] border-t-2 border-dashed border-slate-200 dark:border-slate-800 shrink-0"></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Sandbox Console output */}
            {eventSimLogs.length > 0 && (
              <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-850 bg-slate-950 p-4 font-mono text-left relative overflow-hidden transition-all duration-300">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-900 text-[10px] text-slate-550 font-bold">
                  <span>BLUEPRINT SIMULATOR CONSOLE</span>
                  <span className="text-indigo-400">OUTPUT RELAY</span>
                </div>
                <div className="flex flex-col gap-1.5 min-h-[72px] justify-end">
                  {eventSimLogs.map((log, lIdx) => {
                    let logColor = 'text-slate-450';
                    if (log.includes('[SUCCESS]')) logColor = 'text-emerald-400 font-bold';
                    else if (log.includes('[INFO]')) logColor = 'text-sky-400';
                    return (
                      <div key={lIdx} className={`text-[10px] ${logColor} transition-all duration-300 animate-fadeIn`}>
                        <span className="text-indigo-500 mr-2">&gt;</span>
                        {log}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── SECTION 8: PLANS & PRICING ── */}
        <section id="pricing" className="flex flex-col gap-12 scroll-mt-24">
          <div className="text-center flex flex-col gap-4">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Simple, transparent pricing</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              Scale Any Event With High-Integrity Tools
            </h2>
            <p className="text-slate-650 dark:text-slate-400 max-w-xl mx-auto">
              Choose the perfect plan for your competition lifecycle. All plans include core registration workflows.
            </p>
          </div>

          {/* Billing switcher */}
          <div className="flex justify-center mb-4">
            <div className="bg-slate-100/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-full p-1 flex gap-1 backdrop-blur-sm">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingPeriod === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                }`}
              >
                Bill Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingPeriod === 'annual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                }`}
              >
                Bill Annually
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto w-full">
            {[
              {
                id: 'free',
                name: 'Community',
                price: 0,
                description: 'Perfect for small university clubs and local community hackathons.',
                features: [
                  'Up to 100 participants',
                  'Basic random/manual team matching',
                  'Standard evaluations leaderboard',
                  'Basic support ticket submission',
                  'Standard email notifications',
                  'EventFlow branding in portals'
                ],
                actionText: 'Current Plan',
                color: 'text-slate-500 dark:text-slate-400',
                popular: false,
                glow: 'hover:shadow-[0_0_30px_rgba(148,163,184,0.06)] hover:border-slate-300 dark:hover:border-slate-700',
                themeColor: '#94a3b8'
              },
              {
                id: 'pro',
                name: 'Scale (Pro)',
                price: billingPeriod === 'monthly' ? 49 : 39,
                description: 'Designed for high-performance regional competitions and bootcamps.',
                features: [
                  'Up to 500 participants',
                  'AI Smart Matchmaker (domain & skills balance)',
                  'Smart Timetable Scheduler & Judge Allocator',
                  'AI Copilot Grievance Response Drafter',
                  'Ask AI Chatbot helper for participants',
                  'Priority 24/48 hr email support',
                  'No platform branding advertisements'
                ],
                actionText: 'Upgrade to Pro',
                color: 'text-indigo-600 dark:text-indigo-400',
                popular: true,
                glow: 'hover:shadow-[0_0_35px_rgba(99,102,241,0.12)] hover:border-indigo-500/40 border-indigo-500/30 dark:border-indigo-500/40',
                themeColor: '#6366f1'
              },
              {
                id: 'enterprise',
                name: 'Enterprise',
                price: 'Custom',
                description: 'For corporate innovation challenges, accelerators, and institutions.',
                features: [
                  'Unlimited participants & teams',
                  'Customized AI matching weights & formulas',
                  'Custom-tuned LLM knowledge bases',
                  'Automated mentor-swap safety triggers',
                  'Full White-Labeling (custom domains & logos)',
                  'SSO integration (SAML, Okta)',
                  'Dedicated Slack channel & 2 hr SLA support'
                ],
                actionText: 'Contact Sales',
                color: 'text-sky-500 dark:text-sky-400',
                popular: false,
                glow: 'hover:shadow-[0_0_30px_rgba(56,189,248,0.08)] hover:border-sky-500/30',
                themeColor: '#0ea5e9'
              }
            ].map((plan) => {
              const isCurrent = activePlan === plan.id;
              const isUpgrading = upgradingTo === plan.id;

              return (
                <article
                  key={plan.id}
                  className={`group relative flex flex-col justify-between p-8 rounded-3xl border bg-white/40 dark:bg-slate-950/20 backdrop-blur-md transition-all duration-300 ${plan.glow} ${
                    isCurrent ? 'border-indigo-500 shadow-[0_0_32px_rgba(99,102,241,0.08)] dark:shadow-[0_0_32px_rgba(99,102,241,0.1)]' : 'border-slate-200 dark:border-slate-800/60'
                  }`}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {plan.popular && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md shadow-indigo-500/10">
                      ✨ Recommended
                    </div>
                  )}

                  <div className="flex flex-col gap-6 text-left">
                    <div>
                      <h3 className={`text-xl font-bold ${plan.color}`}>{plan.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1 mt-2">
                      {typeof plan.price === 'number' ? (
                        <>
                          <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight font-mono">${plan.price}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            / month {billingPeriod === 'annual' && 'billed annually'}
                          </span>
                        </>
                      ) : (
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">{plan.price}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isCurrent || isUpgrading}
                      onClick={() => handleUpgrade(plan.id)}
                      className={`w-full py-3 rounded-xl font-bold text-xs transition-all duration-300 text-center border cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-default'
                          : plan.popular
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/25 hover:translate-y-[-1px]'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:translate-y-[-1px]'
                      }`}
                    >
                      {isUpgrading ? 'Upgrading Plan...' : isCurrent ? '✓ Active Plan' : plan.actionText}
                    </button>

                    <div className="h-[1px] bg-slate-200 dark:bg-slate-800/60 my-2"></div>

                    <div className="flex flex-col gap-4">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                        What's included:
                      </span>
                      <ul className="flex flex-col gap-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            <svg
                              className="w-4 h-4 shrink-0 mt-0.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={plan.themeColor}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Footer Callout */}
          <div className="max-w-2xl mx-auto w-full p-6 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800/80 bg-white/20 dark:bg-slate-950/10 backdrop-blur-md mt-4 flex flex-col items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Need custom capabilities for enterprise integration?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
              We provide customized deployment services, localized hosting parameters (e.g. EU data residency), dedicated hardware solvers, and hands-on integration consultation.
            </p>
            <a
              href="mailto:sales@eventflow.ai"
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline mt-1 inline-flex items-center gap-1"
            >
              📧 Reach out to support & sales
            </a>
          </div>
        </section>

        {/* ── SECTION 9: FINAL CTA ── */}
        <section className="relative rounded-3xl border border-indigo-500/20 bg-gradient-to-tr from-white dark:from-slate-950 via-slate-50/80 dark:via-slate-900/80 to-indigo-50/10 dark:to-indigo-950/20 p-12 md:p-20 text-center overflow-hidden shadow-2xl shadow-indigo-100/20 dark:shadow-indigo-950/25 transition-colors duration-300">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-8 items-center">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
              Ready to Run Your Next Event?
            </h2>
            <p className="text-slate-655 dark:text-slate-400 text-base md:text-lg leading-relaxed max-w-lg">
              Unlock algorithmic matching, Z-score outlier grading, and secure Magic link authentication templates today.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="group px-10 py-5 btn-animated-cool text-white font-bold rounded-xl shadow-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Enter eventFlow</span>
              <span className="transition-transform duration-300 transform group-hover:translate-x-1.5 text-xl">→</span>
            </button>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800/40 bg-slate-50/65 dark:bg-[#030712]/50 py-12 mt-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 select-none" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            <img src="/favicon.svg" className="w-6 h-6 object-contain" alt="eFlow Icon" />
            <span className="text-base font-bold tracking-wider text-slate-700 dark:text-slate-200">
              <span className="text-[#00b87c]">e</span>Flow
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-550 font-mono">
            © 2026 eFlow. Engineered for competitive integrity.
          </p>
        </div>
      </footer>

      {/* ── WATCH WORKFLOW MODAL DIALOG ── */}
      {showWorkflowVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-6">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 text-left transition-colors duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">eFlow Orchestration Engine</h3>
              <button 
                onClick={() => setShowWorkflowVideo(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/60 p-8 flex flex-col justify-between relative overflow-hidden transition-colors duration-300">
              {/* Interactive pipeline simulation video element / graphic */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:15px_15px]"></div>
              
              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-3xl animate-pulse">
                  ⚙️
                </div>
                <div className="flex flex-col gap-1 max-w-md">
                  <h4 className="font-bold text-slate-950 dark:text-white text-base">Active Workflow Demonstration</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Watch the algorithmic engine map 200 participants into 50 cross-functional teams, resolve 4 scoring anomalies, and publish the leaderboard in real time.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowWorkflowVideo(false);
                    navigate('/login');
                  }}
                  className="group px-6 py-2.5 btn-animated-cool text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Enter eventFlow & Run Workspace</span>
                  <span className="transition-transform duration-300 transform group-hover:translate-x-1 text-sm">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[99999] bg-emerald-600 text-white dark:bg-emerald-500 font-bold text-xs px-6 py-3.5 rounded-xl shadow-2xl animate-fadeRise flex items-center gap-2 border border-emerald-500/20">
          <span>✓</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
