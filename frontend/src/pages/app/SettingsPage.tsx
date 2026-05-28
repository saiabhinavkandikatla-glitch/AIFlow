import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CreditCard, KeyRound, Loader2, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { billingApi, threadApi } from '@/lib/api'
import type { Thread } from '@/lib/types'
import { currentMonthCount, monthlyThreadLimit } from '@/lib/utils'

export const SettingsPage = () => {
  const { profile, token, updateProfile, changePassword: verifyAndChangePassword, deleteAccount, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [threads, setThreads] = useState<Thread[]>([])
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setName(profile?.name ?? '')
    setAvatarUrl(profile?.avatar_url ?? '')
  }, [profile?.avatar_url, profile?.name])

  useEffect(() => {
    if (!token) return
    threadApi
      .list(token)
      .then((response) => setThreads(response.threads))
      .catch(() => undefined)
  }, [token])

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await updateProfile({ name, avatar_url: avatarUrl })
      toast.success('Profile updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Profile update failed')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (currentPassword === newPassword) {
      toast.error('Choose a new password that is different from your current one.')
      return
    }

    setChangingPassword(true)
    try {
      await verifyAndChangePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed after verification')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Password change failed')
    } finally {
      setChangingPassword(false)
    }
  }

  const removeAccount = async () => {
    if (!window.confirm('Delete your AIFlow profile and all saved Flows?')) return
    setDeleting(true)
    try {
      await deleteAccount()
      toast.success('Account deleted')
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const cancelBilling = async () => {
    if (!token) return
    if (!window.confirm('Cancel your Razorpay subscription at the end of the current billing cycle?')) return

    setBillingLoading(true)
    try {
      const response = await billingApi.cancel(token)
      await refreshProfile()
      toast.success({
        title: 'Subscription cancellation scheduled',
        message: response.message,
      })
    } catch (error) {
      toast.error({
        title: 'Could not cancel Razorpay subscription',
        message: error instanceof Error ? error.message : 'Could not update billing.',
        recovery: 'Check Razorpay configuration and webhook status, then retry.',
      })
    } finally {
      setBillingLoading(false)
    }
  }

  const monthlyUsage = currentMonthCount(threads)
  const plan = profile?.plan ?? 'free'
  const monthlyLimit = monthlyThreadLimit(plan)
  const periodEnd = profile?.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="mt-2 text-muted-foreground">Manage your profile, password, plan, and account data.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your name and avatar URL.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveProfile}>
              <div className="grid gap-4 md:grid-cols-[96px_1fr]">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold">{(name || profile?.email || 'U').slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar">Avatar URL</Label>
                    <Input id="avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </div>
              <Button disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Change password
            </CardTitle>
            <CardDescription>Verify your current password before setting a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={changePassword}>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Your current credentials are checked with Supabase before the password is updated.</span>
              </div>
              <Button variant="outline" disabled={changingPassword}>
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Verify and change password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete account
            </CardTitle>
            <CardDescription>This removes your AIFlow profile, saved Flows, and generated model handoffs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={removeAccount} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>Your workspace tier.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold capitalize">{plan}</div>
            {profile?.subscription_status ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Razorpay status: <span className="capitalize">{profile.subscription_status.replaceAll('_', ' ')}</span>
                {periodEnd ? ` - Renews ${periodEnd}` : ''}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No active subscription connected.</p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              {plan === 'free' ? (
                <Button onClick={() => navigate('/pricing')}>
                  <CreditCard className="h-4 w-4" />
                  Upgrade plan
                </Button>
              ) : (
                <Button variant="destructive" onClick={cancelBilling} disabled={billingLoading}>
                  {billingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Cancel at cycle end
                </Button>
              )}
              <p className="text-sm text-muted-foreground">Razorpay sends subscription invoices and payment mandate updates to your email.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI usage this month</CardTitle>
            <CardDescription>Flow maps generated.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{monthlyUsage}</div>
            {monthlyLimit ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((monthlyUsage / monthlyLimit) * 100, 100)}%` }} />
              </div>
            ) : null}
            <p className="mt-3 text-sm text-muted-foreground">
              {monthlyLimit ? `${monthlyUsage}/${monthlyLimit} Flows used` : 'Unlimited Flow generation enabled'}
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
