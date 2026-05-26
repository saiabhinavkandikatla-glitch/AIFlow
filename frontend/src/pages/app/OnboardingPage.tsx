import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'

export const OnboardingPage = () => {
  const { profile, session, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const suggestedName = useMemo(() => {
    const metadata = session?.user?.user_metadata ?? {}
    return String(metadata.name ?? metadata.full_name ?? '').trim()
  }, [session?.user?.user_metadata])
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.name?.trim()) {
      navigate('/app', { replace: true })
    }
  }, [navigate, profile?.name])

  useEffect(() => {
    if (!name && suggestedName) {
      setName(suggestedName)
    }
  }, [name, suggestedName])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) {
      toast.error('Enter your name to continue.')
      return
    }

    setSaving(true)
    try {
      await updateProfile({ name: cleanName })
      toast.success({
        title: 'Profile completed',
        message: `Welcome to ThreadBridge, ${cleanName}.`,
      })
      navigate('/app', { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your name')
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Preparing your workspace
      </div>
    )
  }

  return (
    <div className="workspace-shell flex min-h-svh items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">What should we call you?</CardTitle>
          <CardDescription>Finish your ThreadBridge profile before opening the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="display-name">Name</Label>
              <Input
                id="display-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{profile.email}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Button disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue
              </Button>
              <Button type="button" variant="ghost" onClick={() => logout().then(() => navigate('/login', { replace: true }))}>
                Use another account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
