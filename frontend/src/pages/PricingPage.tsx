import { useEffect, useState } from 'react'
import { CheckCircle2, CreditCard, Loader2, Sparkles } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { billingApi } from '@/lib/api'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Free',
    tier: 'free',
    price: '$0',
    description: 'For trying AIFlow with a few conversations.',
    featured: false,
    features: ['5 threads/month', 'Basic output', 'Thread library'],
  },
  {
    name: 'Starter',
    tier: 'starter',
    price: '$1',
    description: 'For students and builders who need more context transfers.',
    featured: true,
    features: ['20 threads/month', 'All model prompts', 'Saved thread library'],
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '$9',
    description: 'For regular cross-model conversation handoffs.',
    featured: false,
    features: ['Unlimited threads', 'All model prompts', 'Priority processing'],
  },
  {
    name: 'Team',
    tier: 'team',
    price: '$29',
    description: 'For shared workspaces and collaborative handoffs.',
    featured: false,
    features: ['Everything in Pro', 'Team workspace', 'Shared threads'],
  },
] as const

export const PricingPage = () => {
  const { token, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('billing') === 'cancelled') {
      toast.info({
        title: 'Checkout cancelled',
        message: 'No plan change was made. You can restart checkout whenever you are ready.',
      })
    }
  }, [searchParams])

  const choosePlan = async (tier: 'free' | 'starter' | 'pro' | 'team') => {
    if (tier === 'free') {
      navigate(token ? '/app' : '/signup')
      return
    }

    if (!token) {
      toast.info({
        title: 'Sign in to upgrade',
        message: 'Create or open your account first, then choose your plan.',
      })
      navigate('/signup')
      return
    }

    setLoadingPlan(tier)
    try {
      const response = await billingApi.checkout(token, tier)
      window.location.assign(response.url)
    } catch (error) {
      toast.error({
        title: 'Billing is not ready',
        message: error instanceof Error ? error.message : 'Could not start checkout.',
        recovery: 'Add Stripe keys and price IDs on the backend, restart the API, then try again.',
      })
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link to="/" className="flex items-center gap-3 font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            AIFlow
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {token ? (
              <Link to="/app/settings" className={buttonVariants({ variant: 'outline' })}>
                Billing
              </Link>
            ) : (
              <Link to="/signup" className={buttonVariants()}>
                Get Started Free
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold md:text-5xl">Plans for every handoff rhythm</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Upgrade with Stripe Checkout, then manage billing, payment methods, invoices, and cancellation from the customer portal.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = profile?.plan === plan.tier
            const isLoading = loadingPlan === plan.tier

            return (
              <Card key={plan.name} className={cn('lift', plan.featured && 'border-primary')}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="text-4xl font-semibold">
                    {plan.price}
                    <span className="text-base text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
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
                  <Button className="mt-6 w-full" variant={plan.featured ? 'default' : 'outline'} disabled={isLoading || isCurrent} onClick={() => choosePlan(plan.tier)}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {isCurrent ? 'Current plan' : plan.tier === 'free' ? 'Start Free' : `Upgrade to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
