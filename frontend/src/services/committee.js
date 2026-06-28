// â”€â”€â”€ /src/services/committee.js â”€â”€â”€
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('HackSmart_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ==========================================
// ðŸ¢ EVENT & ROSTER MANAGEMENT
// ==========================================

/**
 * Initialize Event Session Scope
 * Target: POST /api/v1/events
 */
export async function createEvent(eventData) {
  try {
    const { data } = await api.post('/api/v1/events', eventData);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to create an active event context on backend.'
    );
  }
}

/**
 * Upload Participant CSV File
 * Target: POST /api/v1/events/{event_id}/upload-csv
 */
export async function uploadParticipantsCsv(eventId, file) {
  if (!eventId) throw new Error('Missing active event context. Please re-login.');

  const formData = new FormData();
  formData.append('file', file);

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/upload-csv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Roster transmission failure.'
    );
  }
}

/**
 * Fetch Event Participant Roster Live
 * Target: GET /api/v1/events/{event_id}/participants
 */
export async function getParticipants(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id') || 'default_event';

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}/participants`);
    return data; 
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to retrieve active roster profiles from backend database.'
    );
  }
}

export const getParticipantRoster = getParticipants;

// ==========================================
// ðŸ› ï¸ TEAM FORMATION & AI ENGINE CONTROLLERS
// ==========================================

/**
 * Execute Optimization Engine for Team Formation
 * Target: POST /api/v1/events/{event_id}/form-teams
 */
export async function generateTeams(eventId, configPayload) {
  if (!eventId) throw new Error('Missing active event context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/form-teams`, configPayload);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to execute team formation engine optimization.'
    );
  }
}

/**
 * Scans for approved unanalyzed teams and dispatches them to Celery background workers.
 * Target: POST /api/v1/events/{event_id}/generate-db-rationales
 */
export async function generateDbRationales(eventId) {
  if (!eventId) throw new Error('Missing active event context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/generate-db-rationales`);
    return data; 
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to trigger background AI rationale generation.'
    );
  }
}

/**
 * Fetch All Teams for an Event
 */
export async function getTeams(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id') || 'default_event';

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}/teams`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to retrieve staging team structures from the backend.'
    );
  }
}

// ==========================================
// âœ… TEAM CARD STATE ACTIONS & APPROVALS
// ==========================================

/**
 * Single Card Level Approval Handler
 * Target: POST /api/v1/events/{event_id}/teams/{team_id}/approve
 */
export async function approveSingleTeam(eventId, teamId) {
  if (!eventId || !teamId) throw new Error('Missing event or team reference context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/teams/${teamId}/approve`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to update target team approval state.'
    );
  }
}

/**
 * Single Card Level Rejection Handler
 * Target: POST /api/v1/events/{event_id}/teams/{team_id}/reject
 */
export async function rejectSingleTeam(eventId, teamId) {
  if (!eventId || !teamId) throw new Error('Missing event or team reference context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/teams/${teamId}/reject`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to reject target team structural state.'
    );
  }
}

/**
 * Bulk Approve All Proposed Teams
 * Target: POST /api/v1/events/{event_id}/teams/approve-all
 */
export async function approveAllTeams(eventId) {
  if (!eventId) throw new Error('Missing active event context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/teams/approve-all`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to execute bulk approval pipeline.'
    );
  }
}

/**
 * Finalize Entire Stage & Snapshot Approved Teams into finalized_teams table
 * Target: POST /api/v1/events/{event_id}/approve-stage
 */
export async function approveEntireStage(eventId) {
  if (!eventId) throw new Error('Missing active event context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/approve-stage`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to submit entire stage approval data payload.'
    );
  }
}

/**
 * Fetches snapshot entries strictly populated inside the finalized database container.
 * Target: GET /api/v1/events/{event_id}/finalized-teams
 */
