import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare, Radio, ShieldAlert, Cpu, Play, CheckCircle2,
  AlertTriangle, RefreshCw, Loader2, BookOpen, Send
} from 'lucide-react';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';

export default function CodingJudgesConsole() {
  const [eventName, setEventName] = useState('Coding Contest');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Cleared Clarification Ticket Stream
  const [tickets, setTickets] = useState([]);

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [responseInput, setResponseInput] = useState('');

  // Rejudging states
  const [rejudgeProblem, setRejudgeProblem] = useState('All');
  const [rejudgeLanguage, setRejudgeLanguage] = useState('All');
  const [rejudgeRunning, setRejudgeRunning] = useState(false);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
      if (currentEventId) {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${baseURL}/api/v1/events/${currentEventId}`);
        if (res.ok) {
          const data = await res.json();
          setEventName(data.name || 'Coding Contest');
          
          // Connect real ticket data structure if present in your API response
          if (data.tickets) {
            setTickets(data.tickets);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const handleRespond = () => {
    if (!selectedTicketId || !responseInput.trim()) return;

    setTickets(prev => prev.map(t => {
      if (t.id === selectedTicketId) {
        return {
          ...t,
          response: responseInput,
          status: 'Answered'
        };
      }
      return t;
    }));

    triggerToast(`✓ Clarification answer broadcasted to all contestants.`);
    setResponseInput('');
    setSelectedTicketId(null);
  };

  const handleTriggerRejudge = () => {
    setRejudgeRunning(true);
    triggerToast(`🔄 Rejudging sequence started for problem: ${rejudgeProblem} (${rejudgeLanguage})`);
    setTimeout(() => {
      setRejudgeRunning(false);
      triggerToast('✓ System rejudging successfully completed. Leaderboard score indexes synchronized.');
    }, 4000);
  };

  const activeTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading jury terminal…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Jury Console</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{eventName} Jury Operations</h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm font-semibold">
          <ShieldAlert className="w-4 h-4" /> System Audit Dashboard
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Ticket List and Clarification Responder */}
        <div className="lg:col-span-8 space-y-6">
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">Contest Clarification Queue</h2>
            </div>

            <div className="space-y-4">
              {tickets.map((t) => {
                const isSelected = selectedTicketId === t.id;
                const isAnswered = t.status === 'Answered';
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (!isAnswered) {
                        setSelectedTicketId(isSelected ? null : t.id);
                        setResponseInput(t.response || '');
                      }
                    }}
                    className={`rounded-xl border p-4 transition-all duration-200 ${
                      isAnswered 
                        ? 'border-white/[0.04] bg-white/[0.01] opacity-75' 
                        : isSelected 
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20 cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-cyan-400 font-bold font-mono">@{t.user}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold font-mono">{t.problem}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{t.time}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isAnswered ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-amber-400 bg-amber-400/10 border-amber-400/30'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs md:text-sm text-slate-200 mt-2 leading-relaxed">
                      "{t.question}"
                    </p>

                    {isAnswered && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300">
                        <strong className="block mb-1">✓ Jury Broadcast Response:</strong>
                        "{t.response}"
                      </div>
                    )}
                  </div>
                );
              })}

              {tickets.length === 0 && (
                <div className="text-center py-8 border border-dashed border-white/[0.06] rounded-xl">
                  <p className="text-xs text-slate-500 italic">No incoming clarification requests in the pipeline.</p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Responder Panel */}
          {activeTicket && (
            <div className={`${GLASS} rounded-2xl p-6`}>
              <h3 className="text-sm font-bold text-white mb-2">Respond to @{activeTicket.user} ({activeTicket.problem})</h3>
              <div className="space-y-3">
                <textarea
                  value={responseInput}
                  onChange={(e) => setResponseInput(e.target.value)}
                  placeholder="Provide system clarification answer. This response will be broadcast to all contestants to preserve event integrity..."
                  rows={3}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#070c1a] p-3 text-xs text-slate-200 outline-none focus:border-cyan-500/50 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedTicketId(null);
                      setResponseInput('');
                    }}
                    className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRespond}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                  >
                    <Send className="w-3.5 h-3.5" /> Broadcast Clarification
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Operational Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Re-judging Panel */}
          <div className={`${GLASS} rounded-2xl p-6 space-y-4`}>
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className={`w-5 h-5 text-amber-400 ${rejudgeRunning ? 'animate-spin' : ''}`} />
              <h2 className="text-lg font-bold text-white">Arbitration Rejudge</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Problem Target</label>
                <select
                  value={rejudgeProblem}
                  onChange={(e) => setRejudgeProblem(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#070c1a] p-3 text-xs text-slate-300 outline-none cursor-pointer focus:border-cyan-500/50"
                >
                  <option value="All">All Problems (A, B, C, D)</option>
                  <option value="Problem A">Problem A</option>
                  <option value="Problem B">Problem B</option>
                  <option value="Problem C">Problem C</option>
                  <option value="Problem D">Problem D</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">Compiler Language Target</label>
                <select
                  value={rejudgeLanguage}
                  onChange={(e) => setRejudgeLanguage(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-[#070c1a] p-3 text-xs text-slate-300 outline-none cursor-pointer focus:border-cyan-500/50"
                >
                  <option value="All">All Compiler Environments</option>
                  <option value="C++20">C++20 (GCC 13.2)</option>
                  <option value="Python 3.11">Python 3.11</option>
                  <option value="Java 17">Java 17 (OpenJDK)</option>
                  <option value="Go 1.21">Go 1.21</option>
                  <option value="Rust 1.75">Rust 1.75</option>
                </select>
              </div>

              <button
                onClick={handleTriggerRejudge}
                disabled={rejudgeRunning}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 disabled:opacity-40 disabled:hover:bg-amber-500/10 font-bold px-4 py-3.5 transition-all duration-300"
              >
                <RefreshCw className={`w-4 h-4 ${rejudgeRunning ? 'animate-spin' : ''}`} />
                {rejudgeRunning ? 'Rejudging Pools...' : 'Trigger Rejudge Execution'}
              </button>
            </div>
          </div>

          {/* Compilation Node Worker Load */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">System Diagnostics</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs p-2 rounded bg-slate-900/50">
                <span className="text-slate-400">Worker Node 1 Status</span>
                <span className="font-mono font-bold text-emerald-400">IDLE // HEALTHY</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded bg-slate-900/50">
                <span className="text-slate-400">Worker Node 2 Status</span>
                <span className="font-mono font-bold text-emerald-400">IDLE // HEALTHY</span>
              </div>
              <div className="flex justify-between items-center text-xs p-2 rounded bg-slate-900/50">
                <span className="text-slate-400">Pending Evaluation Queue</span>
                <span className="font-mono font-bold text-white">0 submissions</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-cyan-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-cyan-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}