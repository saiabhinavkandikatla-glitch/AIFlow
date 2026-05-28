import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, Layers3, Menu, Plus, Settings, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/app', icon: Home, end: true },
  { label: 'Capture Context', href: '/app/threads/new', icon: Plus },
  { label: 'Flows', href: '/app/threads', icon: Layers3 },
  { label: 'Settings', href: '/app/settings', icon: Settings },
]

const pageTitleForPath = (pathname: string) => {
  if (pathname === '/app') return 'Dashboard'
  if (pathname.startsWith('/app/threads/new')) return 'Capture Context'
  if (pathname.startsWith('/app/threads')) return 'Flows'
  if (pathname.startsWith('/app/settings')) return 'Settings'
  return 'AI Flow'
}

export const AppLayout = () => {
  const [open, setOpen] = useState(false)
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const displayName = profile?.name?.trim() || profile?.email || 'AI Flow user'
  const displayEmail = profile?.email ?? 'Profile not loaded'
  const initial = displayName.slice(0, 1).toUpperCase()
  const pageTitle = pageTitleForPath(location.pathname)

  useEffect(() => {
    if (profile && !profile.name?.trim()) {
      navigate('/app/onboarding', { replace: true })
    }
  }, [navigate, profile])

  const avatar = profile?.avatar_url ? (
    <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initial}
    </div>
  )

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]">
      <div className="flex h-14 items-center gap-3 border-b border-[var(--sidebar-border)] px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">AI Flow</div>
          <div className="text-xs text-muted-foreground">Conversation handoff</div>
        </div>
      </div>

      <div className="border-b border-[var(--sidebar-border)] p-3">
        <Link
          to="/app/threads/new"
          onClick={() => setOpen(false)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/15 hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Capture Context
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item, index) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={item.href}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'animate-slide-in-left flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                  `stagger-${Math.min(index + 1, 5)}`,
                  isActive && 'bg-primary/10 text-primary',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-3">
        <Link
          to="/app/settings"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
        >
          {avatar}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{displayEmail}</div>
          </div>
        </Link>
      </div>
    </aside>
  )

  return (
    <div className="workspace-shell min-h-svh">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-40 animate-fade-in lg:hidden">
          <button className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64 animate-slide-in-left">{sidebar}</div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/50 bg-background/85 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-semibold tracking-tight md:text-lg">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/app/settings" className="rounded-full p-1 hover:bg-muted" aria-label="Open settings">
              {avatar}
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border/70 bg-background/95 p-2 backdrop-blur lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.label}
                to={item.href}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs text-muted-foreground',
                    isActive && 'bg-primary/10 text-primary',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
