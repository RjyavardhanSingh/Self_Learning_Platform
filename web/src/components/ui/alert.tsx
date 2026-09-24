import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn('rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800', className)}
      {...props}
    />
  )
}
