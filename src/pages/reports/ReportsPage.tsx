import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ChevronRight, FileText, Lock, Search } from 'lucide-react'

import schoolBand from '../../assets/school-band.webp'
import { AppShell } from '../../components/app/AppShell'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { GROUP_ORDER, reportsApi, type Catalogue } from '../../lib/reports'
import { GROUP_TONE, REPORT_ICON } from '../../lib/reportIcons'
import { useSchoolOptions } from '../../lib/schoolOptions'

/** Reports home: every report this person may open, grouped. */
export function ReportsPage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [cat, setCat] = useState<Catalogue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!token) return
    reportsApi.catalogue().then(setCat, (err) => setError(errorMessage(err)))
  }, [token])

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = (cat?.reports ?? []).filter((r) => !term || `${r.title} ${r.description} ${r.group}`.toLowerCase().includes(term))
    return GROUP_ORDER.map((g) => [g, list.filter((r) => r.group === g)] as const).filter(([, rs]) => rs.length)
  }, [cat, q])

  if (!token) return <Navigate to="/login" replace />

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-violet-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <img src={schoolBand} alt="" className="pointer-events-none absolute top-0 right-10 hidden h-full [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] 2xl:block" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">Reports</h1>
              <p className="mt-0.5">Ready-made reports for students, attendance, fees, results and more — view, filter, and export to Excel or PDF.</p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a report…" aria-label="Find a report" className="w-full rounded-xl border border-line bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-brand" />
            </div>
          </div>
        </section>
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
        {!cat && !error && <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />}
        {cat?.options.limited && <p className="rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-ink/80 ring-1 ring-sky-100">Student and attendance reports show your own class only.</p>}
        {groups.map(([group, list]) => (
          <section key={group} aria-label={group}>
            <h2 className="mb-2.5 text-lg font-bold">{group}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((r) => {
                const Icon = REPORT_ICON[r.icon] ?? FileText
                return (
                  <li key={r.key}>
                    <Link to={`/reports/${r.key}`} className="group flex h-full items-start gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 transition hover:ring-brand/40" aria-label={r.title}>
                      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${GROUP_TONE[group] ?? 'bg-slate-100'}`}>
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-bold text-ink group-hover:text-brand">
                          {r.title}
                          {r.locked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200">
                              <Lock className="size-3" /> {r.locked}
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-muted">{r.description}</span>
                      </span>
                      <ChevronRight className="mt-1 size-4 shrink-0 text-muted group-hover:text-brand" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {cat && groups.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-muted shadow-card ring-1 ring-line/60">{q ? 'No report matches.' : 'No reports are available for your access.'}</p>}
      </div>
    </AppShell>
  )
}
