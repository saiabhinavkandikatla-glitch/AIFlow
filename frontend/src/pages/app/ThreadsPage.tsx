import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Layers3, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Flow Studio</h1>
          <p className="mt-2 text-muted-foreground">Search, open, refine, or remove the AI Flows tied to your account.</p>
        </div>
        <Link to="/app/threads/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Create Flow
        </Link>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by Flow title or context signal" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border p-10 text-muted-foreground">
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
              Create Flow
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredThreads.map((thread) => (
            <Card key={thread.id} className="lift">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/app/threads/${thread.id}`} className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{thread.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{thread.goal}</p>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => deleteThread(thread)} aria-label="Delete Flow" title="Delete Flow">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {thread.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">{formatDate(thread.created_at)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
