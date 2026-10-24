import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}
