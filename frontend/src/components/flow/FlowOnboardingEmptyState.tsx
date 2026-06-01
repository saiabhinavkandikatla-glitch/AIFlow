import { ArrowRight, Braces, GitBranch, ScanText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const onboardingSteps = [
  {
    icon: ScanText,
    title: 'Capture',
    text: 'Start from a share link, file export, raw chat log, or short manual summary.',
  },
  {
    icon: GitBranch,
    title: 'Map',
    text: 'AIFlow extracts the objective, settled decisions, project state, and next action.',
  },
  {
    icon: Braces,
    title: 'Handoff',
    text: 'Copy model handoffs, reuse the Flow, and move work across Claude, ChatGPT, DeepSeek, Gemini, and Grok.',
  },
]

export const FlowOnboardingEmptyState = ({ className }: { className?: string }) => (
  <section className={cn('overflow-hidden rounded-lg border bg-card/95', className)}>
    <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.4fr] lg:p-8">
      <div className="flex flex-col justify-between gap-6">
        <div>
          <div className="mb-4 inline-flex rounded-md border bg-muted px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
            Flow setup
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Capture your first AI conversation</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Turn a prior conversation into a reusable Flow with context, decisions, next steps, and model-specific handoff prompts.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/app/threads/new" className={buttonVariants()}>
            Capture Context
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/pricing" className={buttonVariants({ variant: 'outline' })}>
            View plans
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {onboardingSteps.map((step, index) => {
          const Icon = step.icon
          return (
            <div key={step.title} className="rounded-lg border bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="mt-5 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  </section>
)
