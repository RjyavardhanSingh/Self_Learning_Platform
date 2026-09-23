import { ArrowRight, BookOpenCheck, Brain, FileUp, Sparkles, Target } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

const pillars = [
  { icon: FileUp, title: 'Bring your material', text: 'Upload a PDF or paste your notes. Your source becomes the foundation.' },
  { icon: Target, title: 'Set a real goal', text: 'Tell us what you want to understand, not just what you need to memorize.' },
  { icon: Brain, title: 'Practice out loud', text: 'Answer one question at a time and get useful feedback while you learn.' },
]

function PublicBrand() {
  return (
    <Link to="/" className="flex items-center gap-3 text-zinc-950">
      <span className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-white">
        <Sparkles className="size-4" strokeWidth={2.5} />
      </span>
      <span>
        <span className="block text-sm font-bold tracking-tight">recall</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400">learn out loud</span>
      </span>
    </Link>
  )
}

export function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <PublicBrand />
          <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-500 md:flex" aria-label="Public navigation">
            <a href="#how-it-works" className="transition hover:text-zinc-950">How it works</a>
            <a href="#approach" className="transition hover:text-zinc-950">Our approach</a>
          </nav>
          <Link to="/upload">
            <Button size="sm" className="hidden sm:inline-flex">Open workspace <ArrowRight className="size-3.5" /></Button>
            <Button size="icon" className="sm:hidden" aria-label="Open workspace"><ArrowRight className="size-4" /></Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pb-28 lg:pt-32">
          <div className="max-w-4xl">
            <div className="max-w-3xl">
              <Badge className="border-zinc-300 bg-white text-zinc-700">A calmer way to learn</Badge>
              <h1 className="mt-7 text-5xl font-semibold leading-[1.03] tracking-[-0.065em] text-zinc-950 sm:text-6xl lg:text-7xl">
                Turn what you study into what you <span className="text-zinc-400">remember.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-500">
                Recall helps you practice with purpose. Bring your material, set your goal, and build confidence one answer at a time.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/upload">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start a learning session
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">See how it works</Button>
                </a>
              </div>
              <div className="mt-10 flex items-center gap-3 text-xs text-zinc-500">
                <span className="grid size-7 place-items-center rounded-full bg-zinc-950 text-white"><Sparkles className="size-3.5" /></span>
                No account needed. Your session stays in this workspace.
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
            <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">How it works</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 sm:text-4xl">A simple loop for deeper understanding.</h2></div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {pillars.map(({ icon: Icon, title, text }) => <Card key={title} className="rounded-2xl"><CardContent className="p-6"><div className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-950"><Icon className="size-5" /></div><h3 className="mt-6 text-base font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></CardContent></Card>)}
            </div>
          </div>
        </section>

        <section id="approach" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Our approach</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Less noise. More understanding.</h2></div><p className="max-w-2xl text-base leading-7 text-zinc-500">Recall turns a pile of material into a small, repeatable practice loop. You stay focused on one question, get useful feedback, and build a clearer picture of what you know.</p></div>
          <div className="mt-10 flex flex-col gap-4 border-t border-zinc-200 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><BookOpenCheck className="size-4" /> Built for short, repeatable sessions.</span><Link to="/upload" className="inline-flex items-center gap-2 font-semibold text-zinc-950">Start learning <ArrowRight className="size-4" /></Link></div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><span>Recall · Learn out loud</span><span>Focused practice for curious people.</span></div></footer>
    </div>
  )
}
