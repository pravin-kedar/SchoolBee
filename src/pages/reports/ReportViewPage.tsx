import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, FileSpreadsheet, FileText, Info, Loader2, Lock, Printer, Search } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { ReportChart } from '../../components/reports/ReportChart'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { inr } from '../../lib/fees'
import { defaults, reportsApi, type Catalogue, type Column, type ReportData, type ReportFilter, type ReportInfo } from '../../lib/reports'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { GROUP_TONE, REPORT_ICON } from '../../lib/reportIcons'

const BADGE: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Saved: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Complete: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Published: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Issued: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Holiday: 'bg-rose-50 text-rose-700 ring-rose-200', 'Not taken': 'bg-rose-50 text-rose-700 ring-rose-200', Missing: 'bg-rose-50 text-rose-700 ring-rose-200',
  '60+ days': 'bg-rose-50 text-rose-700 ring-rose-200', Cancelled: 'bg-slate-100 text-slate-600 ring-slate-200', Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  Relieved: 'bg-slate-100 text-slate-600 ring-slate-200',
}
const badgeTone = (v: string) => BADGE[v] ?? 'bg-amber-50 text-amber-800 ring-amber-200'

function cellText(c: Column, v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return c.kind === 'number' || c.kind === 'money' || c.kind === 'percent' ? '—' : ''
  if (c.kind === 'money') return inr(Number(v))
  if (c.kind === 'percent') return `${v}%`
  if (c.kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return new Date(`${v}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return String(v)
}

/** One report: filters, summary, chart, table, Excel/PDF export. */
export function ReportViewPage() {
  const { key = '' } = useParams()
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [cat, setCat] = useState<Catalogue | null>(null)
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null)
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [find, setFind] = useState('')

  useEffect(() => {
    if (!token) return
    reportsApi.catalogue().then(setCat, (err) => setError(errorMessage(err)))
  }, [token])
  const report = cat?.reports.find((r) => r.key === key) ?? null

  // Filters live in the URL (shareable, survive reloads); defaults fill the gaps.
  const values = useMemo(() => {
    if (!report || !cat) return null
    const v: Record<string, string> = { ...defaults(report, cat) }
    params.forEach((val, k) => (v[k] = val))
    return v
  }, [report, cat, params])
  const query = useMemo(() => (values ? Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '')) : null), [values])
  const queryKey = JSON.stringify(query)

  useEffect(() => {
    if (!query || report?.locked) return
    let live = true
    setLoading(true)
    reportsApi
      .run(key, query)
      .then((d) => live && (setData(d), setError(null)), (err) => live && setError(errorMessage(err)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, queryKey])

  const rows = useMemo(() => {
    if (!data) return []
    const term = find.trim().toLowerCase()
    let list = term ? data.rows.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(term))) : data.rows
    if (sort) {
      const col = data.columns.find((c) => c.key === sort.key)
      const num = col && ['number', 'money', 'percent'].includes(col.kind)
      list = [...list].sort((a, b) => {
        const x = a[sort.key]
        const y = b[sort.key]
        if (x === y) return 0
        if (x === null || x === '' || x === undefined) return 1
        if (y === null || y === '' || y === undefined) return -1
        return (num ? Number(x) - Number(y) : String(x).localeCompare(String(y), 'en', { numeric: true })) * sort.dir
      })
    }
    return list
  }, [data, find, sort])

  if (!token) return <Navigate to="/login" replace />
  if (cat && !report) return <Navigate to="/reports" replace />

  const set = (patch: Record<string, string>) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        for (const [k, v] of Object.entries(patch)) n.set(k, v)
        return n
      },
      { replace: true },
    )

  async function exportAs(format: 'xlsx' | 'pdf') {
    if (!query) return
    setBusy(format)
    setError(null)
    try {
      await reportsApi.export(key, query, format)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const Icon = report ? (REPORT_ICON[report.icon] ?? FileText) : FileText
  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-4 p-4 sm:p-6">
        <Link to="/reports" className="inline-flex items-center gap-1 text-sm font-bold text-brand print:hidden">
          <ArrowLeft className="size-4" /> Reports
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${GROUP_TONE[report?.group ?? ''] ?? 'bg-slate-100'}`}>
              <Icon className="size-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold">{report?.title ?? 'Report'}</h1>
              <p className="text-sm text-muted">{data?.subtitle || report?.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={() => void exportAs('xlsx')} disabled={!data || busy !== null || Boolean(report?.locked)} className="btn-outline py-2 text-sm">
              {busy === 'xlsx' ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4 text-emerald-600" />} Excel
            </button>
            <button onClick={() => void exportAs('pdf')} disabled={!data || busy !== null} className="btn-outline py-2 text-sm">
              {busy === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4 text-rose-500" />} PDF
            </button>
            <button onClick={() => window.print()} disabled={!data} className="btn-outline py-2 text-sm" aria-label="Print">
              <Printer className="size-4" />
            </button>
          </div>
        </div>

        {report && cat && values && <Filters report={report} cat={cat} values={values} onChange={set} />}

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
        {report?.locked ? (
          <section className="rounded-2xl bg-white p-10 text-center shadow-card ring-1 ring-line/60">
            <Lock className="mx-auto size-10 text-violet-500" />
            <p className="mt-3 text-lg font-bold">This report is part of the {report.locked} plan</p>
            <p className="mx-auto mt-1 max-w-md text-muted">Upgrade to see fee, payroll and result summaries with charts and exports.</p>
            <Link to="/plan" className="btn-primary mt-4">
              See plans
            </Link>
          </section>
        ) : !data ? (
          !error && <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {data.summary.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Summary">
                {data.summary.map((s) => (
                  <li key={s.label} className="min-w-0 rounded-2xl bg-white p-3 shadow-card ring-1 ring-line/60 sm:p-4">
                    <p className="text-sm text-muted">{s.label}</p>
                    <p className={`font-display text-xl font-extrabold break-words sm:text-2xl ${s.tone === 'rose' && s.value ? 'text-rose-600' : 'text-ink'}`}>{s.kind === 'money' ? inr(Number(s.value)) : s.value}</p>
                    {s.hint && <p className="text-xs text-muted">{s.hint}</p>}
                  </li>
                ))}
              </ul>
            )}
            {data.note && (
              <p className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-ink/80 ring-1 ring-sky-100">
                <Info className="mt-0.5 size-4 shrink-0 text-brand" /> {data.note}
              </p>
            )}
            {data.chart && data.chart.labels.length > 0 && <ReportChart spec={data.chart} />}

            <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60" aria-label="Report table">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 print:hidden">
                <p className="text-sm text-muted">
                  {rows.length === data.rows.length ? `${data.total_rows} row${data.total_rows === 1 ? '' : 's'}` : `${rows.length} of ${data.rows.length} rows`}
                  {data.total_rows > data.rows.length && ` · showing the first ${data.rows.length} — export for all`}
                </p>
                <div className="relative w-56">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
                  <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find in table…" aria-label="Find in table" className="w-full rounded-lg border border-line py-1.5 pr-2 pl-8 text-sm outline-none focus:border-brand" />
                </div>
              </div>
              {data.rows.length === 0 ? (
                <p className="p-10 text-center text-muted">{data.empty}</p>
              ) : (
                <div className="max-h-[70vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold text-ink/80">
                      <tr>
                        {data.columns.map((c) => {
                          const num = ['number', 'money', 'percent'].includes(c.kind)
                          const active = sort?.key === c.key
                          return (
                            <th key={c.key} className={`border-b border-line px-3 py-2.5 whitespace-nowrap ${num ? 'text-right' : ''}`} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                              <button onClick={() => setSort(active ? { key: c.key, dir: sort.dir === 1 ? -1 : 1 } : { key: c.key, dir: num ? -1 : 1 })} className="inline-flex items-center gap-1 hover:text-brand">
                                {c.label}
                                {active && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                              </button>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50/70">
                          {data.columns.map((c) => {
                            const num = ['number', 'money', 'percent'].includes(c.kind)
                            const v = r[c.key]
                            return (
                              <td key={c.key} className={`px-3 py-2 ${num ? 'text-right tabular-nums' : ''} ${c.width && c.width <= 4 ? 'text-center' : ''}`}>
                                {c.kind === 'badge' && v ? <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ring-1 ${badgeTone(String(v))}`}>{String(v)}</span> : cellText(c, v)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                    {data.totals && (
                      <tfoot className="sticky bottom-0 bg-indigo-50 font-bold">
                        <tr>
                          {data.columns.map((c) => (
                            <td key={c.key} className={`border-t-2 border-brand/30 px-3 py-2.5 ${['number', 'money', 'percent'].includes(c.kind) ? 'text-right tabular-nums' : ''}`}>
                              {c.key in data.totals! ? cellText(c, data.totals![c.key]) : ''}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function Filters({ report, cat, values, onChange }: { report: ReportInfo; cat: Catalogue; values: Record<string, string>; onChange: (p: Record<string, string>) => void }) {
  const cls = cat.options.classes.find((c) => c.id === values.class_id)
  const field = (f: ReportFilter) => {
    const label = <span className="mb-1 block text-xs font-bold text-muted">{f.label}</span>
    switch (f.kind) {
      case 'year':
        return (
          <label key={f.key}>
            {label}
            <select value={values.year_id ?? ''} onChange={(e) => onChange({ year_id: e.target.value })} aria-label={f.label} className={selectCls}>
              {cat.options.years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </label>
        )
      case 'class':
        return (
          <label key={f.key}>
            {label}
            <select value={values.class_id ?? ''} onChange={(e) => onChange({ class_id: e.target.value, section_id: '' })} aria-label={f.label} className={selectCls}>
              <option value="">{cat.options.limited ? 'My classes' : 'All classes'}</option>
              {cat.options.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )
      case 'section':
        return (
          <label key={f.key}>
            {label}
            <select value={values.section_id ?? ''} disabled={!cls?.sections.length} onChange={(e) => onChange({ section_id: e.target.value })} aria-label={f.label} className={selectCls}>
              <option value="">All sections</option>
              {cls?.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </label>
        )
      case 'date':
        return (
          <label key={f.key}>
            {label}
            <input type="date" value={values[f.key] ?? ''} onChange={(e) => e.target.value && onChange({ [f.key]: e.target.value })} aria-label={f.label} className={selectCls} />
          </label>
        )
      case 'month':
        return (
          <label key={f.key}>
            {label}
            <input type="month" value={values[f.key] ?? ''} onChange={(e) => onChange({ [f.key]: e.target.value })} aria-label={f.label} className={selectCls} placeholder="Latest" />
          </label>
        )
      case 'range':
        return (
          <div key={f.key} className="flex flex-wrap items-end gap-2">
            <label>
              <span className="mb-1 block text-xs font-bold text-muted">From</span>
              <input type="date" value={values.date_from ?? ''} onChange={(e) => onChange({ date_from: e.target.value })} aria-label="From date" className={selectCls} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-muted">To</span>
              <input type="date" value={values.date_to ?? ''} onChange={(e) => onChange({ date_to: e.target.value })} aria-label="To date" className={selectCls} />
            </label>
            {f.default === 'year' && (values.date_from || values.date_to) && (
              <button onClick={() => onChange({ date_from: '', date_to: '' })} className="pb-2 text-xs font-bold text-brand">
                Whole year
              </button>
            )}
          </div>
        )
      case 'assessment':
        return (
          <label key={f.key}>
            {label}
            <select value={values.assessment_id ?? ''} onChange={(e) => onChange({ assessment_id: e.target.value })} aria-label={f.label} className={selectCls}>
              <option value="">Latest</option>
              {cat.options.assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )
      case 'choice':
        return (
          <label key={f.key}>
            {label}
            <select value={values[f.key] ?? f.default ?? ''} onChange={(e) => onChange({ [f.key]: e.target.value })} aria-label={f.label} className={selectCls}>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )
      default:
        return null
    }
  }
  if (!report.filters.length) return null
  return (
    <section className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 print:hidden" aria-label="Filters">
      {report.filters.map(field)}
    </section>
  )
}
