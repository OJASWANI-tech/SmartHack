export const participant = {
  name: 'Navya P.',
  role: 'Product + AI Lead',
  event: 'Hack Summit 2024',
  stage: 'Evaluation',
  qualification: 'Qualified',
  team: {
    id: 'EF-HS24-PHX-07',
    name: 'Team Phoenix',
    status: 'Qualified',
    currentRound: 'Evaluation',
    rationale: 'A balanced mix of AI, product, design, and full-stack craft for a high-trust campus support assistant.',
    problem: 'Build an intelligent assistant that helps students find services, deadlines, and support with context-aware answers.',
    chemistry: 92,
    resources: ['Briefing deck', 'Dataset pack', 'Brand kit', 'Mentor notes'],
  },
}

export const teamMembers = [
  { name: 'Navya P.', role: 'AI Lead', contact: 'navya.p@example.com', skills: ['LLMs', 'Product', 'Python'], color: '#6BE6D3' },
  { name: 'Aditi R.', role: 'UX Designer', contact: 'aditi.r@example.com', skills: ['Research', 'Figma', 'Design Systems'], color: '#ADADFB' },
  { name: 'Rohan S.', role: 'Full-stack', contact: 'rohan.s@example.com', skills: ['React', 'FastAPI', 'Postgres'], color: '#7DBBFF' },
  { name: 'Megha G.', role: 'Storyteller', contact: 'megha.g@example.com', skills: ['Pitch', 'Ops', 'Growth'], color: '#71DD8C' },
]

export const eventStages = [
  { label: 'Registration', state: 'complete', date: 'Jul 01' },
  { label: 'Team Formation', state: 'complete', date: 'Jul 20' },
  { label: 'Evaluation', state: 'active', date: 'Aug 18 - 20' },
  { label: 'Results', state: 'locked', date: 'Aug 21' },
]

export const journeyMilestones = [
  { label: 'Registration', state: 'complete', detail: 'Profile and eligibility confirmed' },
  { label: 'Selection', state: 'complete', detail: 'Shortlisted for the main challenge' },
  { label: 'Team Formation', state: 'complete', detail: 'Phoenix squad finalized' },
  { label: 'Submission', state: 'active', detail: 'Final package due soon' },
  { label: 'Evaluation', state: 'locked', detail: 'Judge review window opens next' },
  { label: 'Results', state: 'locked', detail: 'Winners and feedback published' },
]

export const importantDates = [
  { label: 'Submission Deadline', value: 'Aug 15, 11:59 PM', tone: 'green' },
  { label: 'Evaluation Round', value: 'Aug 18 - Aug 20', tone: 'blue' },
  { label: 'Final Results', value: 'Aug 21, 10:00 AM', tone: 'purple' },
]

export const evaluators = [
  { name: 'Judge D-12', specialty: 'AI/ML, NLP, Systems Design', expertise: 'Lead Evaluator' },
  { name: 'Judge S-07', specialty: 'Product Design, UI/UX', expertise: 'Experience Review' },
]

export const announcements = [
  { title: 'Evaluation schedule is live', category: 'Important', time: '2h ago', body: 'Your team review window is locked for Aug 18.' },
  { title: 'Submission checklist updated', category: 'Reminder', time: '1d ago', body: 'Add a demo link and a concise architecture note.' },
  { title: 'Community office hours', category: 'Update', time: '2d ago', body: 'Mentors are available in the event community tonight.' },
  { title: 'Deadline stays unchanged', category: 'Urgent', time: '3d ago', body: 'Final package closes Aug 15 at 11:59 PM.' },
]

export const notifications = [
  { title: 'Your team has been finalized', time: '2h ago', type: 'success' },
  { title: 'Evaluation starts tomorrow', time: '1d ago', type: 'info' },
  { title: 'Phoenix qualified for the next round', time: '2d ago', type: 'win' },
]

export const submissions = [
  { version: 'v3 Final Candidate', status: 'Ready', date: 'Aug 14, 8:42 PM' },
  { version: 'v2 Prototype Demo', status: 'Submitted', date: 'Aug 12, 7:10 PM' },
  { version: 'v1 Concept Note', status: 'Submitted', date: 'Aug 09, 5:35 PM' },
]