export async function getFinalizedTeams(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id') || 'default_event';

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}/finalized-teams`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to extract confirmed production team records.'
    );
  }
}

// ==========================================
// ðŸ“¢ DISPATCH SYSTEMS & COMMUNICATIONS
// ==========================================

/**
 * Dispatch Official Welcome Announcements Sequence via Celery
 * Target: POST /api/v1/events/{event_id}/send-announcements
 */
export async function sendTeamAnnouncements(eventId, payload = {}) {
  if (!eventId) throw new Error('Missing active event context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/send-announcements`, payload);
    return data; 
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to dispatch email communications sequence.'
    );
  }
}

// ==========================================
// âš–ï¸ SCORE ANOMALIES MANAGEMENT (ALIGNED WITH BACKEND)
// ==========================================

/**
 * Fetch all detected score anomalies for an event
 * Target: GET /api/v1/events/{event_id}/anomalies
 */
export async function getScoreAnomalies(eventId) {
  if (!eventId) throw new Error('Missing active event context.');
  try {
    const { data } = await api.get(`/api/v1/events/${eventId}/anomalies`);
    return data;
  } catch (error) {
    console.error("Failed fetching database anomalies array:", error);
    throw new Error(error.response?.data?.detail || 'Failed to retrieve system anomalies.');
  }
}

/**
 * Resolves a score anomaly via committee action override
 * Target: POST /api/v1/events/{event_id}/anomalies/{anomaly_id}/resolve
 */
export async function resolveScoreAnomaly(eventId, anomalyId, action, note = '') {
  if (!eventId || !anomalyId) throw new Error('Missing target context parameters.');
  
  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/anomalies/${anomalyId}/resolve`, {
      resolution_action: action, 
      committee_note: note       
    });
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to process anomaly resolution rules.'
    );
  }
}

/**
 * Escalates anomaly flag back to judge notification queues
 * Target: POST /api/v1/events/{event_id}/anomalies/{anomaly_id}/request-rescore
 */
export async function requestRescoreFromEvaluators(eventId, anomalyId) {
  if (!eventId || !anomalyId) throw new Error('Missing target context parameters.');
  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/anomalies/${anomalyId}/request-rescore`);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to dispatch escalation signals.');
  }
}

/**
 * Queries submitted scores and fetches live AI compliance reasoning summaries
 * Target: GET /api/v1/events/{event_id}/anomalies/summary/{team_id}
 */
export async function getAIDivergenceSummary(eventId, teamId) {
  if (!eventId || !teamId) throw new Error('Missing matrix target fields.');
  try {
    const { data } = await api.get(`/api/v1/events/${eventId}/anomalies/summary/${teamId}`);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch AI divergence metrics.');
  }
}

// ==========================================
// ðŸ“ˆ TELEMETRY ENDPOINTS
// ==========================================

/**
 * Fetch Live Dashboard Metrics Counter Summary
 */
export async function getCommitteeSummary(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id');
  const emptySummary = {
    totalParticipants: 0,
    pendingApprovals: 0,
    approvedTeams: 0,
    rejectedTeams: 0,
    evaluationStatus: '0%',
    evaluationOverview: {
      evaluated: 0,
      pending: 0,
      notStarted: 0,
      totalEvaluations: 0,
      overallPercent: 0,
    },
    judgeProgress: [],
    stages: [],
    communicationStatus: {
      delivered: 0,
      pending: 0,
      failed: 0,
      total: 0,
    },
    is_submission_open: false,
    anomaliesCount: 0,
  };

  if (!activeId || activeId === 'undefined') {
    return emptySummary;
  }

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}/summary`);
    return { ...emptySummary, ...data };
  } catch (error) {
    console.error("Summary fetch failure:", error);
    return emptySummary;
  }
}

export async function advanceCommitteeStage(eventId) {
  if (!eventId) throw new Error('Missing active event context to advance workflow stage.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/advance-stage`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to advance committee workflow stage.',
      { cause: error }
    );
  }
}

