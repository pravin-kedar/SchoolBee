import { useEffect, useState } from 'react'
import { Ban, Download, Eye, Search } from 'lucide-react'

import { Dialog } from '../ui/Dialog'
import { Pager } from '../ui/Pager'
import { selectCls } from '../students/StudentTable'
import { errorMessage } from '../../lib/api'
import { CATEGORY_TONE, certificatesApi, useCanIssue, type Issued, type IssuedList } from '../../lib/certificates'
import { formatDate } from '../../lib/students'

const PAGE_SIZE = 15

/** The school's issued-certificate register. With `studentId`, one student's
 *  certificates (student profile); with `batchId`, one bulk run. */
export function IssuedRegister({ studentId, batchId, compact = false }: { studentId?: string; batchId?: string; compact?: boolean }) {
  const canIssue = useCanIssue()
  const [data, setData] = useState<IssuedList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [cancelling, setCancelling] = useState<Issued | null>(null)

  useEffect(() => {
    if (q.trim() === query) return // nothing changed (also the run on mount)
    const t = setTimeout(() => (setQuery(q.trim()), setPage(1)), 300)
    return () => clearTimeout(t)
  }, [q, query])

  useEffect(() => {
    let live = true
    certificatesApi
      .issued({ q: query, category, status, student_id: studentId, batch_id: batchId, page, page_size: PAGE_SIZE })
      .then((d) => live && (setData(d), setError(null)))
      .catch((err) => live && setError(errorMessage(err)))
    return () => {
      live = false
    }
  }, [query, category, status, studentId, batchId, page, reload])

  return (
    <div className="space-y-4">
      {!compact && data && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ['Issued', data.summary.issued, 'bg-emerald-50 text-emerald-700 ring-emerald-100'],
              ['This month', data.summary.this_month, 'bg-sky-50 text-brand ring-sky-100'],
              ['Cancelled', data.summary.cancelled, 'bg-rose-50 text-rose-600 ring-rose-100'],
            ] as const
          ).map(([label, value, tone]) => (
            <div key={label} className={`rounded-2xl p-4 ring-1 ${tone}`}>
              <p className="font-display text-3xl font-extrabold">{value}</p>
              <p className="text-sm font-bold">{label}</p>
            </div>
          ))}
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-60 flex-[2]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student, serial or admission no…" aria-label="Search certificates" className={`${selectCls} w-full pl-9`} />
          </div>
          <select aria-label="Certificate type" value={category} onChange={(e) => (setCategory(e.target.value), setPage(1))} className={`${selectCls} flex-1`}>
            <option value="">All types</option>
            {['Bonafide', 'Leaving', 'Character', 'Achievement', 'Other'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select aria-label="Certificate status" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))} className={`${selectCls} flex-1`}>
            <option value="">Issued & cancelled</option>
            <option value="Issued">Issued</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-line/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Serial no.</th>
                {!studentId && <th className="px-4 py-3">Student</th>}
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3">Issued on</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.items.map((d) => (
                <tr key={d.id} aria-label={d.serial_no} className={d.status === 'Cancelled' ? 'bg-slate-50/60 text-muted' : ''}>
                  <td className="px-4 py-3 font-mono text-xs font-bold whitespace-nowrap">{d.serial_no}</td>
                  {!studentId && (
                    <td className="px-4 py-3">
                      <p className="font-bold text-ink">{d.student_name}</p>
                      <p className="text-xs text-muted">{[d.class_section, d.admission_no].filter(Boolean).join(' · ')}</p>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <p className="font-semibold">{d.template_name}</p>
                    <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${CATEGORY_TONE[d.category] ?? CATEGORY_TONE.Other}`}>{d.category}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(d.issue_date)}
                    {d.issued_by && <p className="text-xs text-muted">by {d.issued_by}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {d.status === 'Cancelled' ? (
                      <span title={d.cancel_reason ?? ''} className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600 ring-1 ring-rose-200">
                        Cancelled
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Issued</span>
                    )}
                    {d.cancel_reason && <p className="mt-1 max-w-44 truncate text-xs text-rose-600">{d.cancel_reason}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {d.view_url && (
                        <a href={d.view_url} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-lg text-ink/70 hover:bg-slate-100" aria-label={`Open ${d.serial_no}`} title="Open / print">
                          <Eye className="size-4" />
                        </a>
                      )}
                      {d.download_url && (
                        <a href={d.download_url} className="grid size-8 place-items-center rounded-lg text-ink/70 hover:bg-slate-100" aria-label={`Download ${d.serial_no}`} title="Download">
                          <Download className="size-4" />
                        </a>
                      )}
                      {canIssue && d.status === 'Issued' && (
                        <button onClick={() => setCancelling(d)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Cancel ${d.serial_no}`} title="Cancel certificate">
                          <Ban className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data && !error && <div className="m-4 h-24 animate-pulse rounded-xl bg-slate-100" />}
        {data && data.items.length === 0 && <p className="py-10 text-center text-muted">No certificates issued yet.</p>}
        {data && <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />}
      </div>

      {cancelling && (
        <CancelDialog
          doc={cancelling}
          onClose={() => setCancelling(null)}
          onCancel={async (reason) => {
            await certificatesApi.cancel(cancelling.id, reason)
            setReload((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}

function CancelDialog({ doc, onClose, onCancel }: { doc: Issued; onClose: () => void; onCancel: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('')
  return (
    <Dialog
      title={`Cancel ${doc.serial_no}?`}
      subtitle={`${doc.template_name} for ${doc.student_name}. It stays in the register marked as cancelled; the number isn't reused.`}
      submitLabel="Cancel certificate"
      danger
      submitDisabled={reason.trim().length < 3}
      onClose={onClose}
      onSubmit={() => onCancel(reason.trim())}
    >
      <div className="flex flex-wrap gap-2">
        {['Issued by mistake', 'Wrong details', 'Replaced by a new certificate'].map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink hover:bg-slate-200">
            {r}
          </button>
        ))}
      </div>
      <label className="block text-sm font-bold text-ink">
        Reason
        <textarea
          autoFocus
          rows={2}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </label>
    </Dialog>
  )
}
