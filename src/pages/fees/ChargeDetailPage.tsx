import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, CheckCircle2, CircleDollarSign, Download, Loader2, Pencil, Search, Trash2, UserPlus, Users, Wallet, X } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { ChargeFields } from '../../components/fees/ChargeFields'
import { AmountDialog, ReasonDialog } from '../../components/fees/FeeDialogs'
import { MoneyCard, StatusPill } from '../../components/fees/FeeUi'
import { PaymentDialog } from '../../components/fees/PaymentDialog'
import { StudentChecklist } from '../../components/fees/StudentChecklist'
import { Avatar } from '../../components/students/StudentUi'
import { selectCls } from '../../components/students/StudentTable'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { usePermission } from '../../lib/auth'
import { certificatesApi, type CertStudent } from '../../lib/certificates'
import {
  CHARGE_TONE,
  CLASS_PRESETS,
  chargesApi,
  draftProblem,
  feesApi,
  inr,
  shortDate,
  toCharge,
  type ChargeDetail,
  type ChargeDraft,
  type ChargeLine,
} from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'

type Filter = '' | 'unpaid' | 'paid' | 'waived'

export function ChargeDetailPage() {
  const { id = '' } = useParams()
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const [charge, setCharge] = useState<ChargeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; receiptId?: string } | null>(null)
  const [filter, setFilter] = useState<Filter>('')
  const [q, setQ] = useState('')
  const [collecting, setCollecting] = useState<ChargeLine | null>(null)
  const [waiving, setWaiving] = useState<ChargeLine | null>(null)
  const [amountFor, setAmountFor] = useState<ChargeLine | null>(null)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const access = usePermission()
  const canManage = access.can('fees.manage')

  useEffect(() => {
    chargesApi.get(id).then(setCharge, (err) => setError(errorMessage(err)))
  }, [id])

  if (!token) return <Navigate to="/login" replace />

  async function run(key: string, fn: () => Promise<ChargeDetail | void>, text?: string) {
    setBusy(key)
    setError(null)
    try {
      const out = await fn()
      if (out) setCharge(out)
      if (text) setNotice({ text })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const term = q.trim().toLowerCase()
  const lines = (charge?.lines ?? []).filter(
    (l) =>
      (!term || l.full_name.toLowerCase().includes(term) || l.admission_no.toLowerCase().includes(term)) &&
      (filter === '' || (filter === 'waived' ? l.waived : filter === 'paid' ? !l.waived && l.balance === 0 : !l.waived && l.balance > 0)),
  )
  const back = `/fees?tab=charges${charge ? `&year=${charge.academic_year_id}` : ''}`

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <Link to={back} className="inline-flex items-center gap-1 text-sm font-bold text-brand">
          <ArrowLeft className="size-4" /> Additional charges
        </Link>

        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}

        {!charge ? (
          !error && <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold">
                  {charge.name}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${CHARGE_TONE[charge.category] ?? CHARGE_TONE.Other}`}>{charge.category}</span>
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" /> {charge.target_label}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-4" /> Due {shortDate(charge.due_date)}
                  </span>
                  <span>{inr(charge.amount)} per student</span>
                </p>
                {charge.description && <p className="mt-1 text-sm">{charge.description}</p>}
              </div>
              <div className="flex flex-wrap gap-2" hidden={!canManage}>
                <button onClick={() => setEditing(true)} className="btn-outline">
                  <Pencil className="size-4" /> Edit
                </button>
                <button onClick={() => setAdding(true)} className="btn-outline">
                  <UserPlus className="size-4" /> Add students
                </button>
                <button onClick={() => setDeleting(true)} className="btn-outline border-rose-200 text-rose-600">
                  <Trash2 className="size-4" /> Delete
                </button>
              </div>
            </section>

            {notice && (
              <p role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> {notice.text}
                </span>
                {notice.receiptId && (
                  <button onClick={() => void run('receipt', () => feesApi.receipt(notice.receiptId!))} className="btn-primary py-1.5 text-sm">
                    {busy === 'receipt' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download receipt
                  </button>
                )}
              </p>
            )}

            {charge.missing_students > 0 && (
              <p className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                {charge.missing_students} student{charge.missing_students === 1 ? ' has' : 's have'} joined {charge.target_label} since this charge was raised.
                <button onClick={() => void run('sync', () => chargesApi.addNewJoiners(charge.id), 'New students added to the charge')} className="btn-primary py-1.5 text-sm">
                  {busy === 'sync' && <Loader2 className="size-4 animate-spin" />} Add them
                </button>
              </p>
            )}

            <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <MoneyCard label="Expected" value={inr(charge.expected)} hint={`${charge.students} students${charge.waived ? ` · ${charge.waived} waived` : ''}`} icon={CircleDollarSign} tone="bg-sky-100 text-brand" />
              <MoneyCard label="Collected" value={inr(charge.collected)} hint={`${charge.paid_students} of ${charge.students} paid`} icon={Wallet} tone="bg-emerald-100 text-emerald-600" />
              <MoneyCard label="Pending" value={inr(charge.pending)} icon={CalendarClock} tone="bg-amber-100 text-amber-600" />
              <MoneyCard label="Overdue" value={inr(charge.overdue)} hint={charge.overdue ? 'Past the due date' : 'Nothing overdue'} icon={CalendarClock} tone="bg-rose-100 text-rose-500" />
            </section>

            <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
              <div className="flex gap-2" role="group" aria-label="Filter">
                {(
                  [
                    ['', 'All'],
                    ['unpaid', 'Unpaid'],
                    ['paid', 'Paid'],
                    ['waived', 'Waived'],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ${filter === k ? 'bg-ink text-white ring-ink' : 'text-ink/70 ring-line hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative min-w-56 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student…" aria-label="Search students" className={`${selectCls} w-full pl-9`} />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {lines.map((l) => (
                      <tr key={l.id} aria-label={l.full_name} className={l.waived ? 'bg-slate-50/60 text-muted' : ''}>
                        <td className="px-4 py-3">
                          <Link to={`/fees/students/${l.student_id}?year=${charge.academic_year_id}`} className="flex items-center gap-3">
                            <Avatar name={l.full_name} url={l.photo_url} gender={l.gender} size="size-9" />
                            <span className="leading-tight">
                              <span className="block font-bold text-ink hover:text-brand">{l.full_name}</span>
                              <span className="text-xs text-muted">{l.admission_no}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">{[l.class_name, l.section_name].filter(Boolean).join(' - ') || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setAmountFor(l)} disabled={l.waived || !canManage} className="inline-flex items-center gap-1 font-semibold hover:text-brand disabled:hover:text-inherit" aria-label={`Change amount for ${l.full_name}`}>
                            {inr(l.amount)} {!l.waived && <Pencil className="size-3 text-muted" />}
                          </button>
                          {l.amount !== charge.amount && !l.waived && <span className="block text-[11px] text-violet-600">custom</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700">{inr(l.paid)}</td>
                        <td className="px-4 py-3">
                          <StatusPill status={l.status} />
                          {l.waive_reason && <span className="mt-1 block text-xs">{l.waive_reason}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {l.balance > 0 && access.can('fees.collect') && (
                              <button onClick={() => setCollecting(l)} className="btn-primary px-3 py-1.5 text-sm">
                                Collect
                              </button>
                            )}
                            {!canManage ? null : l.waived ? (
                              <button onClick={() => void run(`w${l.id}`, () => chargesApi.updateLine(l.id, { waived: false }), `${l.full_name} will be charged again`)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-brand ring-1 ring-sky-200 hover:bg-sky-50">
                                Un-waive
                              </button>
                            ) : (
                              l.paid === 0 && (
                                <button onClick={() => setWaiving(l)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50">
                                  Waive
                                </button>
                              )
                            )}
                            {!l.has_payments && canManage && (
                              <button onClick={() => void run(`r${l.id}`, () => chargesApi.removeLine(l.id), `${l.full_name} removed from this charge`)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Remove ${l.full_name}`} title="Remove (added by mistake)">
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lines.length === 0 && <p className="py-10 text-center text-muted">No students here.</p>}
            </section>
          </>
        )}
      </div>

      {charge && collecting && (
        <PaymentDialog
          studentName={collecting.full_name}
          targets={[{ lineId: collecting.id, label: charge.name, balance: collecting.balance, suggested: collecting.balance }]}
          onClose={() => setCollecting(null)}
          onSubmit={async (input) => {
            const out = await feesApi.pay(collecting.student_id, input, charge.academic_year_id)
            setCharge(await chargesApi.get(charge.id))
            const p = out.payments.find((x) => x.id === out.last_payment_id)
            setNotice({ text: `${inr(input.amount)} received from ${collecting.full_name} · receipt ${p?.receipt_no ?? ''}`, receiptId: out.last_payment_id ?? undefined })
          }}
        />
      )}
      {waiving && (
        <ReasonDialog
          title={`Waive for ${waiving.full_name}?`}
          subtitle="They won't be charged; you can un-waive it later."
          label="Reason"
          quick={['Not participating', 'Scholarship', 'Staff child', 'Sibling']}
          submitLabel="Waive"
          onClose={() => setWaiving(null)}
          onSubmit={async (reason) => {
            setCharge(await chargesApi.updateLine(waiving.id, { waived: true, waive_reason: reason }))
            setNotice({ text: `Waived for ${waiving.full_name}` })
          }}
        />
      )}
      {amountFor && charge && (
        <AmountDialog
          name={amountFor.full_name}
          current={amountFor.amount}
          min={amountFor.paid}
          onClose={() => setAmountFor(null)}
          onSubmit={async (amount) => {
            setCharge(await chargesApi.updateLine(amountFor.id, { amount }))
            setNotice({ text: `${amountFor.full_name} now pays ${inr(amount)}` })
          }}
        />
      )}
      {editing && charge && <EditChargeDialog charge={charge} onClose={() => setEditing(false)} onSaved={(c) => (setCharge(c), setNotice({ text: 'Charge updated' }))} />}
      {adding && charge && <AddStudentsDialog charge={charge} onClose={() => setAdding(false)} onAdded={(c, n) => (setCharge(c), setNotice({ text: `${n} student${n === 1 ? '' : 's'} added` }))} />}
      {deleting && charge && (
        <Dialog
          title={`Delete “${charge.name}”?`}
          subtitle="It's removed from every student's dues. Not possible once a payment has been recorded — waive it instead."
          submitLabel="Delete"
          danger
          onClose={() => setDeleting(false)}
          onSubmit={async () => {
            await chargesApi.remove(charge.id)
            navigate(back, { replace: true })
          }}
        />
      )}
    </AppShell>
  )
}

