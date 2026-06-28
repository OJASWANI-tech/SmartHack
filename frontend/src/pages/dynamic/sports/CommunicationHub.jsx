import { useState } from 'react';
import { Megaphone, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { resolveEventId } from '../../../api/dynamicRuntime';

const GLASS = 'bg-slate-900/45 backdrop-blur-lg border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]';
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SCOPES = ['All Teams', 'All Referees', 'All Participants'];
const TYPES = [{ key: 'info', label: 'Info' }, { key: 'urgent', label: 'Urgent' }];

/*
 * CommunicationHub â€” the committee-side broadcast composer described in the
 * brief. Posts to the existing, already-authenticated /broadcasts endpoint
 * (the same one the Participant Dashboard's Live Announcements panel already
 * polls), so no new backend route is needed â€” this just gives committee users
 * a UI for it instead of requiring a raw API call.
 */
export default function CommunicationHub() {
  const eventId = resolveEventId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [scope, setScope] = useState('All Teams');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleSend() {
    if (!eventId) { setError('No active event found in this browser.'); return; }
    if (!title.trim() || !body.trim()) { setError('Headline and body are both required.'); return; }

    setSending(true);
    setError(null);
    try {
      const token = localStorage.getItem('HackSmart_token');
      const res = await fetch(`${BASE}/api/v1/events/${eventId}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), type, scope }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Failed to send (${res.status})`);
      }
      setSent(true);
      setTitle('');
      setBody('');
      setTimeout(() => setSent(false), 3500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Communication Hub</p>
        <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Broadcast to Teams &amp; Referees</h1>
        <p className="text-sm text-slate-500 mt-2">
          Posts go live in the Participant Dashboard's "Live Announcements" panel within seconds (15s poll cycle).
        </p>
      </div>

      <div className={`${GLASS} rounded-2xl p-6 md:p-8 max-w-2xl`}>
        <div className="flex items-center gap-2 mb-6">
          <Megaphone className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Compose Announcement</h2>
        </div>

        <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">Headline</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Final moved to Field B"
          className="w-full mb-4 bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none transition-all duration-300"
        />

        <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Details for teams and refereesâ€¦"
          rows={4}
          className="w-full mb-4 bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none transition-all duration-300 resize-vertical"
        />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">Priority</label>
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-300 ${
                    type === t.key ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'text-slate-400 border-white/[0.08] hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-2">Target Channel</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:border-cyan-500 outline-none transition-all duration-300"
            >
              {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mb-4">âš ï¸ {error}</p>}
        {sent && (
          <p className="text-xs text-emerald-400 mb-4 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Broadcast sent.</p>
        )}

        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold px-4 py-3 transition-all duration-300"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Sendingâ€¦' : 'Send Broadcast'}
        </button>
      </div>
    </div>
  );
}

