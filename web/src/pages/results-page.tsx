import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, LoaderCircle, RefreshCw, RotateCcw, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppShell, ProgressDots, StepHeader } from '../components/layout/app-shell'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { api, ApiError, type Question, type SessionResults } from '../lib/api'
import { cn } from '../lib/utils'

function readResults(): SessionResults | null {
  const stored = window.sessionStorage.getItem('recall.results')
  return stored ? (JSON.parse(stored) as SessionResults) : null
}

function scoreTone(score: number | null): string {
  if (score === null) return 'bg-zinc-100 text-zinc-500'
  if (score > 60) return 'bg-zinc-950 text-white'
  return 'bg-amber-100 text-amber-900'
}

export function ResultsPage() {
  const navigate = useNavigate()
  const [results] = useState<SessionResults | null>(readResults)
  const [expired, setExpired] = useState(false)

  const retest = useMutation({
    mutationFn: (weakOnly: boolean) =>
      api.createRetest(results?.id ?? '', { weak_only: weakOnly }),
    onSuccess: (retestSession) => {
      window.sessionStorage.setItem(
        'recall.session',
        JSON.stringify({
          id: retestSession.id,
          context_id: retestSession.context_id,
          question_count: retestSession.question_count,
          current_index: 0,
          status: retestSession.status,
          pending_count: 0,
          scored_count: 0,
        }),
      )
      window.sessionStorage.setItem('recall.questions', JSON.stringify(retestSession.questions))
      navigate('/practice')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 410) {
        setExpired(true)
        return
      }
      toast.error(error instanceof ApiError ? error.message : 'Could not start retest.')
    },
  })

  if (!results) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">No results yet.</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Complete a practice session to unlock your full report.
          </p>
          <Link to="/practice">
            <Button className="mt-6">
              Back to practice <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const answersByIndex = new Map(results.answers.map((a) => [a.question_index, a]))
  const weakCount = results.weak_topics.length

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <StepHeader
          eyebrow="Step 5 of 6 · Results"
          title="Your full report."
          description="Readiness score, every question's result, and exactly what to review next."
        />
        <div className="mt-8">
          <ProgressDots current={5} />
        </div>

        <div className="mt-10 grid max-w-3xl gap-4">
          <Card>
            <CardContent>
              <div className="flex items-center gap-5">
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-2xl font-bold text-white">
                  {results.readiness_score}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Trophy className="size-4" /> Readiness score
                  </p>
                  {results.next_review_suggestion ? (
                    <p className="mt-1 text-sm leading-6 text-zinc-500">{results.next_review_suggestion}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Topics</CardTitle>
                  <CardDescription className="mt-1">Where you stand per topic.</CardDescription>
                </div>
                <Badge>
                  {weakCount === 0 ? 'All strong' : `${weakCount} to review`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(results.topic_summary).map(([topic, data]) => (
                  <div key={topic} className="rounded-xl border border-zinc-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{topic}</p>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-bold',
                          scoreTone(data.average_score),
                        )}
                      >
                        {data.average_score}%
                      </span>
                    </div>
                    {data.concepts_missed.length > 0 ? (
                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        Missed: {data.concepts_missed.join(', ')}
                      </p>
                    ) : null}
                    {data.misconceptions.length > 0 ? (
                      <p className="mt-1 text-xs leading-5 text-amber-800">
                        Misconceptions: {data.misconceptions.join('; ')}
                      </p>
                    ) : null}
                  </div>
                ))}
                {Object.keys(results.topic_summary).length === 0 ? (
                  <p className="text-sm text-zinc-500">No topic breakdown available for this session.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Every question</CardTitle>
              <CardDescription className="mt-1">Your answer, score, and feedback.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.questions.map((question: Question, position: number) => {
                  const answer = answersByIndex.get(position)
                  return (
                    <details key={question.id ?? position} className="group rounded-xl border border-zinc-200">
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-950 text-[11px] font-bold text-white">
                          {position + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{question.text}</span>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                            scoreTone(answer?.score ?? null),
                          )}
                        >
                          {answer?.score === null || answer?.score === undefined ? '…' : `${answer.score}%`}
                        </span>
                      </summary>
                      <div className="border-t border-zinc-100 p-4 pt-3">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">You said</p>
                        <p className="mt-1 text-sm leading-6 text-zinc-700">
                          {answer?.answer_text || 'Skipped.'}
                        </p>
                        {answer?.feedback ? (
                          <>
                            <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                              Feedback
                            </p>
                            <p className="mt-1 text-sm leading-6 text-zinc-700">{answer.feedback}</p>
                          </>
                        ) : null}
                      </div>
                    </details>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retest</CardTitle>
              <CardDescription className="mt-1">
                Go clear your concepts and come back in some time — or take another shot right now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expired ? (
                <Alert>
                  This session&apos;s 24h review window has closed. Generate a fresh practice set to keep
                  going.
                </Alert>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    className="flex-1"
                    disabled={retest.isPending || weakCount === 0}
                    onClick={() => retest.mutate(true)}
                  >
                    {retest.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" /> Starting…
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-4" /> Retest weak areas
                        {weakCount > 0 ? ` (${weakCount})` : ''}
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" disabled={retest.isPending} onClick={() => retest.mutate(false)}>
                    <RefreshCw className="size-4" /> Full test again
                  </Button>
                </div>
              )}
              {retest.isError && !(retest.error instanceof ApiError && retest.error.status === 410) ? (
                <Alert className="mt-4">
                  {retest.error instanceof ApiError ? retest.error.message : 'Could not start retest.'}
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Link
          to="/preparing"
          className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-950"
        >
          <ArrowLeft className="size-3.5" /> Back to preparing
        </Link>
      </div>
    </AppShell>
  )
}
