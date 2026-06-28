import { Navigate, Route, Routes, useSearchParams, useNavigate, useParams, Outlet } from 'react-router-dom'
import { useEffect } from 'react'

// --- CORE FRAMEWORK IMPORTS ---
import ProtectedRoute from './components/common/ProtectedRoute'
import AdminRoute from './components/common/AdminRoute'
import AccessDenied from './pages/AccessDenied'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import LinkExpired from './pages/LinkExpired'
import AuthCallback from './pages/AuthCallback'

// --- âš¡ NEW UNIFIED DYNAMIC PIPELINE ENGINE ---
import DynamicTestLayout from './pages/dynamic/DynamicTestLayout'
import DynamicComponentSelector from './pages/dynamic/DynamicComponentSelector'
import DynamicParticipantPortal from './pages/dynamic/DynamicParticipantPortal'
import DynamicEvaluatorPortal from './pages/dynamic/DynamicEvaluatorPortal'
import DynamicGateway from './pages/dynamic/DynamicGateway'

// --- ðŸ† SPORTS TRACK (isolated under /dynamic/sports) ---
import SportsOverview from './pages/dynamic/sports/participant/SportsOverview'
import SportsBracket from './pages/dynamic/sports/participant/SportsBracket'
import SportsRoster from './pages/dynamic/sports/participant/SportsRoster'
import SportsMatchCenter from './pages/dynamic/sports/participant/SportsMatchCenter'
import SportsEvaluatorQueue from './pages/dynamic/sports/evaluator/SportsEvaluatorQueue'
import EventInitialization from './pages/dynamic/sports/EventInitialization'
import CommunicationHub from './pages/dynamic/sports/CommunicationHub'

// --- ðŸ›ï¸ DEBATE SANDBOX TRACK VIEWS ---
import DebateDashboard from './pages/dynamic/debate/DebateDashboard'
import DebateIntakeFormation from './pages/dynamic/debate/DebateIntakeFormation'
import DebateTeamReview from './pages/dynamic/debate/DebateTeamReview'
import DebateAnomalies from './pages/dynamic/debate/DebateAnomalies'
import DebateResults from './pages/dynamic/debate/DebateResults'
import DebateCommunications from './pages/dynamic/debate/DebateCommunications'

// --- ðŸ›ï¸ STANDARD PRODUCTION TRACK VIEWS ---
import CommitteeSetup from './pages/committee/CommitteeSetup'
import CommitteeDashboard from './pages/committee/CommitteeDashboard'
import CommitteeIntakeFormation from './pages/committee/CommitteeIntakeFormation'
import CommitteeTeamReview from './pages/committee/CommitteeTeamReview'
import CommitteeAssignMentors from './pages/committee/CommitteeAssignMentors'
import CommitteeUploadJudges from './pages/committee/CommitteeUploadJudges'
import CommitteeApprovals from './pages/committee/CommitteeApprovals'
import CommitteeCommunications from './pages/committee/CommitteeCommunications'
import CommitteeOrchestration from './pages/committee/CommitteeOrchestration'
import CommitteeEvaluations from './pages/committee/CommitteeEvaluations'
import CommitteeAnomalies from './pages/committee/CommitteeAnomalies'
import CommitteeResults from './pages/committee/CommitteeResults'
import ConfigAgentPage from "./pages/committee/CommitteeAgent"
import CommitteeSettings from './pages/committee/CommitteeSettings'
import CommitteeGrievances from './pages/committee/CommitteeGrievances'
import CommitteeActivityLogs from './pages/committee/CommitteeActivityLogs'
import CommitteeParticipants from './pages/committee/CommitteeParticipants'
import CommitteeTeamConfig from './pages/committee/CommitteeTeamConfig'
import CommitteeGeneratedTeams from './pages/committee/CommitteeGeneratedTeams'
import BillingPage from './pages/committee/CommitteeBilling'

