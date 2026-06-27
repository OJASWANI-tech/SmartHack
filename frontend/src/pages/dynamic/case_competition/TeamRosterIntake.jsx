import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, ChevronDown, File, Download, AlertCircle, CheckCircle,
  Users, Settings, Loader2, X, Eye, EyeOff
} from 'lucide-react';

export default function IntakeAndFormation() {
  const [eventName, setEventName] = useState('TI Hackathon 2026');
  const [rosterStatus, setRosterStatus] = useState('Draft');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedFields, setExpandedFields] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const fileInputRef = useRef(null);

  const [participants, setParticipants] = useState([
    { id: 1, name: 'Aditya Kumar', email: 'aditya@example.com', team: 'Team Alpha', nda: true, university: true, resume: true },
    { id: 2, name: 'Priya Singh', email: 'priya@example.com', team: 'Team Alpha', nda: true, university: true, resume: false },
    { id: 3, name: 'Rajesh Patel', email: 'rajesh@example.com', team: 'Team Beta', nda: false, university: true, resume: true },
    { id: 4, name: 'Neha Verma', email: 'neha@example.com', team: 'Team Beta', nda: true, university: true, resume: true }
  ]);

  const CSV_FIELDS = [
    { field: 'Participant Name', required: true, description: 'Full name of the participant' },
    { field: 'Email', required: true, description: 'Valid email address for communication' },
    { field: 'Team Name', required: true, description: 'Team the participant belongs to' },
    { field: 'University', required: false, description: 'University/Institution name' },
    { field: 'NDA Signed', required: false, description: 'Boolean: true/false' },
    { field: 'University Verified', required: false, description: 'Boolean: true/false' },
    { field: 'Resume Complete', required: false, description: 'Boolean: true/false' }
  ];

  useEffect(() => {
    setLoading(false);
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const downloadTemplate = () => {
    const csv = 'Participant Name,Email,Team Name,University,NDA Signed,University Verified,Resume Complete\nAditya Kumar,aditya@example.com,Team Alpha,NIT Jamshedpur,true,true,true\nPriya Singh,priya@example.com,Team Alpha,NIT Jamshedpur,true,true,false';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'participants_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Template downloaded successfully.');
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV file is empty.');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredFields = ['participant name', 'email', 'team name'];
    const missingFields = requiredFields.filter((field) => !headers.includes(field));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const newParticipants = [];
    let maxId = Math.max(...participants.map((p) => p.id), 0);

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      if (values.every((v) => !v)) continue;

      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const name = row['participant name'];
      const email = row['email'];
      const team = row['team name'];

      if (!name || !email || !team) {
        throw new Error(`Row ${i + 1}: Missing required fields.`);
      }

      const newParticipant = {
        id: ++maxId,
        name,
        email,
        team,
        nda: row['nda signed']?.toLowerCase() === 'true',
        university: row['university verified']?.toLowerCase() === 'true',
        resume: row['resume complete']?.toLowerCase() === 'true'
      };

      newParticipants.push(newParticipant);
    }

    if (newParticipants.length === 0) {
      throw new Error('No valid participant rows found.');
    }

    return newParticipants;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = (file) => {
    if (!file.name.endsWith('.csv')) {
      triggerToast('Please upload a valid CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result;
        const newParticipants = parseCSV(csv);
        setParticipants((prev) => [...prev, ...newParticipants]);
        setRosterStatus('Imported');
        triggerToast(`Successfully imported ${newParticipants.length} participant(s).`);
      } catch (err) {
        triggerToast(`Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const verifiedCount = participants.filter((p) => p.nda && p.university && p.resume).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1428] text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1428] text-slate-100">
      {/* Header */}
      <div className="border-b border-white/[0.08] bg-[#0d1b2a] px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Intake &amp; Formation</h1>
            <p className="text-sm text-slate-400">Import participants and configure formation rules.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Roster: {rosterStatus}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <span className="text-xl">☀️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Left: Steps */}
          <div className="col-span-2 space-y-8">
            {/* STEP 1: DATA INTEGRATION */}
            <div>
              <div className="text-xs uppercase tracking-widest font-bold text-blue-400 mb-6">Step 1: Data Integration</div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  dragActive
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-white/[0.15] bg-white/[0.03] hover:border-blue-400/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Drop CSV here or browse</h3>
                    <p className="text-sm text-slate-400">Accepts standard production .csv configurations</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                  >
                    Select File
                  </button>
                </div>
              </div>

              {/* Expected Data Structure Fields */}
              <button
                onClick={() => setExpandedFields(!expandedFields)}
                className="mt-4 flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-300 hover:text-slate-100 transition-colors group"
              >
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-transform ${
                    expandedFields ? 'rotate-180' : ''
                  }`}
                />
                Expected Data Structure Fields
              </button>

              {expandedFields && (
                <div className="mt-2 rounded-lg bg-white/[0.02] border border-white/[0.08] p-4 space-y-3">
                  {CSV_FIELDS.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 pb-3 border-b border-white/[0.06] last:border-0 last:pb-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-100">{item.field}</span>
                          {item.required && (
                            <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 font-semibold">Required</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={downloadTemplate}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-semibold text-sm transition-colors border border-blue-500/30"
                  >
                    <Download className="w-4 h-4" /> Download Template
                  </button>
                </div>
              )}
            </div>

            {/* STEP 2: CONFIGURATION */}
            <div>
              <div className="text-xs uppercase tracking-widest font-bold text-blue-400 mb-6">Step 2: Configuration</div>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Settings className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Team Formation Engine</h3>
                    <p className="text-sm text-slate-400">Configure team formation rules and matching criteria</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Rosters */}
          <div className="col-span-1 space-y-6">
            {/* Participant Roster */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
              <div className="border-b border-white/[0.08] bg-white/[0.05] px-6 py-4">
                <h3 className="text-lg font-bold text-white">Participant Roster</h3>
              </div>
              <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                {participants.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">No participants imported yet.</p>
                ) : (
                  <>
                    {participants.map((p) => (
                      <div key={p.id} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 hover:bg-white/[0.08] transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100 truncate">{p.name}</p>
                            <p className="text-xs text-slate-500 truncate">{p.email}</p>
                          </div>
                          {p.nda && p.university && p.resume && (
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="px-2 py-1 rounded bg-slate-700/50 text-slate-300">{p.team}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <div className="pt-3 border-t border-white/[0.06] mt-3">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-300">{verifiedCount}</span> of{' '}
                    <span className="font-semibold text-slate-300">{participants.length}</span> verified
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total Participants</p>
                  <p className="text-3xl font-bold text-white mt-2">{participants.length}</p>
                </div>
                <div className="h-px bg-white/[0.08]" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Fully Verified</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">{verifiedCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-blue-500/30 bg-slate-900/90 backdrop-blur-lg px-5 py-3 text-sm font-medium text-blue-300 shadow-lg transition-all duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
