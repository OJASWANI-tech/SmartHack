import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Mail, Send, Megaphone, Bell, ShieldCheck, 
  FileText, Play, CheckCircle2 
} from 'lucide-react';

export default function DebateCommunications() {
  const location = useLocation();
  const [toastMessage, setToastMessage] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real database-backed communications logs
  const [commLogs, setCommLogs] = useState([]);

  // Active tournament dashboard layout contexts
  const activeEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Synchronize historic communication dispatches from database hooks
  useEffect(() => {
    if (!activeEventId) {
      setIsLoading(false);
      return;
    }

    const fetchCommunicationHistory = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/communications/logs`);
        if (!res.ok) throw new Error("History telemetry trace mapping failed.");
        const logs = await res.json();

        setCommLogs(logs.map(log => ({
          id: log.id,
          time: log.sent_at_timestamp, // Formatted string from backend e.g. "13:08:44"
          type: log.channel_type,      // "Email Campaign", "SMS Alert", etc.
          subject: log.message_subject,
          recipients: log.recipient_count,
          status: log.delivery_status
        })));
      } catch (err) {
        console.error("Failed to parse communications trace history:", err);
        triggerToast("⚠️ Failed to sync historical dispatch metrics.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunicationHistory();
  }, [location.pathname, activeEventId]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleCustomSend = async (e) => {
    e.preventDefault();
    if (!customTitle || !customBody) {
      triggerToast("⚠️ Title and message body are required!");
      return;
    }
    if (!activeEventId) return;
    
    try {
      setIsSending(true);
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/communications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: customTitle,
          body_text: customBody,
          broadcast_scope: 'GLOBAL'
        })
      });

      if (!res.ok) throw new Error("Broadcast transactional pipeline dropped.");
      const freshLog = await res.json();

      // Prepends newest broadcast directly to view state
      setCommLogs(prev => [{
        id: freshLog.id,
        time: freshLog.sent_at_timestamp,
        type: freshLog.channel_type,
        subject: freshLog.message_subject,
        recipients: freshLog.recipient_count,
        status: freshLog.delivery_status
      }, ...prev]);

      triggerToast(`📢 Global Broadcast Sent: "${customTitle}"`);
      setCustomTitle('');
      setCustomBody('');
    } catch (err) {
      console.error(err);
      triggerToast("❌ Broadcast notification failed to propagate.");
    } finally {
      setIsSending(false);
    }
  };

  const triggerCampaign = async (templateIdentifier, suspectedScopeCount) => {
    if (!activeEventId) return;

    try {
      triggerToast("📡 Dispatching campaign template nodes...");
      const res = await fetch(`${baseURL}/api/v1/events/${activeEventId}/communications/trigger-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_key: templateIdentifier })
      });

      if (!res.ok) throw new Error("Template transaction sequence rejected.");
      const systemicLog = await res.json();

      setCommLogs(prev => [{
        id: systemicLog.id,
        time: systemicLog.sent_at_timestamp,
        type: systemicLog.channel_type,
        subject: systemicLog.message_subject,
        recipients: systemicLog.recipient_count,
        status: systemicLog.delivery_status
      }, ...prev]);

      triggerToast(`✓ Dispatched campaign to ${systemicLog.recipient_count} recipients.`);
    } catch (err) {
      console.error(err);
      triggerToast("❌ Structural bulk dispatch operation aborted.");
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">

      {/* Toast Alert Portal */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xl shadow-black/40 border border-indigo-400">
          {toastMessage}
        </div>
      )}

      {/* Control Panel Header Workspace */}
      <div className="mb-6 p-5 rounded-xl border bg-[#0b1120] border-slate-800/60 shadow-sm">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-500/20 text-purple-400 border border-purple-500/35">
            Communications Desk
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">Motions & Pairings Broadcast</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage automated email notifications, match pairing releases, and global tournament announcements.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide p-6">
          Querying remote distribution historic log tables...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column Controls */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Template Activation Triggers Grid */}
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" /> Pre-Configured Templates
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Pairings automation dispatch block */}
                <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/70 hover:border-slate-700/50 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" /> Round Pairings Email
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Sends government/opposition team sides, room locations, and assigned adjudicators to all debaters.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerCampaign("ROUND_PAIRINGS_RELEASE", 48)}
                    className="mt-4 w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white transition-colors"
                  >
                    Dispatch Pairings Campaign
                  </button>
                </div>

                {/* Judge briefing package dispatch block */}
                <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/70 hover:border-slate-700/50 transition-all duration-200 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" /> Adjudicator Briefing Packet
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Sends grading rubrics, ballot submit links, and conflict matrix checks directly to panel chairs.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerCampaign("ADJUDICATOR_BRIEFING_PACKET", 12)}
                    className="mt-4 w-full py-1.5 rounded bg-amber-600/25 hover:bg-amber-600/35 border border-amber-500/35 text-[10px] font-bold text-amber-300 transition-colors"
                  >
                    Dispatch Adjudicator Briefs
                  </button>
                </div>

              </div>
            </div>

            {/* Broadcast Pipeline History Logs */}
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" /> Dispatch History Log
              </h3>
              
              <div className="overflow-x-auto">
                {commLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs italic">
                    No messaging campaign logs found in the event distribution matrix.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Subject / Campaign</th>
                        <th className="py-2.5 px-3 text-center">Recipients</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="border-b border-slate-800/35 hover:bg-slate-900/30 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-400">{log.time}</td>
                          <td className="py-3 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase
                              ${log.type?.includes('Email') 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">{log.subject}</td>
                          <td className="py-3 px-3 text-center">{log.recipients}</td>
                          <td className="py-3 px-3 text-right text-emerald-400 font-bold">✓ {log.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Custom Interactive Form */}
          <div>
            <div className="p-6 rounded-xl border bg-[#0f172a]/70 border-slate-800/40 sticky top-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-rose-400" /> Custom Broadcast
              </h3>

              <form onSubmit={handleCustomSend} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title / Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schedule Delay Announcement"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Body</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Type announcement contents here..."
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10"
                >
                  <Send className="w-3.5 h-3.5" /> 
                  {isSending ? 'Sending Notice...' : 'Broadcast Notice'}
                </button>
              </form>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}