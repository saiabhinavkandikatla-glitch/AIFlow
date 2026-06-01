import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe2,
  Layers3,
  MessageSquareText,
  Network,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const trustItems = [
  { icon: BrainCircuit, label: 'Gemini-powered context mapping' },
  { icon: Globe2, label: 'Public share link support' },
  { icon: ShieldCheck, label: 'Supabase authentication' },
  { icon: Zap, label: 'Fast model handoff prompts' },
]

const bentoFeatures: { icon: LucideIcon; title: string; text: string; className?: string }[] = [
  {
    icon: MessageSquareText,
    title: 'Conversation Capture',
    text: 'Import public AI share links, raw chat logs, .txt/.json exports, or a manual summary.',
    className: 'md:col-span-2',
  },
  {
    icon: BrainCircuit,
    title: 'Context Mapping',
    text: 'Extract the goal, key decisions, current state, last point, tags, and next step.',
  },
  {
    icon: FileText,
    title: 'Export Uploads',
    text: 'Use .txt and .json conversation exports when a provider hides public share content.',
  },
  {
    icon: Layers3,
    title: 'Flow Library',
    text: 'Save each transfer as a reusable AI Flow with search, detail pages, rename, and delete.',
  },
  {
    icon: Network,
    title: 'Model Handoff Prompts',
    text: 'Generate ready-to-paste prompts for ChatGPT, Claude, Gemini, DeepSeek, and Grok.',
    className: 'md:col-span-2',
  },
  {
    icon: Zap,
    title: 'Prompt Refinement',
    text: 'Regenerate handoff prompts when you want a cleaner continuation for every target model.',
  },
  {
    icon: ShieldCheck,
    title: 'Private Workspace',
    text: 'Each user owns their saved Flows through authenticated, protected app routes.',
    className: 'md:col-span-2',
  },
]

const handoffSteps = [
  ['Capture', 'Claude share link imported', 'border-blue-400/40 bg-blue-500/10'],
  ['Map', 'Goal, decisions, and last point extracted', 'border-purple-400/40 bg-purple-500/10'],
  ['Generate', 'Five model handoff prompts created', 'border-cyan-400/40 bg-cyan-500/10'],
  ['Continue', 'Paste into ChatGPT and resume', 'border-emerald-400/40 bg-emerald-500/10'],
]

const howItWorks = [
  ['Import', 'Paste a public share link, upload a chat export, paste raw text, or write a manual summary.'],
  ['Analyze', 'AIFlow turns messy conversation history into a clean Flow: goal, context, decisions, and next step.'],
  ['Handoff', 'Copy a target-model prompt and continue the same work in ChatGPT, Claude, Gemini, DeepSeek, or Grok.'],
]

const reliabilityNotes = [
  ['Claude shares', 'Uses Claude public snapshot JSON when the HTML shell hides the transcript.'],
  ['Long chats', 'Automatically trims oversized imports while keeping the analysis request inside the backend limit.'],
  ['Fallbacks', 'If a provider blocks transcript extraction, users can upload .txt/.json or paste the chat directly.'],
]

const pricing: { name: string; price: string; subtitle: string; items: string[] }[] = [
  { name: 'Free', price: '$0', subtitle: 'Try AIFlow', items: ['5 AI Flows/month', 'Core model handoffs', 'Flow Studio'] },
  { name: 'Starter', price: '$1', subtitle: 'For regular transfers', items: ['20 AI Flows/month', 'All model handoffs', 'Saved Flow library'] },
  { name: 'Pro', price: '$9', subtitle: 'For heavy AI work', items: ['Unlimited AI Flows', 'Prompt refinement', 'Priority processing'] },
  { name: 'Team', price: '$29', subtitle: 'For shared context work', items: ['Everything in Pro', 'Team workspace', 'Shared AI Flows'] },
]

const faqs = [
  ['Does AIFlow chat with models for me?', 'No. AIFlow creates structured handoff prompts so you can continue work in the model you choose.'],
  ['Which models are supported?', 'AIFlow generates handoffs for ChatGPT, Claude, Gemini, DeepSeek, and Grok.'],
  ['What can I import?', 'You can use public share links, .txt/.json exports, raw pasted transcripts, or a manual conversation summary.'],
  ['What if a share link blocks extraction?', 'Use a pasted transcript or export upload. Some providers hide transcripts behind browser-only rendering or protection.'],
]

