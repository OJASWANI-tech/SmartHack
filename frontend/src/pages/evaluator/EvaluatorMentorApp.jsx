import { Navigate, Route, Routes } from 'react-router-dom'
import EvaluatorMentorLayout from '../../components/layout/EvaluatorMentorLayout'
import AssignedTeams from './EvaluatorMentorAssignedTeams'
import Dashboard from './EvaluatorMentorDashboard'
import EvaluationSheet from './EvaluatorMentorEvaluationSheet'
import MyMentees from './EvaluatorMentorMyMentees'
import Profile from './EvaluatorMentorProfile'
import ResourcesNotes from './EvaluatorMentorResourcesNotes'
import Schedule from './EvaluatorMentorSchedule'
import ScoresRanking from './EvaluatorMentorScoresRanking'
import Sessions from './EvaluatorMentorSessions'

function EvaluatorMentorApp() {
  return (
    <EvaluatorMentorLayout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assigned-teams" element={<AssignedTeams />} />
        <Route path="/evaluation-sheet" element={<EvaluationSheet />} />
        <Route path="/scores-ranking" element={<ScoresRanking />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/my-mentees" element={<MyMentees />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/resources-notes" element={<ResourcesNotes />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/em/dashboard" replace />} />
      </Routes>
    </EvaluatorMentorLayout>
  )
}

export default EvaluatorMentorApp
