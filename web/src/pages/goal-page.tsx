import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, BookOpen, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppShell, EmptyState, PageHeader } from '../components/layout/app-shell'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { api, ApiError, type Material } from '../lib/api'
import { cn } from '../lib/utils'
import { goalSchema, type GoalValues } from '../lib/validation'

const levels: Array<{ value: GoalValues['level']; title: string; text: string }> = [
  { value: 'beginner', title: 'New to This', text: 'I’m building the basics.' },
  { value: 'intermediate', title: 'Getting There', text: 'I know some of this already.' },
  { value: 'advanced', title: 'Going Deeper', text: 'I want to stretch my understanding.' },
]

function readMaterial(): Material | null {
  const stored = window.sessionStorage.getItem('recall.material')
  return stored ? (JSON.parse(stored) as Material) : null
}

export function GoalPage() {
  const navigate = useNavigate()
  const material = readMaterial()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<GoalValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { subject: '', target: '', level: 'intermediate', deadline: '', language: 'en' },
    mode: 'onBlur',
  })
  const level = useWatch({ control: form.control, name: 'level' })
  const subjectError = form.formState.errors.subject
  const targetError = form.formState.errors.target

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
        setError(
          submitError.requestId
            ? `${submitError.message} · Request ${submitError.requestId}`
            : submitError.message,
        )
      } else {
        setError('We could not create your learning context. Check that the API is running, then retry.')
      }
    } finally {
      setIsSubmitting(false)
    }
  })

  if (!material) {
    return (
      <AppShell>
        <EmptyState
          icon={<BookOpen className="size-6" aria-hidden="true" />}
          title="Start With Your Material"
          description="We need something to learn from before we can shape your goal."
          action={
            <Button asChild>
              <Link to="/upload">
                Upload Material
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-5 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        <PageHeader
          title="What Do You Want to Understand?"
          description="A clear goal keeps every question relevant to you. Three details are enough to begin."
        />

        <Card className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardContent className="scroll-area min-h-0 flex-1 p-5">
            <form id="goal-form" onSubmit={submit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="subject">What Are You Studying?</Label>
                <Input
                  id="subject"
                  autoComplete="off"
                  aria-invalid={subjectError ? true : undefined}
                  aria-describedby={subjectError ? 'subject-error' : undefined}
                  {...form.register('subject')}
                  placeholder="Biology · Cell respiration"
                />
                {subjectError ? (
                  <p id="subject-error" className="text-xs text-red-600">
                    {subjectError.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">What Do You Want to Be Able to Do?</Label>
                <Input
                  id="target"
                  autoComplete="off"
                  aria-invalid={targetError ? true : undefined}
                  aria-describedby={targetError ? 'target-error' : undefined}
                  {...form.register('target')}
                  placeholder="Explain how cells create energy"
                />
                {targetError ? (
                  <p id="target-error" className="text-xs text-red-600">
                    {targetError.message}
                  </p>
                ) : null}
              </div>

              <fieldset className="space-y-2.5">
                <legend className="mb-2 text-sm font-medium text-zinc-800">
                  How Familiar Is This?
                </legend>
                <div className="grid gap-2">
                  {levels.map((option) => {
                    const selected = level === option.value
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-150',
                          selected
                            ? 'border-zinc-950 bg-zinc-50'
                            : 'border-zinc-200 hover:border-zinc-400',
                        )}
                      >
                        <input
                          type="radio"
                          value={option.value}
                          {...form.register('level')}
                          className="size-4 shrink-0 accent-zinc-950"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-zinc-900">
                            {option.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500">{option.text}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deadline">
                    Deadline <span className="font-normal text-zinc-400">(optional)</span>
                  </Label>
                  <Input id="deadline" type="date" {...form.register('deadline')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    autoComplete="off"
                    spellCheck={false}
                    inputMode="text"
                    {...form.register('language')}
                    placeholder="en"
                  />
                </div>
              </div>

              {error ? <Alert>{error}</Alert> : null}
            </form>
          </CardContent>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="ghost">
              <Link to="/upload">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Link>
            </Button>
            <Button type="submit" form="goal-form" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Preparing…
                </>
              ) : (
                <>
                  Create My Session
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
