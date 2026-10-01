import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'

import { errorMessage } from '../../lib/api'

const WIDTH = { md: 'sm:max-w-md', lg: 'sm:max-w-xl' } as const

/** Modal form: overlay, title, body, Cancel + primary action. Runs
 *  `onSubmit`, shows its error inline, closes on success.
 *  Never taller than the screen: header and buttons stay put and the body
 *  scrolls. On phones it's a bottom sheet. */
export function Dialog({
  title,
  subtitle,
  submitLabel,
  danger = false,
  onSubmit,
  onClose,
  children,
  submitDisabled = false,
  size = 'md',
}: {
  title: string
  subtitle?: string
  submitLabel: string
  danger?: boolean
  onSubmit: () => Promise<unknown>
  onClose: () => void
  children?: ReactNode
  submitDisabled?: boolean
  size?: keyof typeof WIDTH
}) {
  const id = useId()
  const body = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmit()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
      body.current?.scrollTo({ top: 0, behavior: 'smooth' }) // the error is at the top
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal aria-labelledby={id}>
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={() => !busy && onClose()} />
      <form
        onSubmit={submit}
        className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-float sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl ${WIDTH[size]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 id={id} className="text-lg font-extrabold sm:text-xl">
              {title}
            </h2>
            {subtitle && <p className="text-sm">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div ref={body} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}
          {children}
        </div>
        <div className="flex shrink-0 gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end sm:px-6 sm:py-4">
          <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center border-line text-ink sm:flex-none">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || submitDisabled}
            className={`btn flex-1 justify-center sm:flex-none ${danger ? 'bg-rose-600 text-white hover:bg-rose-700' : 'btn-primary'} disabled:opacity-60`}
          >
            {busy && <Loader2 className="size-4 animate-spin" />} {submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
