import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ShieldAlert, Search, RefreshCw, Upload, FileText, CheckCircle2, 
  AlertTriangle, Play, ChevronRight, Save, Clipboard, Terminal, 
  Loader2, Info, User, AlertOctagon, History, Edit3
} from 'lucide-react';

const GLASS_CARD = 'bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-lg';
const INPUT_CLASS = 'bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all';
const BUTTON_SECONDARY = 'bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-1.5 px-3.5 rounded-lg text-xs cursor-pointer transition-all duration-200 flex items-center gap-1.5';
const BUTTON_PRIMARY = 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs cursor-pointer shadow-md shadow-indigo-950/25 transition-all duration-150 flex items-center gap-1.5';

export default function AntiCheat({ currentEvent }) {
  const dbConfig = currentEvent?.stage_config?.config || {};
  const similarityThreshold = dbConfig.similarity_threshold || 70;
  const engineType = dbConfig.engine_type || "Hybrid Engine (AST + MOSS + Semantic)";
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Dynamic live tracking data collections
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [reviewerNote, setReviewerNote] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState("IDLE"); 
  const [uploadError, setUploadError] = useState("");
  
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    flagged: 0,
    underReview: 0,
    resolved: 0
  });

  const fileInputRef = useRef(null);

  const pollScanResults = async () => {
    if (!currentEvent?.id) return;
    try {
      const res = await fetch(`${baseURL}/api/v1/anti-cheat/${currentEvent.id}/results`);
      if (!res.ok) throw new Error("Could not pull engine response updates.");
      const data = await res.json();
      
      // Update pipeline metadata counts
      if (data.summary) {
        setSummaryStats({
          total: data.summary.total_submissions || 0,
          flagged: data.summary.flagged_count || 0,
          underReview: data.summary.under_review_count || 0,
          resolved: data.summary.resolved_count || 0
        });
      }

      if (data.status === "COMPLETED") {
        if (data.matches && data.matches.length > 0) {
          const mappedMatches = data.matches.map((m) => {
            const challengePath = m.file_A || "solution.py";
            return {
              id: m.match_id || `M-${m.id}`,
              participantA: m.participant_A_handle || "Unknown",
              participantB: m.participant_B_handle || "Unknown",
              challenge: challengePath.substring(challengePath.indexOf('/') + 1) || challengePath,
              status: m.workflow_status || "Pending Review",
              score: Math.round((m.similarity_score || 0) * 100),
              metaA: {
                submissionId: m.submission_A_id || "N/A",
                runtime: m.runtime_A || "N/A",
                timestamp: m.timestamp_A || "",
                language: m.language_A || getLanguageLabel(challengePath)
              },
              metaB: {
                submissionId: m.submission_B_id || "N/A",
                runtime: m.runtime_B || "N/A",
                timestamp: m.timestamp_B || "",
                language: m.language_B || getLanguageLabel(challengePath)
              },
              breakdown: { 
                ast: Math.round((m.ast_match_score || 0) * 100), 
                token: Math.round((m.token_match_score || 0) * 100), 
                moss: Math.round((m.moss_match_score || 0) * 100), 
                semantic: Math.round((m.semantic_match_score || 0) * 100) 
              },
              timeline: m.audit_timeline || [],
              history: m.system_logs || [],
              notes: m.reviewer_notes || "",
              codeA: m.code_content_A || "",
              codeB: m.code_content_B || ""
            };
          });
          setMatches(mappedMatches);
          
          // Re-sync selection reference updates down to memory vectors
          if (selectedMatch) {
            const updatedSelection = mappedMatches.find(item => item.id === selectedMatch.id);
            if (updatedSelection) setSelectedMatch(updatedSelection);
          } else if (mappedMatches.length > 0) {
            setSelectedMatch(mappedMatches[0]);
          }
        } else {
          setMatches([]);
          setSelectedMatch(null);
        }
        setScanStatus("COMPLETED");
        setIsLoading(false);
      } else if (data.status === "PROCESSING" || data.status === "UPLOADING") {
        setScanStatus(data.status);
        setTimeout(pollScanResults, 3000);
      } else {
        setScanStatus("IDLE");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Consensus engine synchronization error:", err);
      setUploadError("Telemetry connection loss: Unable to sync with active engine stream.");
      setIsLoading(false);
    }
  };

  const triggerPipelineScan = async () => {
    if (!currentEvent?.id) return;
    setIsLoading(true);
    setScanStatus("PROCESSING");
    setUploadError("");
    try {
      const res = await fetch(`${baseURL}/api/v1/anti-cheat/${currentEvent.id}/scan`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error("The operational core cluster rejected processing run.");
      pollScanResults();
    } catch (err) {
      console.error(err);
      setUploadError("Failed to initiate processing sequence on the ingestion cluster.");
      setIsLoading(false);
      setScanStatus("IDLE");
    }
  };

  const handleZipUpload = async (file) => {
    if (!file || !currentEvent?.id) return;
    if (!file.name.endsWith('.zip')) {
      setUploadError("Invalid file extension. Please select a valid compressed (.zip) archive.");
      return;
    }
    setIsLoading(true);
    setScanStatus("UPLOADING");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${baseURL}/api/v1/anti-cheat/${currentEvent.id}/upload-submissions`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Upload transaction rejected by database storage block.");
      setScanStatus("PROCESSING");
      pollScanResults();
    } catch (err) {
      console.error(err);
      setUploadError("Could not push archive directory to raw cluster tables.");
      setIsLoading(false);
      setScanStatus("IDLE");
    }
  };

  useEffect(() => {
    if (currentEvent?.id) {
      setIsLoading(true);
      pollScanResults();
    }
  }, [currentEvent?.id]);

  const processedMatches = useMemo(() => {
    return matches.filter(match => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        match.participantA.toLowerCase().includes(query) || 
        match.participantB.toLowerCase().includes(query) || 
        match.challenge.toLowerCase().includes(query) || 
        match.id.toLowerCase().includes(query);
      
      return filterFlagged ? (matchesSearch && match.score >= similarityThreshold) : matchesSearch;
    });
  }, [matches, searchTerm, filterFlagged, similarityThreshold]);

  const updateWorkflowState = async (id, nextStatus) => {
    if (!currentEvent?.id) return;
    try {
      const res = await fetch(`${baseURL}/api/v1/anti-cheat/${currentEvent.id}/matches/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error("Failed to change validation state.");
      
      setMatches(prev => prev.map(m => m.id === id ? { ...m, status: nextStatus } : m));
      if (selectedMatch?.id === id) {
        setSelectedMatch(prev => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      console.error(err);
      setUploadError("Could not commit workflow status mutation down to database context.");
    }
  };

  const saveAuditNote = async () => {
    if (!reviewerNote.trim() || !selectedMatch || !currentEvent?.id) return;
    try {
      const res = await fetch(`${baseURL}/api/v1/anti-cheat/${currentEvent.id}/matches/${selectedMatch.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: reviewerNote.trim() })
      });
      if (!res.ok) throw new Error("Server rejected note insertion append sequence.");
      
      const data = await res.json();
      const updatedNotes = data.updated_notes || `${selectedMatch.notes}\n[Jury Note]: ${reviewerNote}`;
      
      setMatches(prev => prev.map(m => m.id === selectedMatch.id ? { ...m, notes: updatedNotes } : m));
      setSelectedMatch(prev => ({ ...prev, notes: updatedNotes }));
      setReviewerNote("");
    } catch (err) {
      console.error(err);
      setUploadError("Could not commit dynamic commentary to persistence engine layers.");
    }
  };

  function getLanguageLabel(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = { py: 'Python 3', js: 'JavaScript', cpp: 'C++ (GCC)', java: 'Java 17', ts: 'TypeScript' };
    return map[ext] || 'Source';
  }

  return (
    <div className="w-full text-slate-400 font-sans">
      
      {/* Action Header Banner */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 mb-5 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-500 font-extrabold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" /> Plagiarism & Code Integrity Monitor
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Submission Clones Inspector</h1>
          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>Engine: <strong className="text-slate-350">{engineType}</strong></span>
            <span>|</span>
            <span>Threshold: <strong className="text-rose-500">&ge;{similarityThreshold}%</strong></span>
            <span>|</span>
            <span>Telemetry: <strong className="text-amber-500 font-semibold">{scanStatus}</strong></span>
          </div>
        </div>

        <div className="flex gap-2.5 items-center w-full md:w-auto">
          <input type="file" ref={fileInputRef} onChange={(e) => handleZipUpload(e.target.files?.[0])} accept=".zip" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isLoading} 
            className={BUTTON_SECONDARY}
          >
            <Upload className="w-3.5 h-3.5" />
            {scanStatus === "UPLOADING" ? "Uploading..." : "Upload ZIP Submissions"}
          </button>
          
          <button 
            onClick={triggerPipelineScan} 
            disabled={scanStatus === "PROCESSING" || isLoading} 
            className={BUTTON_PRIMARY}
          >
            {scanStatus === "PROCESSING" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Run Re-Scan
              </>
            )}
          </button>
        </div>
      </header>

      {/* Summary Metrics Matrix */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { label: 'Total Submissions', val: summaryStats.total, color: 'text-slate-200' },
          { label: 'Flagged Anomaly Pairs', val: summaryStats.flagged, color: 'text-rose-400' },
          { label: 'Under Review', val: summaryStats.underReview, color: 'text-amber-400' },
          { label: 'Resolved Cases', val: summaryStats.resolved, color: 'text-emerald-400' }
        ].map((item, idx) => (
          <div key={idx} className="text-xs text-slate-450 bg-slate-900/50 px-3.5 py-1.5 rounded-full border border-slate-850/80 flex items-center gap-1.5">
            <span>{item.label}:</span>
            <strong className={`font-bold ${item.color}`}>{item.val}</strong>
          </div>
        ))}
      </div>

      {uploadError && (
        <div className="p-3 border border-rose-500/30 color-rose-400 rounded-lg text-xs mb-4 bg-rose-500/5 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Search Layout block */}
      <section className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[280px] w-full">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search cases by individual handles, problem name, or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={filterFlagged} 
            onChange={(e) => setFilterFlagged(e.target.checked)} 
            className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4" 
          />
          Show matches above similarity threshold only
        </label>
      </section>

      {/* Interactive Main Split Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] gap-6 items-start">
        
        {/* Left Side: Anomaly Stream Queue */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#0f172a]/60 shadow-lg">
          <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-450">
            SUSPICIOUS DETECTIONS ({processedMatches.length})
          </div>
          <div className="flex flex-col max-h-[740px] overflow-y-auto divide-y divide-slate-850/60">
            {processedMatches.map((match) => {
              const isViolation = match.score >= similarityThreshold;
              const isSelected = selectedMatch?.id === match.id;
              return (
                <div 
                  key={match.id} 
                  onClick={() => setSelectedMatch(match)}
                  className={`p-4 cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? 'bg-slate-900/60 border-r-2 border-r-indigo-500' 
                      : 'hover:bg-slate-950/20'
                  }`}
                  style={{
                    borderLeft: `3px solid ${isViolation ? '#ef4444' : '#f59e0b'}`
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold">{match.id}</span>
                    <span className={`text-xs font-bold ${isViolation ? 'text-rose-400' : 'text-amber-400'}`}>
                      {match.score}% match
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-200 mb-1">{match.participantA} ↔ {match.participantB}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">📁 {match.challenge}</div>
                </div>
              );
            })}
            {processedMatches.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">No detections matching selected filters.</div>
            )}
          </div>
        </div>

        {/* Right Side: Code Compare Canvas Inspector */}
        <div className="border border-slate-800 rounded-xl bg-slate-950/20 min-h-[520px] overflow-hidden shadow-lg">
          {selectedMatch ? (
            <div className="p-6 flex flex-col gap-5">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800/60 pb-4 gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-white">{selectedMatch.participantA} vs {selectedMatch.participantB}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">Target File: <strong className="text-slate-350">{selectedMatch.challenge}</strong></div>
                </div>
                
                {/* Immediate Action Buttons */}
                <div className="flex flex-wrap gap-2 items-center">
                  <button 
                    onClick={() => updateWorkflowState(selectedMatch.id, "Cleared")} 
                    className={`px-3 py-1.5 border rounded-lg text-xs font-bold cursor-pointer transition-all duration-150 ${
                      selectedMatch.status === "Cleared" 
                        ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300' 
                        : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    Clear Case
                  </button>
                  <button 
                    onClick={() => updateWorkflowState(selectedMatch.id, "Warning Issued")} 
                    className={`px-3 py-1.5 border rounded-lg text-xs font-bold cursor-pointer transition-all duration-150 ${
                      selectedMatch.status === "Warning Issued" 
                        ? 'bg-amber-600/25 border-amber-500 text-amber-300' 
                        : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    Issue Warning
                  </button>
                  <button 
                    onClick={() => updateWorkflowState(selectedMatch.id, "Disqualified")} 
                    className={`px-3 py-1.5 border rounded-lg text-xs font-bold cursor-pointer transition-all duration-150 ${
                      selectedMatch.status === "Disqualified" 
                        ? 'bg-rose-650/25 border-rose-500 text-rose-350' 
                        : 'bg-transparent border-slate-800 text-slate-450 hover:text-rose-400 hover:border-slate-750'
                    }`}
                  >
                    Disqualify
                  </button>
                </div>
              </div>

              {/* Integrated Analysis Scores */}
              <div className="flex flex-col md:flex-row gap-5 items-center bg-slate-900/40 p-4 rounded-xl border border-slate-850/80">
                <div className="text-center md:border-r border-slate-800/80 md:pr-6 md:mr-2 flex flex-col items-center justify-center min-w-[110px]">
                  <div className="text-3xl font-extrabold text-rose-500 font-mono tracking-tighter">{selectedMatch.score}%</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Similarity index</div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 gap-x-6 flex-1 w-full text-xs">
                  {[
                    { label: 'AST Structure Match', value: selectedMatch.breakdown.ast },
                    { label: 'Token Alignment Ratio', value: selectedMatch.breakdown.token },
                    { label: 'MOSS Fingerprint Index', value: selectedMatch.breakdown.moss },
                    { label: 'LLM Semantic Vector', value: selectedMatch.breakdown.semantic }
                  ].map((metric, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-400">
                      <span>{metric.label}:</span>
                      <strong className="font-mono text-slate-200 font-bold">{metric.value}%</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-rose-350 p-3 bg-rose-500/5 border-l-2 border-l-rose-500 rounded-r-lg flex items-center gap-2">
                <Info className="w-4 h-4 text-rose-500 shrink-0" />
                <span><strong>Identified Overlap Region:</strong> Structurally identical configurations detected across source logic paths.</span>
              </div>

              {/* Editor Side-by-Side Viewport */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-200 font-bold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-400" /> {selectedMatch.participantA}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {selectedMatch.metaA.submissionId} | {selectedMatch.metaA.runtime} | {selectedMatch.metaA.language}
                    </span>
                  </div>
                  <div className="bg-[#0b0f19] p-3 font-mono text-[11px] overflow-x-auto min-h-[200px] max-h-[365px] overflow-y-auto leading-relaxed text-slate-350">
                    {selectedMatch.codeA ? (
                      selectedMatch.codeA.split('\n').map((line, i) => (
                        <div key={i} className="flex px-2 py-0.5 rounded">
                          <span className="w-6 text-slate-600 text-right mr-3 select-none text-[10px]">{i+1}</span>
                          <span>{line}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-600 italic">No code logic provided.</span>
                    )}
                  </div>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-200 font-bold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-400" /> {selectedMatch.participantB}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {selectedMatch.metaB.submissionId} | {selectedMatch.metaB.runtime} | {selectedMatch.metaB.language}
                    </span>
                  </div>
                  <div className="bg-[#0b0f19] p-3 font-mono text-[11px] overflow-x-auto min-h-[200px] max-h-[365px] overflow-y-auto leading-relaxed text-slate-350">
                    {selectedMatch.codeB ? (
                      selectedMatch.codeB.split('\n').map((line, i) => (
                        <div key={i} className="flex px-2 py-0.5 rounded">
                          <span className="w-6 text-slate-600 text-right mr-3 select-none text-[10px]">{i+1}</span>
                          <span>{line}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-600 italic">No code logic provided.</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Drawer Collapsibles */}
              <div className="flex flex-col gap-3.5 border-t border-slate-800/80 pt-4 mt-1">
                
                <details className="border border-slate-800/80 rounded-xl bg-slate-900/20 overflow-hidden group">
                  <summary className="p-3.5 text-xs font-semibold text-slate-300 cursor-pointer select-none bg-slate-900/40 hover:bg-slate-900/60 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span>Review History & Audit Trail</span>
                  </summary>
                  <div className="p-4 border-t border-slate-800/60 text-xs flex flex-col gap-2 bg-slate-950/10 font-mono text-slate-450">
                    {selectedMatch.timeline.map((t, idx) => <div key={idx}>🔹 {t}</div>)}
                    {selectedMatch.history.map((h, idx) => <div key={idx}>⚙️ {h}</div>)}
                    <div>Current status: <strong className="text-slate-300 font-semibold">{selectedMatch.status}</strong></div>
                  </div>
                </details>

                <details className="border border-slate-800/80 rounded-xl bg-slate-900/20 overflow-hidden group" open>
                  <summary className="p-3.5 text-xs font-semibold text-slate-300 cursor-pointer select-none bg-slate-900/40 hover:bg-slate-900/60 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-indigo-400" />
                    <span>Reviewer Jury Notes</span>
                  </summary>
                  <div className="p-4 border-t border-slate-800/60 text-xs flex flex-col gap-3.5 bg-slate-950/10">
                    <div className="text-slate-300 whitespace-pre-wrap pl-3 border-l-2 border-l-indigo-500 leading-relaxed font-sans">
                      {selectedMatch.notes || <span className="text-slate-600 italic">No notes logged for this match file yet.</span>}
                    </div>
                    
                    <div className="flex gap-2.5 items-center mt-1">
                      <input 
                        type="text" 
                        placeholder="Append observations or custom validation rationale..." 
                        value={reviewerNote}
                        onChange={(e) => setReviewerNote(e.target.value)}
                        className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                      <button onClick={saveAuditNote} className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs cursor-pointer transition-all">
                        Save Note
                      </button>
                    </div>
                  </div>
                </details>
              </div>

            </div>
          ) : (
            <div className="h-[450px] flex flex-col justify-center items-center text-center text-slate-500 p-6">
              <ShieldAlert className="w-8 h-8 text-slate-700 mb-2" />
              <h3 className="font-bold text-sm text-slate-400 mb-1">No Case Selected</h3>
              <p className="text-xs">Select a verification profile track from the left panel stream queue to inspect source code overlaps.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}