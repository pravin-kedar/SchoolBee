import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff, Lock, type LucideIcon } from 'lucide-react'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon: LucideIcon
  error?: string
}

const inputClass =
  'w-full rounded-xl border bg-white py-2.5 pr-4 pl-11 text-ink placeholder:text-muted/80 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10'

export function Field({ label, icon: Icon, error, className = '', ...input }: FieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-ink">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputClass} ${error ? 'border-rose-400' : 'border-line'}`}
          {...input}
        />
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs font-semibold text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField({ label = 'Password', error, ...input }: Omit<FieldProps, 'icon' | 'label'> & { label?: string }) {
  const id = useId()
  const [show, setShow] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-ink">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          className={`${inputClass} pr-12 ${error ? 'border-rose-400' : 'border-line'}`}
          {...input}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-ink"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
      {message}
    </p>
  )
}
