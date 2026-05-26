import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Card } from '@/components/ui/card'

export const AuthShell = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) => (
  <div className="grid min-h-svh bg-background lg:grid-cols-[1fr_560px]">
    <section className="hero-scene hidden min-h-svh p-8 text-white lg:flex lg:flex-col lg:justify-between">
      <Link to="/" className="flex items-center gap-3 font-semibold">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        ThreadBridge
      </Link>
      <div className="max-w-xl">
        <h1 className="text-5xl font-semibold leading-tight">Move the useful context, not the noise</h1>
        <p className="mt-5 text-lg leading-8 text-slate-300">
          Turn an old AI chat into a clean continuation brief with the goal, decisions, and next step ready to carry forward.
        </p>
      </div>
      <div className="grid gap-3">
        {['Thread state', 'Decisions', 'Last point', 'Next action', 'Model handoff'].map((model) => (
          <div key={model} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-sm">{model}</span>
            <span className="h-2 w-20 rounded bg-accent/70" />
          </div>
        ))}
      </div>
    </section>
    <section className="flex min-h-svh items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center lg:hidden">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            ThreadBridge
          </Link>
        </div>
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </Card>
      </div>
    </section>
  </div>
)
