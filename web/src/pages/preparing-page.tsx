import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppShell, ProgressDots, StepHeader } from '../components/layout/app-shell'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { api, ApiError, type LearningContext, type Question } from '../lib/api'

function readContext(): LearningContext | null {
  const stored = window.sessionStorage.getItem('recall.context')
  return stored ? JSON.parse(stored) as LearningContext : null
}

export function PreparingPage() {
  const navigate = useNavigate()
  const context = readContext()
  const [questions, setQuestions] = useState<Question[]>([])
  const { data, isLoading } = useQuery({
    queryKey: ['questions', context?.id],
    queryFn: () => api.getQuestions(context?.id ?? ''),
    enabled: Boolean(context?.id),
    retry: false,
  })
  const generate = useMutation({
    mutationFn: () => api.generateQuestions(context?.id ?? '', 5),
    onSuccess: (result) => {
      setQuestions(result.questions)
      window.sessionStorage.setItem('recall.questions', JSON.stringify(result.questions))
      toast.success(`${result.questions.length} practice questions are ready.`)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Question generation failed.')
    },
  })
  const visibleQuestions = questions.length > 0 ? questions : data?.questions ?? []

  if (!context) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">Your context is missing.</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Start again by uploading a material and setting your goal.</p>
          <Link to="/upload"><Button className="mt-6">Start over <ArrowRight className="size-4" /></Button></Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <StepHeader eyebrow="Step 3 of 6 · Preparing" title="Let’s make this yours." description="We’ll turn your material and goal into a focused set of practice questions." />
        <div className="mt-8"><ProgressDots current={3} /></div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <Card className="border-zinc-200 bg-white text-zinc-950">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500"><Sparkles className="size-3.5" /> Your practice brief</div>
              <p className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{context.subject}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{context.target}</p>
              <div className="mt-8 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-5"><div><p className="text-2xl font-semibold">{context.stats.word_count.toLocaleString()}</p><p className="mt-1 text-xs text-zinc-500">source words</p></div><div><p className="text-2xl font-semibold">{context.stats.reading_minutes} min</p><p className="mt-1 text-xs text-zinc-500">estimated read</p></div></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4"><div><CardTitle>Practice questions</CardTitle><CardDescription className="mt-1">Five questions is a great place to start.</CardDescription></div><Badge>{visibleQuestions.length || '—'} ready</Badge></div>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="flex items-center gap-2 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500"><LoaderCircle className="size-4 animate-spin" /> Looking for saved questions…</div> : null}
              {!isLoading && visibleQuestions.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center"><div className="mx-auto grid size-11 place-items-center rounded-2xl bg-zinc-100"><Sparkles className="size-5" /></div><p className="mt-4 text-sm font-semibold">Your questions will appear here.</p><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-zinc-500">Generate a small practice set based on your material and goal.</p><Button className="mt-5" onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending ? <><LoaderCircle className="size-4 animate-spin" />Creating…</> : <>Generate questions <Sparkles className="size-4" /></>}</Button></div> : null}
              {visibleQuestions.length > 0 ? <div className="space-y-3">{visibleQuestions.map((question, index) => <div key={`${question.text}-${index}`} className="flex gap-3 rounded-xl border border-zinc-200 p-4"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-950 text-[11px] font-bold text-white">{index + 1}</span><div><p className="text-sm font-medium leading-6 text-zinc-900">{question.text}</p>{question.topic ? <p className="mt-2 text-xs text-zinc-400">{question.topic}</p> : null}</div></div>)}<div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-between"><Button variant="secondary" onClick={() => generate.mutate()} disabled={generate.isPending}><RefreshCw className="size-4" />Regenerate</Button><Button onClick={() => navigate('/practice')}>Start practice <ArrowRight className="size-4" /></Button></div></div> : null}
              {generate.isError ? <Alert className="mt-4">{generate.error instanceof ApiError ? generate.error.message : 'Question generation failed. Is the API running?'}</Alert> : null}
            </CardContent>
          </Card>
        </div>
        <Link to="/goal" className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-950"><ArrowLeft className="size-3.5" />Back to goal</Link>
      </div>
    </AppShell>
  )
}
