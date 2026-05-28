import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Braces, Layers3, Loader2, Plus, TrendingUp, type LucideIcon } from 'lucide-react'
import { toast } from '@/lib/toast'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FlowOnboardingEmptyState } from '@/components/flow/FlowOnboardingEmptyState'
import { UsageBanner } from '@/components/thread/UsageBanner'
import { useAuth } from '@/contexts/AuthContext'
import { threadApi } from '@/lib/api'
import type { Thread } from '@/lib/types'
import { currentMonthCount, formatDate, monthlyThreadLimit } from '@/lib/utils'

const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: LucideIcon }) => (
  <Card className="lift">
    <CardContent className="flex items-center justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="mt-2 text-3xl font-semibold">{value}</div>
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Your Flow volume, newest context maps, and model handoff coverage.</p>
        </div>
        <Link to="/app/threads/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Create Flow
        </Link>
      </div>

      {monthlyLimit !== null && monthlyUsage >= monthlyLimit ? <UsageBanner count={monthlyUsage} limit={monthlyLimit} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Flows created" value={threads.length} icon={Layers3} />
        <StatCard title="Flows generated this month" value={monthlyUsage} icon={TrendingUp} />
        <StatCard title="Model handoffs available" value="5" icon={Braces} />
      </div>

      {loading || recent.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Recent Flows</CardTitle>
            <Link to="/app/threads" className={buttonVariants({ variant: 'outline', className: 'hidden md:inline-flex' })}>
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading Flows
              </div>
            ) : (
              <div className="divide-y">
                {recent.map((thread) => (
                  <Link key={thread.id} to={`/app/threads/${thread.id}`} className="flex items-center gap-4 py-4 transition hover:bg-muted/50">
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
  )
}
