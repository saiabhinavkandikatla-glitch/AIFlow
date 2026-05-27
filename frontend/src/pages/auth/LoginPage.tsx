import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Globe2, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { AuthShell } from '@/pages/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { clearSupabaseAuthStorage } from '@/lib/supabase'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as { from?: string; authError?: string; toastShown?: boolean } | null
  const redirectTo = routeState?.from ?? '/app'
  const authError = routeState?.authError
  const shownAuthError = useRef<string | null>(null)

  useEffect(() => {
    if (session) navigate(redirectTo, { replace: true })
  }, [navigate, redirectTo, session])

  const restartGoogleConnection = useCallback(async () => {
    await clearSupabaseAuthStorage()
    await loginWithGoogle()
  }, [loginWithGoogle])

  useEffect(() => {
    if (!authError || routeState?.toastShown || shownAuthError.current === authError) return
    shownAuthError.current = authError
    toast.error({
      title: 'Google sign-in did not finish',
      message: authError,
      recovery: 'Start a clean OAuth attempt. If the same server error appears again, re-copy the Google Client ID and Secret into Supabase.',
      action: {
        label: 'Retry connection',
        onClick: restartGoogleConnection,
      },
      persistent: true,
    })
  }, [authError, restartGoogleConnection, routeState?.toastShown])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      await login({ email, password })
      toast.success('Signed in. Opening your workspace.')
      navigate(redirectTo)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Sign in to AIFlow" subtitle="Open your saved threads and keep the next AI handoff moving.">
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <Button className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={() =>
          restartGoogleConnection().catch((error) =>
            toast.error({
              title: 'Could not start Google sign-in',
              message: error instanceof Error ? error.message : 'Google sign-in failed before redirect.',
              recovery: 'Clear the local auth cache, then retry the Google connection.',
              action: {
                label: 'Clear cache & retry',
                onClick: restartGoogleConnection,
              },
              persistent: true,
            }),
          )
        }
      >
        <Globe2 className="h-4 w-4" />
        Continue with Google
      </Button>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link to="/signup" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
