export const committeeNavItems = [
  { type: 'group', label: 'PIPELINE' },
  { to: '/committee/dashboard', label: 'Dashboard Overview', icon: 'dashboard' },
  { to: '/committee/intake-formation', label: 'Intake & Formation', icon: 'intake', adminOnly: true },
  { to: '/committee/team-review', label: 'Team Review', icon: 'teams' },
  { to: '/committee/assign-mentors', label: 'Mentor Assignment', icon: 'mentor' },
  { to: '/committee/upload-judges', label: 'Judge Allocation', icon: 'judge' },
  { to: '/committee/communications', label: 'Communications', icon: 'comms' },
  
  // --- JUDGING & EVALUATION PHASE ---
  { to: '/committee/smart-matchmaker', label: 'Smart Matchmaker', icon: 'matchmaker' },
  { to: '/committee/evaluations', label: 'Evaluation', icon: 'eval' },
  { to: '/committee/anomalies', label: 'Anomaly Center', icon: 'alert' }, 
  { to: '/committee/results', label: 'Results & Leaderboard', icon: 'results' },
  
  { type: 'group', label: 'SETTINGS' },

  { to: '/committee/grievances', label: 'Participant Grievances', icon: 'alert' },
  { to: '/committee/activity-logs', label: 'Activity Logs', icon: 'logs' },
]

// ⚡ NEW: NAV ITEMS FOR YOUR DYNAMIC SANDBOX LAYOUT PIPELINE
export const dynamicCommitteeNavItems = [
  { type: 'group', label: 'DYNAMIC TRACK' },
  { to: '/dynamic-test/dashboard', label: 'Dashboard Overview', icon: 'dashboard' },
  { to: '/dynamic-test/intake-formation', label: 'Intake & Formation', icon: 'intake' },
  { to: '/dynamic-test/team-review', label: 'Team Review', icon: 'teams' },
  { to: '/dynamic-test/assign-mentors', label: 'Mentor Assignment', icon: 'mentor' },
  { to: '/dynamic-test/anomalies', label: 'Anomaly Center', icon: 'alert' },
  { to: '/dynamic-test/results', label: 'Results & Leaderboard', icon: 'results' },
]

export const participantNavItems = [
  { type: 'group', label: 'NAVIGATION' },
  { to: '/participant/dashboard', label: 'Home', icon: 'home' },
  { to: '/participant/event-journey', label: 'Journey', icon: 'journey' },
  { to: '/participant/my-team', label: 'My Team', icon: 'team' },
  { to: '/participant/submissions', label: 'Submit', icon: 'submit' },
  { to: '/participant/announcements', label: 'Announcements', icon: 'announce' },
  { to: '/participant/results', label: 'Results', icon: 'results' },
  { to: '/participant/assistant', label: 'Ask AI', icon: 'assistant' },
  { to: '/participant/smart-chat', label: 'Smart Chat', icon: 'chat' },
  { to: '/participant/help', label: 'Support Console', icon: 'help' },
  { type: 'group', label: 'ACCOUNT' },
  { to: '/participant/profile', label: 'Profile', icon: 'profile' },
]

export const evaluatorNavItems = [
  { type: 'group', label: 'JUDGING CONSOLE' },
  { to: '/evaluator/dashboard', label: 'Dashboard Overview', icon: 'dashboard' },
  { to: '/evaluator/guidelines', label: 'Judging Guidelines', icon: 'journey' },
  { type: 'group', label: 'EVALUATION & RUNS' },
  { to: '/evaluator/assignments', label: 'Evaluation Queue', icon: 'teams' },
  { to: '/evaluator/history', label: 'Grading History', icon: 'logs' },
  { type: 'group', label: 'STATISTICS & CALIBRATION' },
  { to: '/evaluator/calibration', label: 'Bias & Calibration', icon: 'eval' },
  { to: '/evaluator/profile', label: 'Availability & Profile', icon: 'profile' },
  { type: 'group', label: 'TOOLS & UTILITIES' },
  { to: '/evaluator/feedback', label: 'AI Feedback Sandbox', icon: 'assistant' }
]

// 🏆 SPORTS TRACK — isolated nav sets for /dynamic/sports/participant & /evaluator
export const sportsParticipantNavItems = [
  { type: 'group', label: 'TOURNAMENT' },
  { to: '/dynamic/sports/participant/overview', label: 'Dashboard Overview', icon: 'dashboard' },
  { to: '/dynamic/sports/participant/bracket', label: 'Fixture Bracket & Schedule', icon: 'bracket' },
  { to: '/dynamic/sports/participant/roster', label: 'My Roster', icon: 'roster' },
  { to: '/dynamic/sports/participant/matches', label: 'Match Center', icon: 'matchCenter' },
]

export const sportsEvaluatorNavItems = [
  { type: 'group', label: 'REFEREE CONSOLE' },
  { to: '/dynamic/sports/evaluator', label: 'Match Queue', icon: 'matchCenter' },
]

// ⚡ FIXED: Added explicit mapping for the 'dynamic-committee' role key identifier
export const dashboardByRole = {
  committee: '/committee/dashboard',
  'dynamic-committee': '/dynamic-test/dashboard',
  participant: '/participant/dashboard',
  evaluator: '/evaluator/dashboard',
}