import React, { useState, useEffect, Suspense } from 'react';

// --- LAZY IMPORT CODING MODULES ---
const CodingDashboard = React.lazy(() => import('./coding/CodingDashboard'));
const CaseConfig = React.lazy(() => import('./coding/CaseConfig'));
const CodingContestIntake = React.lazy(() => import('./coding/CodingContestIntake'));
const CodingTeamReview = React.lazy(() => import('./coding/CodingTeamReview'));
const CodingSchedule = React.lazy(() => import('./coding/CodingSchedule'));
const AntiCheat = React.lazy(() => import('./coding/AntiCheat'));
const CodingResult = React.lazy(() => import('./coding/CodingResult'));
const CodingLeaderboard = React.lazy(() => import('./coding/CodingLeaderboard'));
const CodingSubmissions = React.lazy(() => import('./coding/CodingSubmissions'));
const CodingMentorAssignment = React.lazy(() => import('./coding/CodingMentorAssignment'));
const CodingJudgesConsole = React.lazy(() => import('./coding/CodingJudgesConsole'));
const ProblemManagement = React.lazy(() => import('./coding/ProblemManagement'));

// --- LAZY IMPORT DEBATE MODULES ---
const DebateDashboard = React.lazy(() => import('./debate/DebateDashboard'));
const DebateIntakeFormation = React.lazy(() => import('./debate/DebateIntakeFormation'));
const DebateTeamReview = React.lazy(() => import('./debate/DebateTeamReview'));
const DebateAnomalies = React.lazy(() => import('./debate/DebateAnomalies'));
const DebateResults = React.lazy(() => import('./debate/DebateResults'));
const DebateCommunications = React.lazy(() => import('./debate/DebateCommunications'));
const DebateSchedulingRoundManagement = React.lazy(() => import('./debate/DebateSchedulingRoundManagement'));
const DebateResultsCertification = React.lazy(() => import('./debate/DebateResultsCertification'));
const DebateConfiguration = React.lazy(() => import('./debate/DebateConfiguration'));
const DebateJudgesConsole = React.lazy(() => import('./debate/DebateJudgesConsole'));

// --- LAZY IMPORT SPORTS MODULES ---
const SportsOverviewDashboard = React.lazy(() => import('./sports/OverviewDashboard'));
const SportsParticipantIntake = React.lazy(() => import('./sports/ParticipantIntake'));
const SportsTeamFormationResults = React.lazy(() => import('./sports/TeamFormationResults'));
const SportsTournamentSetup = React.lazy(() => import('./sports/TournamentSetup'));
const SportsFixtureManagement = React.lazy(() => import('./sports/FixtureManagement'));
const SportsRefereeManagement = React.lazy(() => import('./sports/RefereeManagement'));
const SportsAnalyticsReports = React.lazy(() => import('./sports/AnalyticsReports'));
const LiveScoreResults = React.lazy(() => import('./sports/LiveScoreResults'));
const SportsAthleteEligibilityWaivers = React.lazy(() => import('./sports/AthleteEligibilityWaivers'));
const SportsDisciplinaryIntegrityBoard = React.lazy(() => import('./sports/DisciplinaryIntegrityBoard'));
const SportsMedicalIncidentHub = React.lazy(() => import('./sports/MedicalIncidentHub'));
const SportsFinalStandingsCertification = React.lazy(() => import('./sports/FinalStandingsCertification'));