// --- EVALUATOR & PARTICIPANT VIEWS ---
import EvaluatorDashboard from './pages/evaluator/EvaluatorDashboard'
import EvaluatorEvaluations from './pages/evaluator/EvaluatorEvaluations'
import EvaluatorAssignments from './pages/evaluator/EvaluatorAssignments'
import EvaluatorWorkspace from './pages/evaluator/EvaluatorWorkspace'
import EvaluatorHistory from './pages/evaluator/EvaluatorHistory'
import EvaluatorFeedback from './pages/evaluator/EvaluatorFeedback'
import EvaluatorAISummary from './pages/evaluator/EvaluatorAISummary'
import EvaluatorProfile from './pages/evaluator/EvaluatorProfile'
import EvaluatorGuidelines from './pages/evaluator/EvaluatorGuidelines'
import EvaluatorCalibration from './pages/evaluator/EvaluatorCalibration'

import ParticipantAnnouncements from './pages/participant/ParticipantAnnouncements'
import ParticipantAssistant from './pages/participant/ParticipantAssistant'
import ParticipantDashboard from './pages/participant/ParticipantDashboard'
import ParticipantEventJourney from './pages/participant/ParticipantEventJourney'
import ParticipantMyTeam from './pages/participant/ParticipantMyTeam'
import ParticipantProfile from './pages/participant/ParticipantProfile'
import ParticipantSubmissions from './pages/participant/ParticipantSubmissions'
import ParticipantResultsProgress from './pages/participant/ParticipantResultsProgress'
import ParticipantSmartChat from './pages/participant/ParticipantSmartChat'
import ParticipantHelp from './pages/participant/ParticipantHelp'

// --- RECOVERY ENTRY ROUTE UTILITY ---
function TokenEntry({ redirectTo }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      localStorage.setItem('HackSmart_token', token)
      localStorage.removeItem('HackSmart_mock_role')

      try {
        const payload = token.split('.')[1]
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
        if (decoded?.event_id) {
          localStorage.setItem('current_event_id', decoded.event_id)
          localStorage.setItem('event_id', decoded.event_id)
        }
      } catch {
        // Fallback for non-JWT tokens
      }
    }
    navigate(redirectTo, { replace: true })
  }, [searchParams, navigate, redirectTo])

  return null
}

// --- âš¡ DYNAMIC PIPELINE PARAMETER WRAPPER ---
function DynamicRouteWrapper() {
  const { componentKey } = useParams();
  return <DynamicComponentSelector componentKey={componentKey} />;
}

// --- ðŸŒ™ DYNAMIC TRACK THEME BOUNDARY ---
// Forces the dark theme across the ENTIRE dynamic track (sandbox + dynamic
// participant/evaluator + sports) so these pages keep their original dark look,
// regardless of the global light theme. The user's saved theme preference is
// left untouched and restored automatically when leaving the dynamic track.
function DynamicThemeBoundary() {
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.getAttribute('data-theme');
    const prevHadDarkClass = root.classList.contains('dark');
    root.setAttribute('data-theme', 'dark');
    root.classList.add('dark');
    return () => {
      if (prevTheme) root.setAttribute('data-theme', prevTheme);
      else root.removeAttribute('data-theme');
      if (!prevHadDarkClass) root.classList.remove('dark');
    };
  }, []);
  return <Outlet />;
}

// --- ðŸ† SPORTS PORTAL INDEX REDIRECT â€” carries :eventId through to the default tab ---
function SportsPortalIndexRedirect({ to }) {
  const { eventId } = useParams();
  return <Navigate to={eventId ? `${to}/${eventId}` : to} replace />;
}

