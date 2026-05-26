import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, Layers3, LogOut, Menu, Plus, Settings, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/app', icon: Home, end: true },
  { label: 'My Threads', href: '/app/threads', icon: Layers3 },
  { label: 'New Thread', href: '/app/threads/new', icon: Plus },
  { label: 'Settings', href: '/app/settings', icon: Settings },
]

export const AppLayout = () => {
  const [open, setOpen] = useState(false)
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (profile && !profile.name?.trim()) {
      navigate('/app/onboarding', { replace: true })
    }
  }, [navigate, profile])

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out')
    navigate('/')
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r bg-card/95">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">AIFlow</div>
          <div className="text-xs text-muted-foreground capitalize">{profile?.plan ?? 'free'} workspace</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground',
                  isActive && 'border-primary/20 bg-primary/10 text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t p-3">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )

  return (
    <div className="workspace-shell min-h-svh">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-background/80" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative h-full w-72">{sidebar}</div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Private context workspace</div>
              <div className="text-lg font-semibold">Carry the thread forward</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-3 rounded-md border px-3 py-2 md:flex">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {(profile?.name ?? profile?.email ?? 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="max-w-40 truncate text-sm">{profile?.name ?? profile?.email}</div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
