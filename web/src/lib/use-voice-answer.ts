import { useScribe } from '@elevenlabs/react'
import { useCallback, useEffect, useRef, useState } from 'react'

export type VoicePhase = 'idle' | 'connecting' | 'recording' | 'done' | 'error'

export const MAX_RECORD_SECONDS = 10 * 60

type Options = {
  getToken: () => Promise<string>
  maxSeconds?: number
  onError?: (message: string) => void
}

/**
 * One recording pass: idle → connecting → recording → done.
 * Live partials render while speaking; stop() commits and resolves the
 * final transcript. Timer + auto-stop live in refs (one render per second).
 */
export function useVoiceAnswer({ getToken, maxSeconds = MAX_RECORD_SECONDS, onError }: Options) {
  const [phase, setPhase] = useState<VoicePhase>('idle')
  const [partial, setPartial] = useState('')
  const [committed, setCommitted] = useState('')
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const committedRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAtRef = useRef(0)
  const onErrorRef = useRef(onError)

  const reportError = useCallback((message: string) => {
    setError(message)
    setPhase('error')
    onErrorRef.current?.(message)
  }, [])

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    timerRef.current = null
    stopTimerRef.current = null
  }, [])

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onPartialTranscript: (data) => setPartial(data.text),
    onCommittedTranscript: (data) => {
      committedRef.current = committedRef.current ? `${committedRef.current} ${data.text}` : data.text
      setCommitted(committedRef.current)
      setPartial('')
    },
    onError: () => reportError('Transcription failed. Check your connection and try again.'),
    onAuthError: () => reportError('Transcription session expired. Record again.'),
    onQuotaExceededError: () => reportError('Transcription quota exceeded. Try again later.'),
    onRateLimitedError: () => reportError('Transcription is busy. Wait a moment and try again.'),
    onInputError: () => reportError('Microphone input error. Check your microphone and try again.'),
  })
  const scribeRef = useRef(scribe)

  // Keep mutable refs in sync outside of render.
  useEffect(() => {
    scribeRef.current = scribe
    onErrorRef.current = onError
  })

  const stop = useCallback(async (): Promise<string> => {
    clearTimers()
    try {
      scribeRef.current.commit()
    } catch {
      /* already disconnected */
    }
    // Allow the final committed segment to arrive before hanging up.
    await new Promise((resolve) => setTimeout(resolve, 1200))
    scribeRef.current.disconnect()
    setPartial('')
    setPhase('done')
    return committedRef.current.trim()
  }, [clearTimers])

  const start = useCallback(async () => {
    setError(null)
    setPartial('')
    setCommitted('')
    committedRef.current = ''
    setElapsedSecs(0)
    setPhase('connecting')
    try {
      const token = await getToken()
      await scribeRef.current.connect({ token })
    } catch {
      reportError('Could not reach the transcription service. Try again.')
      return
    }
    startedAtRef.current = Date.now()
    setPhase('recording')
    timerRef.current = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    stopTimerRef.current = setTimeout(() => void stop(), maxSeconds * 1000)
  }, [getToken, maxSeconds, reportError, stop])

  const reset = useCallback(() => {
    clearTimers()
    scribeRef.current.disconnect()
    scribeRef.current.clearTranscripts()
    committedRef.current = ''
    setPartial('')
    setCommitted('')
    setElapsedSecs(0)
    setError(null)
    setPhase('idle')
  }, [clearTimers])

  useEffect(
    () => () => {
      clearTimers()
      scribeRef.current.disconnect()
    },
    [clearTimers],
  )

  return {
    phase,
    partial,
    committed,
    elapsedSecs,
    remainingSecs: Math.max(0, maxSeconds - elapsedSecs),
    error,
    start,
    stop,
    reset,
  }
}

export function formatClock(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
