import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Globe2, Loader2, MailCheck, Send } from 'lucide-react'
import { toast } from '@/lib/toast'
import { AuthShell } from '@/pages/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { clearSupabaseAuthStorage } from '@/lib/supabase'

const friendlySignupError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Signup failed'
  const normalized = message.toLowerCase()

  if (normalized.includes('email rate limit')) {
    return 'Supabase has temporarily rate-limited verification emails. Wait a few minutes, then resend or try again.'
  }

  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account already exists for this email. Log in, or use forgot password if needed.'
  }

  return message
}

export const SignupPage = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null)
  const { signup, loginWithGoogle, resendVerification, session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/app', { replace: true })
  }, [navigate, session])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setSignupError(null)
    try {
      const result = await signup({ name, email, password })
      toast.success('Account created successfully')
      if (result.needsVerification) {
        setVerifyEmail(email)
      } else {
        toast.success('Opening your dashboard')
        navigate('/app', { replace: true })
      }
    } catch (error) {
      const message = friendlySignupError(error)
      setSignupError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!verifyEmail) return
    setResending(true)
    setSignupError(null)
    try {
      await resendVerification(verifyEmail)
      toast.success('Verification email sent')
    } catch (error) {
      const message = friendlySignupError(error)
      setSignupError(message)
      toast.error(message)
    } finally {
      setResending(false)
    }
  }

  const restartGoogleConnection = async () => {
    await clearSupabaseAuthStorage()
    await loginWithGoogle()
  }

  return (
    <AuthShell title="Create your workspace" subtitle="Start with 5 free AI context transfers this month.">
      {verifyEmail ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MailCheck className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Verify your email</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              We created your ThreadBridge account. Open the verification link sent to <span className="font-medium text-foreground">{verifyEmail}</span>, then sign in.
            </p>
          </div>
          {signupError ? (
            <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-left text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-muted-foreground">{signupError}</p>
            </div>
          ) : null}
          <div className="rounded-md border bg-muted/40 p-3 text-left text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Account created successfully
            </div>
            <p className="mt-1">After email verification, ThreadBridge will open your dashboard with your own saved threads.</p>
          </div>
          <div className="grid gap-2">
            <Button onClick={() => navigate('/login')}>Go to login</Button>
            <Button variant="outline" onClick={resend} disabled={resending}>
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Resend verification email
            </Button>
            <Button variant="ghost" onClick={() => setVerifyEmail(null)}>
              Use a different email
            </Button>
          </div>
        </div>
      ) : (
        <>
      {signupError ? (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-muted-foreground">{signupError}</p>
        </div>
      ) : null}
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <Button className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sign up
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
              recovery: 'Clear local auth state and start a fresh Google OAuth attempt.',
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
      <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
        Google verifies your email with Google, then returns you to the ThreadBridge dashboard.
      </p>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
        </>
      )}
    </AuthShell>
  )
}