function EditChargeDialog({ charge, onClose, onSaved }: { charge: ChargeDetail; onClose: () => void; onSaved: (c: ChargeDetail) => void }) {
  const [draft, setDraft] = useState<ChargeDraft>({
    name: charge.name,
    category: charge.category,
    amount: String(charge.amount),
    due_date: charge.due_date,
    description: charge.description ?? '',
  })
  const problem = draftProblem(draft)
  return (
    <Dialog
      title="Edit charge"
      subtitle={Number(draft.amount) !== charge.amount ? 'The new amount applies to students still at the old amount who haven’t paid anything yet.' : undefined}
      submitLabel="Save"
      submitDisabled={Boolean(problem)}
      onClose={onClose}
      onSubmit={async () => onSaved(await chargesApi.update(charge.id, toCharge(draft)))}
    >
      <ChargeFields draft={draft} onChange={setDraft} presets={CLASS_PRESETS} />
    </Dialog>
  )
}

function AddStudentsDialog({ charge, onClose, onAdded }: { charge: ChargeDetail; onClose: () => void; onAdded: (c: ChargeDetail, n: number) => void }) {
  const options = useSchoolOptions()
  const [students, setStudents] = useState<CertStudent[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  useEffect(() => {
    certificatesApi.students({}).then(setStudents, () => undefined)
  }, [])
  return (
    <Dialog
      title="Add students"
      subtitle={`They'll be charged ${inr(charge.amount)} each.`}
      submitLabel={`Add ${selected.size || ''}`.trim()}
      submitDisabled={selected.size === 0}
      onClose={onClose}
      onSubmit={async () => onAdded(await chargesApi.addStudents(charge.id, [...selected]), selected.size)}
    >
      <StudentChecklist students={students} classes={options?.classes ?? []} selected={selected} onChange={setSelected} taken={new Set(charge.lines.map((l) => l.student_id))} />
    </Dialog>
  )
}
