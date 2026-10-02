import { Star } from 'lucide-react'

/** Tap a star to rate 1-5; tap the current star again to clear. */
export function StarInput({
  value,
  onChange,
  label,
  disabled = false,
  size = 'size-5',
}: {
  value: number | null
  onChange: (v: number | null) => void
  label: string
  disabled?: boolean
  size?: string
}) {
  return (
    <span className="inline-flex items-center" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value != null && n <= value
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === n ? null : n)}
            aria-label={`${label}: ${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={value === n}
            className="rounded p-0.5 transition hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
          >
            <Star className={`${size} ${on ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} strokeWidth={1.75} />
          </button>
        )
      })}
    </span>
  )
}

/** Read-only stars; a 3.6 average shows 3 full stars and a 60% one. */
export function StarDisplay({ value, size = 'size-4' }: { value: number | null; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={value == null ? 'Not rated' : `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = value == null ? 0 : Math.max(0, Math.min(1, value - (n - 1)))
        return (
          <span key={n} className={`relative inline-block ${size}`}>
            <Star className={`absolute inset-0 ${size} text-slate-300`} strokeWidth={1.75} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={`${size} fill-amber-400 text-amber-400`} strokeWidth={1.75} />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
