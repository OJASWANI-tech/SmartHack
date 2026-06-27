import { NavLink } from 'react-router-dom'
import { PortalIcon } from '../participant/ParticipantPortalKit'

const evaluatorNav = [
  { label:"Dashboard",       icon:"layout-dashboard", path:"/em/dashboard" },
  { label:"Assigned Teams",  icon:"users",            path:"/em/assigned-teams" },
  { label:"Evaluation Sheet",icon:"clipboard-check",  path:"/em/evaluation-sheet" },
  { label:"Scores & Ranking",icon:"trophy",           path:"/em/scores-ranking" },
  { label:"Schedule",        icon:"calendar",         path:"/em/schedule" },
]

const mentorNav = [
  { label:"My Mentees",       icon:"users",          path:"/em/my-mentees" },
  { label:"Sessions",         icon:"calendar-plus",  path:"/em/sessions" },
  { label:"Resources & Notes",icon:"notes",          path:"/em/resources-notes" },
]

const accountNav = [
  { label:"Profile", icon:"user", path:"/em/profile" },
]

function NavGroup({ label, items }) {
  return (
    <>
      <span className="nav-group-label">{label}</span>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => (isActive ? 'active' : undefined)}
          end
        >
          <PortalIcon name={item.icon} variant="committee" />
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </>
  )
}

function RoleAwareSidebar({ roles = [] }) {
  return (
    <>
      {roles.includes('evaluator') && <NavGroup label="EVALUATOR" items={evaluatorNav} />}
      {roles.includes('mentor') && <NavGroup label="MENTOR" items={mentorNav} />}
      <NavGroup label="ACCOUNT" items={accountNav} />
    </>
  )
}

export default RoleAwareSidebar
