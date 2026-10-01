import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, BadgeCheck, Clock, Crown, GraduationCap, IndianRupee, LogIn, School, Settings2, Trash2, UserCog, UserX, Users } from 'lucide-react'

import { Card, SchoolStatus, Stat, ZapShell } from '../../components/zap/ZapShell'
import { errorMessage } from '../../lib/api'
import { timeAgo, zap, type ZapOverview } from '../../lib/zap'
import { inr } from '../../lib/fees'
import { STATUS_TEXT, STATUS_TONE, shortDate, zapLicenseApi, type LicenseOverview } from '../../lib/license'

export function ZapOverviewPage() {
  const [data, setData] = useState<ZapOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lic, setLic] = useState<LicenseOverview | null>(null)

  useEffect(() => {
    zap.overview().then(setData, (err) => setError(errorMessage(err)))
    zapLicenseApi.overview().then(setLic, (err) => setError(errorMessage(err)))
  }, [])
  const c = lic?.counts

  const max = Math.max(1, ...(data?.signups.map((d) => d.count) ?? [1]))
  const n = (v: number | undefined) => (data ? v : '—')

  return (
    <ZapShell title="Overview" subtitle="Everything happening across SchoolBee.">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Schools" value={n(data?.schools)} hint={data && `${data.schools_new_30d} new in 30 days`} icon={School} tone="bg-sky-100 text-brand" />
        <Stat label="Students" value={n(data?.students)} hint="Active, all schools" icon={GraduationCap} tone="bg-emerald-100 text-emerald-600" />
        <Stat label="Teachers" value={n(data?.teachers)} hint={data && `${data.users} users in total`} icon={Users} tone="bg-violet-100 text-violet-600" />
        <Stat label="Logins today" value={n(data?.logins_today)} hint={data && `${data.active_schools_today} schools active today`} icon={LogIn} tone="bg-amber-100 text-amber-600" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="New this week" value={n(data?.schools_new_7d)} hint="Schools registered" icon={UserCog} tone="bg-sky-50 text-brand" />
        <Stat label="Setup pending" value={data ? data.schools - data.schools_setup_done : '—'} hint="Haven't finished school setup" icon={Settings2} tone="bg-amber-50 text-amber-600" />
        <Stat label="Blocked schools" value={n(data?.schools_blocked)} icon={Ban} tone="bg-rose-50 text-rose-500" />
        <Stat label="Blocked users" value={n(data?.users_blocked)} icon={UserX} tone="bg-rose-50 text-rose-500" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Licences">
        <Stat label="Paying schools" value={c ? c.active : '—'} hint={c && `${c.suspended} on hold`} icon={BadgeCheck} tone="bg-emerald-100 text-emerald-600" />
        <Stat label="On free trial" value={c ? c.trial : '—'} hint={c && `${c.none} haven't chosen a plan`} icon={Crown} tone="bg-violet-100 text-violet-600" />
        <Stat
          label="Expired"
          value={c ? c.expired : '—'}
          hint={lic && (lic.deletable ? <Link to="/zap/licenses?status=deletable" className="font-bold text-rose-600">{lic.deletable} due for deletion</Link> : 'Access blocked until they pay')}
          icon={Clock}
          tone="bg-rose-50 text-rose-500"
        />
        <Stat label="Revenue this year" value={lic ? inr(lic.revenue_year) : '—'} hint={lic && `${inr(lic.revenue_month)} this month · Apr–Mar year`} icon={IndianRupee} tone="bg-amber-100 text-amber-600" />
      </section>

      {lic && lic.expiring.length > 0 && (
        <Card title="Licences ending soon">
          <ul className="divide-y divide-line" aria-label="Licences ending soon">
            {lic.expiring.map((s) => (
              <li key={s.id}>
                <Link to={`/zap/schools/${s.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:bg-slate-50">
                  <span className="min-w-0 flex-1 truncate font-bold">{s.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_TONE[s.status]}`}>
                    {s.plan_name} · {STATUS_TEXT[s.status]}
                  </span>
                  <span className="text-xs text-muted">
                    ends {shortDate(s.ends_on)} · {s.days_left} day{s.days_left === 1 ? '' : 's'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {lic && lic.expired.length > 0 && (
        <Card title="Recently expired" action={<Link to="/zap/licenses?status=expired" className="text-sm font-bold text-brand">View all</Link>}>
          <ul className="divide-y divide-line" aria-label="Recently expired">
            {lic.expired.slice(0, 8).map((s) => (
              <li key={s.id}>
                <Link to={`/zap/schools/${s.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm hover:bg-slate-50">
                  <span className="min-w-0 flex-1 truncate font-bold">{s.name}</span>
                  <span className="text-xs text-muted">
                    {s.plan_name} · expired {shortDate(s.ends_on)} · data kept until {shortDate(s.delete_on)}
                  </span>
                  {s.deletable && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                      <Trash2 className="size-3" /> Can be deleted
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Schools registered (last 30 days)">
        {data ? (
          <div className="flex h-40 items-end gap-1" role="img" aria-label="Schools registered per day">
            {data.signups.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className={`w-full rounded-t ${d.count ? 'bg-brand' : 'bg-slate-100'}`} style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} />
                <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded bg-ink px-2 py-0.5 text-xs whitespace-nowrap text-white group-hover:block">
                  {new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: {d.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Newest schools" action={<Link to="/zap/schools" className="text-sm font-bold text-brand">View all</Link>}>
          <ul className="divide-y divide-line">
            {data?.recent_schools.map((s) => (
              <li key={s.id}>
                <Link to={`/zap/schools/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-slate-50">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-100 font-bold text-brand">{s.name[0]?.toUpperCase()}</span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate font-bold">{s.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {s.owner_name ?? '—'} · {s.students} students · joined {timeAgo(s.created_at)}
                    </span>
                  </span>
                  <SchoolStatus blocked={Boolean(s.blocked_at)} setupDone={s.setup_done} />
                </Link>
              </li>
            ))}
            {data && data.recent_schools.length === 0 && <li className="py-6 text-center text-sm text-muted">No schools yet</li>}
          </ul>
        </Card>
        <Card title="Latest logins" action={<Link to="/zap/logins" className="text-sm font-bold text-brand">View all</Link>}>
          <ul className="divide-y divide-line">
            {data?.recent_logins.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 leading-tight">
                  <span className="block truncate font-bold">{l.user_name ?? 'Unknown user'}</span>
                  <Link to={`/zap/schools/${l.school_id}`} className="block truncate text-xs text-brand">
                    {l.school_name}
                  </Link>
                </span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(l.at)}</span>
              </li>
            ))}
            {data && data.recent_logins.length === 0 && <li className="py-6 text-center text-sm text-muted">No logins yet</li>}
          </ul>
        </Card>
      </div>
    </ZapShell>
  )
}
