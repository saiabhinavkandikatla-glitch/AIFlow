import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Pencil, Save, Trash2 } from 'lucide-react'
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
  const [renaming, setRenaming] = useState(false)
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
    try {
      const response = await threadApi.update(token, thread.id, { title })
      setThread(response.thread)
      setRenaming(false)
      toast.success('Flow renamed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rename failed')
    }
  }

  const regenerate = async () => {
    if (!token || !thread) return
    setRegenerating(true)
    try {
      const response = await threadApi.regenerate(token, thread.id)
      setThread(response.thread)
      toast.success('Flow bridges refined')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Regeneration failed')
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
      <div className="flex items-center justify-center rounded-lg border p-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Flow
      </div>
    )
  }

  if (!thread) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-muted-foreground">Flow not found.</p>
          <Link to="/app/threads" className={buttonVariants({ className: 'mt-4' })}>
            Back to Flow Studio
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link to="/app/threads" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRenaming((current) => !current)}>
          <Pencil className="h-4 w-4" />
            Rename Flow
          </Button>
          <Button variant="destructive" onClick={deleteThread}>
            <Trash2 className="h-4 w-4" />
            Delete Flow
          </Button>
        </div>
      </div>

      {renaming ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            <Button onClick={saveTitle}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ThreadCard thread={thread} />
      <PromptTabs thread={thread} prompts={thread.prompts} onRegenerate={regenerate} regenerating={regenerating} />
    </div>
  )
}
