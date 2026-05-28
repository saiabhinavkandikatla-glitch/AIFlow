import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Layers3, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FlowOnboardingEmptyState } from '@/components/flow/FlowOnboardingEmptyState'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { threadApi } from '@/lib/api'
import type { Thread } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export const ThreadsPage = () => {
  const { token } = useAuth()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const loadThreads = () => {
    if (!token) return
    setLoading(true)
    threadApi
      .list(token)
      .then((response) => setThreads(response.threads))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load Flows'))
      .finally(() => setLoading(false))
  }

  useEffect(loadThreads, [token])

  const filteredThreads = useMemo(() => {
    const query = search.toLowerCase().trim()
    return threads.filter((thread) => {
      const matchesQuery =
        !query ||
        thread.title.toLowerCase().includes(query) ||
        thread.tags.some((tag) => tag.toLowerCase().includes(query))
      const matchesDate = !dateFilter || thread.created_at.slice(0, 10) === dateFilter
      return matchesQuery && matchesDate
    })
  }, [dateFilter, search, threads])

  const deleteThread = async (thread: Thread) => {
    if (!token) return
    if (!window.confirm(`Delete Flow "${thread.title}"?`)) return
    try {
      await threadApi.delete(token, thread.id)
      setThreads((current) => current.filter((item) => item.id !== thread.id))
      toast.success('Flow deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  return (
    <div className="animate-fade-slide-up space-y-6 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Flows</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Search and reopen the AI handoffs you have already created.</p>
        </div>
        <Link to="/app/threads/new" className={buttonVariants({ className: 'rounded-xl' })}>
          <Plus className="h-4 w-4" />
          Capture Context
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl bg-card pl-9"
            placeholder="Search by title or tag"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 rounded-xl bg-card pl-9" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border bg-card p-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading Flows
        </div>
      ) : threads.length === 0 ? (
        <FlowOnboardingEmptyState />
      ) : filteredThreads.length === 0 ? (
        <EmptyState
          icon={<Layers3 className="h-5 w-5" />}
          title="No matching Flows"
          description="Create a new Flow or adjust your search and date filters."
          action={
            <Link to="/app/threads/new" className={buttonVariants()}>
              Capture Context
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-border/70 rounded-2xl border bg-card">
          {filteredThreads.map((thread, index) => (
            <div
              key={thread.id}
              className={`group animate-fade-slide-up flex items-start gap-4 p-4 hover:bg-muted/50 md:items-center stagger-${Math.min(index + 1, 5)}`}
            >
              <Link to={`/app/threads/${thread.id}`} className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <h2 className="truncate font-semibold tracking-tight">{thread.title}</h2>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(thread.created_at)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{thread.goal}</p>
                {thread.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {thread.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100"
                onClick={() => deleteThread(thread)}
                aria-label="Delete Flow"
                title="Delete Flow"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
