import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, CalendarCog, Crown, Download, Loader2, PauseCircle, PlayCircle, Plus, Trash2, X } from 'lucide-react'

import { Card } from './ZapShell'
import { Dialog } from '../ui/Dialog'
import { selectCls } from '../students/StudentTable'
import { errorMessage } from '../../lib/api'
import { inr } from '../../lib/fees'
import { STATUS_TEXT, STATUS_TONE, gb, limitText, rupees, shortDate, zapLicenseApi, type AdminLicenseDetail, type ApplyInput, type LicenseRow } from '../../lib/license'

export const inputCls = `${selectCls} mt-1 w-full font-normal`
const MODES = ['UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Card', 'Other']
const DURATIONS = [1, 3, 6, 12, 24]
const SUSPEND_REASONS = ['Payment not received', 'Cheque bounced', 'Terms violation', 'Requested by the school']

/** Website admin: a school's licence - status, change plan / dates, suspend, backup + delete. */
export function ZapLicenseCard({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const navigate = useNavigate()
  const [d, setD] = useState<AdminLicenseDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<null | 'apply' | 'suspend' | 'delete'>(null)
  const [editing, setEditing] = useState<LicenseRow | null>(null)
  const [cancelling, setCancelling] = useState<LicenseRow | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [backedUp, setBackedUp] = useState(false)

  useEffect(() => {
    zapLicenseApi.school(schoolId).then(setD, (err) => setError(errorMessage(err)))
  }, [schoolId])

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const s = d?.status
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Crown className="size-5 text-violet-600" /> Licence
        </span>
      }
      action={
        d &&
        s && (
          <span className="flex flex-wrap justify-end gap-2">
            {s.status === 'suspended' ? (
              <button onClick={() => run('resume', async () => setD(await zapLicenseApi.resume(schoolId)))} className="btn-outline py-2 text-sm">
                {busy === 'resume' ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />} Resume licence
              </button>
            ) : (
              <button onClick={() => setDialog('suspend')} className="btn-outline py-2 text-sm text-amber-700">
                <PauseCircle className="size-4" /> Suspend
              </button>
            )}
            <button onClick={() => setDialog('apply')} className="btn-primary py-2 text-sm">
              <Plus className="size-4" /> Change licence
            </button>
          </span>
        )
      }
    >
      {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      {!d || !s ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2 text-lg font-extrabold">
              {s.plan_name} <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_TONE[s.status]}`}>{STATUS_TEXT[s.status]}</span>
            </span>
            {s.ends_on && (
              <span>
                {s.status === 'expired' ? 'Expired on' : 'Valid until'} <b>{shortDate(s.ends_on)}</b>
                {s.days_left != null && ` · ${s.days_left} day${s.days_left === 1 ? '' : 's'} left`}
              </span>
            )}
            <span className="text-muted">
              {d.usage.students} / {limitText(d.limits.students)} students · {gb(d.usage.storage_mb)} / {gb(d.limits.storage_mb)} · {d.usage.staff_logins} / {limitText(d.limits.staff_logins)} logins
            </span>
          </div>
          {s.status === 'suspended' && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
              On hold{s.suspended_reason ? `: ${s.suspended_reason}` : ''}. Staff can log in but only see a “licence on hold” page.
            </p>
          )}
          {s.status === 'expired' && s.delete_on && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm ring-1 ring-rose-200" aria-label="Data retention">
              <span className="font-semibold text-rose-800">
                {d.deletable ? `Data retention ended on ${shortDate(s.delete_on)} — the school's data can now be deleted.` : `Data is kept until ${shortDate(s.delete_on)}. Deleting becomes possible from that day.`}
              </span>
              <span className="flex gap-2">
                <button
                  onClick={() =>
                    run('backup', async () => {
                      await zapLicenseApi.backup(schoolId)
                      setBackedUp(true)
                    })
                  }
                  className="btn-outline bg-white py-1.5 text-sm"
                >
                  {busy === 'backup' ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />} Download backup
                </button>
                <button
                  disabled={!d.deletable}
                  onClick={() => setDialog('delete')}
                  title={d.deletable ? undefined : `Available from ${shortDate(s.delete_on)}`}
                  className="btn-primary bg-rose-600 py-1.5 text-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-4" /> Delete school
                </button>
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">How</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.history.map((x) => (
                  <tr key={x.id} aria-label={`${x.plan_name} ${x.starts_on}`} className={x.cancelled_at ? 'text-muted' : ''}>
                    <td className="px-3 py-2 font-bold">{x.plan_name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {shortDate(x.starts_on)} – {shortDate(x.ends_on)}
                    </td>
                    <td className="px-3 py-2">
                      {x.kind === 'trial' ? 'Free trial' : x.kind === 'complimentary' ? 'Complimentary' : `${x.payment_mode ?? 'Paid'}${x.payment_reference ? ` · ${x.payment_reference}` : ''}`}
                      {x.note && <span className="block text-xs text-muted">{x.note}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{x.amount ? inr(x.amount) : '—'}</td>
                    <td className="px-3 py-2">{x.cancelled_at ? `Cancelled — ${x.cancel_reason}` : x.state}</td>
                    <td className="px-3 py-2">
                      <span className="flex justify-end gap-1">
                        {x.receipt_no && (
                          <button
                            onClick={() => run(x.id, () => zapLicenseApi.receipt(x.id))}
                            className="grid size-8 place-items-center rounded-lg hover:bg-slate-100"
                            aria-label={`Receipt ${x.receipt_no}`}
                            title={x.receipt_no}
                          >
                            {busy === x.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                          </button>
                        )}
                        {!x.cancelled_at && (
                          <>
                            <button onClick={() => setEditing(x)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label={`Change end date ${x.plan_name} ${x.starts_on}`} title="Change end date">
                              <CalendarCog className="size-4" />
                            </button>
                            <button onClick={() => setCancelling(x)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Cancel ${x.plan_name} ${x.starts_on}`} title="Cancel">
                              <X className="size-4" />
                            </button>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
                {d.history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted">
                      No licence yet — the owner hasn&rsquo;t chosen a plan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {dialog === 'apply' && d && <ApplyDialog schoolId={schoolId} detail={d} onClose={() => setDialog(null)} onDone={setD} />}
      {dialog === 'suspend' && <SuspendDialog onClose={() => setDialog(null)} onSubmit={async (reason) => setD(await zapLicenseApi.suspend(schoolId, reason))} />}
      {dialog === 'delete' && d && (
        <DeleteDialog
          schoolName={schoolName}
          backedUp={backedUp}
          onBackup={() => zapLicenseApi.backup(schoolId).then(() => setBackedUp(true))}
          onClose={() => setDialog(null)}
          onSubmit={async (reason) => {
            await zapLicenseApi.deleteSchool(schoolId, { confirm_name: schoolName, backup_taken: backedUp, reason })
            navigate('/zap/licenses?deleted=1', { replace: true })
          }}
        />
      )}
      {editing && <EditDialog row={editing} onClose={() => setEditing(null)} onDone={setD} />}
      {cancelling && <CancelDialog row={cancelling} onClose={() => setCancelling(null)} onDone={setD} />}
    </Card>
  )
}

function ApplyDialog({ schoolId, detail, onClose, onDone }: { schoolId: string; detail: AdminLicenseDetail; onClose: () => void; onDone: (d: AdminLicenseDetail) => void }) {
  const plans = detail.all_plans
  const first = plans.find((p) => !p.is_trial && p.is_active) ?? plans[0]
  const [f, setF] = useState<ApplyInput>({ plan: first?.key ?? '', kind: 'paid', months: 12, starts_on: null, ends_on: null, amount: 0, payment_mode: 'UPI', payment_reference: null, note: null })
  const [custom, setCustom] = useState(false)
  const plan = plans.find((p) => p.key === f.plan)
  const suggested = plan && !plan.is_trial ? (f.months === 12 && plan.price_yearly ? plan.price_yearly : f.months === 24 && plan.price_yearly ? plan.price_yearly * 2 : (f.months ?? 0) * plan.price_monthly) : 0
  const set = (patch: Partial<ApplyInput>) => setF((x) => ({ ...x, ...patch }))
  const ok = f.plan && (f.kind === 'complimentary' || (f.amount > 0 && f.payment_mode))
  return (
    <Dialog
      title="Change licence"
      subtitle="Sets the school's plan from the start date (after an offline payment, or to give free time). Whatever overlaps the new period ends the day before it starts."
      submitLabel={f.kind === 'paid' ? 'Apply & create receipt' : 'Apply'}
      size="lg"
      submitDisabled={!ok || (custom && !f.ends_on)}
      onClose={onClose}
      onSubmit={async () => onDone(await zapLicenseApi.apply(schoolId, { ...f, months: custom ? null : f.months }))}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold">
          Plan
          <select value={f.plan} onChange={(e) => set({ plan: e.target.value, amount: 0 })} aria-label="Plan" className={inputCls}>
            {plans.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
                {p.is_active ? '' : ' (hidden)'}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          Type
          <select value={f.kind} onChange={(e) => set({ kind: e.target.value as ApplyInput['kind'] })} aria-label="Type" className={inputCls}>
            <option value="paid">Paid</option>
            <option value="complimentary">Complimentary (free)</option>
          </select>
        </label>
      </div>
      <div>
        <p className="text-sm font-bold">Duration</p>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Duration">
          {DURATIONS.map((m) => (
            <button key={m} type="button" aria-pressed={!custom && f.months === m} onClick={() => (setCustom(false), set({ months: m, ends_on: null }))} className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${!custom && f.months === m ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}>
              {m < 12 ? `${m} month${m > 1 ? 's' : ''}` : `${m / 12} year${m > 12 ? 's' : ''}`}
            </button>
          ))}
          <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${custom ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}>
            Custom dates
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold">
          Starts on <span className="font-normal text-muted">(blank = today / after the same plan)</span>
          <input type="date" value={f.starts_on ?? ''} onChange={(e) => set({ starts_on: e.target.value || null })} aria-label="Starts on" className={inputCls} />
        </label>
        {custom && (
          <label className="block text-sm font-bold">
            Ends on
            <input type="date" value={f.ends_on ?? ''} onChange={(e) => set({ ends_on: e.target.value || null })} aria-label="Ends on" className={inputCls} />
          </label>
        )}
      </div>
      {f.kind === 'paid' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">
              Amount received (₹)
              <input inputMode="numeric" value={f.amount || ''} onChange={(e) => set({ amount: Number(e.target.value.replace(/\D/g, '')) || 0 })} aria-label="Amount received" className={inputCls} />
              {!custom && suggested > 0 && f.amount !== suggested && (
                <button type="button" onClick={() => set({ amount: suggested })} className="mt-1 text-xs font-bold text-brand">
                  Use list price {rupees(suggested)}
                </button>
              )}
            </label>
            <label className="block text-sm font-bold">
              Paid by
              <select value={f.payment_mode ?? ''} onChange={(e) => set({ payment_mode: e.target.value })} aria-label="Paid by" className={inputCls}>
                {MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-bold">
            Reference <span className="font-normal text-muted">(UTR / cheque no.)</span>
            <input value={f.payment_reference ?? ''} maxLength={100} onChange={(e) => set({ payment_reference: e.target.value })} aria-label="Payment reference" className={inputCls} />
          </label>
        </>
      )}
      <label className="block text-sm font-bold">
        Note <span className="font-normal text-muted">(optional)</span>
        <input value={f.note ?? ''} maxLength={300} onChange={(e) => set({ note: e.target.value })} placeholder={f.kind === 'paid' ? 'e.g. Diwali offer' : 'e.g. Pilot school'} aria-label="Note" className={inputCls} />
      </label>
    </Dialog>
  )
}

function EditDialog({ row, onClose, onDone }: { row: LicenseRow; onClose: () => void; onDone: (d: AdminLicenseDetail) => void }) {
  const [endsOn, setEndsOn] = useState(row.ends_on)
  const [note, setNote] = useState('')
  return (
    <Dialog
      title="Change end date"
      subtitle={`${row.plan_name}: ${shortDate(row.starts_on)} – ${shortDate(row.ends_on)}. Extending lets the school keep working; the owner is told.`}
      submitLabel="Save end date"
      submitDisabled={!endsOn || endsOn < row.starts_on || endsOn === row.ends_on}
      onClose={onClose}
      onSubmit={async () => onDone(await zapLicenseApi.edit(row.id, endsOn, note.trim() || null))}
    >
      <label className="block text-sm font-bold">
        New end date
        <input type="date" value={endsOn} min={row.starts_on} onChange={(e) => setEndsOn(e.target.value)} aria-label="New end date" className={inputCls} />
      </label>
      <label className="block text-sm font-bold">
        Why <span className="font-normal text-muted">(optional)</span>
        <input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Payment received late" aria-label="Why" className={inputCls} />
      </label>
    </Dialog>
  )
}

function CancelDialog({ row, onClose, onDone }: { row: LicenseRow; onClose: () => void; onDone: (d: AdminLicenseDetail) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Dialog
      title={`Cancel this ${row.plan_name} period?`}
      subtitle={`${shortDate(row.starts_on)} – ${shortDate(row.ends_on)}. It stops counting at once (e.g. a mistake or a refund). It stays in the history.`}
      submitLabel="Cancel period"
      danger
      submitDisabled={reason.trim().length < 2}
      onClose={onClose}
      onSubmit={async () => onDone(await zapLicenseApi.cancel(row.id, reason.trim()))}
    >
      <input autoFocus value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. Entered by mistake" aria-label="Cancel reason" className={inputCls} />
    </Dialog>
  )
}

export function SuspendDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('')
  return (
    <Dialog
      title="Suspend licence?"
      subtitle="Everyone in the school can still log in, but they only see a “licence on hold” page until you resume it. Their data is untouched."
      submitLabel="Suspend licence"
      danger
      submitDisabled={reason.trim().length < 2}
      onClose={onClose}
      onSubmit={() => onSubmit(reason.trim())}
    >
      <div className="flex flex-wrap gap-1.5">
        {SUSPEND_REASONS.map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${reason === r ? 'bg-amber-100 ring-amber-300' : 'ring-line hover:bg-slate-50'}`}>
            {r}
          </button>
        ))}
      </div>
      <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Reason (the owner sees it)" aria-label="Suspend reason" className={inputCls} />
    </Dialog>
  )
}

function DeleteDialog({
  schoolName,
  backedUp,
  onBackup,
  onClose,
  onSubmit,
}: {
  schoolName: string
  backedUp: boolean
  onBackup: () => Promise<void>
  onClose: () => void
  onSubmit: (reason: string | null) => Promise<void>
}) {
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <Dialog
      title="Delete this school permanently?"
      subtitle="Every record, document and login that belongs only to this school is removed from the cloud. This can't be undone. Payments stay in the payments list."
      submitLabel="Delete permanently"
      danger
      submitDisabled={!backedUp || typed.trim() !== schoolName.trim()}
      onClose={onClose}
      onSubmit={() => onSubmit(reason.trim() || null)}
    >
      <div className={`rounded-xl p-3 text-sm ring-1 ${backedUp ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200'}`}>
        <p className="font-semibold">{backedUp ? 'Backup downloaded ✓' : 'Step 1 — download the full backup and keep it safe.'}</p>
        {!backedUp && (
          <button
            type="button"
            onClick={async () => {
              setSaving(true)
              try {
                await onBackup()
              } finally {
                setSaving(false)
              }
            }}
            className="btn-outline mt-2 bg-white py-1.5 text-sm"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />} Download backup
          </button>
        )}
      </div>
      <label className="block text-sm font-bold">
        Step 2 — type <span className="font-mono">{schoolName}</span> to confirm
        <input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type the school name" className={inputCls} />
      </label>
      <label className="block text-sm font-bold">
        Reason <span className="font-normal text-muted">(optional, kept in the log)</span>
        <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Not renewed after expiry" aria-label="Delete reason" className={inputCls} />
      </label>
    </Dialog>
  )
}
