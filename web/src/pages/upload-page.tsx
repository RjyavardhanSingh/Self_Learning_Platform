import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Check, FileText, LoaderCircle, UploadCloud, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppShell, PageHeader } from '../components/layout/app-shell'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Input, Textarea } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { api, ApiError, type Material } from '../lib/api'
import { cn } from '../lib/utils'
import { uploadTextSchema, type UploadTextValues } from '../lib/validation'

type UploadMode = 'text' | 'pdf'

const CHARACTER_LIMIT = 50_000

export function UploadPage() {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<UploadMode>('text')
  const [file, setFile] = useState<File | null>(null)
  const [material, setMaterial] = useState<Material | null>(null)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const textForm = useForm<UploadTextValues>({
    resolver: zodResolver(uploadTextSchema),
    defaultValues: { content: '', name: 'pasted-notes.txt', kind: 'text' },
    mode: 'onBlur',
  })
  const content = useWatch({ control: textForm.control, name: 'content' }) ?? ''
  const kind = useWatch({ control: textForm.control, name: 'kind' })
  const nameError = textForm.formState.errors.name
  const contentError = textForm.formState.errors.content

  const selectMode = (nextMode: UploadMode) => {
    setMode(nextMode)
    setError('')
    setMaterial(null)
  }

  const selectFile = (nextFile: File | undefined) => {
    if (!nextFile) return
    if (nextFile.type && nextFile.type !== 'application/pdf') {
      setError('That file is not a PDF. Choose a .pdf file and try again.')
      return
    }
    if (!nextFile.name.toLowerCase().endsWith('.pdf')) {
      setError('That file has the wrong extension. Rename it to .pdf and try again.')
      return
    }
    setError('')
    setFile(nextFile)
    textForm.setValue('name', nextFile.name)
    setMaterial(null)
  }

  const saveMaterial = (nextMaterial: Material) => {
    setMaterial(nextMaterial)
    window.sessionStorage.setItem('recall.material', JSON.stringify(nextMaterial))
    toast.success(`${nextMaterial.name} is ready to learn from.`)
  }

  const handleUploadError = (uploadError: unknown) => {
    if (uploadError instanceof ApiError) {
      setError(
        uploadError.requestId
          ? `${uploadError.message} · Request ${uploadError.requestId}`
          : uploadError.message,
      )
    } else {
      setError('We could not upload your material. Check that the API is running, then retry.')
    }
  }

  const uploadPdf = async () => {
    if (!file) {
      setError('Choose a PDF before uploading.')
      return
    }
    setError('')
    setIsUploading(true)
    try {
      saveMaterial(await api.uploadPdf(file))
    } catch (uploadError) {
      handleUploadError(uploadError)
    } finally {
      setIsUploading(false)
    }
  }

  const submitText = textForm.handleSubmit(async (values) => {
    setError('')
    setIsUploading(true)
    try {
      saveMaterial(await api.uploadText(values))
    } catch (uploadError) {
      handleUploadError(uploadError)
    } finally {
      setIsUploading(false)
    }
  })

  return (
    <AppShell>
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-5 pt-5 sm:px-6 sm:pt-6 lg:px-8">
        <PageHeader
          title="Bring Something Worth Learning"
          description="Start with a PDF or paste your notes. This material shapes every question you get."
        />

        <Card className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="shrink-0 p-5">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-sunk p-1">
              {(['text', 'pdf'] as UploadMode[]).map((option) => {
                const selected = mode === option
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectMode(option)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150',
                      selected
                        ? 'bg-surface text-ink shadow-sm'
                        : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    {option === 'text' ? 'Paste Text' : 'Upload PDF'}
                  </button>
                )
              })}
            </div>
          </CardHeader>

          <CardContent className="scroll-area min-h-0 flex-1 p-5 pt-0">
            {mode === 'text' ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="material-name">Source Name</Label>
                  <Input
                    id="material-name"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={nameError ? true : undefined}
                    aria-describedby={nameError ? 'material-name-error' : undefined}
                    {...textForm.register('name')}
                    placeholder="biology-notes.md"
                  />
                  {nameError ? (
                    <p id="material-name-error" className="text-xs text-bad">
                      {nameError.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="material-content">Your Notes</Label>
                    <span className="tabular text-xs text-ink-faint">
                      {content.length.toLocaleString()} / {CHARACTER_LIMIT.toLocaleString()}
                    </span>
                  </div>
                  <Textarea
                    id="material-content"
                    maxLength={CHARACTER_LIMIT}
                    aria-invalid={contentError ? true : undefined}
                    aria-describedby={contentError ? 'material-content-error' : undefined}
                    {...textForm.register('content')}
                    placeholder="Paste a chapter, lecture notes, or an article…"
                    className="h-full min-h-40 resize-none"
                  />
                  {contentError ? (
                    <p id="material-content-error" className="text-xs text-bad">
                      {contentError.message}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      textForm.setValue('kind', kind === 'text' ? 'markdown' : 'text', {
                        shouldDirty: true,
                      })
                    }
                    className="text-xs font-semibold text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
                  >
                    {kind === 'text' ? 'Save as Markdown' : 'Save as Plain Text'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  aria-label="Choose a PDF file"
                  onChange={(event) => selectFile(event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    selectFile(event.dataTransfer.files?.[0])
                  }}
                  className="flex min-h-48 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-sunk px-5 py-8 text-center transition-colors duration-150 hover:border-ink-muted hover:bg-sunk"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-surface shadow-sm">
                    <UploadCloud className="size-5 text-ink-muted" aria-hidden="true" />
                  </span>
                  <span className="mt-5 text-sm font-semibold text-ink">
                    Drop Your PDF Here
                  </span>
                  <span className="mt-1 text-xs text-ink-muted">
                    or press Enter to browse · max 25&nbsp;MB
                  </span>
                </button>
                {file ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                    <FileText className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="tabular text-xs text-ink-faint">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:text-ink"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {error ? <Alert className="mt-5">{error}</Alert> : null}
            {material ? (
              <div
                className="mt-5 flex items-center gap-3 rounded-xl border border-good-tint bg-good-tint px-4 py-3 text-sm text-good"
                role="status"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-good text-white">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <strong className="break-words">{material.name}</strong> is ready.{' '}
                  <span className="tabular">{material.word_count.toLocaleString()}</span> words
                  found.
                </span>
              </div>
            ) : null}
          </CardContent>

          <div className="shrink-0 space-y-2 border-t border-sunk p-5">
            {material ? (
              <Button className="w-full" size="lg" onClick={() => navigate('/goal')}>
                Continue to Your Goal
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={mode === 'text' ? submitText : uploadPdf}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Uploading…
                  </>
                ) : (
                  <>
                    Use This Material
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