/** Committee Event Workflow Progress */
export async function getEventStages(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id');
  if (!activeId || activeId === 'undefined') return [];

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}/committee-stages`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch committee stages:", err);
    return [];
  }
}

export async function getDeliveryLogs(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id');
  if (!activeId || activeId === 'undefined') return [];

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}/delivery-logs`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Delivery log fetch failure:", error);
    return [];
  }
}

/**
 * Fetch Live Leaderboard Real-Time Array
 */
export async function getLeaderboard(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id');
  if (!activeId || activeId === 'undefined') return [];

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}/leaderboard`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Leaderboard transmission failure:", error);
    return [];
  }
}

/**
 * Fetch Pending Review Tasks Stream
 */
export async function getApprovalQueue(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id');
  if (!activeId || activeId === 'undefined') return [];

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}/approvals/pending`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Approvals queue fetch failure:", error);
    return [];
  }
}

/**
 * Fetch System Audit Logs Timeline
 */
export async function getActivityLog(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id');
  if (!activeId || activeId === 'undefined') return [];

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}/activity`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Activity log fetch failure:", error);
    return [];
  }
}

// ==========================================
// ðŸŽ“ MENTOR ALLOCATION MANAGEMENT
// ==========================================

/**
 * Maps a single card supervisor manual override update to a team.
 * Target: POST /api/v1/events/{event_id}/teams/{team_id}/assign-mentor
 */
export async function assignMentorToTeam(eventId, teamId, mentorPayload) {
  if (!eventId || !teamId) throw new Error('Missing event or team reference context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/teams/${teamId}/assign-mentor`, mentorPayload);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to commit manual mentor configuration override.'
    );
  }
}

/**
 * Freezes mentor allocations for the target stage context and locks the configuration.
 * Target: POST /api/v1/events/{event_id}/stages/mentors/finalize
 */
export async function finalizeMentorAllocations(eventId) {
  if (!eventId) throw new Error('Missing active event context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/stages/mentors/finalize`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to seal mentor staging allocations.'
    );
  }
}

/**
 * Polls current team formation stage status
 * Target: GET /api/v1/events/{event_id}/stage-status
 */
export async function getStageStatus(eventId) {
  if (!eventId) throw new Error('Missing active event context.');

  try {
    const { data } = await api.get(`/api/v1/events/${eventId}/stage-status`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to fetch current stage status.'
    );
  }
}

export async function uploadJudgesExpertiseCsv(eventId, file) {
  if (!eventId) throw new Error('Missing active event context parameters.');

  const formData = new FormData();
  formData.append('file', file);

  try {
    const { data } = await api.post(`/api/v1/committee/events/${eventId}/upload-judges-expertise`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to successfully route judges expertise vectors matrix.'
    );
  }
}

export async function toggleSubmissionPhase(eventId, isOpen) {
  if (!eventId) throw new Error('Missing active event context to toggle submission phase.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/toggle-submission?is_open=${isOpen}`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to update system lifecycle phase state.'
    );
  }
}

/**
 * Regenerate AI Rationale for a Single Team (Inline Staging)
 * Target: POST /api/v1/events/{event_id}/teams/{team_id}/rationale
 */
