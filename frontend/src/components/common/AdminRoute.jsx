import { Navigate, Outlet } from 'react-router-dom'
import { getCommitteeRole } from '../../services/auth'

export default function AdminRoute() {
  const role = getCommitteeRole()
  if (role !== 'admin') {
    return <Navigate to="/committee/dashboard" replace />
  }
  return <Outlet />
}