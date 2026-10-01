import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'

import { ZapShell } from '../../components/zap/ZapShell'
import { Pager } from '../../components/ui/Pager'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { dateTime, zap, type Paged, type ZapLoginRow } from '../../lib/zap'

const PAGE_SIZE = 25

export function ZapLoginsPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<Paged<ZapLoginRow> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filters = useMemo(
    () => ({ q: params.get('q') ?? '', school_id: params.get('school_id') ?? '', page: Number(params.get('page') ?? 1), page_size: PAGE_SIZE }),
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
      .logins(filters)
      .then((d) => live && (setData(d), setError(null)))
      .catch((err) => live && setError(errorMessage(err)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [filters])

  const schoolName = filters.school_id ? data?.items[0]?.school_name : null

  return (
    <ZapShell title="Login History" subtitle="Who logged in to which school, and when.">
      <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, school or IP…"
            aria-label="Search logins"
            className={`${selectCls} w-full pl-9`}
          />
        </div>
        {filters.school_id && (
          <button onClick={() => update({ school_id: '' })} className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-sm font-bold text-brand ring-1 ring-sky-100">
            School: {schoolName ?? 'selected'} <X className="size-4" />
          </button>
        )}
      </section>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        <div className="overflow-x-auto">
          <table className={`w-full min-w-[720px] text-left text-sm ${loading && data ? 'opacity-60' : ''}`}>
            <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">IP address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.items.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">{dateTime(l.at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{l.user_name ?? 'Unknown user'}</p>
                    <p className="text-xs text-muted">{l.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/zap/schools/${l.school_id}`} className="font-semibold text-brand hover:underline">
                      {l.school_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{l.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && !data && <div className="m-4 h-40 animate-pulse rounded-xl bg-slate-100" />}
        {data && data.items.length === 0 && <p className="py-12 text-center text-muted">No logins found.</p>}
        {data && <Pager page={filters.page} pageSize={PAGE_SIZE} total={data.total} onPage={(page) => update({ page }, false)} />}
      </section>
    </ZapShell>
  )
}
