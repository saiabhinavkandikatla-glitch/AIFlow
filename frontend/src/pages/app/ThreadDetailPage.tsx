import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { PromptTabs } from '@/components/thread/PromptTabs'
import { ThreadCard } from '@/components/thread/ThreadCard'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { threadApi } from '@/lib/api'
import type { Thread } from '@/lib/types'

export const ThreadDetailPage = () => {
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!token || !id) return
    setLoading(true)
    threadApi
      .get(token, id)
      .then((response) => {
        setThread(response.thread)
        setTitle(response.thread.title)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load Flow'))
      .finally(() => setLoading(false))
  }, [id, token])

  const saveTitle = async () => {
    if (!token || !thread) return
    const nextTitle = title.trim()
    if (!nextTitle) {
      setTitle(thread.title)
      setEditingTitle(false)
      return
    }
    if (nextTitle === thread.title) {
      setEditingTitle(false)
      return
    }

    try {
      const response = await threadApi.update(token, thread.id, { title: nextTitle })
      setThread(response.thread)
      setTitle(response.thread.title)
      toast.success('Flow renamed')
    } catch (error) {
      setTitle(thread.title)
      toast.error(error instanceof Error ? error.message : 'Rename failed')
    } finally {
      setEditingTitle(false)
    }
  }

  const regenerate = async () => {
    if (!token || !thread) return
    setRegenerating(true)
    try {
      const response = await threadApi.regenerate(token, thread.id)
      setThread(response.thread)
      toast.success('Model handoffs refined')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Flow refinement failed')
    } finally {
      setRegenerating(false)
    }
  }

  const deleteThread = async () => {
    if (!token || !thread) return
    if (!window.confirm(`Delete Flow "${thread.title}"?`)) return
    try {
      await threadApi.delete(token, thread.id)
      toast.success('Flow deleted')
      navigate('/app/threads')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-slide-up flex items-center justify-center rounded-2xl border bg-card p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Flow
      </div>
    )
  }

  if (!thread) {
    return (
      <Card className="animate-scale-in">
        <CardContent className="p-8">
          <p className="text-muted-foreground">Flow not found.</p>
          <Link to="/app/threads" className={buttonVariants({ className: 'mt-4' })}>
            Back to Flows
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="animate-fade-slide-up space-y-6 pb-20">
      <div className="space-y-5">
        <Link to="/app/threads" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <Input
                autoFocus
                value={title}
                onBlur={saveTitle}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur()
                  }
                  if (event.key === 'Escape') {
                    setTitle(thread.title)
                    setEditingTitle(false)
                  }
                }}
                className="h-auto rounded-xl border-transparent bg-muted px-3 py-2 text-3xl font-semibold tracking-tight md:text-4xl"
              />
            ) : (
              <button type="button" className="block max-w-full text-left" onClick={() => setEditingTitle(true)} title="Click to rename">
                <h1 className="truncate text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{thread.title}</h1>
              </button>
            )}
            <p className="mt-2 text-sm text-muted-foreground">Click the title to rename this Flow.</p>
          </div>
          <Button variant="destructive" onClick={deleteThread} className="rounded-xl">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <ThreadCard thread={thread} />
      <PromptTabs thread={thread} prompts={thread.prompts} onRegenerate={regenerate} regenerating={regenerating} />
    </div>
  )
}