const ProductPreview = () => (
  <div className="relative">
    <div className="absolute inset-0 translate-y-6 rounded-lg bg-primary/20 blur-3xl" />
    <div className="relative overflow-hidden rounded-lg border border-white/12 bg-zinc-950/85 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-300" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
          <Search className="h-3.5 w-3.5" />
          Command K
        </div>
      </div>
      <div className="grid min-h-[460px] lg:grid-cols-[180px_1fr_220px]">
        <aside className="hidden border-r border-white/10 p-4 text-sm text-zinc-400 lg:block">
          {['Dashboard', 'Capture', 'Flows', 'Handoffs', 'Settings'].map((item, index) => (
            <div key={item} className={cn('mb-2 rounded-md px-3 py-2', index === 2 && 'bg-white/10 text-white')}>
              {item}
            </div>
          ))}
        </aside>
        <div className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-zinc-500">Captured Flow</div>
              <div className="text-lg font-semibold text-white">Claude to ChatGPT handoff</div>
            </div>
            <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">Ready</div>
          </div>
          <div className="relative grid gap-4">
            <div className="absolute left-6 top-10 hidden h-[260px] w-px bg-gradient-to-b from-blue-400 via-purple-400 to-emerald-300 md:block" />
            {handoffSteps.map(([label, text, style], index) => (
              <div key={label} className={cn('relative rounded-lg border p-4', style)}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-xs text-white">{index + 1}</span>
                  <div>
                    <div className="text-xs uppercase text-zinc-400">{label}</div>
                    <div className="font-medium text-white">{text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="border-t border-white/10 p-4 lg:border-l lg:border-t-0">
          <div className="mb-3 text-xs uppercase text-zinc-500">Generated Prompts</div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-zinc-300">
            Continue this prior AI conversation from the exact state captured in the Flow.
          </div>
          <div className="mt-4 space-y-2">
            {['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Grok'].map((model) => (
              <div key={model} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-300">
                {model}
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  </div>
)

export const LandingPage = () => (
  <div className="min-h-svh overflow-hidden bg-[#090b10] text-white">
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-[#090b10]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-zinc-950">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold">AI Flow</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#demo" className="hover:text-white">Demo</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className={buttonVariants({ variant: 'ghost', className: 'text-white hover:bg-white/10' })}>
            Login
          </Link>
          <Link to="/signup" className={buttonVariants({ className: 'hidden bg-white text-zinc-950 hover:bg-zinc-200 sm:inline-flex' })}>
            Start Free
          </Link>
        </div>
      </div>
    </header>

    <section className="relative px-4 pb-20 pt-32 md:px-8 md:pt-40">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(135deg,rgba(49,87,255,0.28),rgba(124,58,237,0.16),transparent_62%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <Badge className="border-white/15 bg-white/10 text-white">AI conversation transfer</Badge>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] md:text-7xl">
            Move AI conversations between models without losing context
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Import a chat from Claude, ChatGPT, Gemini, DeepSeek, or Grok. AIFlow maps the context and generates a clean handoff prompt for the model you want to use next.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/signup" className={buttonVariants({ size: 'lg', className: 'bg-white text-zinc-950 hover:bg-zinc-200' })}>
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#demo" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'border-white/15 bg-white/5 text-white hover:bg-white/10' })}>
              <Play className="h-4 w-4" />
              See Handoff Demo
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-zinc-400">
            {['Share links', 'TXT/JSON exports', 'Raw chat logs', 'Manual summaries'].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{item}</span>
            ))}
          </div>
        </div>
        <ProductPreview />
      </div>
    </section>

    <main className="relative bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="grid gap-3 md:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-lg border bg-card/80 p-4">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold text-primary">What AIFlow actually does</p>
          <h2 className="mt-2 text-4xl font-semibold">Turn messy AI chats into reusable model handoffs.</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            The product is focused on one practical job: preserve conversation state and help you continue that work in another AI model.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {bentoFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className={cn('lift overflow-hidden', feature.className)}>
                <CardContent className="p-5">
                  <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.text}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-primary">Demo flow</p>
            <h2 className="mt-2 text-4xl font-semibold">From conversation link to continuation prompt.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Capture the prior chat, let AIFlow extract the state, then copy the handoff for the model you want to use next.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {['Import share link', 'Extract decisions', 'Generate handoffs', 'Resume elsewhere'].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Handoff Builder</span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">Ready to copy</span>
            </div>
            <div className="grid gap-3">
              {handoffSteps.map(([label, text], index) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border bg-background/70 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">{label}</div>
                    <div className="font-medium">{text}</div>
                  </div>
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {howItWorks.map(([title, text], index) => (
            <Card key={title} className="lift">
              <CardContent className="p-6">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">0{index + 1}</div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Reliability</p>
            <h2 className="mt-2 text-4xl font-semibold">Clear limits, useful fallbacks.</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {reliabilityNotes.map(([title, text]) => (
            <Card key={title} className="lift">
              <CardContent className="p-6">
                <div className="font-semibold">{title}</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold text-primary">Pricing</p>
          <h2 className="mt-2 text-4xl font-semibold">Start free. Upgrade when you need more handoffs.</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {pricing.map(({ name, price, subtitle, items }) => (
            <Card key={name} className={cn('lift', name === 'Pro' && 'border-primary')}>
              <CardContent className="p-6">
                <div className="text-sm font-medium text-muted-foreground">{name}</div>
                <div className="mt-3 text-3xl font-semibold">{price}<span className="text-base text-muted-foreground">{price === 'Custom' ? '' : '/month'}</span></div>
                <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
                <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {items.map((item) => (
                    <div key={item} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-4 py-16 md:px-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="mt-2 text-4xl font-semibold">Questions before you transfer?</h2>
        </div>
        <div className="grid gap-3">
          {faqs.map(([question, answer]) => (
            <Card key={question}>
              <CardContent className="p-5">
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="overflow-hidden rounded-lg border bg-[#090b10] p-8 text-white md:p-12">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-semibold md:text-5xl">Capture Your First AI Conversation</h2>
            <p className="mt-4 text-lg leading-8 text-zinc-300">
              Create a Flow from a link, export, raw transcript, or manual summary and continue the work in your next model.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={buttonVariants({ size: 'lg', className: 'bg-white text-zinc-950 hover:bg-zinc-200' })}>
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'border-white/15 bg-white/5 text-white hover:bg-white/10' })}>
                Open Workspace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
)
