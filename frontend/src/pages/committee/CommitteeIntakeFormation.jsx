import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CommitteeLayout from '../../components/layout/CommitteeLayout'

// Safe Import Fallback: Attempts named imports, but catches module architecture variants safely
import * as CommitteeServices from '../../services/committee'

// System Split: Only first name, last name, and email are strictly required for account integrity
const strictlyRequiredColumns = ['first_name', 'last_name', 'email']
const allSupportedColumns = ['first_name', 'last_name', 'email', 'phone', 'institution', 'skill_tags', 'experience_level', 'domain']
const validLevels = ['Beginner', 'Intermediate', 'Advanced']

// 🎬 Automated Runtime Animation Injector for Intake & Formation Pipeline
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = `
    @keyframes panelEntrance {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseBackground {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .animate-panel-stack {
      animation: panelEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .csv-dropzone-interactive {
      transition: all 0.2s ease-in-out;
      border: 2px dashed var(--border-color);
    }
    .csv-dropzone-interactive:hover {
      border-color: var(--accent-color);
      background: var(--bg-secondary);
      transform: scale(0.995);
    }
    .engine-section-row {
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .engine-section-row:focus-within {
      border-color: var(--accent-color) !important;
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }
    .pipeline-toast-active {
      background: linear-gradient(-45deg, #0284c7, #0f172a, #0369a1, #1e1b4b);
      background-size: 400% 400%;
      animation: pulseBackground 12s ease infinite, panelEntrance 0.2s ease-out;
    }
  `;
  document.head.appendChild(styleTag);
}

function splitCsvLine(line) {
  const values = []
  let current = ''
  let quoted = false
  for (const char of line) {
    if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
    } else current += char
  }
  values.push(current.trim())
  return values
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return { rows: [], invalidRows: [{ row: 1, errors: ['CSV must include a header and at least one participant'] }] }

  const headers = splitCsvLine(lines[0])
  const headerIndex = Object.fromEntries(headers.map((header, index) => [header.toLowerCase().trim(), index]))
  
  // Verify strictly required architectural indices exist
  const missingColumns = strictlyRequiredColumns.filter((column) => headerIndex[column.toLowerCase()] === undefined)

  if (missingColumns.length > 0) {
    return { rows: [], invalidRows: [{ row: 1, errors: [`Missing strictly required columns: ${missingColumns.join(', ')}`] }] }
  }

  const rows = []
  const invalidRows = []

  lines.slice(1).forEach((line, index) => {
    const values = splitCsvLine(line)
    const rowNumber = index + 2
    
    // Helper helper to handle optional field maps without throwing runtime index breaks
    const getSafeValue = (columnName) => {
      const idx = headerIndex[columnName.toLowerCase()];
      return idx !== undefined && values[idx] ? values[idx].trim() : '';
    }

    const participant = {
      firstName: getSafeValue('first_name'),
      lastName: getSafeValue('last_name'),
      name: `${getSafeValue('first_name')} ${getSafeValue('last_name')}`.trim(),
      email: getSafeValue('email'),
      phone: getSafeValue('phone'),
      institution: getSafeValue('institution') || 'Not Specified',
      skills: getSafeValue('skill_tags') ? getSafeValue('skill_tags').split(',').map((skill) => skill.trim()).filter(Boolean) : [],
      level: getSafeValue('experience_level') || 'Intermediate',
      domain: getSafeValue('domain') || 'General',
    }

    const errors = []
    if (!participant.firstName || !participant.lastName) errors.push('Missing name fields')
    if (!participant.email || !participant.email.includes('@')) errors.push('Invalid or missing email')
    
    // Normalize and supply optional defaults for Experience Levels instead of breaking validation flow
    if (participant.level) {
      const formattedLevel = participant.level.charAt(0).toUpperCase() + participant.level.slice(1).toLowerCase();
      if (validLevels.includes(formattedLevel)) {
        participant.level = formattedLevel;
      } else {
        participant.level = 'Intermediate'; 
      }
    } else {
      participant.level = 'Intermediate';
    }

    if (errors.length > 0) {
      invalidRows.push({ row: rowNumber, name: participant.name || 'Unknown', errors })
    } else {
      rows.push(participant)
    }
  })

  return { rows, invalidRows }
}

