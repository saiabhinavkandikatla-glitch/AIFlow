import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  className?: string
}) => (
  <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center', className)}>
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</div>
    <h3 className="text-base font-semibold">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
)
