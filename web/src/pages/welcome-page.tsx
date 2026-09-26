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

import { Badge } from '../components/ui/badge'
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
    <Link to="/" className="flex items-center gap-3 text-zinc-950">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white">
        <Sparkles className="size-4" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold tracking-tight">recall</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">
          Learn out loud
        </span>
      </span>
    </Link>
  )
}

export function WelcomePage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f7f7f5] text-zinc-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-zinc-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-[#f7f7f5]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <PublicBrand />
          <nav
            className="hidden items-center gap-7 text-sm font-medium text-zinc-500 md:flex"
            aria-label="Marketing"
          >
            <a href="#how-it-works" className="transition-colors hover:text-zinc-950">
              How It Works
            </a>
            <a href="#outcomes" className="transition-colors hover:text-zinc-950">
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
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-20">
          <div className="max-w-3xl">
            <Badge className="border-zinc-300 bg-white text-zinc-700">A Calmer Way to Learn</Badge>
            <h1 className="text-balance mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-6xl">
              Turn what you study into what you{' '}
              <span className="text-zinc-400">remember.</span>
            </h1>
            <p className="text-pretty mt-5 max-w-xl text-base leading-7 text-zinc-500 sm:text-lg sm:leading-8">
              Bring your material, say what you need to achieve, then practice answering out loud.
              Finish with a clear report on what you know and what to fix.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/upload">
                  Start a Learning Session
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
            <p className="mt-7 flex items-center gap-2.5 text-xs text-zinc-500">
              <Sparkles className="size-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
              No account needed. Your session stays in this workspace.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">How It Works</p>
              <h2 className="text-balance mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                One Loop. Three Moves.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {pillars.map(({ icon: Icon, title, text }, index) => (
                <Card key={title} className="rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-950">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="tabular text-xs font-bold text-zinc-300">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="text-pretty mt-6 text-base font-semibold tracking-tight">
                      {title}
                    </h3>
                    <p className="text-pretty mt-2 text-sm leading-6 text-zinc-500">{text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="outcomes" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">What You Get</p>
              <h2 className="text-balance mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Less Noise. More Understanding.
              </h2>
            </div>
            <p className="text-pretty max-w-2xl text-base leading-7 text-zinc-500">
              No rubrics, no agent logs, no jargon. Just an honest picture of what you know, the
              ideas that need work, and the shortest path to fixing them.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {outcomes.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <Icon className="size-4 text-zinc-400" aria-hidden="true" />
                <p className="mt-4 text-sm font-semibold tracking-tight">{title}</p>
                <p className="text-pretty mt-1.5 text-sm leading-6 text-zinc-500">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-zinc-200 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <BookOpenCheck className="size-4 shrink-0" aria-hidden="true" />
              Built for short, repeatable sessions.
            </span>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 font-semibold text-zinc-950 transition-colors hover:text-zinc-600"
            >
              Start Learning
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>Recall · Learn out loud</span>
          <span>Focused practice for curious people.</span>
        </div>
      </footer>
    </div>
  )
}
