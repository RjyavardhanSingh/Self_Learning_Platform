import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn('rounded-xl border border-bad/25 bg-bad-tint px-4 py-3 text-sm text-bad', className)}
      {...props}
    />
  )
}
