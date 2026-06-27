import React, { useState } from 'react';
import { BookOpen, Upload, Send, Clock, Users, Lock, Unlock, ChevronDown, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';

const GLASS = 'bg-slate-900/50 backdrop-blur-lg border border-white/[0.06] shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]';

const TRACKS = ['All Teams', 'Track A', 'Track B', 'Track C', 'Finals Only'];

const PREVIOUS_BRIEFS = [
  { id: 1, title: 'Case Brief v1 — Qualification Round', releasedAt: 'Jun 12, 9:00 AM', track: 'All Teams', downloads: 38 },
  { id: 2, title: 'Case Brief v2 — Semi Finals', releasedAt: 'Jun 13, 10:30 AM', track: 'Track A, Track B', downloads: 24 },
];

export default function CaseBriefRelease({ onReleased }) {
  const [title, setTitle] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('All Teams');
  const [scheduledRelease, setScheduledRelease] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState(null); // 'releasing' | 'success' | 'error'
  const [trackOpen, setTrackOpen] = useState(false);

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') setFile(f);
    else setStatus('error');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleRelease = () => {
    if (!title.trim() || !file) return;
    setStatus('releasing');
    setTimeout(() => {
      setStatus('success');
      if (onReleased) onReleased({ title, track: selectedTrack, file });
    }, 1800);
  };

  const reset = () => {
    setTitle('');
    setFile(null);
    setScheduledRelease(false);
    setScheduleTime('');
    setSelectedTrack('All Teams');
    setStatus(null);
  };

  const canRelease = title.trim() && file && !status;

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#060B16] flex items-center justify-center p-6">
        <div className={`${GLASS} rounded-2xl p-10 max-w-md w-full text-center`}>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Brief Released</h2>
          <p className="text-slate-400 text-sm mb-1">
            <span className="text-slate-300 font-medium">{title}</span> has been sent to{' '}
            <span className="text-indigo-400 font-medium">{selectedTrack}</span>.
          </p>
          <p className="text-slate-500 text-xs mb-8">Teams will receive a notification immediately.</p>
          <button
            onClick={reset}
            className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-semibold px-4 py-3 transition-all duration-200"
          >
            Release Another Brief
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060B16] p-6 md:p-8 text-slate-200">

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Command Center</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">Release Case Brief</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Form */}
        <div className="lg:col-span-2 space-y-5">

          {/* Brief Title */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Brief Title
            </label>
            <input
              type="text"
              placeholder="e.g. Case Brief v3 — Grand Finals"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all duration-200"
            />
          </div>

          {/* File Upload */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Case Brief PDF
            </label>
            {file ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 cursor-pointer
                  ${dragOver
                    ? 'border-indigo-500/50 bg-indigo-500/[0.07]'
                    : 'border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.02]'
                  }`}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <Upload className="w-6 h-6 text-slate-500 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  Drop PDF here or{' '}
                  <span className="text-indigo-400 underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-slate-600 mt-1">PDF only · Max 25 MB</p>
                <input
                  id="fileInput"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 mt-3 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5" /> Only PDF files are accepted.
              </div>
            )}
          </div>

          {/* Audience + Schedule */}
          <div className={`${GLASS} rounded-2xl p-6 space-y-5`}>

            {/* Track Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Release To
              </label>
              <div className="relative">
                <button
                  onClick={() => setTrackOpen(!trackOpen)}
                  className="w-full flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 hover:border-white/[0.14] transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    {selectedTrack}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${trackOpen ? 'rotate-180' : ''}`} />
                </button>
                {trackOpen && (
                  <div className="absolute z-10 top-full mt-2 w-full bg-slate-900 border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    {TRACKS.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setSelectedTrack(t); setTrackOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150
                          ${selectedTrack === t
                            ? 'bg-indigo-500/15 text-indigo-300'
                            : 'text-slate-300 hover:bg-white/[0.04]'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Toggle */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Schedule Release
                </label>
                <button
                  onClick={() => setScheduledRelease(!scheduledRelease)}
                  className={`relative w-10 h-5 rounded-full transition-all duration-200 border
                    ${scheduledRelease
                      ? 'bg-indigo-500/40 border-indigo-500/50'
                      : 'bg-white/[0.05] border-white/[0.08]'
                    }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all duration-200
                      ${scheduledRelease ? 'translate-x-5 bg-indigo-400' : 'bg-slate-500'}`}
                  />
                </button>
              </div>
              {scheduledRelease && (
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-300 focus:outline-none placeholder-slate-600"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* Release Button Panel */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex items-center gap-2 mb-1">
              {canRelease ? (
                <Unlock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-slate-600" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {scheduledRelease ? 'Schedule Brief' : 'Release Now'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-5">
              {canRelease
                ? scheduledRelease
                  ? `Will release to ${selectedTrack} at the scheduled time.`
                  : `Will immediately notify all teams in ${selectedTrack}.`
                : 'Add a title and upload a PDF to continue.'}
            </p>

            <button
              onClick={handleRelease}
              disabled={!canRelease}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-sm transition-all duration-200
                ${canRelease
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-500/50'
                  : 'bg-white/[0.03] border border-white/[0.06] text-slate-600 cursor-not-allowed'
                }`}
            >
              {status === 'releasing' ? (
                <>
                  <span className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                  Releasing…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {scheduledRelease ? 'Schedule Brief' : 'Release Brief'}
                </>
              )}
            </button>
          </div>

          {/* Summary Preview */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preview</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Title</span>
                <span className="text-slate-300 text-right max-w-[60%] truncate">
                  {title || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audience</span>
                <span className="text-slate-300">{selectedTrack}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">File</span>
                <span className="text-slate-300 truncate max-w-[60%]">
                  {file ? file.name : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Release</span>
                <span className="text-slate-300">
                  {scheduledRelease && scheduleTime
                    ? new Date(scheduleTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : scheduledRelease ? 'Scheduled (no time set)' : 'Immediate'}
                </span>
              </div>
            </div>
          </div>

          {/* Previous Releases */}
          <div className={`${GLASS} rounded-2xl p-6`}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Previously Released</p>
            <div className="space-y-3">
              {PREVIOUS_BRIEFS.map((b) => (
                <div key={b.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <p className="text-xs font-semibold text-slate-300 truncate">{b.title}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{b.releasedAt} · {b.track}</p>
                  <p className="text-[11px] text-indigo-400 mt-1">{b.downloads} downloads</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
