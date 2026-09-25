import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  LoaderCircle,
  Mic,
  RotateCcw,
  SkipForward,
  Square,
} from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppShell, ProgressDots, StepHeader } from '../components/layout/app-shell'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { api, ApiError, type PracticeSession, type Question } from '../lib/api'
import { formatClock, useVoiceAnswer } from '../lib/use-voice-answer'

function readSession(): PracticeSession | null {
  const stored = window.sessionStorage.getItem('recall.session')
  return stored ? (JSON.parse(stored) as PracticeSession) : null
}

function readQuestions(): Question[] {
  const stored = window.sessionStorage.getItem('recall.questions')
  return stored ? (JSON.parse(stored) as Question[]) : []
}

const QuestionCard = memo(function QuestionCard({
  question,
  position,
  total,
}: {
  question: Question
  position: number
  total: number
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>
              Question {position} of {total}
            </CardTitle>
            <CardDescription className="mt-1">Read it, understand it, then answer out loud.</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {question.topic ? <Badge>{question.topic}</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-base font-medium leading-7 text-zinc-900">{question.text}</p>
        {question.previous_attempt ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Last time {question.previous_attempt.score}% — missed:{' '}
            {question.previous_attempt.concepts_missed.length > 0
              ? question.previous_attempt.concepts_missed.join(', ')
              : 'nothing specific, tighten the explanation'}
            .
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
})

export function PracticePage() {
  const navigate = useNavigate()
  const [session] = useState<PracticeSession | null>(readSession)
  const [questions] = useState<Question[]>(readQuestions)
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState<string | null>(null)
  const [awaitingAck, setAwaitingAck] = useState(false)

  const getToken = useCallback(() => api.mintSttToken().then((t) => t.token), [])
  const voice = useVoiceAnswer({ getToken })

  const total = questions.length
  const done = index >= total
  const question = !done ? questions[index] : null

  const { data: live } = useQuery({
    queryKey: ['session', session?.id],
    queryFn: () => api.getSession(session?.id ?? ''),
    enabled: Boolean(session?.id) && awaitingAck,
    // Poll only while background scores are outstanding; one final fetch
    // confirms the ack, then polling stops on its own.
    refetchInterval: (query) =>
      (query.state.data?.pending_count ?? 1) > 0 ? 3000 : false,
  })
  const pendingCount = live?.pending_count ?? 0

  const submit = useMutation({
    mutationFn: (payload: { answer_text: string; skipped?: boolean }) =>
      api.submitAnswer(session?.id ?? '', { question_index: index, ...payload }),
    onSuccess: (record) => {
      if (record.status === 'pending') setAwaitingAck(true)
      voice.reset()
      setDraft(null)
      setIndex((i) => i + 1)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not submit answer.')
    },
  })

  const finish = useMutation({
    mutationFn: () => api.completeSession(session?.id ?? ''),
    onSuccess: (result) => {
      window.sessionStorage.setItem('recall.results', JSON.stringify(result))
      navigate('/results')
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not finish session.')
    },
  })

  const handleStop = useCallback(async () => {
    const text = await voice.stop()
    if (!text) {
      toast.error("We didn't catch that — record again.")
      voice.reset()
      return
    }
    setDraft(text)
  }, [voice])

  if (!session || questions.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">No active practice session.</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Generate questions first, then start a practice session.
          </p>
          <Link to="/preparing">
            <Button className="mt-6">
              Back to preparing <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <StepHeader
          eyebrow="Step 4 of 6 · Practice"
          title="Say it out loud."
          description="Read each question, answer by speaking, and move on. Scoring happens in the background."
        />
        <div className="mt-8 flex items-center justify-between gap-4">
          <ProgressDots current={4} />
          {pendingCount > 0 ? (
            <Badge>
              <LoaderCircle className="mr-1 size-3 animate-spin" /> Scoring {pendingCount} in background
            </Badge>
          ) : (
            <Badge>
              {Math.min(index, total)} of {total} answered
            </Badge>
          )}
        </div>

        <div className="mt-10 max-w-3xl space-y-4">
          {!done && question ? (
            <>
              <QuestionCard question={question} position={index + 1} total={total} />
              <Card>
                <CardContent>
                  {voice.phase === 'idle' && draft === null && !submit.isPending ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <Button size="lg" className="h-16 w-16 rounded-full" onClick={() => voice.start()}>
                        <Mic className="size-6" />
                        <span className="sr-only">Answer by speaking</span>
                      </Button>
                      <p className="mt-4 text-sm font-semibold">Answer it</p>
                      <p className="mt-1 text-xs text-zinc-500">Tap, speak your answer, then stop.</p>
                      <button
                        type="button"
                        onClick={() => submit.mutate({ answer_text: '', skipped: true })}
                        className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-950"
                      >
                        <SkipForward className="size-3.5" /> Skip for now
                      </button>
                    </div>
                  ) : null}

                  {voice.phase === 'connecting' ? (
                    <div className="flex items-center gap-2 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      <LoaderCircle className="size-4 animate-spin" /> Connecting to transcription…
                    </div>
                  ) : null}

                  {voice.phase === 'recording' ? (
                    <div className="py-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                          <span className="size-2 animate-pulse rounded-full bg-red-500" /> Listening…
                        </div>
                        <div className="flex items-center gap-1.5 text-xs tabular-nums text-zinc-500">
                          <Clock className="size-3.5" /> {formatClock(voice.elapsedSecs)} /{' '}
                          {formatClock(voice.elapsedSecs + voice.remainingSecs)}
                        </div>
                      </div>
                      <p className="mt-4 min-h-16 text-sm leading-6 text-zinc-700">
                        {voice.committed ? `${voice.committed} ` : null}
                        <span className="text-zinc-400">{voice.partial}</span>
                        {!voice.committed && !voice.partial ? 'Speak now…' : null}
                      </p>
                      <Button className="mt-4 w-full" onClick={handleStop}>
                        <Square className="size-4" /> Stop & review
                      </Button>
                    </div>
                  ) : null}

                  {voice.phase === 'error' ? (
                    <div className="space-y-3 py-2">
                      <Alert>{voice.error ?? 'Transcription failed.'}</Alert>
                      <Button variant="secondary" className="w-full" onClick={() => voice.reset()}>
                        <RotateCcw className="size-4" /> Try recording again
                      </Button>
                    </div>
                  ) : null}

                  {draft !== null && voice.phase !== 'recording' ? (
                    <div className="space-y-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                        Your answer — edit if needed
                      </p>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={5}
                        maxLength={12000}
                        className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-900 outline-none focus:border-zinc-950"
                      />
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          className="flex-1"
                          disabled={submit.isPending || draft.trim().length === 0}
                          onClick={() => submit.mutate({ answer_text: draft.trim() })}
                        >
                          {submit.isPending ? (
                            <>
                              <LoaderCircle className="size-4 animate-spin" /> Sending…
                            </>
                          ) : (
                            <>
                              Submit answer <ArrowRight className="size-4" />
                            </>
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={submit.isPending}
                          onClick={() => {
                            setDraft(null)
                            voice.reset()
                          }}
                        >
                          <RotateCcw className="size-4" /> Re-record
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </>
          ) : null}

          {done ? (
            <Card>
              <CardHeader>
                <CardTitle>All questions answered.</CardTitle>
                <CardDescription className="mt-1">
                  {pendingCount > 0
                    ? `Finishing ${pendingCount} background scores, then your full report is ready.`
                    : 'Your full report with readiness score and per-question feedback is ready.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" disabled={finish.isPending} onClick={() => finish.mutate()}>
                  {finish.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" /> Compiling your report…
                    </>
                  ) : (
                    <>
                      See my results <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
                {finish.isError ? (
                  <Alert className="mt-4">
                    {finish.error instanceof ApiError ? finish.error.message : 'Could not finish session.'}
                  </Alert>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
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
