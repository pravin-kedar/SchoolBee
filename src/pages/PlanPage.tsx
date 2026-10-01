import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckCircle2, Crown, Download, HardDrive, Loader2, Mail, PauseCircle, Phone, ShieldAlert, UserCheck, Users, X } from 'lucide-react'

import { AppShell } from '../components/app/AppShell'
import { PayDialog } from '../components/license/PayDialog'
import { PlanPicker } from '../components/license/PlanPicker'
import { errorMessage } from '../lib/api'
import { usePermission } from '../lib/auth'
import { useAccessToken } from '../lib/auth-store'
import { inr } from '../lib/fees'
import { STATUS_TEXT, STATUS_TONE, gb, licenseApi, refreshLicenseStatus, shortDate, type Cycle, type LicenseDetail, type Plan } from '../lib/license'

/** Plan & Licence (school owner): current plan, usage, buying / renewing, history. */
export function PlanPage() {
  const token = useAccessToken()
  const { ready, isOwner } = usePermission()
  const [d, setD] = useState<LicenseDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [buying, setBuying] = useState<{ plan: Plan; cycle: Cycle } | null>(null)

  useEffect(() => {
    if (!token || !isOwner) return
    licenseApi.detail().then(setD, (err) => setError(errorMessage(err)))
  }, [token, isOwner])

  if (!token) return <Navigate to="/login" replace />
  if (ready && !isOwner) return <Navigate to="/dashboard" replace />
  if (d && d.status.status === 'none') return <Navigate to="/choose-plan" replace />

  const s = d?.status
  const blocked = s?.status === 'expired' || s?.status === 'suspended'
  return (
    <AppShell>
      <div className="space-y-5 p-4 sm:p-6">
        <section className="rounded-2xl bg-gradient-to-r from-white via-violet-50 to-amber-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Plan &amp; Licence</h1>
          <p className="mt-0.5">Your SchoolBee plan, what you’re using, and renewals.</p>
        </section>
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
        {!d || !s ? (
          !error && <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Current plan">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`grid size-14 place-items-center rounded-2xl ${blocked ? 'bg-rose-100 text-rose-600' : 'bg-violet-100 text-violet-600'}`}>
                    {s.status === 'suspended' ? <PauseCircle className="size-7" /> : s.status === 'expired' ? <ShieldAlert className="size-7" /> : <Crown className="size-7" />}
                  </span>
                  <div>
                    <p className="text-sm text-muted">Current plan</p>
                    <p className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
                      {s.plan_name} <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_TONE[s.status]}`}>{STATUS_TEXT[s.status]}</span>
                    </p>
                  </div>
                </div>
                <div className="max-w-md text-sm sm:text-right">
                  {s.status === 'trial' && (
                    <p>
                      Free trial ends <b>{shortDate(s.ends_on)}</b> ({s.days_left} day{s.days_left === 1 ? '' : 's'} left). Choose a plan to keep using SchoolBee after that.
                    </p>
                  )}
                  {s.status === 'active' && (
                    <p>
                      Valid until <b>{shortDate(s.ends_on)}</b> ({s.days_left} day{s.days_left === 1 ? '' : 's'} left)
                    </p>
                  )}
                  {s.status === 'expired' && (
                    <p className="font-semibold text-rose-700">
                      Expired on {shortDate(s.ends_on)} — access is paused until you renew.
                      {s.delete_on && <> Your data is kept until {shortDate(s.delete_on)}; after that it may be permanently deleted.</>}
                    </p>
                  )}
                  {s.status === 'suspended' && (
                    <p className="font-semibold text-amber-800">
                      Your licence is on hold{s.suspended_reason ? `: ${s.suspended_reason}` : ''}. Please contact us to restore access.
                    </p>
                  )}
                </div>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Usage">
                <Meter icon={Users} label="Students" used={d.usage.students} limit={d.limits.students} />
                <Meter icon={HardDrive} label="Document storage" used={d.usage.storage_mb} limit={d.limits.storage_mb} format={gb} />
                <Meter icon={UserCheck} label="Staff logins" used={d.usage.staff_logins} limit={d.limits.staff_logins} />
              </ul>
            </section>

            {s.status !== 'suspended' && (
              <section aria-label="Choose a plan">
                <h2 className="mb-3 text-lg font-bold">{s.status === 'active' ? 'Renew or change plan' : 'Choose a plan'}</h2>
                <PlanPicker
                  plans={d.plans}
                  catalog={d.catalog}
                  current={s.status === 'active' ? s.plan : null}
                  busy={busy}
                  onBuy={(plan, cycle) => setBuying({ plan, cycle })}
                  buyLabel={(p) => (s.status === 'active' && s.plan === p.key ? `Renew ${p.name}` : `Choose ${p.name}`)}
                />
              </section>
            )}

            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm shadow-card ring-1 ring-line/60">
              <p>Questions about your plan or a payment? We&rsquo;re happy to help.</p>
              <p className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
                {d.contact.email && (
                  <a href={`mailto:${d.contact.email}`} className="inline-flex items-center gap-1.5 text-brand">
                    <Mail className="size-4" /> {d.contact.email}
                  </a>
                )}
                {d.contact.phone && (
                  <a href={`tel:${d.contact.phone}`} className="inline-flex items-center gap-1.5 text-brand">
                    <Phone className="size-4" /> {d.contact.phone}
                  </a>
                )}
              </p>
            </section>

            <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60" aria-label="Licence history">
              <h2 className="px-5 pt-5 text-lg font-bold">Licence history</h2>
              <div className="overflow-x-auto p-2">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs font-bold tracking-wide text-muted uppercase">
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
                      <tr key={x.id} className={x.cancelled_at ? 'text-muted line-through' : ''}>
                        <td className="px-3 py-2.5 font-bold">{x.plan_name}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {shortDate(x.starts_on)} – {shortDate(x.ends_on)}
                        </td>
                        <td className="px-3 py-2.5">
                          {x.kind === 'trial' ? 'Free trial' : x.kind === 'complimentary' ? 'Complimentary' : `${x.payment_mode ?? 'Paid'}${x.payment_reference && x.source !== 'online' ? ` · ${x.payment_reference}` : ''}`}
                          {x.note && !x.cancelled_at && <span className="block text-xs text-muted no-underline">{x.note}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">{x.amount ? inr(x.amount) : '—'}</td>
                        <td className="px-3 py-2.5">{x.state}</td>
                        <td className="px-3 py-2.5 text-right">
                          {x.receipt_no && !x.cancelled_at && (
                            <button
                              onClick={async () => {
                                setBusy(x.id)
                                try {
                                  await licenseApi.receipt(x.id)
                                } catch (err) {
                                  setError(errorMessage(err))
                                } finally {
                                  setBusy(null)
                                }
                              }}
                              className="btn-outline py-1 text-xs"
                              aria-label={`Receipt ${x.receipt_no}`}
                            >
                              {busy === x.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
      {buying && d && (
        <PayDialog
          plan={buying.plan}
          cycle={buying.cycle}
          online={d.online_payment}
          contact={d.contact}
          onClose={() => setBuying(null)}
          onPaid={(next) => {
            setD(next)
            refreshLicenseStatus()
            setNotice(`Thank you! Your ${next.status.plan_name} plan is active until ${shortDate(next.status.ends_on)}.`)
          }}
        />
      )}
    </AppShell>
  )
}

function Meter({ icon: Icon, label, used, limit, format = (n: number) => n.toLocaleString('en-IN') }: { icon: typeof Users; label: string; used: number; limit: number | null; format?: (n: number) => string }) {
  const pct = limit ? Math.min(100, Math.round((used * 100) / limit)) : 0
  const tone = pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand'
  return (
    <li className="rounded-xl p-3 ring-1 ring-line" aria-label={label}>
      <p className="flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4" /> {label}
      </p>
      <p className="mt-1 font-bold">
        {format(used)} <span className="font-normal text-muted">/ {limit == null ? 'Unlimited' : format(limit)}</span>
      </p>
      {limit != null && (
        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-100">
          <span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        </span>
      )}
    </li>
  )
}
