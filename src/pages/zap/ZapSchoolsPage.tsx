import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'

import { SchoolStatus, ZapShell } from '../../components/zap/ZapShell'
import { Pager } from '../../components/ui/Pager'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { dateTime, timeAgo, zap, type Paged, type SchoolFilter, type SchoolSort, type ZapSchoolRow } from '../../lib/zap'
import { STATUS_TEXT, STATUS_TONE, shortDate, zapLicenseApi, type SchoolLicenseRow } from '../../lib/license'

const PAGE_SIZE = 20

export function ZapSchoolsPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<Paged<ZapSchoolRow> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lic, setLic] = useState<Record<string, SchoolLicenseRow>>({})

  useEffect(() => {
    zapLicenseApi.list({}).then((rows) => setLic(Object.fromEntries(rows.map((r) => [r.id, r]))), () => undefined)
  }, [])

  const filters = useMemo(
    () => ({
      q: params.get('q') ?? '',
      status: (params.get('status') ?? '') as SchoolFilter,
      sort: (params.get('sort') ?? 'newest') as SchoolSort,
      page: Number(params.get('page') ?? 1),
      page_size: PAGE_SIZE,
    }),
    [params],
  )
  const update = (patch: Record<string, string | number>, resetPage = true) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v === '' || v == null) next.delete(k)
          else next.set(k, String(v))
        }
        if (resetPage) next.delete('page')
        return next
      },
      { replace: true },
    )

  const [search, setSearch] = useState(filters.q)
  useEffect(() => {
    if (search.trim() === filters.q) return // nothing changed (also the run on mount)
    const t = setTimeout(() => update({ q: search.trim() }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    let live = true
    setLoading(true)
    zap
      .schools(filters)
      .then((d) => live && (setData(d), setError(null)))
      .catch((err) => live && setError(errorMessage(err)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [filters])

  return (
    <ZapShell title="Schools" subtitle="Every school registered on SchoolBee.">
      <section className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <div className="relative min-w-60 flex-[2]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school, owner, email or phone…"
            aria-label="Search schools"
            className={`${selectCls} w-full pl-9`}
          />
        </div>
        <select aria-label="Status" value={filters.status} onChange={(e) => update({ status: e.target.value })} className={`${selectCls} flex-1`}>
          <option value="">All schools</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="setup_pending">Setup pending</option>
        </select>
        <select aria-label="Sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className={`${selectCls} flex-1`}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="students">Most students</option>
          <option value="last_login">Recently active</option>
        </select>
      </section>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        <div className="overflow-x-auto">
          <table className={`w-full min-w-[980px] text-left text-sm ${loading && data ? 'opacity-60' : ''}`}>
            <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3 text-right">Students</th>
                <th className="px-4 py-3 text-right">Teachers</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/zap/schools/${s.id}`} className="font-bold text-ink hover:text-brand">
                      {s.name}
                    </Link>
                    <p className="text-xs text-muted">{[s.email, s.phone].filter(Boolean).join(' · ') || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{s.owner_name ?? '—'}</p>
                    <p className="text-xs text-muted">{s.owner_email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{s.students}</td>
                  <td className="px-4 py-3 text-right font-semibold">{s.teachers}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{dateTime(s.created_at, false)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{timeAgo(s.last_login_at)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {lic[s.id] ? (
                      <>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_TONE[lic[s.id].status]}`}>
                          {lic[s.id].status === 'none' ? 'No plan' : `${lic[s.id].plan_name}${lic[s.id].status === 'active' ? '' : ` · ${STATUS_TEXT[lic[s.id].status]}`}`}
                        </span>
                        {lic[s.id].ends_on && <span className="block pt-1 text-xs text-muted">{lic[s.id].status === 'expired' ? 'ended' : 'till'} {shortDate(lic[s.id].ends_on)}</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SchoolStatus blocked={Boolean(s.blocked_at)} setupDone={s.setup_done} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && !data && <div className="m-4 h-40 animate-pulse rounded-xl bg-slate-100" />}
        {data && data.items.length === 0 && <p className="py-12 text-center text-muted">No schools match.</p>}
        {data && <Pager page={filters.page} pageSize={PAGE_SIZE} total={data.total} onPage={(page) => update({ page }, false)} />}
      </section>
    </ZapShell>
  )
}
