import { cn } from '../../lib/utils'

/**
 * Static bar heights, tallest at the centre. Purely decorative, so it is
 * hidden from assistive tech and the speaking state is always announced in
 * text alongside it.
 */
const BARS = [40, 68, 92, 58, 78, 46] as const

export function Waveform({
  active = false,
  className,
}: {
  active?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex h-full items-center justify-center gap-[3px]', className)}
    >
      {BARS.map((height, index) => (
        <span
          key={index}
          style={{ height: `${active ? height : Math.round(height * 0.55)}%` }}
          className={cn(
            'w-[3px] rounded-full transition-[height,background-color] duration-300',
            active ? 'bg-current' : 'bg-current opacity-40',
          )}
        />
      ))}
    </span>
  )
}
