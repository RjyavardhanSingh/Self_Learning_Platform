export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/v1'

export type MaterialKind = 'text' | 'markdown' | 'pdf'

export type Material = {
  id: string
  name: string
  kind: MaterialKind
  page_count: number
  word_count: number
}

export type ContextStats = {
  source_count: number
  page_count: number
  word_count: number
  reading_minutes: number
}

export type LearningContext = {
  id: string
  subject: string
  target: string
  stats: ContextStats
}

export type Question = {
  id?: number
  text: string
  topic?: string
  difficulty?: string
  target_concepts: string[]
  required_relationships: string[]
  acceptable_alternatives: string[]
  common_misconceptions: string[]
  source_citations: string[]
}

export type QuestionList = { questions: Question[] }

export type GoalLevel = 'beginner' | 'intermediate' | 'advanced'

export class ApiError extends Error {
  status: number
  requestId?: string

  constructor(message: string, status: number, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
  }
}

type ErrorPayload = {
  detail?: string | Array<{ msg?: string }>
  request_id?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  })

  const requestId = response.headers.get('x-request-id') ?? undefined
  const payload = (await response.json().catch(() => null)) as T | ErrorPayload | null

  if (!response.ok) {
    const error = payload as ErrorPayload | null
    const detail = Array.isArray(error?.detail)
      ? error.detail[0]?.msg
      : error?.detail
    throw new ApiError(detail ?? 'Something went wrong. Please try again.', response.status, requestId)
  }

  return payload as T
}

export const api = {
  health: () => request<{ status: string; api_version: string }>('/health'),

  uploadText: (payload: { content: string; name: string; kind: 'text' | 'markdown' }) =>
    request<Material>('/materials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadPdf: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<Material>('/materials/upload', {
      method: 'POST',
      body: formData,
    })
  },

  createContext: (payload: {
    material_ids: string[]
    subject: string
    target: string
    level: GoalLevel
    deadline?: string
    language: string
  }) =>
    request<LearningContext>('/contexts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateQuestions: (contextId: string, count = 5) =>
    request<QuestionList>(`/contexts/${contextId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ count }),
    }),

  getQuestions: (contextId: string) => request<QuestionList>(`/contexts/${contextId}/questions`),
}
