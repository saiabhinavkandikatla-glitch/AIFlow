import * as React from 'react'
import { cn } from '@/lib/utils'

type TabsContextValue = {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

export const Tabs = ({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: {
  value?: string
  defaultValue: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}) => {
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value ?? internal
  return (
    <TabsContext.Provider
      value={{
        value: current,
        onValueChange: (next) => {
          setInternal(next)
          onValueChange?.(next)
        },
      }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export const TabsList = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('inline-flex rounded-md border bg-muted p-1', className)} {...props} />
)

export const TabsTrigger = ({
  value,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) => {
  const context = React.useContext(TabsContext)
  const selected = context?.value === value
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => context?.onValueChange(value)}
      className={cn(
        'inline-flex min-h-8 items-center justify-center gap-2 rounded px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground',
        selected && 'bg-background text-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = ({
  value,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) => {
  const context = React.useContext(TabsContext)
  if (context?.value !== value) return null
  return <div className={cn('mt-4', className)} {...props} />
}
