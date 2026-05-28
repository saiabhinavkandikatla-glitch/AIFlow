import { useState } from 'react'
import { Check, Clipboard, WandSparkles } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { GeneratedPrompt, Thread } from '@/lib/types'

const modelNotes: Record<GeneratedPrompt['model_name'], string> = {
  ChatGPT: 'Structured handoff prompt for broad reasoning and fast task continuation.',
  Claude: 'Context-rich handoff prompt for careful analysis and nuanced writing.',
  Gemini: 'Synthesis-first handoff prompt with explicit assumptions and next moves.',
  DeepSeek: 'Execution-focused handoff prompt for technical problem solving.',
  Grok: 'Concise handoff prompt with direct framing and assumption checks.',
}

const modelStyles: Record<GeneratedPrompt['model_name'], string> = {
  ChatGPT: 'bg-emerald-500',
  Claude: 'bg-orange-500',
  Gemini: 'bg-blue-500',
  DeepSeek: 'bg-teal-500',
  Grok: 'bg-purple-500',
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
  const [copied, setCopied] = useState<string | null>(null)

  const copyThread = async (prompt: GeneratedPrompt) => {
    const text = [
      `AI Flow bridge for ${prompt.model_name}`,
      '',
      `Title: ${thread.title}`,
      `Current Strategic Objective: ${thread.goal}`,
      '',
      'Flow Context:',
      thread.context,
      '',
      'Settled Decisions:',
      ...(thread.key_decisions.length ? thread.key_decisions.map((decision) => `- ${decision}`) : ['- No explicit decisions were detected.']),
      '',
      `Current State: ${thread.last_point}`,
      `Next Milestone: ${thread.next_step}`,
      '',
      thread.tags.length ? `Context Signals: ${thread.tags.join(', ')}` : 'Context Signals: none',
      '',
      `${prompt.model_name} Model Handoff:`,
      prompt.prompt_text,
    ].join('\n')

    await navigator.clipboard.writeText(text)
    setCopied(prompt.model_name)
    window.setTimeout(() => setCopied(null), 2000)
    toast.success(`${prompt.model_name} handoff prompt copied`)
  }

  return (
    <Card className="animate-scale-in rounded-2xl">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="tracking-tight">Model Handoffs</CardTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose a destination model and copy a ready-to-paste continuation prompt.
          </p>
        </div>
        {onRegenerate ? (
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={regenerating}
            title="Refine handoff prompts"
            aria-label="Refine handoff prompts"
            className="rounded-xl"
          >
            <WandSparkles className={regenerating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refine Handoffs
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={first}>
          <TabsList className="flex w-full flex-wrap justify-start gap-2 border-0 bg-transparent p-0">
            {prompts.map((prompt) => (
              <TabsTrigger
                key={prompt.model_name}
                value={prompt.model_name}
                className="rounded-full border bg-background px-3 py-2 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                <span className={`h-2 w-2 rounded-full ${modelStyles[prompt.model_name]}`} />
                {prompt.model_name}
              </TabsTrigger>
            ))}
          </TabsList>
          {prompts.map((prompt) => (
            <TabsContent key={prompt.model_name} value={prompt.model_name} className="animate-fade-slide-up mt-4">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm leading-6 text-muted-foreground">{modelNotes[prompt.model_name]}</p>
                <Button
                  onClick={() => copyThread(prompt)}
                  title={`Copy a ${prompt.model_name} model handoff.`}
                  aria-label={`Copy ${prompt.model_name} model handoff`}
                  className="rounded-xl"
                >
                  {copied === prompt.model_name ? <Check className="h-4 w-4 text-emerald-500" /> : <Clipboard className="h-4 w-4" />}
                  {copied === prompt.model_name ? 'Copied!' : 'Copy Handoff'}
                </Button>
              </div>
              <pre className="max-h-[440px] overflow-auto whitespace-pre-wrap rounded-2xl border bg-muted/40 p-4 font-mono text-sm leading-6 text-foreground shadow-inner">
                {prompt.prompt_text}
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