// --- LAZY IMPORT CASE COMPETITION MODULES ---
const CaseCompetitionCommandCenterDashboard = React.lazy(() => import('./case_competition/CommandCenterDashboard'));
const CaseCompetitionTeamRosterIntake = React.lazy(() => import('./case_competition/TeamRosterIntake'));
const CaseCompetitionTeamFormationApproval = React.lazy(() => import('./case_competition/TeamFormationApproval'));
const CaseCompetitionCaseBriefRelease = React.lazy(() => import('./case_competition/CaseBriefRelease'));
const CaseCompetitionCaseCommunication = React.lazy(() => import('./case_competition/CaseCommunication'));
const CaseCompetitionRubricRoundSetup = React.lazy(() => import('./case_competition/RubricRoundSetup'));
const CaseCompetitionJudgePanelManager = React.lazy(() => import('./case_competition/JudgePanelManager'));
const CaseCompetitionPresentationScheduler = React.lazy(() => import('./case_competition/PresentationScheduler'));
const CaseCompetitionLivePitchHUD = React.lazy(() => import('./case_competition/LivePitchHUD'));
const CaseCompetitionSubmissionEvaluationHub = React.lazy(() => import('./case_competition/SubmissionEvaluationHub'));
const CaseCompetitionScoreAggregation = React.lazy(() => import('./case_competition/ScoreAggregation'));
const CaseCompetitionFinalLeaderboardReports = React.lazy(() => import('./case_competition/FinalLeaderboardReports'));

// Safe inline placeholder for non-coding tracks so Vite doesn't look for missing files
const ArchetypePlaceholder = ({ title }) => (
  <div className="p-8 bg-[#090d22] border border-slate-800 rounded-lg text-slate-400 font-mono text-xs max-w-xl mx-auto mt-10">
    <div className="text-amber-500 font-semibold mb-2">⚡ SYSTEM NOTICE // WORKSPACE AUTOMATION</div>
    The active database event type requested the <span className="text-blue-400">"{title}"</span> layout pipeline. 
    This interface is currently inheriting core sandboxed rules.
  </div>
);

