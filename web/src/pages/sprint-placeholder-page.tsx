import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppShell, ProgressDots } from '../components/layout/app-shell'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

export function SprintPlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <Card className="w-full">
          <CardContent className="p-8 text-center sm:p-12">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-zinc-950 text-white"><Sparkles className="size-6" /></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Recall · Sprint 2</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">{description}</p>
            <div className="mt-7 flex justify-center"><ProgressDots current={4} /></div>
            <Link to="/" className="mt-8 inline-block"><Button variant="secondary"><ArrowLeft className="size-4" />Back to overview</Button></Link>
            <Link to="/preparing" className="mt-4 block text-xs font-semibold text-zinc-500 hover:text-zinc-950">Return to prepared questions <ArrowRight className="inline size-3.5" /></Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
