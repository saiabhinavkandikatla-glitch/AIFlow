import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, Link as LinkIcon, Loader2, PenLine, TextCursorInput, WandSparkles } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { threadApi } from '@/lib/api'
import type { InputMethod, ManualThreadInput } from '@/lib/types'

const methodCopy: Record<InputMethod, { title: string; description: string }> = {
  share_link: {
    title: 'Import from share link',
    description: 'Paste a public ChatGPT or Claude share link and turn it into a clean handoff.',
  },
  file_upload: {
    title: 'Upload chat export',
    description: 'Use a .txt transcript or .json chat export.',
  },
  raw_text: {
    title: 'Paste raw conversation',
    description: 'Messy speaker turns are fine.',
  },
  manual_description: {
    title: 'Describe the state manually',
    description: 'Best when the original transcript is not available.',
  },
}

export const NewThreadPage = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
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
    setLoading(true)
    try {
      const response = await threadApi.create(token, buildPayload())
      toast.success('Thread analyzed')
      navigate(`/app/threads/${response.thread.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Thread creation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">New Thread</h1>
        <p className="mt-2 text-muted-foreground">Bring in a conversation and generate model-ready thread handoffs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{methodCopy[method].title}</CardTitle>
          <CardDescription>{methodCopy[method].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <Tabs defaultValue={method} value={method} onValueChange={(value) => setMethod(value as InputMethod)}>
              <TabsList className="grid w-full grid-cols-2 gap-1 md:grid-cols-4">
                <TabsTrigger value="share_link">
                  <LinkIcon className="h-4 w-4" />
                  Share link
                </TabsTrigger>
                <TabsTrigger value="file_upload">
                  <FileUp className="h-4 w-4" />
                  File upload
                </TabsTrigger>
                <TabsTrigger value="raw_text">
                  <TextCursorInput className="h-4 w-4" />
                  Raw text
                </TabsTrigger>
                <TabsTrigger value="manual_description">
                  <PenLine className="h-4 w-4" />
                  Manual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="share_link" className="space-y-2">
                <Label htmlFor="share-link">Share URL</Label>
                <Input
                  id="share-link"
                  placeholder="https://chatgpt.com/share/..."
                  value={shareLink}
                  onChange={(event) => setShareLink(event.target.value)}
                  required={method === 'share_link'}
                />
              </TabsContent>

              <TabsContent value="file_upload" className="space-y-2">
                <Label htmlFor="file">Chat export</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".txt,.json,application/json,text/plain"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  required={method === 'file_upload'}
                />
              </TabsContent>

              <TabsContent value="raw_text" className="space-y-2">
                <Label htmlFor="raw-text">Conversation text</Label>
                <Textarea
                  id="raw-text"
                  placeholder="User: ...&#10;Assistant: ..."
                  className="min-h-72"
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  required={method === 'raw_text'}
                />
              </TabsContent>

              <TabsContent value="manual_description" className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="working-on">What were you working on?</Label>
                  <Textarea
                    id="working-on"
                    value={manual.working_on}
                    onChange={(event) => setManual((current) => ({ ...current, working_on: event.target.value }))}
                    required={method === 'manual_description'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decisions">What decisions were made?</Label>
                  <Textarea
                    id="decisions"
                    value={manual.decisions_made}
                    onChange={(event) => setManual((current) => ({ ...current, decisions_made: event.target.value }))}
                    required={method === 'manual_description'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-message">What was the last message/question?</Label>
                  <Textarea
                    id="last-message"
                    value={manual.last_message}
                    onChange={(event) => setManual((current) => ({ ...current, last_message: event.target.value }))}
                    required={method === 'manual_description'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="continue-goal">What do you want to continue?</Label>
                  <Textarea
                    id="continue-goal"
                    value={manual.continue_goal}
                    onChange={(event) => setManual((current) => ({ ...current, continue_goal: event.target.value }))}
                    required={method === 'manual_description'}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">Create a thread bridge</div>
                <p className="mt-1 text-sm text-muted-foreground">Continue this conversation on another AI platform without losing context.</p>
              </div>
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                Create thread
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