export default function CommitteeIntakeFormation() {
  const navigate = useNavigate()
  const [fileObject, setFileObject] = useState(null)
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [invalidRows, setInvalidRows] = useState([])
  const [importedRoster, setImportedRoster] = useState([])
  const [toast, setToast] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [institutionFilter, setInstitutionFilter] = useState('All')
  const [levelFilter, setLevelFilter] = useState('All')
  const [domainFilter, setDomainFilter] = useState('All') 
  const [page, setPage] = useState(1)

  const [teamSize, setTeamSize] = useState(4)
  const [randomizationFactor, setRandomizationFactor] = useState(20)
  const [requireMixedSkills, setRequireMixedSkills] = useState(true)
  const [minDevelopers, setMinDevelopers] = useState(1)
  const [minDesigners, setMinDesigners] = useState(1)
  const [minBusiness, setMinBusiness] = useState(1)
  const [balanceExperience, setBalanceExperience] = useState(true)
  const [maxExperts, setMaxExperts] = useState(1)
  const [minBeginners, setMinBeginners] = useState(1)
  const [equalizeAvgExp, setEqualizeAvgExp] = useState(false)
  const [institutionLimitEnabled, setInstitutionLimitEnabled] = useState(false)
  const [maxPerInstitution, setMaxPerInstitution] = useState(2)
  const [genderDiversityRule, setGenderDiversityRule] = useState('prefer-mixed')
  const [matchInterests, setMatchInterests] = useState(true)
  const [matchingPriority, setMatchingPriority] = useState('problem-statement')
  const [selectedTracks, setSelectedTracks] = useState({
    Healthcare: true,
    FinTech: true,
    Sustainability: true,
    Cybersecurity: true,
  })

  const [constraints, setConstraints] = useState([{ id: 1, type: 'Must-Include Pair', first: '', second: '' }])

  const api = useMemo(() => {
    const directFetch = CommitteeServices.getParticipants || CommitteeServices.getParticipantRoster;
    const directUpload = CommitteeServices.uploadParticipantsCsv;
    const directGenerate = CommitteeServices.generateTeams || CommitteeServices.formTeams;
    const directRationales = CommitteeServices.generateDbRationales;
    const directStatus = CommitteeServices.getStageStatus;

    const fallbackFetch = CommitteeServices.default?.getParticipants || CommitteeServices.default?.getParticipantRoster;
    const fallbackUpload = CommitteeServices.default?.uploadParticipantsCsv;
    const fallbackGenerate = CommitteeServices.default?.generateTeams || CommitteeServices.default?.formTeams;
    const fallbackRationales = CommitteeServices.default?.generateDbRationales;
    const fallbackStatus = CommitteeServices.default?.getStageStatus;

    return {
      getParticipants: directFetch || fallbackFetch || null,
      uploadParticipantsCsv: directUpload || fallbackUpload || null,
      generateTeams: directGenerate || fallbackGenerate || null,
      generateDbRationales: directRationales || fallbackRationales || null,
      getStageStatus: directStatus || fallbackStatus || null
    };
  }, []);

  useEffect(() => {
    const currentEventId = localStorage.getItem('current_event_id') || 'default_event'

    async function loadExistingRoster() {
      if (!api.getParticipants) {
        console.warn("Could not map 'getParticipants' from service module exports. Running layout in manual draft mode.");
        return;
      }

      try {
        setIsUploading(true)
        const response = await api.getParticipants(currentEventId, { limit: 1000 })
        
        if (response && Array.isArray(response) && response.length > 0) {
          const normalizedData = response.map((dbItem, idx) => {
            const safeEmail = dbItem.email || dbItem.email_id || `assigned_fallback_${idx}@system.local`
            const fName = dbItem.first_name || dbItem.firstName || ''
            const lName = dbItem.last_name || dbItem.lastName || ''

            return {
              firstName: fName,
              lastName: lName,
              name: dbItem.name || `${fName} ${lName}`.trim() || `Participant ${idx + 1}`,
              email: safeEmail,
              phone: dbItem.phone || dbItem.phone_number || '',
              institution: dbItem.institution || dbItem.college || 'Not Specified',
              skills: Array.isArray(dbItem.skill_tags) 
                ? dbItem.skill_tags 
                : (dbItem.skill_tags || '').split(',').map(s => s.trim()).filter(Boolean),
              level: dbItem.experience_level || dbItem.level || 'Intermediate',
              domain: dbItem.domain || 'General'
            }
          })

          setImportedRoster(normalizedData)
          setParsedRows(normalizedData) 
        } else {
          setImportedRoster([])
          setParsedRows([])
        }
      } catch (error) {
        console.error('Error fetching roster data from database:', error)
      } finally {
        setIsUploading(false)
      }
    }

    loadExistingRoster()
  }, [api])

  const imported = importedRoster.length > 0
  const roster = imported ? importedRoster : parsedRows

  const institutions = useMemo(() => {
    const uniqueNames = new Set(roster.map((row) => {
      const inst = row.institution?.trim() || 'Not Specified';
      return inst.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }));
    return ['All', ...uniqueNames];
  }, [roster]);

  const domains = useMemo(() => {
    const uniqueDomains = new Set(roster.map((row) => {
      return (row.domain?.trim() || 'General').toUpperCase();
    }));
    return ['All', ...uniqueDomains];
  }, [roster]);
  
  const filteredRoster = useMemo(() => {
    const searchNormalized = search.toLowerCase().trim();
    
    const filtered = roster.filter((row) => {
      const matchesSearch = !searchNormalized || 
        row.name.toLowerCase().includes(searchNormalized) ||
        row.email.toLowerCase().includes(searchNormalized) ||
        row.institution.toLowerCase().includes(searchNormalized) ||
        row.domain.toLowerCase().includes(searchNormalized);

      const matchesInstitution = institutionFilter === 'All' || 
        row.institution.toLowerCase().trim() === institutionFilter.toLowerCase().trim();
        
      const matchesLevel = levelFilter === 'All' || 
        row.level.toLowerCase().trim() === levelFilter.toLowerCase().trim();

      const matchesDomain = domainFilter === 'All' ||
        row.domain.toLowerCase().trim() === domainFilter.toLowerCase().trim();
        
      return matchesSearch && matchesInstitution && matchesLevel && matchesDomain;
    });

    return [...filtered].sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true });
    });
  }, [institutionFilter, levelFilter, domainFilter, roster, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / 10))
  const currentPage = page > totalPages ? totalPages : page;
  const visibleRows = filteredRoster.slice((currentPage - 1) * 10, currentPage * 10)

  function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) return
    setFileObject(file)
    setFileName(file.name)
    file.text().then((text) => {
      const result = parseCsv(text)
      setParsedRows(result.rows)
      setInvalidRows(result.invalidRows)
      setImportedRoster([])
      setPage(1)
    })
  }

  function clearFile() {
    setFileObject(null)
    setFileName('')
    setParsedRows([])
    setInvalidRows([])
    setImportedRoster([])
    setPage(1)
    setConstraints([])
  }

  async function handleResetWorkspace() {
    if (!window.confirm("WARNING: This will permanently delete all participants, teams, evaluators, scores, and reset all pipeline stages to the beginning. Are you sure you want to start over?")) {
      return
    }
    
    const currentEventId = localStorage.getItem('current_event_id') || 'default_event'
    try {
      setToast('Wiping database active workspace matrices...')
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${baseURL}/api/v1/events/${currentEventId}/reset-workspace`, {
        method: 'POST'
      })
      if (response.ok) {
        setParsedRows([])
        setImportedRoster([])
        setInvalidRows([])
        setFileName('')
        setToast('Workspace successfully reset. Roster cleared.')
        setTimeout(() => window.location.reload(), 1200)
      } else {
        const err = await response.json()
        setToast(`Reset failed: ${err.detail || 'Server error'}`)
      }
    } catch (err) {
      console.error(err)
      setToast('Network error during reset workspace transaction.')
    }
  }

  async function confirmImport() {
    if (!fileObject) return
    if (!api.uploadParticipantsCsv) {
      setToast('System error: Upload service is not configured correctly.')
      return;
    }

    const currentEventId = localStorage.getItem('current_event_id') || 'default_event'

    try {
      setIsUploading(true)
      setToast('Uploading raw file schema records into FastAPI database context...')
      await api.uploadParticipantsCsv(currentEventId, fileObject)
      setImportedRoster(parsedRows)
      setToast('Roster safely processed and imported to remote backend databases!')
    } catch (error) {
      console.error('FastAPI Roster Intake Sync Error:', error)
      setToast(`Ingest failure: ${error.message || 'Check database connection profiles.'}`)
    } finally {
      setIsUploading(false)
      window.setTimeout(() => setToast(''), 3500)
    }
  }

  function updateConstraint(id, field, value) {
    setConstraints((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }

  function addConstraint() {
    setConstraints((items) => [...items, { id: Date.now(), type: 'Must-Include Pair', first: '', second: '' }])
  }

  const toggleTrack = (track) => {
    setSelectedTracks(prev => ({ ...prev, [track]: !prev[track] }))
  }

  const handleGenerateTeams = async () => {
    if (isGenerating) return;
    if (!api.generateTeams) {
      setToast('Configuration error: Generation engine method is not registered.');
      return;
    }

    const currentEventId = localStorage.getItem('current_event_id') || 'default_event';
    setIsGenerating(true);
    setToast('');

    const configPayload = {
      team_size: parseInt(teamSize, 10) || 4,
      label: `Committee Custom Run (${new Date().toLocaleTimeString()})`,
      institutionLimitEnabled: !!institutionLimitEnabled,
      max_per_institution: institutionLimitEnabled ? (parseInt(maxPerInstitution, 10) || 1) : null,
      skills: {
        enabled: !!requireMixedSkills,
        minDevelopers: requireMixedSkills ? (parseInt(minDevelopers, 10) || 0) : 0,
        minDesigners: requireMixedSkills ? (parseInt(minDesigners, 10) || 0) : 0,
        minBusiness: requireMixedSkills ? (parseInt(minBusiness, 10) || 0) : 0
      },
      experience: {
        enabled: !!balanceExperience,
        maxExperts: balanceExperience ? (parseInt(maxExperts, 10) || 4) : (parseInt(teamSize, 10) || 4),
        minBeginners: balanceExperience ? (parseInt(minBeginners, 10) || 0) : 0
      }
    };

    try {
      await api.generateTeams(currentEventId, configPayload);

      if (api.generateDbRationales) {
        await api.generateDbRationales(currentEventId);
      }

      setToast('');
      
      setTimeout(() => {
        setIsGenerating(false);
        setToast('');
        navigate('/committee/team-review', { state: { configurations: configPayload } });
      }, 800);

    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Unknown allocation failure.';
      setToast(`Formation Error: ${errorMessage}`);
      setIsGenerating(false);
      window.setTimeout(() => setToast(''), 4000);
    }
  };
  
  const tagStyle = (type) => {
    const classes = {
      core: 'status-pill info',
      skills: 'status-pill success',
      experience: 'status-pill purple',
      diversity: 'status-pill warning',
      interest: 'status-pill danger',
      hard: 'status-pill'
    }
    return classes[type] || classes.hard
  }

  return (
    <CommitteeLayout statusItems={[{ label: 'Roster', value: roster.length > 0 ? 'Imported' : 'Draft' }]} pageTitle="Intake & Formation" pageSubtitle="Import participants and configure formation rules.">
      <div className="committee-reference-dashboard team-review-page">

        {toast && (
          <div className="pipeline-toast pipeline-toast-active" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, padding: '14px 24px', borderRadius: '8px', color: '#ffffff', boxShadow: '0 12px 32px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', fontWeight: 500 }}>
            {toast}
          </div>
        )}

        <div className="pipeline-page-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <section className="committee-card animate-panel-stack" style={{ animationDelay: '0.05s', padding: '24px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div className="ref-section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <span className={tagStyle('core')} style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', fontWeight: 700, padding: '4px 8px' }}>Step 1: Data Integration</span>
              <h3 style={{ marginTop: '8px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Participant Roster</h3>
            </div>
            
            {roster.length === 0 && !isUploading ? (
              <label className="csv-dropzone csv-dropzone-interactive" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', borderRadius: '10px', cursor: 'pointer', background: 'var(--bg-secondary-opaque, rgba(0,0,0,0.01))', marginBottom: '16px' }}>
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(event) => handleFile(event.target.files?.[0])} />
                <span style={{ fontSize: '28px', marginBottom: '8px' }}>📊</span>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Drop CSV here or browse</strong>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Accepts standard production .csv configurations</span>
              </label>
            ) : roster.length > 0 && (
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '12px 18px', backgroundColor: imported ? 'rgba(56, 189, 248, 0.08)' : 'rgba(16, 185, 129, 0.08)', 
                border: imported ? '1px solid var(--status-info)' : '1px solid var(--status-success)', 
                borderRadius: '8px', margin: '0 0 20px 0', transition: 'all 0.2s ease'
              }}>
                <div>
                  <strong style={{ color: imported ? '#0284c7' : '#10b981', display: 'block', fontSize: '13px', fontWeight: '600' }}>
                    {imported ? '✓ System Database Sync Active' : `✓ ${fileName} Loaded`}
                  </strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                    {imported 
                      ? `${importedRoster.length} participants loaded live into pipeline storage.` 
                      : `${parsedRows.length} rows verified and ready to commit.`}
                  </span>
                </div>
                {imported ? (
                  <button 
                    type="button"
                    onClick={handleResetWorkspace}
                    className="committee-btn committee-btn-danger"
                    style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  >
                    Reset Workspace
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={clearFile}
                    className="committee-btn committee-btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  >
                    Clear File
                  </button>
                )}
              </div>
            )}

            <details className="format-guide" style={{ marginBottom: '16px', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'all 0.2s ease' }}>
              <summary style={{ fontWeight: '500', color: 'var(--text-secondary)', fontSize: '12px', outline: 'none' }}>Expected Data Structure Fields</summary>
              <ul style={{ marginTop: '12px', paddingLeft: '0', listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' }}>
                {allSupportedColumns.map((col) => (
                  <li key={col} style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', color: 'var(--text-primary)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center' }}>{col}</li>
                ))}
              </ul>
            </details>

            {!imported && (parsedRows.length > 0 || invalidRows.length > 0) && invalidRows.length > 0 && (
              <div className="validation-panel" style={{ marginBottom: '16px', border: '1px solid var(--status-danger)', borderRadius: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.06)' }}>
                <div className="validation-stats" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Schema Context: <strong>{parsedRows.length + invalidRows.length}</strong></span>
                  <span className="status-pill success" style={{ fontSize: '11px', padding: '3px 8px' }}>Valid: {parsedRows.length}</span>
                  <span className="status-pill danger" style={{ fontSize: '11px', padding: '3px 8px' }}>Errors: {invalidRows.length}</span>
                </div>
              </div>
            )}

            {!imported && parsedRows.length > 0 && invalidRows.length === 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <button 
                  className="committee-btn committee-btn-primary" 
                  type="button" 
                  disabled={isUploading} 
                  onClick={confirmImport}
                  style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '6px', fontWeight: 500, transition: 'all 0.15s ease' }}
                >
                  {isUploading ? 'Transmitting Matrix...' : 'Confirm & Save Roster'}
                </button>
              </div>
            )}

            {roster.length > 0 && (
              <div className="roster-section" style={{ marginTop: '16px' }}>
                <div className="table-controls" style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <input className="committee-input" style={{ flex: 2, minWidth: '200px', transition: 'all 0.15s ease' }} placeholder="Search workspace roster metrics..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
                  
                  <select className="committee-select" style={{ flex: 1, minWidth: '130px', transition: 'all 0.15s ease' }} value={domainFilter} onChange={(event) => { setDomainFilter(event.target.value); setPage(1) }}>
                    <option value="All">All Domains</option>
                    {domains.filter(d => d !== 'ALL').map((domain) => <option key={domain} value={domain}>{domain}</option>)}
                  </select>

                  <select className="committee-select" style={{ flex: 1, minWidth: '130px', transition: 'all 0.15s ease' }} value={institutionFilter} onChange={(event) => { setInstitutionFilter(event.target.value); setPage(1) }}>
                    {institutions.map((institution) => <option key={institution} value={institution}>{institution}</option>)}
                  </select>
                </div>
                
                <div className="committee-table-wrap" style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table className="committee-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Domain</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((row, index) => (
                        <tr key={`${row.email}-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ fontWeight: '500', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)' }}>{row.name}</td>
                          <td style={{ color: 'var(--text-secondary)', padding: '10px 12px', fontSize: '13px' }}>{row.email}</td>
                          <td style={{ padding: '10px 12px' }}><span className="status-pill info" style={{ fontSize: '11px', padding: '2px 6px' }}>{row.domain}</span></td>
                          <td style={{ color: 'var(--text-secondary)', padding: '10px 12px', fontSize: '13px' }}>{row.level}</td>
                        </tr>
                      ))}
                      {visibleRows.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>No workspace participants match criteria.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '12px', alignItems: 'center' }}>
                    <button type="button" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="committee-btn committee-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }}>Prev</button>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</span>
                    <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="committee-btn committee-btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }}>Next</button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="committee-card animate-panel-stack" style={{ animationDelay: '0.12s', padding: '24px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div className="ref-section-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <span className={tagStyle('core')} style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', fontWeight: 700, padding: '4px 8px' }}>Step 2: Configuration</span>
              <h3 style={{ marginTop: '8px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Team Formation Engine</h3>
            </div>
            
            <div className="formation-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div className="engine-section-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label className="committee-label" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Target Configuration Team Size
                  <input className="committee-input" type="number" min="2" max="10" value={teamSize} onChange={(e) => setTeamSize(parseInt(e.target.value) || 4)} style={{ width: '100%', boxSizing: 'border-box' }} />
                </label>
                
                <label className="committee-label" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Algorithmic Diversity Buffer</span>
                    <strong style={{ color: 'var(--accent-color)', fontSize: '13px' }}>{randomizationFactor}%</strong>
                  </div>
                  <input style={{ marginTop: '8px', cursor: 'pointer', width: '100%' }} type="range" min="0" max="50" step="5" value={randomizationFactor} onChange={(e) => setRandomizationFactor(parseInt(e.target.value))} />
                </label>
              </div>

              <div className="engine-section-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label className="committee-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={requireMixedSkills} 
                    onChange={(e) => setRequireMixedSkills(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                  />
                  Enforce cross-functional structural roles
                </label>
                
                {requireMixedSkills && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginTop: '4px' }}>
                    <label className="committee-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Min Developers
                      <input className="committee-input" type="number" min="0" value={minDevelopers} onChange={(e) => setMinDevelopers(parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
                    </label>
                    <label className="committee-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Min Designers
                      <input className="committee-input" type="number" min="0" value={minDesigners} onChange={(e) => setMinDesigners(parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
                    </label>
                    <label className="committee-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Min Business
                      <input className="committee-input" type="number" min="0" value={minBusiness} onChange={(e) => setMinBusiness(parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
                    </label>
                  </div>
                )}
              </div>

              <div className="engine-section-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label className="committee-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={balanceExperience} 
                    onChange={(e) => setBalanceExperience(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                  />
                  Balance tier vectors dynamically (Experience Levels)
                </label>
                
                {balanceExperience && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '4px' }}>
                    <label className="committee-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Max Experts per Team
                      <input className="committee-input" type="number" min="0" value={maxExperts} onChange={(e) => setMaxExperts(parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
                    </label>
                    <label className="committee-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Min Beginners per Team
                      <input className="committee-input" type="number" min="0" value={minBeginners} onChange={(e) => setMinBeginners(parseInt(e.target.value) || 0)} style={{ width: '100%' }} />
                    </label>
                  </div>
                )}
              </div>

              <div className="engine-section-row" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label className="committee-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={institutionLimitEnabled} 
                    onChange={(e) => setInstitutionLimitEnabled(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                  />
                  Limit participants from the same institution
                </label>
                
                {institutionLimitEnabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '4px' }}>
                    <label className="committee-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Maximum capacity per institution
                      <input className="committee-input" type="number" min="1" value={maxPerInstitution} onChange={(e) => setMaxPerInstitution(parseInt(e.target.value) || 1)} style={{ width: '100%' }} />
                    </label>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  onClick={handleGenerateTeams}
                  disabled={isGenerating || roster.length === 0}
                  className="committee-btn committee-btn-primary"
                  style={{ 
                    padding: '12px 24px', 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    borderRadius: '8px', 
                    cursor: (isGenerating || roster.length === 0) ? 'not-allowed' : 'pointer',
                    opacity: (isGenerating || roster.length === 0) ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    background: 'var(--accent-color, #0284c7)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                  }}
                >
                  {isGenerating ? 'Compiling Matrices...' : 'Generate Teams'}
                </button>
              </div>

            </div>
          </section>
        </div>
      </div>
    </CommitteeLayout>
  )
}