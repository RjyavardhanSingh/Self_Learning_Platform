import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  FileUp,
  Mic,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

const pillars = [
  {
    icon: FileUp,
    title: 'Bring Your Material',
    text: 'Upload a PDF or paste your notes. Your own source becomes the foundation for every question.',
  },
  {
    icon: Target,
    title: 'Set a Real Goal',
    text: 'Say what you want to understand, not just what you need to memorize. Three levels, no jargon.',
  },
  {
    icon: Mic,
    title: 'Practice Out Loud',
    text: 'Answer one question at a time by speaking. Scoring runs behind the scenes while you keep talking.',
  },
]

const outcomes = [
  { icon: Trophy, title: 'A Readiness Score', text: 'One honest number for how well you hold up right now.' },
  { icon: Brain, title: 'What to Fix', text: 'The specific concepts you missed, grouped by topic.' },
  { icon: BookOpenCheck, title: 'Mix-Ups We Noticed', text: 'The wrong ideas that keep showing up, in plain language.' },
]

function PublicBrand() {
  return (
    <Link to="/" className="flex items-center gap-3 text-ink">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-white">
        <Sparkles className="size-4" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold tracking-tight">recall</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint">
          Learn out loud
        </span>
      </span>
    </Link>
  )
}

export function WelcomePage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <PublicBrand />
          <nav
            className="hidden items-center gap-7 text-sm font-medium text-ink-muted md:flex"
            aria-label="Marketing"
          >
            <a href="#how-it-works" className="transition-colors hover:text-ink">
              How It Works
            </a>
            <a href="#outcomes" className="transition-colors hover:text-ink">
              What You Get
            </a>
          </nav>
          <Button asChild size="sm" className="hidden shrink-0 sm:inline-flex">
            <Link to="/upload">
              Open Workspace
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="icon" className="shrink-0 sm:hidden">
            <Link to="/upload" aria-label="Open Workspace">
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>

      <main id="main-content">
        <section className="relative isolate mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-24">
          {/* Single soft accent wash, borrowed from the reference hero. One
              colour, low opacity, decorative only. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[380px] w-[min(90vw,860px)] -translate-x-1/2 rounded-full bg-accent-tint opacity-80 blur-3xl"
          />
          <div className="max-w-3xl">
            <h1 className="text-balance text-[2.6rem] leading-[1.02] tracking-[-0.035em] sm:text-6xl">
              Turn what you study into what you{' '}
              <span className="text-purple-400 font-semibold">remember.</span>
            </h1>
            <p className="text-pretty mt-5 max-w-xl text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">
              Bring your material, say what you need to achieve, then practice answering out loud.
              Finish with a clear report on what you know and what to fix.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
                <Link to="/upload">
                  Start a Session
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
            <p className="mt-7 flex items-center gap-2.5 text-xs text-ink-muted">
              <Sparkles className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
              No account needed. Your session stays in this workspace.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">How It Works</p>
              <h2 className="text-balance mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                One Loop. Three Moves.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {pillars.map(({ icon: Icon, title, text }, index) => (
                <Card key={title} className="rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-xl bg-sunk text-ink">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="tabular text-xs font-bold text-line-strong">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="text-pretty mt-6 text-base font-semibold tracking-tight">
                      {title}
                    </h3>
                    <p className="text-pretty mt-2 text-sm leading-6 text-ink-muted">{text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="outcomes" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-muted">What You Get</p>
              <h2 className="text-balance mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Less Noise. More Understanding.
              </h2>
            </div>
            <p className="text-pretty max-w-2xl text-base leading-7 text-ink-muted">
              No rubrics, no agent logs, no jargon. Just an honest picture of what you know, the
              ideas that need work, and the shortest path to fixing them.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {outcomes.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <Icon className="size-4 text-ink-faint" aria-hidden="true" />
                <p className="mt-4 text-sm font-semibold tracking-tight">{title}</p>
                <p className="text-pretty mt-1.5 text-sm leading-6 text-ink-muted">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <BookOpenCheck className="size-4 shrink-0" aria-hidden="true" />
              Built for short, repeatable sessions.
            </span>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 font-semibold text-ink transition-colors hover:text-ink-muted"
            >
              Start Learning
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>Recall · Learn out loud</span>
          <span>Focused practice for curious people.</span>
        </div>
      </footer>
    </div>
  )
}
