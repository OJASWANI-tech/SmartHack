import React, { useState } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle, Clock, 
  Filter, Search, MessageSquare, PlusCircle 
} from 'lucide-react';

export default function ProblemManagement({ currentEvent }) {
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Clean state initialized without hardcoded data array matrices
  const [tickets, setTickets] = useState([]);

  const [newTicket, setNewTicket] = useState({ room: '', type: 'Plagiarism Violation', description: '', priority: 'MEDIUM' });

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!newTicket.room || !newTicket.description) return;

    const ticketObj = {
      id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
      room: newTicket.room,
      type: newTicket.type,
      description: newTicket.description,
      status: "OPEN",
      priority: newTicket.priority,
      timestamp: "Just now"
    };

    setTickets([ticketObj, ...tickets]);
    setNewTicket({ room: '', type: 'Plagiarism Violation', description: '', priority: 'MEDIUM' });
  };

  const updateStatus = (id, nextStatus) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status: nextStatus } : t));
  };

  const filteredTickets = tickets.filter(t => {
    const matchesFilter = filter === 'ALL' || t.status === filter;
    const matchesSearch = t.room.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen p-6 font-sans antialiased bg-[#060b19] text-slate-200">
      
      {/* Upper Context Header */}
      <div className="mb-6 p-5 rounded-xl border bg-[#0b1120] border-slate-800/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-amber-500/20 text-amber-400 border border-amber-500/35">
            Technical & Infrastructure Hub
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">Live Problem Management Console</h2>
          <p className="text-xs text-slate-400 mt-0.5">Track, review, and adjudicate submission appeals, runtime compilation problems, and evaluation environment adjustments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Interactive Log Form */}
        <div className="flex flex-col gap-5">
          <div className="p-5 rounded-xl border bg-[#0f172a]/70 border-slate-800/40">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-indigo-400" /> File Live Escalation
            </h3>
            
            <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1.5">Target Sandbox Cluster / Team Environment</label>
                <input 
                  type="text" 
                  placeholder="e.g., Sandbox-Cluster-A, Node-Environment-B"
                  value={newTicket.room}
                  onChange={e => setNewTicket({...newTicket, room: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1.5">Dispute Typology</label>
                <select 
                  value={newTicket.type}
                  onChange={e => setNewTicket({...newTicket, type: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Plagiarism Violation">Plagiarism Violation</option>
                  <option value="Infrastructure Appeal">Infrastructure Appeal</option>
                  <option value="Technical / Git Loop">Technical / Git Loop</option>
                  <option value="Other / Structural Override">Other / Environment Failure</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1.5">Urgency Matrix Level</label>
                <select 
                  value={newTicket.priority}
                  onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="LOW">Low - Diagnostic Record Only</option>
                  <option value="MEDIUM">Medium - Review Post Batch</option>
                  <option value="HIGH">High - Immediate Intervention Needed</option>
                  <option value="CRITICAL">Critical - Halt Advancement Calculus</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1.5">Incident Log Specifications</label>
                <textarea 
                  rows="4"
                  placeholder="Provide precise breakdown logs, memory heap signatures, validation trace blocks, or infrastructure rule errors..."
                  value={newTicket.description}
                  onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                Broadcast Ticket to Tabulation
              </button>
            </form>
          </div>
        </div>

        {/* Right 2 Columns: Live Streams and Filter Logs */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* Controls Bar */}
          <div className="p-4 rounded-xl border bg-[#0f172a]/70 border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search cluster, ID, or trace log..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wide transition ${filter === status ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Iteration Loop */}
          <div className="flex flex-col gap-3">
            {filteredTickets.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 font-mono">
                No active infrastructure tracking logs match your filter configurations.
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 rounded-xl border bg-slate-950/60 border-slate-800/80 hover:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition">
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5">
                      {ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-white tracking-tight">{ticket.id}</span>
                        <span className="text-xs text-slate-400 font-semibold">&bull; Workspace Node: {ticket.room}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                          ticket.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          ticket.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{ticket.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {ticket.type}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ticket.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Assignment Controls */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 border-t sm:border-t-0 border-slate-900 pt-3 sm:pt-0 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wide ${
                      ticket.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400' :
                      ticket.status === 'INVESTIGATING' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {ticket.status}
                    </span>

                    <div className="flex items-center gap-1">
                      {ticket.status !== 'INVESTIGATING' && ticket.status !== 'RESOLVED' && (
                        <button 
                          onClick={() => updateStatus(ticket.id, 'INVESTIGATING')}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-slate-300"
                        >
                          Investigate
                        </button>
                      )}
                      {ticket.status !== 'RESOLVED' && (
                        <button 
                          onClick={() => updateStatus(ticket.id, 'RESOLVED')}
                          className="px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900 text-[10px] font-bold text-emerald-400 flex items-center gap-1"
                        >
                          <CheckCircle className="w-2.5 h-2.5" /> Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}