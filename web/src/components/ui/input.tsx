import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:cursor-not-allowed disabled:bg-sunk aria-[invalid=true]:border-bad',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex w-full resize-y rounded-xl border border-line-strong bg-surface px-3.5 py-3 text-sm leading-6 text-ink transition-colors placeholder:text-ink-faint hover:border-line-strong focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:cursor-not-allowed disabled:bg-sunk aria-[invalid=true]:border-bad',
        className,
      )}
      {...props}
    />
  )
}