export default function DynamicComponentSelector({ componentKey, currentEvent }) {
  const [normalizedType, setNormalizedType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventRecord = async () => {
      try {
        const currentEventId = localStorage.getItem('current_event_id') || localStorage.getItem('event_id');
        
        if (currentEventId) {
          const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const res = await fetch(`${baseURL}/api/v1/events/${currentEventId}`);
          
          if (res.ok) {
            const data = await res.json();
            const rawType = data.event_type; 

            if (!rawType) {
              setNormalizedType('coding');
            } else if (rawType.toLowerCase() === 'hackathon') {
              setNormalizedType('hackathon');
            } else if (rawType.includes('coding')) {
              setNormalizedType('coding');
            } else if (rawType.includes('case')) {
              setNormalizedType('case_study');
            } else if (rawType.includes('sports') || rawType.includes('sport')) {
              setNormalizedType('sports');
            } else if (rawType.toLowerCase().includes('debate')) {
              setNormalizedType('debate');
            } else {
              setNormalizedType('coding');
            }
            return;
          }
        }
        setNormalizedType('coding'); 
      } catch (err) {
        console.error("Database tracking link failed:", err);
        setNormalizedType('coding');
      } finally {
        setLoading(false);
      }
    };

    fetchEventRecord();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060b19] text-slate-400 font-mono text-xs tracking-wider">
        CORE LAYER // SYNCING EVENT ENGINE WITH DATABASE...
      </div>
    );
  }

  // 🛠️ ROBUST LLM STRING CLEANING & NORMALIZATION LAYER
  let sanitizedKey = '';
  if (componentKey) {
    sanitizedKey = componentKey
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // --- 1. CORE MAP MATRIX (Store raw component references, NOT JSX elements) ---
  const componentMatrix = {
    'dashboard': {
      coding: CodingDashboard,
      hackathon: CodingDashboard,
      case_study: CaseCompetitionCommandCenterDashboard,
      sports: SportsOverviewDashboard,
      debate: DebateDashboard
    },
    'dynamic-dashboard': {
      coding: CodingDashboard,
      hackathon: CodingDashboard,
      case_study: CaseCompetitionCommandCenterDashboard,
      sports: SportsOverviewDashboard,
      debate: DebateDashboard
    },
    'contest-configuration': { 
      coding: CaseConfig, 
      hackathon: () => <ArchetypePlaceholder title="Hackathon Config Console" />, 
      case_study: CaseCompetitionCaseBriefRelease,
      sports: SportsTournamentSetup,
      debate: DebateConfiguration
    },
    'case-config': { 
      coding: CaseConfig, 
      hackathon: () => <ArchetypePlaceholder title="Hackathon Config Console" />, 
      case_study: CaseCompetitionCaseBriefRelease,
      sports: SportsTournamentSetup,
      debate: DebateConfiguration
    },
    'setup': { 
      coding: CaseConfig, 
      hackathon: () => <ArchetypePlaceholder title="Hackathon Config Console" />, 
      case_study: CaseCompetitionCaseBriefRelease,
      sports: SportsTournamentSetup,
      debate: DebateConfiguration
    },
    'intake-formation': { 
      coding: CodingContestIntake, 
      hackathon: CodingContestIntake, 
      case_study: CaseCompetitionTeamFormationApproval,
      sports: SportsParticipantIntake,
      debate: DebateIntakeFormation
    },
    'debate-intake-team-formation': {
      debate: DebateIntakeFormation
    },
    'judges-console': {
      coding: CodingJudgesConsole,
      hackathon: CodingResult,
      case_study: CaseCompetitionJudgePanelManager,
      debate: DebateJudgesConsole
    },
    'registration': { 
      coding: CodingContestIntake, 
      hackathon: CodingContestIntake, 
      case_study: CaseCompetitionTeamRosterIntake,
      sports: SportsParticipantIntake,
      debate: DebateIntakeFormation
    },
    'debate-results-certification': {
      debate: DebateResultsCertification
    },
    'debate-configuration': {
      debate: DebateConfiguration
    },
    'participant-intake': { 
      coding: CodingContestIntake, 
      hackathon: CodingContestIntake, 
      case_study: CaseCompetitionTeamRosterIntake,
      sports: SportsParticipantIntake,
      debate: DebateIntakeFormation
    },
    'intake': { 
      coding: CodingContestIntake, 
      hackathon: CodingContestIntake, 
      case_study: CaseCompetitionTeamRosterIntake,
      sports: SportsParticipantIntake,
      debate: DebateIntakeFormation
    },
    'team-review': { 
      coding: CodingTeamReview, 
      hackathon: CodingTeamReview, 
      case_study: CaseCompetitionTeamFormationApproval,
      sports: SportsTeamFormationResults,
      debate: DebateTeamReview
    },
    'debate-team-review': {
      debate: DebateTeamReview
    },
    'team-formation': { 
      coding: CodingTeamReview, 
      hackathon: CodingTeamReview, 
      case_study: CaseCompetitionTeamFormationApproval,
      sports: SportsTeamFormationResults,
      debate: DebateTeamReview
    },
    'schedule': { 
      coding: CodingSchedule, 
      hackathon: CodingSchedule, 
      case_study: CaseCompetitionPresentationScheduler,
      sports: SportsFixtureManagement,
      debate: DebateSchedulingRoundManagement
    },
    'communication': {
      debate: DebateCommunications,
      case_study: CaseCompetitionCaseCommunication
    },
    'debate-scheduling-round-management': {
       debate: DebateSchedulingRoundManagement
    },
    'fixtures': { 
      coding: CodingSchedule, 
      hackathon: CodingSchedule, 
      case_study: CaseCompetitionPresentationScheduler,
      sports: SportsFixtureManagement,
      debate: DebateSchedulingRoundManagement
    },
    'fixture-management': { 
      coding: CodingSchedule, 
      hackathon: CodingSchedule, 
      case_study: CaseCompetitionPresentationScheduler,
      sports: SportsFixtureManagement,
      debate: DebateSchedulingRoundManagement
    },
    'anomalies': {
        debate: DebateAnomalies
    },
    'debate-anomalies-integrity-monitoring': {
         debate: DebateAnomalies
    },
    'referee-management': { 
      coding: AntiCheat, 
      hackathon: AntiCheat, 
      case_study: CaseCompetitionJudgePanelManager,
      sports: SportsRefereeManagement,
      debate: DebateAnomalies
    },
    'participant-review': { 
      coding: CodingTeamReview, 
      hackathon: CodingTeamReview, 
      case_study: CaseCompetitionTeamFormationApproval,
      sports: SportsTeamFormationResults,
      debate: DebateTeamReview
    },
    'schedule-management': { 
      coding: CodingSchedule, 
      hackathon: CodingSchedule, 
      case_study: CaseCompetitionPresentationScheduler,
      sports: SportsFixtureManagement,
      debate: DebateSchedulingRoundManagement 
    },
    'debate-communications-hub': {
      debate: DebateCommunications 
    },
    'live-score-results': { 
      coding: CodingResult, 
      hackathon: CodingResult, 
      case_study: CaseCompetitionScoreAggregation,
      sports: LiveScoreResults, 
      debate: DebateResults
    },
    'live-debate-leaderboard': {
        debate: DebateResults
    },
    'analytics-reports': { 
      coding: CodingResult, 
      hackathon: CodingResult, 
      case_study: CaseCompetitionFinalLeaderboardReports,
      sports: SportsAnalyticsReports,
      debate: DebateResults
    },
    'assign-mentors': { 
      coding: CodingMentorAssignment, 
      hackathon: CodingSchedule, 
      case_study: CaseCompetitionPresentationScheduler,
      sports: SportsFixtureManagement,
      debate: DebateDashboard
    },
    'mentor-assignment': { 
      coding: CodingMentorAssignment, 
      hackathon: CodingSchedule, 
      case_study: CaseCompetitionPresentationScheduler,
      sports: SportsFixtureManagement,
      debate: DebateDashboard
    },
    'anti-cheat': { 
      coding: AntiCheat, 
      hackathon: AntiCheat, 
      case_study: CaseCompetitionJudgePanelManager,
      sports: SportsRefereeManagement,
      debate: DebateAnomalies
    },
    'anti-cheat-integrity': { 
      coding: AntiCheat, 
      hackathon: AntiCheat, 
      case_study: CaseCompetitionJudgePanelManager,
      sports: SportsRefereeManagement,
      debate: DebateAnomalies   
    },
    'anticheat': { 
      coding: AntiCheat, 
      hackathon: AntiCheat, 
      case_study: CaseCompetitionJudgePanelManager,
      sports: SportsRefereeManagement,
      debate: DebateAnomalies
    },
    'referees': { 
      coding: AntiCheat, 
      hackathon: AntiCheat, 
      case_study: CaseCompetitionJudgePanelManager,
      sports: SportsRefereeManagement,
      debate: DebateAnomalies
    },
    'results': { 
      coding: CodingResult, 
      hackathon: CodingResult, 
      case_study: CaseCompetitionFinalLeaderboardReports,
      sports: SportsAnalyticsReports,
      debate: DebateResults
    },
    'analytics': { 
      coding: CodingResult, 
      hackathon: CodingResult, 
      case_study: CaseCompetitionFinalLeaderboardReports,
      sports: SportsAnalyticsReports,
      debate: DebateResults
    },
    'leaderboard': {
      coding: CodingLeaderboard,
      hackathon: CodingLeaderboard,
      case_study: CaseCompetitionFinalLeaderboardReports,
      sports: SportsAnalyticsReports,
      debate: DebateResults
    },
    'live-leaderboard': {
      coding: CodingLeaderboard,
      hackathon: CodingLeaderboard,
      case_study: CaseCompetitionFinalLeaderboardReports,
      sports: SportsAnalyticsReports,
      debate: DebateResults
    },
    'submissions': {
      coding: CodingSubmissions,
      hackathon: CodingSubmissions,
      case_study: CaseCompetitionSubmissionEvaluationHub,
      debate: DebateDashboard
    },
    'coding-submissions-runtime-monitor': {
      coding: CodingSubmissions,
      hackathon: CodingSubmissions,
      case_study: CaseCompetitionSubmissionEvaluationHub,
      debate: DebateDashboard
    },
    'final-results-certification': {
       coding: CodingResult,
       case_study: CaseCompetitionFinalLeaderboardReports,
       debate: DebateResultsCertification
    },
    'judges': { 
      coding: CodingJudgesConsole, 
      hackathon: CodingResult, 
      case_study: CaseCompetitionJudgePanelManager,
      debate: DebateDashboard
    },
    'evaluation': { 
      coding: CodingResult, 
      hackathon: CodingResult, 
      case_study: CaseCompetitionSubmissionEvaluationHub 
    },
    'team_intake': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionTeamRosterIntake
    },
    'team-intake': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionTeamRosterIntake
    },
    'participant-intake':{
 coding: CodingContestIntake,
    },
    'team-validation': {  
      coding: CodingTeamReview,
      hackathon: CodingTeamReview,
      case_study: CaseCompetitionTeamFormationApproval
    },
    'evaluation-framework-setup': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionRubricRoundSetup
    },
    'judge-panel-management': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionJudgePanelManager
    },
    'submission-management': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionSubmissionEvaluationHub
    },    
    'presentation-scheduler': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionPresentationScheduler
    },
    'live-presentation-console': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionLivePitchHUD
    },
    'leaderboard-results': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionFinalLeaderboardReports
    },
    'case-brief-release': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionCaseBriefRelease
    },
    'score-aggregation': {  
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionScoreAggregation
    },
    'communications-announcements': {
      coding: CodingContestIntake,
      hackathon: CodingContestIntake,
      case_study: CaseCompetitionCaseCommunication
    },
    'athlete-eligibility-waivers': {
      sports: SportsAthleteEligibilityWaivers
    },
    'eligibility-waivers': {
      sports: SportsAthleteEligibilityWaivers
    },
    'disciplinary-integrity': {
      sports: SportsDisciplinaryIntegrityBoard
    },
    'disciplinary-anti-doping-grievance-board': {
      sports: SportsDisciplinaryIntegrityBoard
    },
    'medical-incident-hub': {
      sports: SportsMedicalIncidentHub
    },
    'medical-incident-response-hub': {
      sports: SportsMedicalIncidentHub
    },
    'final-standings-certification': {
      sports: SportsFinalStandingsCertification
    },
    'final-standings-awards-certification': {
      sports: SportsFinalStandingsCertification
    }
  };

  // --- 2. FALLBACK SMART INTENT FUZZY MATCH LOGIC ---
 let TargetComponent = componentMatrix[sanitizedKey]?.[normalizedType];

  if (!TargetComponent) {
    // Check Archetype Rules First for DEBATE pipeline fallback intents
    if (normalizedType === 'debate') {
      if (sanitizedKey.includes('dashboard')) {
        TargetComponent = DebateDashboard; // Matched to your matrix
      } else if (sanitizedKey.includes('certification')) {
        TargetComponent = DebateResultsCertification;
      } else if (sanitizedKey.includes('result') || sanitizedKey.includes('leaderboard') || sanitizedKey.includes('evaluation')) {
        TargetComponent = DebateResults;
      } else if (sanitizedKey.includes('config') || sanitizedKey.includes('setup')) {
        TargetComponent = DebateConfiguration;
      } else if (sanitizedKey.includes('intake') || sanitizedKey.includes('register') || sanitizedKey.includes('formation')) {
        TargetComponent = DebateIntakeFormation;
      } else if (sanitizedKey.includes('judge')) {
        TargetComponent = DebateJudgesConsole;
      } else if (sanitizedKey.includes('review')) {
        TargetComponent = DebateTeamReview;
      } else if (sanitizedKey.includes('anomal') || sanitizedKey.includes('cheat') || sanitizedKey.includes('referee')) {
        TargetComponent = DebateAnomalies;
      } else if (sanitizedKey.includes('schedule') || sanitizedKey.includes('round-management')) {
        TargetComponent = DebateSchedulingRoundManagement;
      } else if (sanitizedKey.includes('communication') || sanitizedKey.includes('hub')) {
        TargetComponent = DebateCommunications;
      }
    } 
    
    // Fallback intents for SPORTS pipeline
    else if (normalizedType === 'sports') {
      if (sanitizedKey.includes('dashboard')) {
        TargetComponent = SportsOverviewDashboard; // Matched to your matrix
      } else if (sanitizedKey.includes('eligibility') || sanitizedKey.includes('waiver')) {
        TargetComponent = SportsAthleteEligibilityWaivers;
      } else if (sanitizedKey.includes('intake') || sanitizedKey.includes('register')) {
        TargetComponent = SportsParticipantIntake;
      } else if (sanitizedKey.includes('team') || sanitizedKey.includes('formation')) {
        TargetComponent = SportsTeamFormationResults;
      } else if (sanitizedKey.includes('config') || sanitizedKey.includes('setup')) {
        TargetComponent = SportsTournamentSetup;
      } else if (sanitizedKey.includes('fixture') || sanitizedKey.includes('schedule')) {
        TargetComponent = SportsFixtureManagement;
      } else if (sanitizedKey.includes('disciplinary') || sanitizedKey.includes('grievance') || sanitizedKey.includes('doping')) {
        TargetComponent = SportsDisciplinaryIntegrityBoard;
      } else if (sanitizedKey.includes('medical') || sanitizedKey.includes('injury') || sanitizedKey.includes('incident')) {
        TargetComponent = SportsMedicalIncidentHub;
      } else if (sanitizedKey.includes('referee') || sanitizedKey.includes('cheat')) {
        TargetComponent = SportsRefereeManagement;
      } else if (sanitizedKey.includes('score') || sanitizedKey.includes('live')) {
        TargetComponent = LiveScoreResults;
      } else if (sanitizedKey.includes('certification') || sanitizedKey.includes('standings') || sanitizedKey.includes('award')) {
        TargetComponent = SportsFinalStandingsCertification;
      } else if (sanitizedKey.includes('report') || sanitizedKey.includes('result') || sanitizedKey.includes('analytics') || sanitizedKey.includes('leaderboard')) {
        TargetComponent = SportsAnalyticsReports;
      }
    }

    // Fallback intents for CASE COMPETITION pipelines
    else if (normalizedType === 'case_study' || normalizedType === 'case competition') {
      if (sanitizedKey.includes('dashboard')) {
        TargetComponent = CaseCompetitionCommandCenterDashboard; // Matched to your matrix
      } else if (sanitizedKey.includes('config') || sanitizedKey.includes('setup') || sanitizedKey.includes('brief') || sanitizedKey.includes('release')) {
        TargetComponent = CaseCompetitionCaseBriefRelease;
      } else if (sanitizedKey.includes('roster') || sanitizedKey.includes('intake') || sanitizedKey.includes('register') || sanitizedKey.includes('participant')) {
        TargetComponent = CaseCompetitionTeamRosterIntake;
      } else if (sanitizedKey.includes('formation') || sanitizedKey.includes('approval') || sanitizedKey.includes('review') || sanitizedKey.includes('validation')) {
        TargetComponent = CaseCompetitionTeamFormationApproval;
      } else if (sanitizedKey.includes('schedule') || sanitizedKey.includes('fixture') || sanitizedKey.includes('presentation') || sanitizedKey.includes('control-panel')) {
        TargetComponent = CaseCompetitionPresentationScheduler;
      } else if (sanitizedKey.includes('rubric') || sanitizedKey.includes('framework')) {
        TargetComponent = CaseCompetitionRubricRoundSetup;
      } else if (sanitizedKey.includes('judge') || sanitizedKey.includes('panel') || sanitizedKey.includes('referee')) {
        TargetComponent = CaseCompetitionJudgePanelManager;
      } else if (sanitizedKey.includes('live') || sanitizedKey.includes('pitch') || sanitizedKey.includes('hud')) {
        TargetComponent = CaseCompetitionLivePitchHUD;
      } else if (sanitizedKey.includes('submission') || sanitizedKey.includes('evaluation') || sanitizedKey.includes('management') || sanitizedKey.includes('problem')) {
        TargetComponent = CaseCompetitionSubmissionEvaluationHub;
      } else if (sanitizedKey.includes('aggregation') || sanitizedKey.includes('score')) {
        TargetComponent = CaseCompetitionScoreAggregation;
      } else if (sanitizedKey.includes('leaderboard') || sanitizedKey.includes('report') || sanitizedKey.includes('result') || sanitizedKey.includes('analytics')) {
        TargetComponent = CaseCompetitionFinalLeaderboardReports;
      } else if (sanitizedKey.includes('communication') || sanitizedKey.includes('announcement') || sanitizedKey.includes('hub')) {
        TargetComponent = CaseCompetitionCaseCommunication;
      }
    }
    
    // Global Fallback to Coding Matrix Defaults (Handles Coding and Hackathons)
    else {
      if (sanitizedKey.includes('dashboard')) {
        TargetComponent = CodingDashboard; // Matched to your matrix (covers coding & hackathon)
      } else if (sanitizedKey.includes('config') || sanitizedKey.includes('setup')) {
        TargetComponent = CaseConfig;
      } else if (sanitizedKey.includes('intake') || sanitizedKey.includes('register')) {
        TargetComponent = CodingContestIntake;
      } else if (sanitizedKey.includes('review') || sanitizedKey.includes('formation')) {
        TargetComponent = CodingTeamReview;
      } else if (sanitizedKey.includes('schedule') || sanitizedKey.includes('fixture') || sanitizedKey.includes('scheduling') || sanitizedKey.includes('control-panel')) {
        TargetComponent = CodingSchedule;
      } else if (sanitizedKey.includes('cheat') || sanitizedKey.includes('referee') || sanitizedKey.includes('anticheat')) {
        TargetComponent = AntiCheat;
      }else if (sanitizedKey.includes('setting') || sanitizedKey.includes('problem') || sanitizedKey.includes('formation') || sanitizedKey.includes('management')) {
        TargetComponent = ProblemManagement;
      } else if (sanitizedKey.includes('leaderboard')) {
        TargetComponent = CodingLeaderboard;
      } else if (sanitizedKey.includes('submission')) {
        TargetComponent = CodingSubmissions;
      } else if (sanitizedKey.includes('mentor')) {
        TargetComponent = CodingMentorAssignment;
      } else if (sanitizedKey.includes('judge')) {
        TargetComponent = CodingJudgesConsole;
      } else if (sanitizedKey.includes('management') || sanitizedKey.includes('dispute') || sanitizedKey.includes('escalation') || sanitizedKey.includes('problem')) {
        TargetComponent = ProblemManagement;
      } else if (sanitizedKey.includes('result') || sanitizedKey.includes('analytics') || sanitizedKey.includes('evaluation')) {
        TargetComponent = CodingResult;
      }
    }
  }

  // --- 3. HARD RECOVERY FALLBACK ---
  if (!TargetComponent && componentMatrix[sanitizedKey]) {
    TargetComponent = componentMatrix[sanitizedKey]['coding'] || componentMatrix[sanitizedKey]['case_study']; 
  }

  // --- 4. SAFE DYNAMIC EVALUATION LAYER ---
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 font-mono text-xs">Streaming module environment layout...</div>}>
      {TargetComponent ? (
        <TargetComponent currentEvent={currentEvent} />
      ) : (
        <div className="p-8 text-slate-500 font-mono text-xs">
          🚫 Key <span className="text-red-400">"{componentKey}"</span> evaluated to <span className="text-blue-400">"{sanitizedKey}"</span> inside the <span className="text-amber-400">"{normalizedType}"</span> module matrix but was empty.
        </div>
      )}
    </Suspense>
  );
}