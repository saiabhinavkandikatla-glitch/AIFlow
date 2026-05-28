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

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

type RazorpayCheckoutOptions = {
  key: string
  name: string
  description: string
  subscription_id: string
  prefill: {
    name?: string
    email: string
  }
  theme: {
    color: string
  }
  handler: (response: RazorpayCheckoutResponse) => void
  modal: {
    ondismiss: () => void
  }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void
    }
  }
}

const plans = [
  {
    name: 'Free',
    tier: 'free',
    price: '$0',
    description: 'For validating AIFlow with a few cross-model transfers.',
    featured: false,
    features: ['5 Flows/month', 'Core handoffs', 'Flow Studio'],
  },
  {
    name: 'Starter',
    tier: 'starter',
    price: '$1',
    description: 'For students and builders who need more Flow volume.',
    featured: true,
    features: ['20 Flows/month', 'All model handoffs', 'Saved Flow Studio'],
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '$9',
    description: 'For regular cross-model AI work and deeper handoff volume.',
    featured: false,
    features: ['Unlimited Flows', 'All model handoffs', 'Priority processing'],
  },
  {
    name: 'Team',
    tier: 'team',
    price: '$29',
    description: 'For shared workspaces and collaborative model handoffs.',
    featured: false,
    features: ['Everything in Pro', 'Team workspace', 'Shared Flows'],
  },
] as const

const loadRazorpayCheckout = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout. Check the connection and retry.'))
    document.body.appendChild(script)
  })

export const PricingPage = () => {
  const { token, profile, refreshProfile } = useAuth()
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
      const checkout = await billingApi.checkout(token, tier)
      await loadRazorpayCheckout()

      const payment = await new Promise<RazorpayCheckoutResponse>((resolve, reject) => {
        const Razorpay = window.Razorpay
        if (!Razorpay) {
          reject(new Error('Razorpay Checkout did not initialize.'))
          return
        }

        const razorpay = new Razorpay({
          key: checkout.key_id,
          name: checkout.app_name,
          description: checkout.description,
          subscription_id: checkout.subscription_id,
          prefill: checkout.prefill,
          theme: {
            color: '#6aa6ff',
          },
          handler: resolve,
          modal: {
            ondismiss: () => reject(new Error('Razorpay checkout was closed before payment finished.')),
          },
        })
        razorpay.open()
      })

      await billingApi.verify(token, {
        plan: tier,
        ...payment,
      })
      await refreshProfile()
      toast.success({
        title: 'Plan upgraded',
        message: 'Razorpay verified your payment and refreshed your AIFlow limits.',
      })
      navigate('/app/settings')
    } catch (error) {
      toast.error({
        title: 'Razorpay checkout failed',
        message: error instanceof Error ? error.message : 'Could not start checkout.',
        recovery: 'Check Razorpay keys and plan IDs on the backend, then retry the checkout.',
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
          <h1 className="text-4xl font-semibold md:text-5xl">Plans for every Flow volume</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Upgrade with Razorpay Checkout for recurring subscriptions, invoices, and cancellation from AIFlow settings.
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