export async function generateSingleTeamRationale(eventId, teamId, payload) {
  if (!eventId || !teamId) throw new Error('Missing active event or team staging context.');

  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/ai-engine/teams/${teamId}/rationale`, payload);
    return data; 
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to trigger single team AI rationale generation.'
    );
  }
}

export const formTeams = generateTeams;

/**
 * Dispatches targeted announcements or leaderboard updates to a single team or all teams.
 */
export const sendTargetedAnnouncements = async (eventId, payload = {}) => {
  try {
    const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${BASE_URL}/api/v1/events/${eventId}/send-targeted-announcements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: payload.subject || null,
        body: payload.body || null,
        team_id: payload.teamId || null, 
        include_leaderboard_context: !!payload.includeLeaderboardContext, 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server responded with status code: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Targeted Announcement Endpoint Error:", error);
    throw error;
  }
};

// ==========================================
// âš¡ TEAM CHAT OPERATIONS INTERACTIVE TRACK
// ==========================================

/**
 * Fetch Chat Messages History
 * Target: GET /api/v1/chat/messages
 */
export async function fetchChatMessages(eventId, teamId, channel) {
  if (!eventId || !teamId || !channel) {
    throw new Error('Missing event_id, team_id or channel parameter contexts.');
  }
  try {
    const { data } = await api.get('/api/v1/chat/messages', {
      params: {
        event_id: eventId,
        team_id: teamId,
        channel: channel
      }
    });
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to retrieve active chat history segments.'
    );
  }
}

/**
 * Send a Live Chat Transmission Packet
 * Target: POST /api/v1/chat/send
 */
/**
 * Send a Live Chat Transmission Packet
 * Target: POST /api/v1/chat/send
 */
export async function sendChatMessage({ 
  eventId, 
  teamId, 
  participantId, 
  channel, 
  message, 
  senderName, 
  senderEmail,
  audio_url, 
  audioUrl,
  fileUrl,    // ðŸŽ¯ FIXED: Must destructure these parameters here!
  file_url,
  fileType,   
  file_type,
  fileName,   
  file_name
}) {
  try {
    const { data } = await api.post('/api/v1/chat/send', {
      event_id: eventId,
      team_id: teamId,
      participant_id: participantId,
      channel: channel,
      message: message,
      sender_name: senderName,
      sender_email: senderEmail,
      audio_url: audio_url || audioUrl || null, 
      
      // ðŸŽ¯ FIXED: Safeguarded mappings so nothing arrives empty
      file_url: file_url || fileUrl || null,     
      file_type: file_type || fileType || null,   
      file_name: file_name || fileName || null    
    });
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to successfully commit real-time chat payload trace.'
    );
  }
}
// ==========================================
// âš™ï¸ DYNAMIC WORKFLOW ENGINE
// ==========================================

export async function initWorkflow(eventId, eventType = 'hackathon') {
  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/workflow/init?event_type=${eventType}`);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to initialize workflow.');
  }
}

export async function getWorkflowState(eventId) {
  try {
    const { data } = await api.get(`/api/v1/events/${eventId}/workflow/state`);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch current workflow state.');
  }
}

export async function advanceWorkflow(eventId) {
  try {
    const { data } = await api.post(`/api/v1/events/${eventId}/workflow/advance`);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to advance workflow.');
  }
}
export async function getEventDetails(eventId) {
  const activeId = eventId || localStorage.getItem('current_event_id') || 'default_event';

  try {
    const { data } = await api.get(`/api/v1/events/${activeId}`);
    return data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 'Failed to retrieve event structural parameters.'
    );
  }
}
export default {
  createEvent,
  uploadParticipantsCsv,
  getParticipants,
  getParticipantRoster,
  generateTeams,
  formTeams,
  generateDbRationales,
  getTeams,
  approveSingleTeam,
  rejectSingleTeam,
  approveAllTeams,
  approveEntireStage,
  getFinalizedTeams,
  sendTeamAnnouncements,
  getScoreAnomalies,
  resolveScoreAnomaly,
  requestRescoreFromEvaluators,
  getAIDivergenceSummary,
  getCommitteeSummary,
  advanceCommitteeStage,
  getEventStages,
  getDeliveryLogs,
  getLeaderboard,
  getApprovalQueue,
  getActivityLog,
  assignMentorToTeam,
  finalizeMentorAllocations,
  getStageStatus,
  uploadJudgesExpertiseCsv,
  toggleSubmissionPhase,
  generateSingleTeamRationale,
  fetchChatMessages,
  sendChatMessage,
  getEventDetails,
};
