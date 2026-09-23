import { z } from 'zod'

export const uploadTextSchema = z.object({
  content: z.string().trim().min(1, 'Add some notes before uploading.').max(50000, 'Keep your notes under 50,000 characters.'),
  name: z.string().trim().min(1, 'Give this material a name.').max(255),
  kind: z.enum(['text', 'markdown']),
})

export const goalSchema = z.object({
  subject: z.string().trim().min(1, 'Tell us what you are studying.').max(100),
  target: z.string().trim().min(1, 'Describe what you want to achieve.').max(200),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  deadline: z.string().optional(),
  language: z.string().trim().min(2).max(10),
})

export type UploadTextValues = z.infer<typeof uploadTextSchema>
export type GoalValues = z.infer<typeof goalSchema>
