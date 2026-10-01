import { useState } from 'react'

import { Dialog } from '../ui/Dialog'
import { selectCls } from '../students/StudentTable'
import { inr } from '../../lib/fees'

/** Ask for a short reason (waive, void...) with quick picks. */
export function ReasonDialog({
  title,
  subtitle,
  label,
  quick,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string
  subtitle: string
  label: string
  quick: string[]
  submitLabel: string
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  return (
    <Dialog title={title} subtitle={subtitle} submitLabel={submitLabel} submitDisabled={reason.trim().length < 2} onClose={onClose} onSubmit={() => onSubmit(reason.trim())}>
      <div className="flex flex-wrap gap-2">
        {quick.map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink hover:bg-slate-200">
            {r}
          </button>
        ))}
      </div>
      <label className="block text-sm font-bold text-ink">
        {label}
        <input autoFocus value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} aria-label={label} className={`${selectCls} mt-1 w-full font-normal`} />
      </label>
    </Dialog>
  )
}

/** Change one student's amount; can't go below what's already paid. */
export function AmountDialog({ name, current, min, onClose, onSubmit }: { name: string; current: number; min: number; onClose: () => void; onSubmit: (amount: number) => Promise<void> }) {
  const [value, setValue] = useState(String(current))
  const v = Number(value) || 0
  return (
    <Dialog
      title={`Amount for ${name}`}
      subtitle={min ? `At least ${inr(min)} — that's already been paid.` : 'e.g. half for a sibling or staff child.'}
      submitLabel="Save"
      submitDisabled={v <= 0 || v < min || v === current}
      onClose={onClose}
      onSubmit={() => onSubmit(v)}
    >
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">₹</span>
        <input autoFocus inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))} aria-label="New amount" className={`${selectCls} w-full pl-7`} />
      </div>
    </Dialog>
  )
}
