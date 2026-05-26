import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

export const UsageBanner = ({ count, limit }: { count: number; limit: number }) => (
  <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4 md:flex-row md:items-center md:justify-between">
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Zap className="h-4 w-4" />
      </div>
      <div>
        <div className="font-semibold">Upgrade to keep creating threads</div>
        <p className="text-sm text-muted-foreground">You have used {count}/{limit} thread generations this month.</p>
      </div>
    </div>
    <Link to="/pricing" className={buttonVariants({ className: 'md:w-auto' })}>
      View plans
    </Link>
  </div>
)
