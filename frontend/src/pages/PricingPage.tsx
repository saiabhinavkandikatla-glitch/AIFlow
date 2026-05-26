import { CheckCircle2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Free',
    price: '$0',
    features: ['5 threads/month', 'Basic output', 'Thread library'],
  },
  {
    name: 'Pro',
    price: '$9',
    featured: true,
    features: ['Unlimited threads', 'All model prompts', 'Priority processing'],
  },
  {
    name: 'Team',
    price: '$29',
    features: ['Everything in Pro', 'Team workspace', 'Shared threads'],
  },
]

export const PricingPage = () => (
  <div className="min-h-svh bg-background">
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          ThreadBridge
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/signup" className={buttonVariants()}>
            Get Started Free
          </Link>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-14 md:px-8">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold md:text-5xl">Pricing that scales with your handoffs</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">Payment wiring is intentionally left out for this MVP. The UI reflects the product tiers and plan limits.</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={cn('lift', plan.featured && 'border-primary')}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="text-4xl font-semibold">{plan.price}<span className="text-base text-muted-foreground">/month</span></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {feature}
                  </div>
                ))}
              </div>
              <Link to="/signup" className={buttonVariants({ className: 'mt-6 w-full' })}>
                Choose {plan.name}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  </div>
)
