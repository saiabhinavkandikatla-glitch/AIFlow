import { ArrowRight, CheckCircle2, FileText, Link as LinkIcon, Lock, MessageSquareText, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const features = [
  { icon: LinkIcon, title: 'Share links', text: 'Import public ChatGPT or Claude conversations.' },
  { icon: FileText, title: 'Exports', text: 'Upload .txt or .json files from prior chats.' },
  { icon: MessageSquareText, title: 'Raw paste', text: 'Paste messy turns and let AI structure them.' },
  { icon: Lock, title: 'Protected library', text: 'Every generated thread is tied to your account.' },
]

const pricing = [
  ['Free', '$0', '5 threads/month', 'Basic output'],
  ['Pro', '$9', 'Unlimited threads', 'All model prompts'],
  ['Team', '$29', 'Shared workspace', 'Team thread library'],
]

export const LandingPage = () => (
  <div className="min-h-svh bg-background">
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold">ThreadBridge</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground">
            How it works
          </a>
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="hover:text-foreground">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className={buttonVariants({ variant: 'ghost' })}>
            Login
          </Link>
          <Link to="/signup" className={buttonVariants({ className: 'hidden sm:inline-flex' })}>
            Get Started Free
          </Link>
        </div>
      </div>
    </header>

    <section className="hero-scene relative min-h-[720px] overflow-hidden pt-16 text-white">
      <div className="absolute inset-x-0 bottom-0 h-40 bg-background" />
      <div className="relative mx-auto flex min-h-[656px] max-w-7xl items-center px-4 py-16 md:px-8">
        <div className="max-w-3xl">
          <Badge className="border-white/20 bg-white/10 text-white">AI context transfer platform</Badge>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight md:text-7xl">Continue any AI conversation, anywhere</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            ThreadBridge analyzes an existing AI conversation, extracts the useful state, and generates model-specific handoff prompts for ChatGPT, Claude, Gemini, DeepSeek, and Grok.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className={buttonVariants({ size: 'lg' })}>
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/pricing" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'border-white/20 bg-white/5 text-white hover:bg-white/10' })}>
              View pricing
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute right-[-80px] top-28 hidden w-[560px] rotate-1 lg:block">
          <div className="rounded-lg border border-white/15 bg-slate-950/80 p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-300" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-slate-400">handoff preview</span>
            </div>
            <div className="grid gap-3 pt-4">
              {['Detect goal', 'Extract decisions', 'Map last point', 'Generate prompts'].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/25 text-xs">{index + 1}</span>
                  <span className="text-sm text-slate-200">{item}</span>
                  <CheckCircle2 className="ml-auto h-4 w-4 text-accent" />
                </div>
              ))}
            </div>
          </div>
          <div className="ml-20 mt-5 rounded-lg border border-white/15 bg-slate-950/80 p-4 shadow-2xl">
            <div className="text-sm font-medium text-slate-200">Continue in Claude</div>
            <div className="mt-3 space-y-2">
              <div className="h-2 w-full rounded bg-white/15" />
              <div className="h-2 w-5/6 rounded bg-white/15" />
              <div className="h-2 w-3/5 rounded bg-white/15" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <main className="mx-auto max-w-7xl px-4 py-14 md:px-8">
      <section id="how" className="grid gap-4 md:grid-cols-3">
        {['Share', 'Analyze', 'Continue'].map((step, index) => (
          <Card key={step} className="lift">
            <CardContent className="p-6">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">{index + 1}</div>
              <h2 className="text-xl font-semibold">{step}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {index === 0 && 'Add a link, upload a file, paste raw text, or write a manual handoff.'}
                {index === 1 && 'Gemini extracts the topic, goal, decisions, current state, and next step.'}
                {index === 2 && 'Copy the best prompt for the model you want to use next.'}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section id="features" className="py-16">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-semibold">Built for messy, real conversations</h2>
          <p className="mt-3 text-muted-foreground">ThreadBridge turns long chats into portable state, not vague summaries.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="lift">
                <CardContent className="p-5">
                  <Icon className="mb-5 h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section id="pricing" className="pb-16">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-semibold">Simple plans</h2>
          <p className="mt-3 text-muted-foreground">Start free, upgrade when AI handoffs become part of your daily work.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {pricing.map(([name, price, lineOne, lineTwo]) => (
            <Card key={name} className={cn('lift', name === 'Pro' && 'border-primary')}>
              <CardContent className="p-6">
                <div className="text-sm font-medium text-muted-foreground">{name}</div>
                <div className="mt-3 text-3xl font-semibold">{price}<span className="text-base text-muted-foreground">/month</span></div>
                <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent" />{lineOne}</div>
                  <div className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-accent" />{lineTwo}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  </div>
)
