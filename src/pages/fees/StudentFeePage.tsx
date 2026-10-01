import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Download,
  FileText,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { ChargeFields } from '../../components/fees/ChargeFields'
import { AmountDialog, ReasonDialog } from '../../components/fees/FeeDialogs'
import { MoneyCard, StatusPill, YearSelect } from '../../components/fees/FeeUi'
import { PaymentDialog } from '../../components/fees/PaymentDialog'
import { Avatar } from '../../components/students/StudentUi'
import { selectCls } from '../../components/students/StudentTable'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { usePermission } from '../../lib/auth'
import {
  CHARGE_TONE,
  STUDENT_PRESETS,
  chargesApi,
  draftProblem,
  feesApi,
  inr,
  payTargets,
  shortDate,
  toCharge,
  todayIso,
  type ChargeDraft,
  type Payment,
  type StudentCharge,
  type StudentFee,
} from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'

export function StudentFeePage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const yearId = params.get('year') ?? undefined
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [fee, setFee] = useState<StudentFee | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ text: string; receiptId?: string } | null>(null)
  const [paying, setPaying] = useState<{ initial: string | null } | null>(null)
  const [voiding, setVoiding] = useState<Payment | null>(null)
  const [addingCharge, setAddingCharge] = useState(false)
  const [waiving, setWaiving] = useState<StudentCharge | null>(null)
  const [amountFor, setAmountFor] = useState<StudentCharge | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const access = usePermission()
  const canManage = access.can('fees.manage')

  useEffect(() => {
    let live = true
    feesApi.student(id, yearId).then(
      (f) => live && (setFee(f), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [id, yearId])

  if (!token) return <Navigate to="/login" replace />

  async function run(key: string, fn: () => Promise<StudentFee | void>, text?: string) {
    setBusy(key)
    setError(null)
    try {
      const out = await fn()
      if (out) setFee(out)
      if (text) setNotice({ text })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const next = fee?.installments.find((i) => i.balance > 0)
  const targets = fee ? payTargets(fee) : []
  const hasAnything = Boolean(fee && (fee.has_structure || fee.charges.length))

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <Link to={`/fees${yearId ? `?year=${yearId}` : ''}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand">
          <ArrowLeft className="size-4" /> Fee Management
        </Link>

        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}

        {!fee ? (
          !error && <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
              <Avatar name={fee.full_name} url={fee.photo_url} gender={fee.gender} size="size-16 text-xl rounded-2xl" />
              <div className="min-w-0 flex-1 leading-snug">
                <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold">
                  {fee.full_name} <StatusPill status={fee.overall_status} />
                </h1>
                <p className="text-sm text-ink/80">
                  {fee.admission_no} · {[fee.class_name, fee.section_name].filter(Boolean).join(' - ') || 'No class'} · {fee.academic_year}
                </p>
                <p className="text-xs text-muted">
                  {[fee.father_name && `Father: ${fee.father_name}`, fee.mother_name && `Mother: ${fee.mother_name}`, fee.parent_phone].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <YearSelect years={options?.years} value={fee.academic_year_id} onChange={(y) => setParams({ year: y }, { replace: true })} />
                <Link to={`/students/${fee.student_id}`} className="btn-outline">
                  Profile
                </Link>
                {hasAnything && (
                  <button onClick={() => void run('invoice', () => feesApi.invoice(fee.student_id, fee.academic_year_id))} className="btn-outline">
                    {busy === 'invoice' ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Download invoice
                  </button>
                )}
                {targets.length > 0 && access.can('fees.collect') && (
                  <button onClick={() => setPaying({ initial: null })} className="btn-primary">
                    <Plus className="size-4" /> Record payment
                  </button>
                )}
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

            {!fee.has_structure && (
              <p className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <TriangleAlert className="size-4" /> No yearly fee is set for {fee.class_name ?? 'this class'} in {fee.academic_year}.
                <Link to={`/fees/structure?year=${fee.academic_year_id}`} className="font-bold text-brand underline">
                  Set up fee structure
                </Link>
              </p>
            )}

            <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <MoneyCard
                label="Total due"
                value={inr(fee.total_due)}
                hint={fee.charges.length ? `Yearly ${inr(fee.has_structure ? fee.net : 0)} + charges ${inr(fee.total_due - (fee.has_structure ? fee.net : 0))}` : fee.discount ? `${inr(fee.gross)} − ${inr(fee.discount)} concession` : 'For the year'}
                icon={IndianRupee}
                tone="bg-sky-100 text-brand"
              />
              <MoneyCard label="Paid" value={inr(fee.total_paid)} hint={`${fee.payments.filter((p) => p.status === 'Paid').length} payment(s)`} icon={Wallet} tone="bg-emerald-100 text-emerald-600" />
              <MoneyCard label="Balance" value={inr(fee.total_balance)} hint={next ? `Next installment: ${next.name}${next.due_date ? ` · ${shortDate(next.due_date)}` : ''}` : fee.total_balance ? 'Additional charges' : 'All paid'} icon={Receipt} tone="bg-amber-100 text-amber-600" />
              <MoneyCard label="Overdue" value={inr(fee.total_overdue)} hint={fee.total_overdue ? 'Past its due date' : 'Nothing overdue'} icon={TriangleAlert} tone="bg-rose-100 text-rose-500" />
            </section>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,26rem)_1fr]">
              <div className="space-y-5">
                {fee.has_structure && <FeeBreakdown readOnly={!canManage} fee={fee} onSaved={(f) => (setFee(f), setNotice({ text: `Yearly fee updated — now ${inr(f.net)}` }))} onError={setError} />}
                <ChargesSection
                  fee={fee}
                  canManage={canManage}
                  canCollect={access.can('fees.collect')}
                  busy={busy}
                  onAdd={() => setAddingCharge(true)}
                  onPay={(c) => setPaying({ initial: c.line_id })}
                  onWaive={setWaiving}
                  onUnwaive={(c) => void run(`w${c.line_id}`, () => chargesApi.updateForStudent(fee.student_id, c.line_id, { waived: false }), `${c.name} will be charged again`)}
                  onAmount={setAmountFor}
                  onRemove={(c) => void run(`r${c.line_id}`, () => chargesApi.removeForStudent(fee.student_id, c.line_id), `${c.name} removed`)}
                />
              </div>

              <div className="space-y-5">
                {fee.has_structure && (
                  <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Installments">
                    <h2 className="mb-3 text-lg font-bold">Yearly fee installments</h2>
                    <ul className="space-y-3">
                      {fee.installments.map((d, i) => {
                        const pct = d.amount ? Math.round((d.paid / d.amount) * 100) : 100
                        return (
                          <li key={d.id ?? i} aria-label={d.name} className="rounded-xl p-3 ring-1 ring-line">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span>
                                <span className="font-bold">{d.name}</span>
                                <span className="ml-2 text-sm text-muted">{d.due_date ? `due ${shortDate(d.due_date)}` : 'any time this year'}</span>
                              </span>
                              <StatusPill status={d.status} />
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${d.status === 'Overdue' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="mt-1.5 flex justify-between text-sm">
                              <span className="text-muted">
                                Paid {inr(d.paid)} of {inr(d.amount)}
                              </span>
                              {d.balance > 0 && <span className="font-bold">{inr(d.balance)} left</span>}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}

                <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Payments">
                  <h2 className="mb-3 text-lg font-bold">Payment history</h2>
                  {fee.payments.length === 0 ? (
                    <p className="text-sm text-muted">No payments recorded yet.</p>
                  ) : (
                    <div className="-mx-5 overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
                          <tr>
                            <th className="px-5 py-2.5">Receipt</th>
                            <th className="px-3 py-2.5">Date</th>
                            <th className="px-3 py-2.5">For</th>
                            <th className="px-3 py-2.5">Mode</th>
                            <th className="px-3 py-2.5 text-right">Amount</th>
                            <th className="px-5 py-2.5 text-right" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {fee.payments.map((p) => (
                            <tr key={p.id} aria-label={p.receipt_no} className={p.status === 'Void' ? 'text-muted' : ''}>
                              <td className="px-5 py-3">
                                <span className={`font-mono text-xs font-bold ${p.status === 'Void' ? 'line-through' : ''}`}>{p.receipt_no}</span>
                                {p.status === 'Void' && <span className="block text-xs text-rose-600">Voided: {p.void_reason}</span>}
                                {p.note && <span className="block text-xs text-muted">{p.note}</span>}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {shortDate(p.paid_on)}
                                {p.received_by && <span className="block text-xs text-muted">by {p.received_by}</span>}
                              </td>
                              <td className={`px-3 py-3 ${p.charge_line_id ? 'font-semibold text-violet-700' : ''}`}>{p.paid_for}</td>
                              <td className="px-3 py-3">
                                {p.method}
                                {p.reference && <span className="block text-xs text-muted">{p.reference}</span>}
                              </td>
                              <td className="px-3 py-3 text-right font-bold">{inr(p.amount)}</td>
                              <td className="px-5 py-3">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => void run(`r${p.id}`, () => feesApi.receipt(p.id))} className="grid size-8 place-items-center rounded-lg text-ink/70 hover:bg-slate-100" aria-label={`Download receipt ${p.receipt_no}`} title="Download receipt">
                                    {busy === `r${p.id}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                                  </button>
                                  {p.status === 'Paid' && canManage && (
                                    <button onClick={() => setVoiding(p)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Void ${p.receipt_no}`} title="Void payment">
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
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>

      {paying && fee && (
        <PaymentDialog
          studentName={fee.full_name}
          targets={targets}
          initial={paying.initial}
          onClose={() => setPaying(null)}
          onSubmit={async (input) => {
            const out = await feesApi.pay(fee.student_id, input, fee.academic_year_id)
            setFee(out)
            const p = out.payments.find((x) => x.id === out.last_payment_id)
            setNotice({ text: `${inr(input.amount)} received for ${p?.paid_for ?? 'the fee'} · receipt ${p?.receipt_no ?? ''}`, receiptId: out.last_payment_id ?? undefined })
          }}
        />
      )}
      {voiding && (
        <ReasonDialog
          title={`Void receipt ${voiding.receipt_no}?`}
          subtitle={`${inr(voiding.amount)} for ${voiding.paid_for} on ${shortDate(voiding.paid_on)} will no longer count. It stays listed as voided.`}
          label="Void reason"
          quick={['Entered twice', 'Wrong student', 'Wrong amount', 'Cheque bounced']}
          submitLabel="Void payment"
          onClose={() => setVoiding(null)}
          onSubmit={async (reason) => {
            setFee(await feesApi.void(voiding.id, reason))
            setNotice({ text: `Receipt ${voiding.receipt_no} voided` })
          }}
        />
      )}
      {addingCharge && fee && (
        <AddChargeDialog
          fee={fee}
          onClose={() => setAddingCharge(false)}
          onAdded={(f, name) => (setFee(f), setNotice({ text: `${name} added to ${f.full_name}'s dues` }))}
        />
      )}
      {waiving && fee && (
        <ReasonDialog
          title={`Waive ${waiving.name}?`}
          subtitle={`${fee.full_name} won't be charged ${inr(waiving.amount)}; you can un-waive it later.`}
          label="Reason"
          quick={['Not participating', 'Scholarship', 'Staff child', 'Sibling']}
          submitLabel="Waive"
          onClose={() => setWaiving(null)}
          onSubmit={async (reason) => {
            setFee(await chargesApi.updateForStudent(fee.student_id, waiving.line_id, { waived: true, waive_reason: reason }))
            setNotice({ text: `${waiving.name} waived` })
          }}
        />
      )}
      {amountFor && fee && (
        <AmountDialog
          name={`${amountFor.name}`}
          current={amountFor.amount}
          min={amountFor.paid}
          onClose={() => setAmountFor(null)}
          onSubmit={async (amount) => {
            setFee(await chargesApi.updateForStudent(fee.student_id, amountFor.line_id, { amount }))
            setNotice({ text: `${amountFor.name} is now ${inr(amount)}` })
          }}
        />
      )}
    </AppShell>
  )
}

function ChargesSection({
  fee,
  canManage,
  canCollect,
  busy,
  onAdd,
  onPay,
  onWaive,
  onUnwaive,
  onAmount,
  onRemove,
}: {
  fee: StudentFee
  canManage: boolean
  canCollect: boolean
  busy: string | null
  onAdd: () => void
  onPay: (c: StudentCharge) => void
  onWaive: (c: StudentCharge) => void
  onUnwaive: (c: StudentCharge) => void
  onAmount: (c: StudentCharge) => void
  onRemove: (c: StudentCharge) => void
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Additional charges">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Additional charges</h2>
        <button onClick={onAdd} className="btn-outline py-1.5 text-sm" hidden={!canManage}>
          <Plus className="size-4" /> Add charge
        </button>
      </div>
      {fee.charges.length === 0 ? (
        <p className="text-sm text-muted">None — events, exams, trips or a late fee show here.</p>
      ) : (
        <ul className="space-y-2">
          {fee.charges.map((c) => (
            <li key={c.line_id} aria-label={c.name} className={`rounded-xl p-3 ring-1 ring-line ${c.waived ? 'bg-slate-50/70' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold leading-tight">
                    {c.name} <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${CHARGE_TONE[c.category] ?? CHARGE_TONE.Other}`}>{c.category}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Due {shortDate(c.due_date)}
                    {c.waived && c.waive_reason ? ` · waived: ${c.waive_reason}` : ''}
                  </p>
                </div>
                <StatusPill status={c.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <b className={c.waived ? 'line-through' : ''}>{inr(c.amount)}</b>
                  {!c.waived && c.paid > 0 && <span className="text-muted"> · paid {inr(c.paid)}</span>}
                </span>
                <span className="flex items-center gap-1">
                  {c.balance > 0 && canCollect && (
                    <button onClick={() => onPay(c)} className="btn-primary px-3 py-1 text-xs">
                      Pay {inr(c.balance)}
                    </button>
                  )}
                  {!c.waived && canManage && (
                    <button onClick={() => onAmount(c)} className="grid size-7 place-items-center rounded-lg text-ink/70 hover:bg-slate-100" aria-label={`Change ${c.name} amount`} title="Change amount">
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                  {!canManage ? null : c.waived ? (
                    <button onClick={() => onUnwaive(c)} disabled={busy === `w${c.line_id}`} className="rounded-lg px-2 py-1 text-xs font-bold text-brand hover:bg-sky-50">
                      Un-waive
                    </button>
                  ) : (
                    c.paid === 0 && (
                      <button onClick={() => onWaive(c)} className="rounded-lg px-2 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50">
                        Waive
                      </button>
                    )
                  )}
                  {c.paid === 0 && canManage && (
                    <button onClick={() => onRemove(c)} disabled={busy === `r${c.line_id}`} className="grid size-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Remove ${c.name}`} title="Remove (added by mistake)">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AddChargeDialog({ fee, onClose, onAdded }: { fee: StudentFee; onClose: () => void; onAdded: (f: StudentFee, name: string) => void }) {
  const [draft, setDraft] = useState<ChargeDraft>({ name: '', category: 'Other', amount: '', due_date: todayIso(), description: '' })
  const problem = draftProblem(draft)
  return (
    <Dialog
      title={`Add a charge for ${fee.full_name}`}
      subtitle="Just for this student — e.g. a late fee or a lost ID card. For a whole class, use Additional charges."
      submitLabel="Add charge"
      submitDisabled={Boolean(problem)}
      onClose={onClose}
      onSubmit={async () => onAdded(await chargesApi.addForStudent(fee.student_id, toCharge(draft), fee.academic_year_id), draft.name.trim())}
    >
      <ChargeFields draft={draft} onChange={setDraft} presets={STUDENT_PRESETS} />
    </Dialog>
  )
}

function FeeBreakdown({
  fee,
  readOnly,
  onSaved,
  onError,
}: {
  fee: StudentFee
  readOnly: boolean
  onSaved: (f: StudentFee) => void
  onError: (m: string) => void
}) {
  const [optional, setOptional] = useState<Set<string>>(new Set(fee.items.filter((i) => i.optional && i.included).map((i) => i.id)))
  const [type, setType] = useState<'none' | 'amount' | 'percent'>(fee.discount_type ?? 'none')
  const [value, setValue] = useState(fee.discount_value ? String(fee.discount_value) : '')
  const [reason, setReason] = useState(fee.discount_reason ?? '')
  const [busy, setBusy] = useState(false)

  const gross = fee.items.filter((i) => !i.optional || optional.has(i.id)).reduce((s, i) => s + i.amount, 0)
  const v = Number(value) || 0
  const discount = type === 'amount' ? Math.min(v, gross) : type === 'percent' ? Math.min(gross, Math.round((gross * Math.min(v, 100)) / 100)) : 0
  const changed =
    type !== (fee.discount_type ?? 'none') ||
    (type !== 'none' && (v !== fee.discount_value || reason.trim() !== (fee.discount_reason ?? ''))) ||
    [...optional].sort().join() !== fee.items.filter((i) => i.optional && i.included).map((i) => i.id).sort().join()
  const needsReason = type !== 'none' && v > 0 && !reason.trim()

  async function save() {
    setBusy(true)
    try {
      onSaved(
        await feesApi.savePlan(
          fee.student_id,
          { discount_type: type === 'none' ? null : type, discount_value: type === 'none' ? 0 : v, discount_reason: reason.trim() || null, optional_item_ids: [...optional] },
          fee.academic_year_id,
        ),
      )
    } catch (err) {
      onError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Fee breakdown">
      <h2 className="text-lg font-bold">Yearly fee</h2>
      <ul className="divide-y divide-line text-sm">
        {fee.items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 py-2">
            {i.optional ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  checked={optional.has(i.id)}
                  aria-label={`${i.name} (optional)`}
                  onChange={(e) =>
                    setOptional((prev) => {
                      const next = new Set(prev)
                      if (e.target.checked) next.add(i.id)
                      else next.delete(i.id)
                      return next
                    })
                  }
                />
                <span>
                  {i.name} <span className="text-xs text-muted">(optional)</span>
                </span>
              </label>
            ) : (
              <span>{i.name}</span>
            )}
            <span className={i.optional && !optional.has(i.id) ? 'text-muted line-through' : 'font-semibold'}>{inr(i.amount)}</span>
          </li>
        ))}
      </ul>

      <fieldset disabled={readOnly} className="space-y-3 rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
        <p className="text-sm font-bold text-emerald-800">Concession for this student</p>
        <div className="flex gap-2">
          {(
            [
              ['none', 'None'],
              ['amount', '₹ Amount'],
              ['percent', '% Percent'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)} className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold ring-1 ${type === k ? 'bg-white text-emerald-700 ring-emerald-400' : 'ring-line hover:bg-white'}`}>
              {label}
            </button>
          ))}
        </div>
        {type !== 'none' && (
          <>
            <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))} placeholder={type === 'percent' ? 'e.g. 10' : 'e.g. 5000'} aria-label="Concession value" className={`${selectCls} w-full`} />
            <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. Sibling, Staff child, Scholarship)" aria-label="Concession reason" className={`${selectCls} w-full`} />
            <div className="flex flex-wrap gap-1.5">
              {['Sibling', 'Staff child', 'Scholarship', 'Early payment'].map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold ring-1 ring-line hover:bg-slate-50">
                  {r}
                </button>
              ))}
            </div>
          </>
        )}
      </fieldset>

      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Fee</dt>
          <dd>{inr(gross)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <dt>Concession</dt>
            <dd>− {inr(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-1 text-base font-extrabold">
          <dt>Yearly fee total</dt>
          <dd>{inr(gross - discount)}</dd>
        </div>
      </dl>
      {needsReason && <p className="text-xs font-semibold text-amber-700">Add a reason for the concession.</p>}
      <button onClick={() => void save()} disabled={!changed || busy || needsReason} hidden={readOnly} className="btn-primary w-full justify-center disabled:opacity-50">
        {busy && <Loader2 className="size-4 animate-spin" />} Save changes
      </button>
    </section>
  )
}
