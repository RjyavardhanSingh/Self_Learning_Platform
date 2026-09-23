import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Check, FileText, LoaderCircle, UploadCloud, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AppShell, ProgressDots, StepHeader } from '../components/layout/app-shell'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input, Textarea } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { api, ApiError, type Material } from '../lib/api'
import { cn } from '../lib/utils'
import { uploadTextSchema, type UploadTextValues } from '../lib/validation'

type UploadMode = 'text' | 'pdf'

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

  const selectMode = (nextMode: UploadMode) => {
    setMode(nextMode)
    setError('')
    setMaterial(null)
  }

  const selectFile = (nextFile: File | undefined) => {
    if (!nextFile) return
    if (nextFile.type && nextFile.type !== 'application/pdf') {
      setError('Please choose a PDF file.')
      return
    }
    if (!nextFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a file with a .pdf extension.')
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
      setError(uploadError.requestId ? `${uploadError.message} · Request ${uploadError.requestId}` : uploadError.message)
    } else {
      setError('We could not upload your material. Is the API running?')
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
      <div className="mx-auto max-w-5xl">
        <StepHeader
          eyebrow="Step 1 of 6 · Upload"
          title="Bring something worth learning."
          description="Start with a PDF or paste your notes. We’ll use this material to shape your practice session."
        />
        <div className="mt-8"><ProgressDots current={1} /></div>

        <div className="mt-10 max-w-3xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Choose your material</CardTitle>
                  <CardDescription className="mt-1">PDF, text, and Markdown are supported.</CardDescription>
                </div>
                <Badge>{mode === 'text' ? 'Text' : 'PDF'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1">
                {(['text', 'pdf'] as UploadMode[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectMode(option)}
                    className={cn(
                      'rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                      mode === option ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900',
                    )}
                  >
                    {option === 'text' ? 'Paste text' : 'Upload PDF'}
                  </button>
                ))}
              </div>

              {mode === 'text' ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="material-name">Source name</Label>
                    <Input id="material-name" {...textForm.register('name')} placeholder="biology-notes.md" />
                    {textForm.formState.errors.name ? <p className="text-xs text-red-600">{textForm.formState.errors.name.message}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="material-content">Your notes</Label>
                      <span className="text-xs text-zinc-400">{content.length.toLocaleString()} / 50,000</span>
                    </div>
                    <Textarea
                      id="material-content"
                      {...textForm.register('content')}
                      maxLength={50000}
                      placeholder="Paste a chapter, lecture notes, or an article here…"
                      className="min-h-72"
                    />
                    {textForm.formState.errors.content ? <p className="text-xs text-red-600">{textForm.formState.errors.content.message}</p> : null}
                    <button
                      type="button"
                      onClick={() => textForm.setValue('kind', kind === 'text' ? 'markdown' : 'text', { shouldDirty: true })}
                      className="text-xs font-semibold text-zinc-500 underline underline-offset-4 hover:text-zinc-950"
                    >
                      {kind === 'text' ? 'Save as plain text' : 'Save as Markdown'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files?.[0]) }}
                    className="flex min-h-72 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 text-center transition hover:border-zinc-500 hover:bg-zinc-100"
                  >
                    <span className="grid size-12 place-items-center rounded-2xl bg-white shadow-sm"><UploadCloud className="size-5" /></span>
                    <span className="mt-5 text-sm font-semibold text-zinc-900">Drop your PDF here</span>
                    <span className="mt-1 text-xs text-zinc-500">or click to browse · max 25 MB</span>
                  </button>
                  {file ? (
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                      <FileText className="size-5 text-zinc-500" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
                      <button type="button" onClick={() => setFile(null)} className="text-zinc-400 hover:text-zinc-950" aria-label="Remove selected PDF"><X className="size-4" /></button>
                    </div>
                  ) : null}
                </div>
              )}

              {error ? <Alert className="mt-5">{error}</Alert> : null}
              {material ? (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-white"><Check className="size-3.5" strokeWidth={3} /></span>
                  <span><strong>{material.name}</strong> is ready. {material.word_count.toLocaleString()} words found.</span>
                </div>
              ) : null}
              <Button className="mt-6 w-full" size="lg" onClick={mode === 'text' ? submitText : uploadPdf} disabled={isUploading || Boolean(material)}>
                {isUploading ? <><LoaderCircle className="size-4 animate-spin" />Uploading…</> : material ? 'Material ready' : 'Use this material'}
                {!isUploading && !material ? <ArrowRight className="size-4" /> : null}
              </Button>
              {material ? <Button className="mt-3 w-full" variant="secondary" onClick={() => navigate('/goal')}>Continue to your goal <ArrowRight className="size-4" /></Button> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
