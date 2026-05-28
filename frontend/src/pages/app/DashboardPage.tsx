import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  Clipboard,
  Copy,
  Layers3,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FlowOnboardingEmptyState } from '@/components/flow/FlowOnboardingEmptyState'
import { UsageBanner } from '@/components/thread/UsageBanner'
import { useAuth } from '@/contexts/AuthContext'
import { threadApi } from '@/lib/api'
import type { Thread } from '@/lib/types'
import { currentMonthCount, formatDate, monthlyThreadLimit } from '@/lib/utils'

const StatCard = ({
  title,
  value,
  icon: Icon,
  delay,
}: {
  title: string
  value: string | number
  icon: LucideIcon
  delay: string
}) => (
  <Card className={`lift animate-fade-slide-up ${delay}`}>
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
)

const howItWorks: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Clipboard,
    title: 'Paste your conversation',
    text: 'Add a share link, file export, raw chat log, or short manual summary.',
  },
  {
    icon: Layers3,
    title: 'AIFlow maps the context',
    text: 'It extracts the goal, key decisions, current state, and next step.',
  },
  {
    icon: Copy,
    title: 'Copy the handoff prompt',
    text: 'Continue the same work in ChatGPT, Claude, Gemini, DeepSeek, or Grok.',
  },
]

const ProfileSection = ({
  name,
  email,
  avatarUrl,
  plan,
}: {
  name: string
  email: string
  avatarUrl?: string | null
  plan: string
}) => (
  <Card className="animate-scale-in overflow-hidden">
    <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full border object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-primary/10 text-xl font-semibold text-primary">
            {name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold tracking-tight">Profile</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">{plan} plan</span>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{name}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              {email}
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Private workspace
            </span>
          </div>
        </div>
      </div>
      <Link to="/app/settings" className={buttonVariants({ variant: 'outline', className: 'w-full lg:w-auto' })}>
        <UserRound className="h-4 w-4" />
        Manage Profile
      </Link>
    </CardContent>
  </Card>
)

export const DashboardPage = () => {
  const { token, profile } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    threadApi
      .list(token)
      .then((response) => setThreads(response.threads))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load Flows'))
      .finally(() => setLoading(false))
  }, [token])

  const monthlyUsage = currentMonthCount(threads)
  const monthlyLimit = monthlyThreadLimit(profile?.plan)
  const recent = threads.slice(0, 5)
  const displayName = profile?.name?.trim() || profile?.email || 'AI Flow user'
  const displayEmail = profile?.email ?? 'Profile not loaded'
  const plan = profile?.plan ?? 'free'

  return (
    <div className="animate-fade-slide-up space-y-6 pb-20 lg:pb-0">
      <section className="overflow-hidden rounded-2xl border bg-card/95 shadow-sm shadow-black/5">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              AI conversation transfer
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              Pick up any AI conversation, anywhere.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
              Paste a ChatGPT, Claude, Gemini, or DeepSeek conversation. AIFlow reads the context, extracts the key decisions,
              and builds a ready-to-paste model handoff so you never lose momentum switching models.
            </p>
          </div>
          <Link to="/app/threads/new" className={buttonVariants({ size: 'lg', className: 'rounded-xl' })}>
            <Plus className="h-4 w-4" />
            Capture Context
          </Link>
        </div>
      </section>

      {monthlyLimit !== null && monthlyUsage >= monthlyLimit ? <UsageBanner count={monthlyUsage} limit={monthlyLimit} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total flows" value={threads.length} icon={Layers3} delay="stagger-1" />
        <StatCard title="Generated this month" value={monthlyUsage} icon={TrendingUp} delay="stagger-2" />
        <StatCard title="Model handoffs available" value="5" icon={Braces} delay="stagger-3" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {loading || recent.length > 0 ? (
            <Card className="animate-scale-in">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="tracking-tight">Recent Flows</CardTitle>
                <Link to="/app/threads" className={buttonVariants({ variant: 'outline', className: 'hidden rounded-xl md:inline-flex' })}>
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center p-10 text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Loading Flows
                  </div>
                ) : (
                  <div className="divide-y divide-border/70">
                    {recent.map((thread, index) => (
                      <Link
                        key={thread.id}
                        to={`/app/threads/${thread.id}`}
                        className={`animate-fade-slide-up flex items-center gap-4 rounded-xl px-2 py-4 hover:bg-muted/60 stagger-${Math.min(index + 1, 5)}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{thread.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{formatDate(thread.created_at)}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <FlowOnboardingEmptyState />
          )}
        </div>

        <aside className="space-y-4">
          <ProfileSection name={displayName} email={displayEmail} avatarUrl={profile?.avatar_url} plan={plan} />
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle className="tracking-tight">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {howItWorks.map((step, index) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className={`animate-fade-slide-up flex gap-3 stagger-${Math.min(index + 1, 5)}`}>
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{step.title}</div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.text}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
