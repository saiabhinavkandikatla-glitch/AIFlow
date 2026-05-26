import { Clipboard, WandSparkles } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { GeneratedPrompt, Thread } from '@/lib/types'

const modelNotes: Record<GeneratedPrompt['model_name'], string> = {
  ChatGPT: 'Structured, task-forward handoff for broad reasoning.',
  Claude: 'Context-rich, careful framing for nuanced continuation.',
  Gemini: 'Synthesis-first continuation with explicit assumptions.',
  DeepSeek: 'Direct execution mode for technical problem solving.',
  Grok: 'Concise, candid continuation with assumption checks.',
}

export const PromptTabs = ({
  thread,
  prompts,
  onRegenerate,
  regenerating,
}: {
  thread: Thread
  prompts: GeneratedPrompt[]
  onRegenerate?: () => void
  regenerating?: boolean
}) => {
  const first = prompts[0]?.model_name ?? 'ChatGPT'

  const copyThread = async (prompt: GeneratedPrompt) => {
    const text = [
      `AIFlow handoff for ${prompt.model_name}`,
      '',
      `Title: ${thread.title}`,
      `Goal: ${thread.goal}`,
      '',
      'Context:',
      thread.context,
      '',
      'Key decisions:',
      ...(thread.key_decisions.length ? thread.key_decisions.map((decision) => `- ${decision}`) : ['- No explicit decisions were detected.']),
      '',
      `Last point reached: ${thread.last_point}`,
      `Suggested next step: ${thread.next_step}`,
      '',
      thread.tags.length ? `Tags: ${thread.tags.join(', ')}` : 'Tags: none',
      '',
      `${prompt.model_name} continuation brief:`,
      prompt.prompt_text,
    ].join('\n')

    await navigator.clipboard.writeText(text)
    toast.success(`${prompt.model_name} thread copied`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Continue this thread</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">Choose a model and copy the complete handoff, including the thread brief.</p>
        </div>
        {onRegenerate ? (
          <Button variant="outline" onClick={onRegenerate} disabled={regenerating}>
            <WandSparkles className={regenerating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Rebuild handoffs
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={first}>
          <TabsList className="flex w-full flex-wrap justify-start gap-1">
            {prompts.map((prompt) => (
              <TabsTrigger key={prompt.model_name} value={prompt.model_name}>
                {prompt.model_name}
              </TabsTrigger>
            ))}
          </TabsList>
          {prompts.map((prompt) => (
            <TabsContent key={prompt.model_name} value={prompt.model_name}>
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted-foreground">{modelNotes[prompt.model_name]}</p>
                <Button onClick={() => copyThread(prompt)}>
                  <Clipboard className="h-4 w-4" />
                  Copy thread
                </Button>
              </div>
              <pre className="max-h-[440px] overflow-auto rounded-lg border bg-background p-4 text-sm leading-6 whitespace-pre-wrap text-foreground">
                {prompt.prompt_text}
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
