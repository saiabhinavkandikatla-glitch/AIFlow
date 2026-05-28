import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, Link as LinkIcon, Loader2, PenLine, TextCursorInput, WandSparkles } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { threadApi } from '@/lib/api'
import type { InputMethod, ManualThreadInput } from '@/lib/types'
import { cn } from '@/lib/utils'

const methodCopy: Record<InputMethod, { title: string; description: string }> = {
  share_link: {
    title: 'Share link',
    description: 'Submit a public ChatGPT or Claude share link to preserve the complete conversation state.',
  },
  file_upload: {
    title: 'Export file',
    description: 'Upload a .txt transcript or .json export from prior AI work.',
  },
  raw_text: {
    title: 'Chat log',
    description: 'Paste a chat log with messy speaker turns and let AIFlow structure the state.',
  },
  manual_description: {
    title: 'Manual summary',
    description: 'Best when the transcript is unavailable but the project state is clear.',
  },
}

const methods: { value: InputMethod; label: string; icon: typeof LinkIcon }[] = [
  { value: 'share_link', label: 'Share link', icon: LinkIcon },
  { value: 'file_upload', label: 'Export file', icon: FileUp },
  { value: 'raw_text', label: 'Chat log', icon: TextCursorInput },
  { value: 'manual_description', label: 'Manual', icon: PenLine },
]

export const NewThreadPage = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [method, setMethod] = useState<InputMethod>('share_link')
  const [shareLink, setShareLink] = useState('')
  const [rawText, setRawText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [manual, setManual] = useState<ManualThreadInput>({
    working_on: '',
    decisions_made: '',
    last_message: '',
    continue_goal: '',
  })
  const [loading, setLoading] = useState(false)

  const buildPayload = () => {
    if (method === 'share_link') return { input_method: method, content: shareLink }
    if (method === 'file_upload') return { input_method: method, file }
    if (method === 'raw_text') return { input_method: method, content: rawText }
    return { input_method: method, content: manual }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return
    if (method === 'file_upload' && !file) {
      toast.error('Choose a .txt or .json file to continue.')
      return
    }

    setLoading(true)
    try {
      const response = await threadApi.create(token, buildPayload())
      toast.success('Flow ready')
      navigate(`/app/threads/${response.thread.id}`)
    } catch (error) {
      toast.error({
        title: 'Flow creation failed',
        message: error instanceof Error ? error.message : 'Something stopped the Flow from being created.',
        recovery: 'Retry once. If it repeats, paste the conversation as raw text or upload a trimmed export.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFile = (nextFile: File | undefined) => {
    if (!nextFile) return
    setFile(nextFile)
  }

  return (
    <div className="animate-fade-slide-up mx-auto max-w-5xl space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Capture Context</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Bring in a conversation and turn it into a reusable AI Flow for the model you want to use next.
        </p>
      </div>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-border/70">
          <CardTitle className="tracking-tight">{methodCopy[method].title}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">{methodCopy[method].description}</p>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={submit}>
            <Tabs defaultValue={method} value={method} onValueChange={(value) => setMethod(value as InputMethod)}>
              <div className="flex flex-wrap gap-2 border-b border-border/70 p-4">
                {methods.map((item) => {
                  const Icon = item.icon
                  const active = method === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setMethod(item.value)}
                      className={cn(
                        'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                        active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <div className="p-5 md:p-6">
                <TabsContent value="share_link" className="animate-fade-slide-up mt-0 space-y-2">
                  <Label htmlFor="share-link">Source URL</Label>
                  <Input
                    id="share-link"
                    placeholder="https://chatgpt.com/share/..."
                    value={shareLink}
                    onChange={(event) => setShareLink(event.target.value)}
                    required={method === 'share_link'}
                  />
                </TabsContent>

                <TabsContent value="file_upload" className="animate-fade-slide-up mt-0">
                  <div
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-10 text-center hover:border-primary/40 hover:bg-muted/30"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      handleFile(event.dataTransfer.files[0])
                    }}
                  >
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{file ? file.name : 'Drop your file here'}</p>
                      <p className="mt-1 text-sm text-muted-foreground">.txt or .json, max 1.5 MB</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Browse files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".txt,.json,application/json,text/plain"
                      onChange={(event) => handleFile(event.target.files?.[0])}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="raw_text" className="animate-fade-slide-up mt-0 space-y-2">
                  <Label htmlFor="raw-text">Chat log</Label>
                  <Textarea
                    id="raw-text"
                    placeholder="User: Paste the conversation here...&#10;Assistant: Include the relevant replies, decisions, and current state..."
                    className="min-h-72 resize-y rounded-xl"
                    value={rawText}
                    onChange={(event) => setRawText(event.target.value)}
                    required={method === 'raw_text'}
                  />
                </TabsContent>

                <TabsContent value="manual_description" className="animate-fade-slide-up mt-0 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="working-on">Current objective</Label>
                    <Textarea
                      id="working-on"
                      value={manual.working_on}
                      onChange={(event) => setManual((current) => ({ ...current, working_on: event.target.value }))}
                      required={method === 'manual_description'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="decisions">Decisions made</Label>
                    <Textarea
                      id="decisions"
                      value={manual.decisions_made}
                      onChange={(event) => setManual((current) => ({ ...current, decisions_made: event.target.value }))}
                      required={method === 'manual_description'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-message">Where it stopped</Label>
                    <Textarea
                      id="last-message"
                      value={manual.last_message}
                      onChange={(event) => setManual((current) => ({ ...current, last_message: event.target.value }))}
                      required={method === 'manual_description'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="continue-goal">What to continue</Label>
                    <Textarea
                      id="continue-goal"
                      value={manual.continue_goal}
                      onChange={(event) => setManual((current) => ({ ...current, continue_goal: event.target.value }))}
                      required={method === 'manual_description'}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border/70 bg-card/95 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">AIFlow will map the context, decisions, last point, and next step.</p>
              <Button type="submit" size="lg" className={cn('rounded-xl', loading && 'animate-pulse')} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                {loading ? 'Building handoff...' : 'Create Flow'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
