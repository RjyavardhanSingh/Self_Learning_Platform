import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Sparkles,
  Target,
  Trophy,
  Upload,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

const steps = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Upload material', path: '/upload', icon: Upload },
  { label: 'Set your goal', path: '/goal', icon: Target },
  { label: 'Practice', path: '/practice', icon: BookOpen },
  { label: 'Results', path: '/results', icon: Trophy },
]

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-3 text-white">
      <span className="grid size-9 place-items-center rounded-xl bg-white text-zinc-950">
        <Sparkles className="size-4" strokeWidth={2.5} />
      </span>
      <span>
        <span className="block text-sm font-bold tracking-tight">recall</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">learn out loud</span>
      </span>
    </NavLink>
  )
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation()
  const { data: health, isLoading } = useQuery({ queryKey: ['health'], queryFn: api.health, retry: false })

  return (
    <aside className="flex h-full w-full flex-col bg-zinc-950 px-4 py-5 text-white lg:w-[252px] lg:shrink-0 lg:px-5">
      <div className="flex items-center justify-between">
        <Brand />
        {onClose ? (
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:bg-white/10 hover:text-white lg:hidden" onClick={onClose}>
            <X className="size-5" />
            <span className="sr-only">Close navigation</span>
          </Button>
        ) : null}
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          <span className={cn('size-1.5 rounded-full', isLoading ? 'bg-amber-300' : health ? 'bg-emerald-300' : 'bg-red-300')} />
          {isLoading ? 'Checking API' : health ? 'API connected' : 'API offline'}
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          Your learning workspace is ready when you are.
        </p>
      </div>

      <nav className="mt-8 flex-1 space-y-1" aria-label="Main navigation">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Your journey</p>
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = step.path === '/' ? location.pathname === '/' : location.pathname.startsWith(step.path)
          const isAvailable = index < 2 || isActive
          return (
            <NavLink
              key={step.path}
              to={step.path}
              onClick={onClose}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                isActive ? 'bg-white text-zinc-950' : isAvailable ? 'text-zinc-400 hover:bg-white/10 hover:text-white' : 'text-zinc-600',
              )}
            >
              <Icon className="size-4" strokeWidth={isActive ? 2.5 : 2} />
              <span className="flex-1">{step.label}</span>
              {isActive ? <ArrowRight className="size-3.5" /> : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/10 pt-5">
        <NavLink to="/upload" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/10 hover:text-white">
          <CircleHelp className="size-4" />
          <span>How it works</span>
        </NavLink>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <span className="grid size-8 place-items-center rounded-full bg-zinc-800 text-xs font-semibold">You</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-200">Personal workspace</p>
            <p className="truncate text-[11px] text-zinc-500">Local session</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-zinc-950/40" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full w-[285px] shadow-2xl">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}
        <main className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-zinc-200/80 bg-white/80 px-5 backdrop-blur lg:hidden">
            <Brand />
            <Button variant="secondary" size="icon" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
          </header>
          <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">{children}</div>
        </main>
      </div>
    </div>
  )
}

export function StepHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-7 text-zinc-500">{description}</p>
    </div>
  )
}

export function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current} of 6`}>
      {[1, 2, 3, 4, 5, 6].map((step) => (
        <span key={step} className={cn('h-1.5 rounded-full transition-all', step <= current ? 'w-8 bg-zinc-950' : 'w-4 bg-zinc-200')} />
      ))}
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
      <LoaderCircle className="size-4 animate-spin" />
      Loading your workspace…
    </div>
  )
}

export function CompletedMark() {
  return <Check className="size-3.5" strokeWidth={3} />
}

export function FileTypeIcon() {
  return <FileText className="size-5" />
}
