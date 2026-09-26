import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  LoaderCircle,
  Menu,
  Sparkles,
  Target,
  Trophy,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

const steps = [
  { label: 'Upload Material', path: '/upload', icon: Upload },
  { label: 'Set Your Goal', path: '/goal', icon: Target },
  { label: 'Practice', path: '/practice', icon: BookOpen },
  { label: 'Results', path: '/results', icon: Trophy },
] as const

/**
 * Index of the step the current URL belongs to, or -1 for unknown routes so
 * nothing is falsely marked active on a 404.
 */
function useActiveStep() {
  const { pathname } = useLocation()
  return steps.findIndex((step) => pathname.startsWith(step.path))
}

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-3 text-white">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-zinc-950">
        <Sparkles className="size-4" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold tracking-tight">recall</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
          Learn out loud
        </span>
      </span>
    </NavLink>
  )
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const activeStep = useActiveStep()
  const { data: health, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    retry: false,
  })

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto overscroll-contain bg-zinc-950 px-4 py-5 text-white lg:w-[248px] lg:shrink-0 xl:w-[264px]">
      <div className="flex items-center justify-between gap-2">
        <Brand />
        {onClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:ring-white lg:hidden"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Close Navigation</span>
          </Button>
        ) : null}
      </div>

      <nav className="mt-9 flex-1" aria-label="Main">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Your Journey
        </p>
        <ul className="space-y-1">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === activeStep
            const isDone = index < activeStep
            return (
              <li key={step.path}>
                <NavLink
                  to={step.path}
                  onClick={onClose}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-400 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {({ isActive: navActive }) => (
                    <>
                      <Icon
                        className="size-4 shrink-0"
                        strokeWidth={navActive || isDone ? 2.5 : 2}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">{step.label}</span>
                      {isDone ? (
                        <Check className="size-3.5 shrink-0 text-emerald-400" strokeWidth={3} aria-hidden="true" />
                      ) : isActive ? (
                        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                      ) : null}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-8 space-y-3 border-t border-white/10 pt-5">
        <p className="flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          <span
            aria-hidden="true"
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              isLoading ? 'bg-amber-300' : health ? 'bg-emerald-400' : 'bg-red-400',
            )}
          />
          <span className="truncate">
            {isLoading ? 'Checking API' : health ? 'API Connected' : 'API Offline'}
          </span>
        </p>
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-800 text-xs font-semibold">
            You
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-200">Personal Workspace</p>
            <p className="truncate text-[11px] text-zinc-500">Local session</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Escape closes the drawer; body scroll is locked while it is open.
  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen])

  return (
    <div className="h-dvh overflow-hidden bg-[#f7f7f5] text-zinc-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-zinc-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <div className="flex h-dvh">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              aria-label="Close Navigation"
              className="absolute inset-0 bg-zinc-950/50"
              onClick={() => setMobileOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="relative h-full w-[288px] max-w-[calc(100vw-3rem)] shadow-2xl"
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <main id="main-content" className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden">
            <Brand />
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
            >
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Open Navigation</span>
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </main>
      </div>
    </div>
  )
}

/**
 * Compact page heading. Deliberately has no "Step N of 6" eyebrow — the
 * sidebar already carries progress, and repeating it added noise.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-pretty text-2xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-[28px] sm:leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-pretty mt-1.5 text-sm leading-6 text-zinc-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function LoadingState({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500" role="status">
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? (
        <div className="grid size-14 place-items-center rounded-2xl bg-zinc-950 text-white">
          {icon}
        </div>
      ) : null}
      <h1 className="text-pretty mt-6 max-w-md text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
        {title}
      </h1>
      <p className="text-pretty mt-3 max-w-sm text-sm leading-6 text-zinc-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export function FileTypeIcon() {
  return <FileText className="size-5" aria-hidden="true" />
}
