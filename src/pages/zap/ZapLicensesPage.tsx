import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, PauseCircle, PlayCircle, Search, Settings2, Trash2 } from 'lucide-react'

import { Card, ZapShell } from '../../components/zap/ZapShell'
import { SuspendDialog, inputCls } from '../../components/zap/ZapLicenseCard'
import { Dialog } from '../../components/ui/Dialog'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { dateTime } from '../../lib/zap'
import { STATUS_TEXT, STATUS_TONE, shortDate, zapLicenseApi, type DeletedSchool, type LicenseSettings, type SchoolLicenseRow } from '../../lib/license'

const FILTERS: [string, string][] = [
  ['', 'All'],
  ['trial', 'Free trial'],
  ['active', 'Active'],
  ['expired', 'Expired'],
  ['suspended', 'On hold'],
  ['none', 'No plan yet'],
  ['deletable', 'Due for deletion'],
]

/** Website admin: every school's licence at a glance. */
export function ZapLicensesPage() {
  const [params, setParams] = useSearchParams()
  const filter = params.get('status') ?? ''
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<SchoolLicenseRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suspending, setSuspending] = useState<SchoolLicenseRow | null>(null)
  const [settings, setSettings] = useState(false)
  const [deleted, setDeleted] = useState<DeletedSchool[]>([])
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => zapLicenseApi.list({ status: filter || undefined, q: q.trim() || undefined }).then(setRows, (err) => setError(errorMessage(err))), q ? 250 : 0)
    return () => clearTimeout(t)
  }, [filter, q, reload])
  useEffect(() => {
    zapLicenseApi.deleted().then(setDeleted, () => undefined)
  }, [])

  return (
    <ZapShell
      title="Licences"
      subtitle="Every school's plan, status and dates. Suspend, change or extend a licence from here or from the school's page."
      actions={
        <button onClick={() => setSettings(true)} className="btn-outline">
          <Settings2 className="size-4" /> Reminder settings
        </button>
      }
    >
      {params.get('deleted') && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="size-4" /> The school was deleted. It&rsquo;s listed under &ldquo;Deleted schools&rdquo; below.
        </p>
      )}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Licence status">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              onClick={() => setParams(key ? { status: key } : {}, { replace: true })}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${filter === key ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search school or owner email…" aria-label="Search licences" className={`${selectCls} w-full pl-9`} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ends / ended</th>
                <th className="px-4 py-3">Data kept until</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows?.map((r) => (
                <tr key={r.id} aria-label={r.name} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/zap/schools/${r.id}`} className="font-bold text-ink hover:text-brand">
                      {r.name}
                    </Link>
                    <p className="text-xs text-muted">{r.owner_email ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.plan_name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_TONE[r.status]}`}>{STATUS_TEXT[r.status]}</span>
                    {r.suspended_reason && <p className="pt-1 text-xs text-muted">{r.suspended_reason}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {shortDate(r.ends_on)}
                    {r.days_left != null && (r.status === 'trial' || r.status === 'active') && (
                      <span className={`block text-xs ${r.days_left <= 7 && !r.continues ? 'font-bold text-rose-600' : 'text-muted'}`}>{r.continues ? 'renewed' : `${r.days_left} day${r.days_left === 1 ? '' : 's'} left`}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.status === 'expired' ? (
                      <>
                        {shortDate(r.delete_on)}
                        {r.deletable && (
                          <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                            <Trash2 className="size-3" /> Can be deleted
                          </span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'suspended' ? (
                      <button
                        onClick={async () => {
                          try {
                            await zapLicenseApi.resume(r.id)
                            setReload((n) => n + 1)
                          } catch (err) {
                            setError(errorMessage(err))
                          }
                        }}
                        className="btn-outline py-1.5 text-xs"
                      >
                        <PlayCircle className="size-4" /> Resume
                      </button>
                    ) : (
                      r.status !== 'none' && (
                        <button onClick={() => setSuspending(r)} className="btn-outline py-1.5 text-xs text-amber-700" aria-label={`Suspend ${r.name}`}>
                          <PauseCircle className="size-4" /> Suspend
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows && !error && <div className="m-4 h-40 animate-pulse rounded-xl bg-slate-100" />}
        {rows && rows.length === 0 && <p className="py-12 text-center text-muted">No schools here.</p>}
      </section>

      {deleted.length > 0 && (
        <Card title={`Deleted schools (${deleted.length})`}>
          <ul className="divide-y divide-line text-sm" aria-label="Deleted schools">
            {deleted.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <b>{x.name}</b> <span className="text-muted">· {x.owner_email ?? '—'} · {x.plan_name ?? 'No plan'}{x.expired_on ? `, expired ${shortDate(x.expired_on)}` : ''}</span>
                  {x.reason && <span className="block text-xs text-muted">{x.reason}</span>}
                </span>
                <span className="text-xs text-muted">
                  {dateTime(x.deleted_at)} · {x.deleted_by}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {suspending && (
        <SuspendDialog
          onClose={() => setSuspending(null)}
          onSubmit={async (reason) => {
            await zapLicenseApi.suspend(suspending.id, reason)
            setReload((n) => n + 1)
          }}
        />
      )}
      {settings && <SettingsDialog onClose={() => setSettings(false)} />}
    </ZapShell>
  )
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<LicenseSettings | null>(null)
  useEffect(() => {
    zapLicenseApi.settings().then(setS, () => undefined)
  }, [])
  return (
    <Dialog
      title="Licence reminder settings"
      subtitle="When schools are warned that their plan is ending. Trial length and how long data is kept after expiry are set on each plan (Plans page)."
      submitLabel="Save settings"
      submitDisabled={!s || s.all_staff_days > s.reminder_days}
      onClose={onClose}
      onSubmit={async () => {
        if (s) await zapLicenseApi.saveSettings(s)
      }}
    >
      {s ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            Owner pop-up starts
            <span className="mt-1 flex items-center gap-2 font-normal">
              <input type="number" min={1} max={60} value={s.reminder_days} onChange={(e) => setS({ ...s, reminder_days: Number(e.target.value) })} aria-label="Owner reminder days" className={`${inputCls} mt-0 w-24`} />
              days before expiry (once a day)
            </span>
          </label>
          <label className="block text-sm font-bold">
            Every staff member sees it
            <span className="mt-1 flex items-center gap-2 font-normal">
              <input type="number" min={0} max={30} value={s.all_staff_days} onChange={(e) => setS({ ...s, all_staff_days: Number(e.target.value) })} aria-label="All staff reminder days" className={`${inputCls} mt-0 w-24`} />
              days before (every login)
            </span>
          </label>
        </div>
      ) : (
        <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
      )}
    </Dialog>
  )
}
