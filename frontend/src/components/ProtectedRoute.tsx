import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

interface Props {
  children: ReactNode
  // Most pages need a residence chosen first; the residence screen itself opts out.
  requireResidence?: boolean
}

export default function ProtectedRoute({ children, requireResidence = true }: Props) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (requireResidence && !user.residence) return <Navigate to="/residence" replace />
  return children
}
