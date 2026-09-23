import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, BookOpen, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppShell, ProgressDots, StepHeader } from '../components/layout/app-shell'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { api, ApiError, type Material } from '../lib/api'
import { goalSchema, type GoalValues } from '../lib/validation'

const levels: Array<{ value: GoalValues['level']; title: string; text: string }> = [
  { value: 'beginner', title: 'New to this', text: 'I’m building the basics.' },
  { value: 'intermediate', title: 'Getting there', text: 'I know some of this already.' },
  { value: 'advanced', title: 'Going deeper', text: 'I want to stretch my understanding.' },
]

export function GoalPage() {
  const navigate = useNavigate()
  const material: Material | null = (() => {
    const stored = window.sessionStorage.getItem('recall.material')
    return stored ? JSON.parse(stored) as Material : null
  })()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const form = useForm<GoalValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { subject: '', target: '', level: 'intermediate', deadline: '', language: 'en' },
    mode: 'onBlur',
  })
  const level = useWatch({ control: form.control, name: 'level' })

  const submit = form.handleSubmit(async (values) => {
    if (!material) {
      setError('Upload a material before setting your goal.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const context = await api.createContext({
        material_ids: [material.id],
        subject: values.subject,
        target: values.target,
        level: values.level,
        deadline: values.deadline || undefined,
        language: values.language,
      })
      window.sessionStorage.setItem('recall.context', JSON.stringify(context))
      toast.success('Your learning context is ready.')
      navigate('/preparing')
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.requestId ? `${submitError.message} · Request ${submitError.requestId}` : submitError.message)
      } else {
        setError('We could not create your learning context. Is the API running?')
      }
    } finally {
      setIsSubmitting(false)
    }
  })

  if (!material) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-zinc-950 text-white"><BookOpen className="size-6" /></div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">Start with your material.</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">We need something to learn from before we can shape your goal.</p>
          <Link to="/upload"><Button className="mt-6">Upload material <ArrowRight className="size-4" /></Button></Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <StepHeader
          eyebrow="Step 2 of 6 · Goal"
          title="What do you want to understand?"
          description="A clear goal helps us make every question feel relevant to you."
        />
        <div className="mt-8"><ProgressDots current={2} /></div>

        <div className="mt-10 max-w-3xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div><CardTitle>Shape your session</CardTitle><CardDescription className="mt-1">A few details are enough to get started.</CardDescription></div>
                <Badge>Step 2</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="subject">What are you studying?</Label>
                  <Input id="subject" {...form.register('subject')} placeholder="Biology · Cell respiration" />
                  {form.formState.errors.subject ? <p className="text-xs text-red-600">{form.formState.errors.subject.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">What do you want to be able to do?</Label>
                  <Input id="target" {...form.register('target')} placeholder="Explain how cells create energy" />
                  {form.formState.errors.target ? <p className="text-xs text-red-600">{form.formState.errors.target.message}</p> : null}
                </div>
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-zinc-800">How familiar is this?</legend>
                  <div className="grid gap-2">
                    {levels.map((option) => (
                      <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${level === option.value ? 'border-zinc-950 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'}`}>
                        <input type="radio" value={option.value} {...form.register('level')} className="size-4 accent-zinc-950" />
                        <span><span className="block text-sm font-semibold text-zinc-900">{option.title}</span><span className="mt-0.5 block text-xs text-zinc-500">{option.text}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="deadline">Deadline <span className="font-normal text-zinc-400">(optional)</span></Label><Input id="deadline" type="date" {...form.register('deadline')} /></div>
                  <div className="space-y-2"><Label htmlFor="language">Language</Label><Input id="language" {...form.register('language')} placeholder="en" /></div>
                </div>
                {error ? <Alert>{error}</Alert> : null}
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                  <Link to="/upload"><Button type="button" variant="ghost"><ArrowLeft className="size-4" />Back</Button></Link>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="size-4 animate-spin" />Preparing…</> : <>Create my session <ArrowRight className="size-4" /></>}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
