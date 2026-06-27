import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  ShieldAlert, Clock, Award, CheckCircle, 
  AlertCircle, HelpCircle, Save, Play, Square, RotateCcw 
} from 'lucide-react';

export default function DebateJudgesConsole() {
  const location = useLocation();

  // Timer Lifecycle States
  const [time, setTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);

  // Dynamic state engines bound to the active database context
  const [metaRoomData, setMetaRoomData] = useState({ roomName: "Loading...", motionText: "Syncing..." });
  const [scores, setScores] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const [ballotSubmitted, setBallotSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Extract ongoing dashboard identifiers out of global runtime persistent context caches
  const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
  const activeRoundId = localStorage.getItem('current_round_id') || localStorage.getItem('round_id');
  const assignedRoomId = localStorage.getItem('assigned_room_id') || localStorage.getItem('room_id');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Chronometer Ticker Side Effect Engine
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Synchronize targeted room allocation details and assigned speaker rosters from database hooks
  useEffect(() => {
    if (!activeEventId || !assignedRoomId) {
      setIsLoading(false);
      return;
    }

    const fetchLiveAdjudicationMatrix = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/rooms/${assignedRoomId}/ballot-details`);
        if (!res.ok) throw new Error("Ballot pipeline telemetry trace mapped poorly.");
        const data = await res.json();

        setMetaRoomData({
          roomName: data.room_name_label,
          motionText: data.active_motion_text
        });

        // Construct live scores state map using backend database payload models
        // Expected payload structure: { speakers: [ { position_key: "pm", speaker_name: "Sarah...", current_points: 75, current_feedback: "" } ] }
        const structuredScores = {};
        data.speakers.forEach(sp => {
          structuredScores[sp.position_key.toLowerCase()] = {
            speakerId: sp.speaker_id,
            name: sp.speaker_name,
            teamRoleName: sp.team_role_context_label, // e.g. "Opening Government"
            points: parseInt(sp.current_points, 10) || 70,
            feedback: sp.current_feedback || ""
          };
        });

        setScores(structuredScores);
        setBallotSubmitted(data.is_ballot_locked_or_committed || false);

        if (Object.keys(structuredScores).length > 0) {
          setActiveSpeaker(Object.keys(structuredScores)[0]);
        }
      } catch (err) {
        console.error("Failed to compile judge console parameters:", err);
        triggerToast("⚠️ Error syncing live allocation speaker profiles.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveAdjudicationMatrix();
  }, [location.pathname, activeEventId, assignedRoomId]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleScoreChange = (position, val) => {
    const numVal = parseInt(val, 10) || 0;
    setScores(prev => ({
      ...prev,
      [position]: { ...prev[position], points: numVal }
    }));
  };

  const handleFeedbackChange = (position, text) => {
    setScores(prev => ({
      ...prev,
      [position]: { ...prev[position], feedback: text }
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const submitBallot = async (e) => {
    e.preventDefault();
    if (!activeEventId || !assignedRoomId) return;

    // Range compliance trace parameters validation
    for (const [pos, data] of Object.entries(scores)) {
      if (data.points < 60 || data.points > 85) {
        triggerToast(`❌ Error: ${pos.toUpperCase()} score (${data.points}) falls outside valid margin parameters ($60 \\dots 85$).`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      
      const payloadFormat = Object.entries(scores).map(([posKey, data]) => ({
        speaker_id: data.speakerId,
        position_key: posKey.toUpperCase(),
        allocated_speaker_points: data.points,
        constructed_feedback: data.feedback
      }));

      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/rooms/${assignedRoomId}/submit-ballot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: activeRoundId,
          ballot_speaker_scores: payloadFormat
        })
      });

      if (!res.ok) throw new Error("Transaction payload rejected by the ledger gateway.");
      
      setBallotSubmitted(true);
      triggerToast("⚡ Digital Ballot signed and submitted securely to Tabulation ledger.");
    } catch (err) {
      console.error(err);
      triggerToast("❌ Failsafe: Transmission breakdown dropped ballot pipeline.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white border border-indigo-400 shadow-xl">
          {toastMessage}
        </div>
      )}

      {/* Top Banner Context */}
      <div className="mb-6 p-5 rounded-xl border shadow-sm bg-[#0b1120] border-slate-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-500/20 text-purple-400 border border-purple-500/35">
            Adjudication Engine Live
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">Live Adjudicator Workspace</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Room: <strong className="text-slate-300">{metaRoomData.roomName}</strong> &bull; Motion: <em className="text-indigo-300">{metaRoomData.motionText}</em>
          </p>
        </div>
        
        <div className="text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
          Status: <span className="text-emerald-400 font-bold">Panel Chair</span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide p-6">
          Querying remote distribution room metrics tables...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Timer & Speaker Scores Input */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            
            {/* Floor Time Controller */}
            <div className="p-5 rounded-xl border bg-[#0f172a]/70 border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Speech Chronometer
                </h3>
                <div className="text-3xl font-mono font-bold text-white tracking-tight">
                  {formatTime(time)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Active Track: <span className="text-indigo-400 uppercase font-bold font-mono">{activeSpeaker || "None Selected"}</span>
                </div>
              </div>

              {/* Quick Timer Controls */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${isTimerRunning ? 'bg-amber-600 border-amber-400 text-white' : 'bg-emerald-600 border-emerald-400 text-white'}`}
                >
                  {isTimerRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isTimerRunning ? 'Pause' : 'Start Speech'}
                </button>
                <button 
                  onClick={() => { setIsTimerRunning(false); setTime(0); }}
                  className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
                </button>
              </div>
            </div>

            {/* Core Scoring Layout */}
            <div className="p-5 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" /> Dynamic Speaker Scoresheet
              </h3>

              <div className="flex flex-col gap-4">
                {Object.keys(scores).length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 italic">No assigned team positions verified for this room tier.</div>
                ) : (
                  Object.entries(scores).map(([pos, data]) => (
                    <div 
                      key={pos}
                      onClick={() => setActiveSpeaker(pos)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${activeSpeaker === pos ? 'bg-slate-900 border-indigo-500/70 shadow-sm' : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-10 text-center py-1 rounded text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {pos}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-white">{data.name}</h4>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">{data.teamRoleName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase">Speaker Points:</label>
                          <input 
                            type="number" 
                            disabled={ballotSubmitted}
                            value={data.points} 
                            onChange={(e) => handleScoreChange(pos, e.target.value)}
                            className="w-16 bg-slate-950 border border-slate-800 disabled:opacity-60 rounded-lg px-2 py-1 text-center font-mono text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                            min="60" 
                            max="85"
                          />
                        </div>
                      </div>

                      <input 
                        type="text"
                        disabled={ballotSubmitted}
                        value={data.feedback}
                        onChange={(e) => handleFeedbackChange(pos, e.target.value)}
                        placeholder="Enter critical tracking notes or behavioral structural feedback for this speech profile..."
                        className="w-full bg-slate-950/80 border border-slate-900 disabled:opacity-60 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-700"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Ballot Submission Summary Panel */}
          <div>
            <div className="p-5 rounded-xl border bg-[#0f172a]/70 border-slate-800/40 sticky top-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Ballot Verification
              </h3>

              {ballotSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-center flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">Ballot Successfully Transmitted</h4>
                  <p className="text-[11px] text-slate-400">Verifiable score configuration locked inside server matrix caches.</p>
                </div>
              ) : (
                <form onSubmit={submitBallot} className="flex flex-col gap-4">
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex flex-col gap-1.5">
                    <div className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span className="font-semibold">Submitting Node:</span>
                      <span className="font-mono text-white">Adjudicator_Console_{assignedRoomId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="font-semibold">Current Verification Status:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Unsigned Ballot
                      </span>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting || Object.keys(scores).length === 0}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white border border-indigo-400 shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    🔒 {isSubmitting ? 'Signing Payload...' : 'Sign and Commit Ballots'}
                  </button>
                </form>
              )}

              <div className="mt-4 p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex gap-2.5 items-start">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-slate-300 block mb-0.5">Rule Compliance Reminder</strong>
                  Speaker metrics are configured strictly within standard limits ($60 \dots 85$). Ranks must correlate logically with scalar point sums across teams.
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}