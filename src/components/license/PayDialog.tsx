import { useEffect, useState } from 'react'
import { Mail, Phone } from 'lucide-react'

import { Dialog } from '../ui/Dialog'
import { errorMessage } from '../../lib/api'
import { licenseApi, payForPlan, rupees, shortDate, type Cycle, type LicenseDetail, type Plan, type Quote } from '../../lib/license'

const KIND_TEXT: Record<Quote['kind'], string> = {
  new: 'Starts today.',
  renewal: 'Added after your current plan ends — nothing is lost.',
  upgrade: 'Starts today. The unused part of your current plan is taken off the price.',
  downgrade: 'Starts when your current plan ends.',
}

/** Shows exactly what they'll pay (credit, dates) and opens the payment. */
export function PayDialog({
  plan,
  cycle,
  online,
  contact,
  onClose,
  onPaid,
}: {
  plan: Plan
  cycle: Cycle
  online: boolean
  contact: LicenseDetail['contact']
  onClose: () => void
  onPaid: (detail: LicenseDetail) => void
}) {
  const [q, setQ] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    licenseApi.quote(plan.key, cycle).then(setQ, (err) => setError(errorMessage(err)))
  }, [plan.key, cycle])

  const label = cycle === 'yearly' ? '1 year' : '1 month'
  return (
    <Dialog
      title={`${plan.name} plan · ${label}`}
      subtitle={q ? KIND_TEXT[q.kind] : 'Working out the price…'}
      submitLabel={!online ? 'Close' : q && q.amount === 0 ? 'Switch plan' : q ? `Pay ${rupees(q.amount)}` : 'Pay'}
      submitDisabled={!q && online}
      onClose={onClose}
      onSubmit={async () => {
        if (!online) return
        const detail = await payForPlan(plan.key, cycle)
        if (detail) onPaid(detail)
      }}
    >
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      {q && (
        <dl className="divide-y divide-line rounded-xl text-sm ring-1 ring-line" aria-label="Price">
          <Row label={`${plan.name} · ${label}`} value={rupees(q.list_price)} />
          {q.credit > 0 && <Row label="Credit for your current plan" value={`− ${rupees(q.credit)}`} tone="text-emerald-700" />}
          <Row label="You pay" value={rupees(q.amount)} strong />
          <Row label="Plan runs" value={`${shortDate(q.starts_on)} – ${shortDate(q.ends_on)}`} />
        </dl>
      )}
      {online ? (
        <p className="text-xs text-muted">Pay securely with UPI, card or net banking (Razorpay). Your plan starts as soon as the payment goes through, and the receipt is under Plan &amp; Licence.</p>
      ) : (
        <div className="rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
          <p className="font-semibold text-amber-900">Online payment isn&rsquo;t available yet.</p>
          <p className="mt-1">Contact us to pay by UPI or bank transfer and we&rsquo;ll apply your plan right away.</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 text-brand">
                <Mail className="size-4" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 text-brand">
                <Phone className="size-4" /> {contact.phone}
              </a>
            )}
          </p>
        </div>
      )}
    </Dialog>
  )
}

function Row({ label, value, strong = false, tone = '' }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2.5 ${strong ? 'bg-slate-50 font-extrabold' : ''} ${tone}`}>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}
