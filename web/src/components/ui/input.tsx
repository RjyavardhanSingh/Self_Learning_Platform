import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-950 transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-50 aria-[invalid=true]:border-red-400',
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
        'flex w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm leading-6 text-zinc-950 transition-colors placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-50 aria-[invalid=true]:border-red-400',
        className,
      )}
      {...props}
    />
  )
}
