import { useId, useState, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

import beeBook from '../../assets/bees/bee-book.webp'
import type { StudentStatus } from '../../lib/students'

const AVATAR_TONES: Record<string, string> = {
  Male: 'bg-sky-100 text-sky-700',
  Female: 'bg-rose-100 text-rose-600',
  Other: 'bg-violet-100 text-violet-700',
}

/** Photo, or initials on a soft colour - falls back if the photo fails. */
export function Avatar({ name, url, gender, size = 'size-10' }: { name: string; url?: string | null; gender?: string | null; size?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (url && url !== failed) {
    return <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-white`} onError={() => setFailed(url)} />
  }
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span className={`${size} grid shrink-0 place-items-center rounded-full text-sm font-bold ring-2 ring-white ${AVATAR_TONES[gender ?? ''] ?? 'bg-amber-100 text-amber-700'}`}>
      {initials || '?'}
    </span>
  )
}

const STATUS_TONES: Record<StudentStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Inactive: 'bg-rose-50 text-rose-600 ring-rose-200',
  Draft: 'bg-amber-50 text-amber-700 ring-amber-200',
}

export function StatusBadge({ status }: { status: StudentStatus }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_TONES[status]}`}>{status}</span>
}

/** Page title strip with the bee and a speech bubble (as in the designs). */
export function PageBanner({ title, subtitle, message, children }: { title: string; subtitle: string; message: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-amber-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          {children}
          <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
          <p className="mt-0.5">{subtitle}</p>
        </div>
        <div className="hidden items-center lg:flex">
          <img src={beeBook} alt="" className="z-10 -mr-3 w-20 animate-float drop-shadow-lg" />
          <p className="max-w-56 rounded-2xl bg-amber-50/95 px-4 py-2.5 text-sm leading-snug font-semibold text-ink shadow-card ring-1 ring-amber-100">
            {message}
          </p>
        </div>
      </div>
    </section>
  )
}

const control =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/80 focus:border-brand focus:ring-4 focus:ring-brand/10'

export function SelectField({
  label,
  error,
  children,
  className = '',
  ...select
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-ink">
        {label}
      </label>
      <select id={id} aria-invalid={Boolean(error)} className={`${control} ${error ? 'border-rose-400' : 'border-line'}`} {...select}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  )
}

export function TextAreaField({
  label,
  className = '',
  maxLength = 500,
  value,
  ...area
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; value: string }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-ink">
        {label}
      </label>
      <div className="relative">
        <textarea id={id} rows={2} maxLength={maxLength} value={value} className={`${control} resize-none border-line pb-6`} {...area} />
        <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted">
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}

/** Label + value row used on the profile cards. */
export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold break-words text-ink">{value || '—'}</dd>
    </div>
  )
}
