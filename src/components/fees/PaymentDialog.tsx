import { useState } from 'react'

import { Dialog } from '../ui/Dialog'
import { selectCls } from '../students/StudentTable'
import { METHODS, inr, todayIso, type PayMethod, type PaymentInput, type PayTarget } from '../../lib/fees'

const inputCls = `${selectCls} mt-1 w-full font-normal`

/** Record money received for one student, towards ONE due: the yearly fee
 *  or a single additional charge. (A parent paying for several at once gets
 *  one entry - and one receipt - per due.) */
export function PaymentDialog({
  studentName,
  targets,
  initial = null,
  onClose,
  onSubmit,
}: {
  studentName: string
  targets: PayTarget[]
  /** charge line id to start on; null = the yearly fee (or the first due) */
  initial?: string | null
  onClose: () => void
  onSubmit: (input: PaymentInput) => Promise<unknown>
}) {
  const start = targets.find((t) => t.lineId === initial) ?? targets[0]
  const [targetId, setTargetId] = useState<string | null>(start?.lineId ?? null)
  const target = targets.find((t) => t.lineId === targetId) ?? start
  const [amount, setAmount] = useState(String(start?.suggested ?? ''))
  const [paidOn, setPaidOn] = useState(todayIso())
  const [method, setMethod] = useState<PayMethod>('Cash')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const value = Number(amount) || 0
  const balance = target?.balance ?? 0
  const tooMuch = value > balance

  function pick(lineId: string | null) {
    setTargetId(lineId)
    const t = targets.find((x) => x.lineId === lineId)
    if (t) setAmount(String(t.suggested))
  }

  return (
    <Dialog
      title="Record payment"
      subtitle={target ? `${studentName} · ${target.label} · balance ${inr(balance)}` : `${studentName} · nothing due`}
      submitLabel={value > 0 ? `Record ${inr(value)}` : 'Record payment'}
      submitDisabled={!target || value <= 0 || tooMuch || !paidOn}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({ amount: value, paid_on: paidOn, method, reference: reference.trim() || null, note: note.trim() || null, charge_line_id: target?.lineId ?? null })
      }
    >
      {targets.length > 1 && (
        <label className="block text-sm font-bold text-ink">
          Pay towards
          <select value={targetId ?? ''} onChange={(e) => pick(e.target.value || null)} aria-label="Pay towards" className={inputCls}>
            {targets.map((t) => (
              <option key={t.lineId ?? 'yearly'} value={t.lineId ?? ''}>
                {t.label} — {inr(t.balance)} due
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-muted">Paid for more than one? Record each separately — each gets its own receipt.</span>
        </label>
      )}
      <label className="block text-sm font-bold text-ink">
        Amount received
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-muted">₹</span>
          <input autoFocus inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} aria-label="Amount received" className={`${inputCls} pl-7 text-lg font-bold`} />
        </div>
      </label>
      {target && (
        <div className="flex flex-wrap gap-2">
          {target.suggested !== balance && (
            <button type="button" onClick={() => setAmount(String(target.suggested))} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-brand ring-1 ring-sky-100">
              {target.label}: {inr(target.suggested)}
            </button>
          )}
          <button type="button" onClick={() => setAmount(String(balance))} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-brand ring-1 ring-sky-100">
            Full balance: {inr(balance)}
          </button>
        </div>
      )}
      {tooMuch && <p className="text-sm font-semibold text-rose-600">That's more than the balance of {inr(balance)}.</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold text-ink">
          Date
          <input type="date" max={todayIso()} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} aria-label="Payment date" className={inputCls} />
        </label>
        <label className="block text-sm font-bold text-ink">
          Mode
          <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)} aria-label="Payment mode" className={inputCls}>
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      {method !== 'Cash' && (
        <label className="block text-sm font-bold text-ink">
          {method === 'Cheque' ? 'Cheque number' : 'Transaction / reference no.'} <span className="font-normal text-muted">(optional)</span>
          <input value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} aria-label="Reference" className={inputCls} />
        </label>
      )}
      <label className="block text-sm font-bold text-ink">
        Note <span className="font-normal text-muted">(optional, printed on the receipt)</span>
        <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Term 1 fee" aria-label="Note" className={inputCls} />
      </label>
    </Dialog>
  )
}
