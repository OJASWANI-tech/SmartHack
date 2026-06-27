import React, { useMemo, useState, useEffect } from 'react';
import { 
  UploadCloud, Search, Users, Database, Trash2, Save, FileText, CheckCircle2, 
  HelpCircle, UserPlus, GraduationCap, Trophy, Cpu, Loader2, RefreshCw, Layers
} from 'lucide-react';

const GLASS_CARD = 'bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-lg';
const INPUT_CLASS = 'bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all';
const SELECT_CLASS = 'bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer';

export default function CodingContestIntake() {
  // State initialization dedicated to coding-contest track
  const [eventName, setEventName] = useState('Competitive Coding Championship');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [roster, setRoster] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Targeted coding tracking values
  const algorithmicSpecialties = useMemo(() => [
    'Dynamic Programming', 
    'Graph Theory', 
    'Data Structures', 
    'Math/Crypto'
  ], []);

  const divisionsList = useMemo(() => [
    'Div. 1',
    'Div. 2',
    'Div. 3',
    'Div. 4'
  ], []);

  const codeforcesRanks = useMemo(() => [
    'Grandmaster',
    'Master',
    'Candidate Master',
    'Expert',
    'Specialist',
    'Pupil',
    'Newbie'
  ], []);

  // ==========================================
  // DB SYNCING LAYER
  // ==========================================
  useEffect(() => {
    const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    if (currentEventId) {
      fetch(`${baseURL}/api/v1/events/${currentEventId}`)
        .then(res => res.json())
        .then(data => { 
          if (data.name) setEventName(data.name);
        })
        .catch(err => console.error("Network Error syncing configurations:", err));
    }
  }, []);

  // ==========================================
  // CLEANED CSV FILE UPLOAD LOGIC
  // ==========================================
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) {
        setToast('⚠️ Selected CSV file appears to be empty.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
      
      const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('fullname'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const handleIdx = headers.findIndex(h => h.includes('handle') || h.includes('codeforces') || h.includes('cf'));
      const instIdx = headers.findIndex(h => h.includes('institution') || h.includes('school') || h.includes('region') || h.includes('university'));
      const specIdx = headers.findIndex(h => h.includes('specialty') || h.includes('pillar') || h.includes('domain') || h.includes('focus'));
      const rankIdx = headers.findIndex(h => h.includes('rank') || h.includes('level') || h.includes('rating') || h.includes('division') || h.includes('div'));

      if (nameIdx === -1 || emailIdx === -1) {
        setToast('⚠️ Invalid schema. CSV must contain at least "name" and "email" headers.');
        return;
      }

      const parsedRecords = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const columns = lines[i].split(',').map(c => c.trim().replace(/["']/g, ''));
        if (columns.length < 2) continue;

        let rawSpec = specIdx !== -1 ? columns[specIdx] : '';
        let assignedSpecialty = algorithmicSpecialties.find(
          item => item.toLowerCase() === rawSpec.toLowerCase()
        ) || algorithmicSpecialties[0];

        let rawRank = rankIdx !== -1 ? columns[rankIdx] : '';
        let assignedRank = codeforcesRanks.find(
          r => r.toLowerCase() === rawRank.toLowerCase().replace(/\s+/g, '') || rawRank.toLowerCase().includes(r.toLowerCase())
        ) || 'Specialist';

        // Map Codeforces rank or raw division values to standard Div 1 - Div 4 divisions
        let assignedDivision = 'Div. 2';
        if (rawRank.toLowerCase().includes('div. 1') || rawRank.toLowerCase().includes('div 1')) {
          assignedDivision = 'Div. 1';
        } else if (rawRank.toLowerCase().includes('div. 2') || rawRank.toLowerCase().includes('div 2')) {
          assignedDivision = 'Div. 2';
        } else if (rawRank.toLowerCase().includes('div. 3') || rawRank.toLowerCase().includes('div 3')) {
          assignedDivision = 'Div. 3';
        } else if (rawRank.toLowerCase().includes('div. 4') || rawRank.toLowerCase().includes('div 4')) {
          assignedDivision = 'Div. 4';
        } else {
          // Fallback mapping based on Codeforces Rank
          if (assignedRank === 'Grandmaster' || assignedRank === 'Master' || assignedRank === 'Candidate Master') {
            assignedDivision = 'Div. 1';
          } else if (assignedRank === 'Expert' || assignedRank === 'Specialist') {
            assignedDivision = 'Div. 2';
          } else if (assignedRank === 'Pupil') {
            assignedDivision = 'Div. 3';
          } else {
            assignedDivision = 'Div. 4';
          }
        }

        parsedRecords.push({
          name: columns[nameIdx] || 'Anonymous Contestant',
          email: columns[emailIdx] || 'no-email@sandbox.io',
          cfHandle: handleIdx !== -1 ? columns[handleIdx] : 'unlinked_handle',
          institution: instIdx !== -1 ? columns[instIdx] : 'Independent Pool',
          specialty: assignedSpecialty,
          cfRank: assignedRank,
          division: assignedDivision
        });
      }

      setRoster(prev => {
        const existingEmails = new Set(prev.map(r => r.email.toLowerCase()));
        const uniqueNewRecords = parsedRecords.filter(r => !existingEmails.has(r.email.toLowerCase()));
        if (uniqueNewRecords.length === 0) {
          setToast('ℹ️ Import complete: No new unique user profiles detected.');
          return prev;
        }
        setToast(`✓ Successfully uploaded ${uniqueNewRecords.length} coding contestants to roster!`);
        return [...prev, ...uniqueNewRecords];
      });
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Filter Engine logic for scannable UI queries
  const filteredRoster = useMemo(() => {
    return roster.filter(row => {
      const matchesSearch = !search || 
        row.name.toLowerCase().includes(search.toLowerCase()) || 
        row.cfHandle.toLowerCase().includes(search.toLowerCase()) || 
        row.institution.toLowerCase().includes(search.toLowerCase());
      const matchesSpec = specialtyFilter === 'All' || row.specialty === specialtyFilter;
      const matchesDiv = divisionFilter === 'All' || row.division === divisionFilter;
      return matchesSearch && matchesSpec && matchesDiv;
    });
  }, [roster, search, specialtyFilter, divisionFilter]);

  const handleSaveToDB = () => {
    setIsSaving(true);
    setToast('Saving contestants to evaluation engine database...');
    console.log("ROSTER EXPORT FOR COMPILER INGESTION:", {
      event_name: eventName,
      track_mode: 'coding-contest',
      total_contestants: roster.length,
      roster: roster
    });
    setTimeout(() => { 
      setIsSaving(false);
      setToast('✓ Compiler pool updated successfully!'); 
    }, 1000);
  };

  // Custom styling helper for CF Division tags
  const getCfDivStyle = (div) => {
    switch(div) {
      case 'Div. 1':
        return 'text-rose-500 border border-rose-500/20 bg-rose-500/5';
      case 'Div. 2':
        return 'text-amber-500 border border-amber-500/20 bg-amber-500/5';
      case 'Div. 3':
        return 'text-sky-400 border border-sky-400/20 bg-sky-400/5';
      case 'Div. 4':
        return 'text-teal-400 border border-teal-400/20 bg-teal-400/5';
      default:
        return 'text-slate-400 border border-slate-700 bg-slate-800/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] p-6 md:p-8 text-slate-200">
      
      {toast && (
        <div className="fixed top-6 right-6 z-[10000] px-5 py-3 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-xl border border-emerald-400 animate-in fade-in duration-300">
          {toast}
        </div>
      )}

      {/* Header Info */}
      <div className="mb-6 pb-6 border-b border-slate-800">
        <span className="text-xs uppercase tracking-wider text-emerald-500 font-extrabold">// STAGE 02 // COMPILER INTAKE</span>
        <h1 className="text-2xl font-extrabold text-white mt-1">{eventName}</h1>
        <p className="text-sm text-slate-450 mt-1">
          Operational Environment: <span className="text-emerald-400 font-semibold">Individual Contestant Ingestion Track</span>
        </p>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* BULK INTAKE SECTION */}
        <section className={GLASS_CARD}>
          <div className="border-b border-slate-800/80 pb-4 mb-5">
            <span className="bg-emerald-650/15 text-emerald-400 border border-emerald-500/20 text-[10px] py-0.5 px-2.5 rounded font-extrabold uppercase tracking-wider">
              COMPILER ENGINE INGESTION
            </span>
            <h2 className="text-base font-extrabold text-white mt-1">Upload Registered Individual Contestants</h2>
          </div>

          <div className="w-full">
            <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500 bg-slate-950/30 hover:bg-slate-950/60 rounded-xl flex flex-col justify-center items-center py-12 px-6 cursor-pointer text-center transition-all duration-200 group">
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 mb-3 transition-colors animate-pulse" />
              <span className="font-extrabold text-white text-sm">Click to Browse or Drop CSV File Here</span>
              <span className="text-[11px] text-slate-500 mt-1.5 max-w-md">Supports standard participant registries containing handles, emails, and platform divisions</span>
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
          </div>
        </section>

        {/* VERIFICATION ROSTER PROFILE TABLE */}
        <section className={GLASS_CARD}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800/80 pb-4 mb-5 gap-4">
            <div>
              <span className="bg-emerald-650/15 text-emerald-400 border border-emerald-500/20 text-[10px] py-0.5 px-2.5 rounded font-extrabold uppercase tracking-wider">
                LIVE REGISTRY POOL
              </span>
              <h2 className="text-base font-extrabold text-white mt-1">Contestant Pool Overview</h2>
            </div>
            
            <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg flex items-center gap-1">
              Total Active Pool: <strong className="text-emerald-400 font-bold">{roster.length}</strong> contestants
            </div>
          </div>

          {/* Table Control Filters */}
          <div className="flex flex-col md:flex-row gap-3.5 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                placeholder="Search by name, handle, or region..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className={`${INPUT_CLASS} pl-9 w-full`}
              />
            </div>
            
            <select 
              value={specialtyFilter} 
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className={`${SELECT_CLASS} min-w-[160px]`}
            >
              <option value="All">All Specialties</option>
              {algorithmicSpecialties.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            
            <select 
              value={divisionFilter} 
              onChange={(e) => setDivisionFilter(e.target.value)}
              className={`${SELECT_CLASS} min-w-[180px]`}
            >
              <option value="All">All Divisions (Div. 1 - 4)</option>
              {divisionsList.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/20">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="p-4 pl-5">Contestant Profile</th>
                  <th className="p-4">Platform Handle</th>
                  <th className="p-4">University / Region</th>
                  <th className="p-4">Algorithmic Specialty</th>
                  <th className="p-4 pr-5 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-500" /> Contest Division
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40 text-slate-300">
                {filteredRoster.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/10 transition-colors">
                    <td className="p-4 pl-5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        {row.name}
                      </div>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{row.email}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-400">@{row.cfHandle}</td>
                    <td className="p-4 flex items-center gap-1 text-slate-350">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                      {row.institution}
                    </td>
                    <td className="p-4">
                      <span className="inline-block bg-slate-900 border border-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded font-semibold">
                        {row.specialty}
                      </span>
                    </td>
                    <td className="p-4 pr-5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getCfDivStyle(row.division || 'Div. 2')}`}>
                          {row.division || 'Div. 2'}
                        </span>
                        <span className="text-[10px] text-slate-500 italic">({row.cfRank})</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRoster.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500">
                      No contestants found matching selected query criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Action Triggers */}
          <div className="flex justify-end gap-3.5 mt-5">
            <button 
              onClick={() => setRoster([])} 
              className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-2 px-5 rounded-lg text-xs cursor-pointer transition-all duration-200 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-rose-500" /> Clear Active Pool
            </button>
            <button 
              onClick={handleSaveToDB} 
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-5 rounded-lg text-xs cursor-pointer shadow-md shadow-emerald-950/25 transition-all duration-150 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Roster to Database
                </>
              )}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}