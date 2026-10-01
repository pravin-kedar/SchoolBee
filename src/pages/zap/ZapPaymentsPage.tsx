import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'

import { ZapShell } from '../../components/zap/ZapShell'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { dateTime } from '../../lib/zap'
import { rupees, zapLicenseApi, type PaymentRow } from '../../lib/license'

const TONE: Record<PaymentRow['status'], string> = {
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  created: 'bg-slate-100 text-slate-600 ring-slate-200',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
}
const LABEL: Record<PaymentRow['status'], string> = { paid: 'Paid', created: 'Not completed', failed: 'Failed' }

/** Website admin: every licence payment - online (Razorpay) and recorded by hand. */
export function ZapPaymentsPage() {
  const [status, setStatus] = useState('paid')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<PaymentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => zapLicenseApi.payments({ status: status || undefined, q: q.trim() || undefined }).then(setRows, (err) => setError(errorMessage(err))), q ? 250 : 0)
    return () => clearTimeout(t)
  }, [status, q])

  const total = rows?.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0) ?? 0
  return (
    <ZapShell title="Payments" subtitle="Licence payments from Razorpay and the ones you recorded by hand. Payments stay here even if a school is deleted.">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
      <section className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <div className="relative min-w-60 flex-[2]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="School, receipt no. or Razorpay id…" aria-label="Search payments" className={`${selectCls} w-full pl-9`} />
        </div>
        <select aria-label="Payment status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectCls} flex-1`}>
          <option value="paid">Paid</option>
          <option value="created">Not completed</option>
          <option value="failed">Failed</option>
          <option value="">All</option>
        </select>
      </section>
      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">How</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows?.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{dateTime(r.paid_at ?? r.created_at)}</td>
                  <td className="px-4 py-3">
                    {r.school_id ? (
                      <Link to={`/zap/schools/${r.school_id}`} className="font-bold hover:text-brand">
                        {r.school_name}
                      </Link>
                    ) : (
                      <span className="font-bold">
                        {r.school_name} <span className="text-xs font-normal text-muted">(deleted)</span>
                      </span>
                    )}
                    {r.created_by && <span className="block text-xs text-muted">by {r.created_by}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.plan_name}
                    {r.cycle && r.cycle !== 'custom' && <span className="text-muted"> · {r.cycle}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.gateway === 'razorpay' ? `Razorpay${r.method ? ` · ${r.method.toUpperCase()}` : ''}` : r.method ?? 'Manual'}
                    {(r.gateway_payment_id || r.reference) && <span className="block font-mono text-xs text-muted">{r.gateway_payment_id ?? r.reference}</span>}
                    {r.error && <span className="block text-xs text-rose-600">{r.error}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                    {rupees(r.amount)}
                    {r.credit > 0 && <span className="block text-xs font-normal text-muted">after {rupees(r.credit)} credit</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${TONE[r.status]}`}>{LABEL[r.status]}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.receipt_no ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            {rows && rows.length > 0 && status === 'paid' && (
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-3" colSpan={4}>
                    Total ({rows.length} payment{rows.length === 1 ? '' : 's'})
                  </td>
                  <td className="px-4 py-3 text-right">{rupees(total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!rows && !error && <div className="m-4 h-40 animate-pulse rounded-xl bg-slate-100" />}
        {rows && rows.length === 0 && <p className="py-12 text-center text-muted">No payments here yet.</p>}
      </section>
    </ZapShell>
  )
}
