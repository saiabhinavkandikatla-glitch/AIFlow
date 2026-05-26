import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export const ProtectedRoute = () => {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading session
      </div>
    )
  }

  if (!session) {
    const params = new URLSearchParams(location.search)
    const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash)
    const authError = params.get('error_description') ?? hashParams.get('error_description') ?? params.get('error') ?? hashParams.get('error')

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          authError: authError ? authError.replace(/\+/g, ' ') : undefined,
        }}
      />
    )
  }

  return <Outlet />
}
