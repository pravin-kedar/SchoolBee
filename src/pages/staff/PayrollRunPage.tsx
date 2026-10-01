import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, BadgeCheck, CheckCircle2, Download, IndianRupee, Loader2, Pencil, RefreshCw, RotateCcw, Trash2, Users, Wallet, X } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { MoneyCard, StatusPill } from '../../components/fees/FeeUi'
import { Avatar } from '../../components/students/StudentUi'
import { selectCls } from '../../components/students/StudentTable'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { inr, shortDate, todayIso } from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { monthLabel, payrollApi, type Payslip, type Run } from '../../lib/staff'

const inputCls = `${selectCls} mt-1 w-full font-normal`

/** One payroll month: review every slip, add the month's extras / unpaid
 *  leave, approve (staff can then download their slip), mark paid. */
export function PayrollRunPage() {
  const { runId = '' } = useParams()
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const [run, setRun] = useState<Run | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [days, setDays] = useState('')
  const [editing, setEditing] = useState<Payslip | null>(null)
  const [paying, setPaying] = useState<Payslip | null>(null)
  const [confirm, setConfirm] = useState<'approve' | 'reopen' | 'delete' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    payrollApi.run(runId).then(
      (r) => (setRun(r), setDays(String(r.working_days))),
      (err) => setError(errorMessage(err)),
    )
  }, [runId])

  if (!token) return <Navigate to="/login" replace />

  async function act(key: string, fn: () => Promise<Run>, text?: string) {
    setBusy(key)
    setError(null)
    try {
      const r = await fn()
      setRun(r)
      setDays(String(r.working_days))
      if (text) setNotice(text)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function download(slip: Payslip) {
    setBusy(`pdf-${slip.id}`)
    try {
      await payrollApi.slipPdf(slip.id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const draft = run?.status === 'Draft'
  const unpaid = run ? run.slips.filter((s) => s.status === 'Approved').length : 0
  const anyPaid = run ? run.slips.some((s) => s.status === 'Paid') : false

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/staff?tab=payroll" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
              <ArrowLeft className="size-4" /> Payroll
            </Link>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-extrabold sm:text-3xl">
              {run ? `Payroll — ${monthLabel(run.month)}` : 'Payroll'} {run && <StatusPill status={run.status} />}
            </h1>
            {run && (
              <p className="mt-0.5 text-sm">
                {draft
                  ? 'Draft — add this month’s extras and unpaid leave, then approve. Staff see their slip only after approval.'
                  : `Approved${run.approved_by ? ` by ${run.approved_by}` : ''}${run.approved_at ? ` on ${shortDate(run.approved_at.slice(0, 10))}` : ''} — staff can download their slips.`}
              </p>
            )}
          </div>
          {run && (
            <div className="flex flex-wrap gap-2">
              {draft ? (
                <>
                  <button onClick={() => setConfirm('delete')} className="btn-outline border-rose-200 text-rose-600">
                    <Trash2 className="size-4" /> Delete
                  </button>
                  <button onClick={() => void act('refresh', () => payrollApi.refresh(run.id), 'Salaries refreshed from each staff member’s current salary')} disabled={!!busy} className="btn-outline">
                    {busy === 'refresh' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Refresh salaries
                  </button>
                  <button onClick={() => setConfirm('approve')} disabled={!run.slips.length || !!busy} className="btn-primary disabled:opacity-50">
                    <BadgeCheck className="size-4" /> Approve month
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirm('reopen')} disabled={anyPaid} title={anyPaid ? 'Some salaries are already paid' : undefined} className="btn-outline disabled:opacity-50">
                  <RotateCcw className="size-4" /> Reopen
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}
        {notice && (
          <p role="status" className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> {notice}
            </span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}

        {!run ? (
          !error && <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <MoneyCard label="Staff" value={String(run.totals.staff)} icon={Users} tone="bg-sky-100 text-brand" />
              <MoneyCard label="Gross" value={inr(run.totals.gross)} icon={IndianRupee} tone="bg-violet-100 text-violet-600" />
              <MoneyCard label="Net payable" value={inr(run.totals.net)} icon={Wallet} tone="bg-amber-100 text-amber-600" />
              <MoneyCard label="Paid" value={inr(run.totals.paid)} hint={run.status === 'Approved' ? `${unpaid} still to pay` : undefined} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" />
            </div>

            {run.missing_salary.length > 0 && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  No salary set for {run.missing_salary.join(', ')} — they aren’t in this month. Set their salary on their profile{draft ? ', then Refresh salaries' : ''}.
                </span>
              </p>
            )}

            {draft && (
              <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
                <label className="text-sm font-bold">
                  Working days this month
                  <input type="number" min={1} max={31} value={days} onChange={(e) => setDays(e.target.value)} aria-label="Working days" className={`${selectCls} mt-1 block w-32 font-normal`} />
                </label>
                <button
                  onClick={() => void act('days', () => payrollApi.updateRun(run.id, Number(days), run.month), 'Working days updated')}
                  disabled={!!busy || !days || Number(days) === run.working_days || Number(days) < 1 || Number(days) > 31}
                  className="btn-outline py-2 disabled:opacity-50"
                >
                  Update
                </button>
                <p className="text-xs text-muted">Unpaid leave (LOP) is deducted as fixed earnings × LOP days ÷ working days.</p>
              </div>
            )}

            <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60" aria-label="Payslips">
              {run.slips.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted">Nobody here yet — set salaries on staff profiles, then Refresh salaries.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-bold tracking-wide text-muted uppercase">
                      <tr>
                        <th className="px-4 py-3">Staff</th>
                        <th className="px-4 py-3 text-right">Gross</th>
                        <th className="px-4 py-3 text-right">LOP</th>
                        <th className="px-4 py-3 text-right">Deductions</th>
                        <th className="px-4 py-3 text-right">Net pay</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {run.slips.map((s) => {
                        const extras = s.extra_earnings.length + s.extra_deductions.length
                        return (
                          <tr key={s.id} aria-label={s.full_name}>
                            <td className="px-4 py-3">
                              <Link to={`/staff/${s.staff_id}`} className="flex items-center gap-3">
                                <Avatar name={s.full_name} url={s.photo_url} />
                                <span>
                                  <span className="block font-bold">{s.full_name}</span>
                                  <span className="text-xs text-muted">
                                    {s.employee_code} · {s.staff_type}
                                    {extras ? ` · ${extras} extra${extras > 1 ? 's' : ''}` : ''}
                                  </span>
                                </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right">{inr(s.gross)}</td>
                            <td className="px-4 py-3 text-right">{Number(s.lop_days) ? <span title={`${Number(s.lop_days)} day(s)`}>− {inr(s.lop_amount)}</span> : '—'}</td>
                            <td className="px-4 py-3 text-right">− {inr(s.total_deductions)}</td>
                            <td className="px-4 py-3 text-right font-extrabold" aria-label={`Net ${s.full_name}`}>
                              {inr(s.net)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill status={s.status} />
                              {s.paid_on && (
                                <span className="mt-0.5 block text-xs text-muted">
                                  {shortDate(s.paid_on)} · {s.payment_mode}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex justify-end gap-1">
                                {draft && (
                                  <>
                                    <button onClick={() => setEditing(s)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label={`Edit ${s.full_name}`}>
                                      <Pencil className="size-4" />
                                    </button>
                                    <button onClick={() => void act(`rm-${s.id}`, () => payrollApi.removeSlip(s.id), `${s.full_name} removed from this month`)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Remove ${s.full_name}`}>
                                      <Trash2 className="size-4" />
                                    </button>
                                  </>
                                )}
                                {s.status === 'Approved' && (
                                  <button onClick={() => setPaying(s)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50" aria-label={`Mark paid ${s.full_name}`}>
                                    <Wallet className="size-3.5" /> Mark paid
                                  </button>
                                )}
                                <button onClick={() => void download(s)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label={`Download slip ${s.full_name}`}>
                                  {busy === `pdf-${s.id}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                                </button>
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {editing && run && <SlipDialog slip={editing} workingDays={run.working_days} onClose={() => setEditing(null)} onSaved={(r) => (setRun(r), setNotice(`${editing.full_name}’s slip updated`))} />}
      {paying && <PaidDialog slip={paying} onClose={() => setPaying(null)} onSaved={(r) => (setRun(r), setNotice(`${paying.full_name} marked paid`))} />}
      {confirm && run && (
        <Dialog
          title={confirm === 'approve' ? `Approve ${monthLabel(run.month)}?` : confirm === 'reopen' ? 'Reopen this month?' : 'Delete this payroll month?'}
          subtitle={
            confirm === 'approve'
              ? `Slip numbers are given and ${run.totals.staff} staff member(s) can download their salary slip. You can reopen it until someone is marked paid.`
              : confirm === 'reopen'
                ? 'It goes back to Draft and staff can no longer download these slips until you approve again.'
                : 'All of this month’s slips and extras are removed. You can start it again.'
          }
          submitLabel={confirm === 'approve' ? 'Approve' : confirm === 'reopen' ? 'Reopen' : 'Delete'}
          danger={confirm === 'delete'}
          onClose={() => setConfirm(null)}
          onSubmit={async () => {
            if (confirm === 'delete') {
              await payrollApi.deleteRun(run.id)
              navigate('/staff?tab=payroll', { replace: true })
              return
            }
            const r = confirm === 'approve' ? await payrollApi.approve(run.id) : await payrollApi.reopen(run.id)
            setRun(r)
            setNotice(confirm === 'approve' ? 'Month approved — staff can now download their slips' : 'Month reopened as Draft')
          }}
        />
      )}
    </AppShell>
  )
}

type Line = { name: string; amount: string }

function SlipDialog({ slip, workingDays, onClose, onSaved }: { slip: Payslip; workingDays: number; onClose: () => void; onSaved: (r: Run) => void }) {
  const toLines = (xs: { name: string; amount: number }[]) => xs.map((x) => ({ name: x.name, amount: String(x.amount) }))
  const [earn, setEarn] = useState<Line[]>(toLines(slip.extra_earnings))
  const [ded, setDed] = useState<Line[]>(toLines(slip.extra_deductions))
  const [lop, setLop] = useState(String(Number(slip.lop_days)))
  const [note, setNote] = useState(slip.note ?? '')
  const lopOk = /^\d{1,2}(\.[05])?$/.test(lop || '0') && Number(lop || 0) <= workingDays
  const clean = (xs: Line[]) => xs.filter((x) => x.name.trim() && Number(x.amount) > 0).map((x) => ({ name: x.name.trim(), amount: Number(x.amount) }))

  const lines = (label: string, xs: Line[], set: (l: Line[]) => void, hint: string) => (
    <div>
      <p className="text-sm font-bold">{label}</p>
      <ul className="mt-1 space-y-2">
        {xs.map((l, i) => (
          <li key={i} className="grid grid-cols-[1fr_7.5rem_auto] gap-2">
            <input value={l.name} maxLength={60} placeholder={hint} onChange={(e) => set(xs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label={`${label} name`} className={selectCls} />
            <input inputMode="numeric" value={l.amount} placeholder="₹" onChange={(e) => set(xs.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/[^\d]/g, '') } : x)))} aria-label={`${label} amount`} className={`${selectCls} text-right`} />
            <button type="button" onClick={() => set(xs.filter((_, j) => j !== i))} className="grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Remove ${label.toLowerCase()} line`}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => set([...xs, { name: '', amount: '' }])} className="mt-2 text-xs font-bold text-brand">
        + Add {label.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  )

  return (
    <Dialog
      title={`${slip.full_name} — this month`}
      subtitle="Only for this month; their regular salary doesn’t change."
      submitLabel="Save"
      submitDisabled={!lopOk}
      onClose={onClose}
      onSubmit={async () => onSaved(await payrollApi.updateSlip(slip.id, { extra_earnings: clean(earn), extra_deductions: clean(ded), lop_days: lop || '0', note: note.trim() || null }))}
    >
      {lines('Extra earnings', earn, setEarn, 'e.g. Bonus, Overtime')}
      {lines('Extra deductions', ded, setDed, 'e.g. Advance recovery')}
      <label className="block text-sm font-bold">
        Unpaid leave (LOP) days <span className="font-normal text-muted">of {workingDays} working days · half days allowed</span>
        <input inputMode="decimal" value={lop} onChange={(e) => setLop(e.target.value.replace(/[^\d.]/g, ''))} aria-label="LOP days" className={`${selectCls} mt-1 block w-32 font-normal`} />
      </label>
      {!lopOk && <p className="text-sm font-semibold text-rose-600">Enter whole or half days, up to {workingDays}.</p>}
      <label className="block text-sm font-bold">
        Note on slip <span className="font-normal text-muted">(optional)</span>
        <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} aria-label="Slip note" className={inputCls} />
      </label>
    </Dialog>
  )
}

function PaidDialog({ slip, onClose, onSaved }: { slip: Payslip; onClose: () => void; onSaved: (r: Run) => void }) {
  const [on, setOn] = useState(todayIso())
  const [mode, setMode] = useState('Bank Transfer')
  const [ref, setRef] = useState('')
  return (
    <Dialog
      title={`Mark ${slip.full_name} paid`}
      subtitle={`Net pay ${inr(slip.net)}. The payment details are printed on their slip.`}
      submitLabel="Mark paid"
      submitDisabled={!on}
      onClose={onClose}
      onSubmit={async () => onSaved(await payrollApi.markPaid(slip.id, { paid_on: on, payment_mode: mode, payment_reference: ref.trim() || null }))}
    >
      <label className="block text-sm font-bold">
        Paid on
        <input type="date" value={on} onChange={(e) => setOn(e.target.value)} aria-label="Paid on" className={inputCls} />
      </label>
      <label className="block text-sm font-bold">
        Mode
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Payment mode" className={inputCls}>
          {['Bank Transfer', 'UPI', 'Cash', 'Cheque'].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-bold">
        Reference <span className="font-normal text-muted">(optional — UTR / cheque no.)</span>
        <input value={ref} maxLength={100} onChange={(e) => setRef(e.target.value)} aria-label="Payment reference" className={inputCls} />
      </label>
    </Dialog>
  )
}