function App() {
  return (
    <Routes>
      {/* OPEN ENTRY PASSES */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/access-denied" element={<AccessDenied />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/link-expired" element={<LinkExpired />} />
      <Route path="/committee/setup" element={<CommitteeSetup />} />

      {/* =========================================================
          âš¡ DYNAMIC RUNTIME PORTALS â€” participant submission + evaluator
          scoring, both driven by GET /api/dynamic/event/:id. Open entry
          (magic-link style); event id comes from the URL or localStorage.
          ========================================================= */}
      {/* ðŸŒ™ All dynamic-track routes are wrapped so they render in dark theme */}
      <Route element={<DynamicThemeBoundary />}>
      <Route path="/dynamic/participant" element={<DynamicGateway role="participant" genericComponent={DynamicParticipantPortal} />} />
      <Route path="/dynamic/participant/:eventId" element={<DynamicGateway role="participant" genericComponent={DynamicParticipantPortal} />} />
      <Route path="/dynamic/evaluator" element={<DynamicGateway role="evaluator" genericComponent={DynamicEvaluatorPortal} />} />
      <Route path="/dynamic/evaluator/:eventId" element={<DynamicGateway role="evaluator" genericComponent={DynamicEvaluatorPortal} />} />

      {/* =========================================================
          ðŸ† DYNAMIC SPORTS TRACK â€” full multi-page participant/evaluator
          portals for sports_tournament events, reached transparently via
          DynamicGateway above. Isolated from /participant, /evaluator and
          /committee; built on /api/dynamic + /api/dynamic/sports.
          ========================================================= */}
      <Route path="/dynamic/sports/participant" element={<Navigate to="/dynamic/sports/participant/overview" replace />} />
      <Route path="/dynamic/sports/participant/:eventId" element={<SportsPortalIndexRedirect to="/dynamic/sports/participant/overview" />} />
      <Route path="/dynamic/sports/participant/overview" element={<SportsOverview />} />
      <Route path="/dynamic/sports/participant/overview/:eventId" element={<SportsOverview />} />
      <Route path="/dynamic/sports/participant/bracket" element={<SportsBracket />} />
      <Route path="/dynamic/sports/participant/bracket/:eventId" element={<SportsBracket />} />
      <Route path="/dynamic/sports/participant/roster" element={<SportsRoster />} />
      <Route path="/dynamic/sports/participant/roster/:eventId" element={<SportsRoster />} />
      <Route path="/dynamic/sports/participant/matches" element={<SportsMatchCenter />} />
      <Route path="/dynamic/sports/participant/matches/:eventId" element={<SportsMatchCenter />} />

      <Route path="/dynamic/sports/evaluator" element={<SportsEvaluatorQueue />} />
      <Route path="/dynamic/sports/evaluator/:eventId" element={<SportsEvaluatorQueue />} />

      {/* =========================================================
          âš¡ THE DYNAMIC WORKFLOW TESTING PIPELINE (DATABASE METRICS)
          ========================================================= */}
      <Route element={<ProtectedRoute allowedRoles={['dynamic-committee']} />}>
        <Route path="/dynamic-test" element={<DynamicTestLayout />}>
          {/* Default redirect is now the Dashboard Overview Panel */}
          <Route index element={<Navigate to="dynamic-dashboard" replace />} />    
          
          {/* Debate Sandbox Pages */}
          <Route path="debate-dashboard" element={<DebateDashboard />} />
          <Route path="debate-intake" element={<DebateIntakeFormation />} />
          <Route path="debate-teams" element={<DebateTeamReview />} />
          <Route path="debate-anomalies" element={<DebateAnomalies />} />
          <Route path="debate-results" element={<DebateResults />} />
          <Route path="debate-communications" element={<DebateCommunications />} />

          {/* Sports Committee Extension â€” CSV provisioning + bracket generation */}
          <Route path="event-initialization" element={<EventInitialization />} />
          <Route path="communication-hub" element={<CommunicationHub />} />

          

          {/* Catch-all dynamic parameter mapping catches config, dashboard, anti-cheat, judges etc. directly from database */}
          <Route path=":componentKey" element={<DynamicRouteWrapper />} />
        </Route>
      </Route>
      </Route>

      {/* =========================================================
          ðŸ›ï¸ STANDARD PRODUCTION TRACK
          ========================================================= */}
      <Route element={<ProtectedRoute allowedRoles={['committee']} />}>
        <Route path="/committee" element={<Navigate to="/committee/dashboard" replace />} />
        <Route path="/committee/dashboard" element={<CommitteeDashboard />} />
        <Route path="/committee/plans-billing" element={<BillingPage />} />
        <Route path="/committee/intake-formation" element={<CommitteeIntakeFormation />} />
        
        <Route path="/committee/assign-mentors" element={<CommitteeAssignMentors />} />
        <Route path="/committee/upload-judges" element={<CommitteeUploadJudges />} />
        <Route path="/committee/team-review" element={<CommitteeTeamReview />} />
        <Route path="/committee/participants" element={<CommitteeParticipants />} />
        <Route path="/committee/team-config" element={<CommitteeTeamConfig />} />
        <Route path="/committee/generated-teams" element={<CommitteeGeneratedTeams />} />
        <Route path="/committee/approvals" element={<CommitteeApprovals />} />
        <Route path="/committee/communications" element={<CommitteeCommunications />} />
        
        {/* RE-ROUTES & FALLBACK ALIGNMENTS */}
        <Route path="/committee/smart-matchmaker" element={<CommitteeOrchestration />} />
        <Route path="/committee/orchestration" element={<Navigate to="/committee/smart-matchmaker" replace />} />
        <Route path="/committee/orchestrationCenter" element={<Navigate to="/committee/smart-matchmaker" replace />} />
        
        <Route path="/committee/evaluations" element={<CommitteeEvaluations />} />
        <Route path="/committee/anomalies" element={<CommitteeAnomalies />} />
        <Route path="/committee/anomaly-center" element={<Navigate to="/committee/anomalies" replace />} />
        
        <Route path="/committee/results" element={<CommitteeResults />} />
        <Route path="/committee/config-agent" element={<ConfigAgentPage />} />
        <Route path="/committee/settings" element={<CommitteeSettings />} />
        <Route path="/committee/grievances" element={<CommitteeGrievances />} />
        <Route path="/committee/activity-logs" element={<CommitteeActivityLogs />} />
      </Route>

      {/* PARTICIPANT PATHWAY */}
      <Route element={<ProtectedRoute allowedRoles={['participant']} />}>
        <Route path="/participant" element={<TokenEntry redirectTo="/participant/dashboard" />} />
        <Route path="/participant/dashboard" element={<ParticipantDashboard />} />
        <Route path="/participant/my-team" element={<ParticipantMyTeam />} />
        <Route path="/participant/event-journey" element={<ParticipantEventJourney />} />
        <Route path="/participant/submissions" element={<ParticipantSubmissions />} />
        <Route path="/participant/announcements" element={<ParticipantAnnouncements />} />
        <Route path="/participant/results" element={<ParticipantResultsProgress />} />
        <Route path="/participant/assistant" element={<ParticipantAssistant />} />
        <Route path="/participant/smart-chat" element={<ParticipantSmartChat />} />
        <Route path="/participant/profile" element={<ParticipantProfile />} />
        <Route path="/participant/help" element={<ParticipantHelp />} />
      </Route>

      {/* EVALUATOR PATHWAY */}
      <Route element={<ProtectedRoute allowedRoles={['evaluator']} />}>
        <Route path="/evaluator" element={<TokenEntry redirectTo="/evaluator/dashboard" />} />
        <Route path="/evaluator/dashboard" element={<EvaluatorDashboard />} />
        <Route path="/evaluator/guidelines" element={<EvaluatorGuidelines />} />
        <Route path="/evaluator/evaluations" element={<EvaluatorEvaluations />} />
        <Route path="/evaluator/assignments" element={<EvaluatorAssignments />} />
        <Route path="/evaluator/workspace/:teamId" element={<EvaluatorWorkspace />} />
        <Route path="/evaluator/ai-summary/:teamId" element={<EvaluatorAISummary />} />
        <Route path="/evaluator/history" element={<EvaluatorHistory />} />
        <Route path="/evaluator/calibration" element={<EvaluatorCalibration />} />
        <Route path="/evaluator/feedback" element={<EvaluatorFeedback />} />
        <Route path="/evaluator/profile" element={<EvaluatorProfile />} />
      </Route>

      {/* GLOBAL WILD-CARD RESET */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App;
