import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Palette, ThumbsUp, TriangleAlert } from 'lucide-react'

import { StarDisplay } from '../progress/Stars'
import { errorMessage } from '../../lib/api'
import { shortDate } from '../../lib/license'
import { FREQ_LABEL, progressApi, type StudentProgress } from '../../lib/progress'

type ProgressSummaryData = Omit<StudentProgress, 'full_name' | 'days'>

const RANGES = [
  [30, 'Last 30 days'],
  [90, 'Last 3 months'],
  [365, 'This year'],
] as const

/** Student profile → Progress: star averages, trend, notes, activities. */
export function StudentProgressTab({ studentId, compact = false }: { studentId: string; compact?: boolean }) {
  const [days, setDays] = useState(30)
  const [p, setP] = useState<StudentProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    progressApi.student(studentId, days).then(
      (d) => live && (setP(d), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [studentId, days])

  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>
  if (!p) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
  return (
    <ProgressSummary
      p={p}
      compact={compact}
      extra={
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Period"
          className="rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
        >
          {RANGES.map(([d, label]) => (
            <option key={d} value={d}>
              {label}
            </option>
          ))}
        </select>
      }
    />
  )
}

/** The progress picture of one child for a period (profile, side panel, reports). */
export function ProgressSummary({ p, extra, compact = false }: { p: ProgressSummaryData; extra?: React.ReactNode; compact?: boolean }) {
  const maxWeek = 5
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span>
            <span className="block text-sm text-muted">Overall</span>
            <span className="flex items-center gap-2 text-2xl font-extrabold">
              {p.overall ?? '—'} <StarDisplay value={p.overall} size="size-5" />
            </span>
          </span>
          <span className="text-sm text-muted">
            {p.ratings_count} rating{p.ratings_count === 1 ? '' : 's'} · <span className="font-semibold text-emerald-700">{p.positives} positive</span> ·{' '}
            <span className="font-semibold text-amber-700">{p.attention} needs attention</span> · {p.activities.length} activit
            {p.activities.length === 1 ? 'y' : 'ies'}
            {p.attendance && p.attendance.percent != null && <> · attendance {p.attendance.percent}%</>}
          </span>
        </div>
        {extra}
      </section>

      {p.ratings_count === 0 && p.notes.length === 0 && p.activities.length === 0 ? (
        <section className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-line/60">
          <p className="font-bold">No progress recorded in this period</p>
          <p className="mt-1 text-sm text-muted">Ratings, notes and activity feedback from the Progress page show up here.</p>
        </section>
      ) : (
        <div className={`grid gap-5 ${compact ? '' : 'xl:grid-cols-[minmax(0,1fr)_380px]'}`}>
          <div className="min-w-0 space-y-5">
            {p.areas.length > 0 && (
              <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5" aria-label="By area">
                <h3 className="font-bold">By area</h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {p.areas.map((a) => (
                    <li key={a.area} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ring-1 ring-line">
                      <span className="font-semibold">{a.area}</span>
                      <span className="flex items-center gap-2 text-sm">
                        <StarDisplay value={a.average} /> <b>{a.average}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {p.weekly.length > 1 && (
              <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5">
                <h3 className="font-bold">Week by week</h3>
                <div className="mt-4 flex h-32 items-end gap-2" role="img" aria-label="Average stars per week">
                  {p.weekly.map((w) => (
                    <div key={w.week_start} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-xs font-bold text-ink/70">{w.average}</span>
                      <div className="w-full max-w-10 rounded-t-md bg-amber-400" style={{ height: `${((w.average ?? 0) / maxWeek) * 100}%` }} />
                      <span className="text-[10px] text-muted">{shortDate(w.week_start).replace(/ \d{4}$/, '')}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {p.criteria.length > 0 && (
              <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
                <h3 className="px-5 pt-5 font-bold">Every criterion</h3>
                <div className="overflow-x-auto p-2">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="text-left text-xs font-bold tracking-wide text-muted uppercase">
                      <tr>
                        <th className="px-3 py-2">Criterion</th>
                        <th className="px-3 py-2">Average</th>
                        <th className="px-3 py-2">Latest</th>
                        <th className="px-3 py-2">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {p.criteria.map((c) => (
                        <tr key={c.criterion_id}>
                          <td className="px-3 py-2.5">
                            <span className="font-semibold">{c.name}</span>
                            <span className="block text-xs text-muted">
                              {c.area} · {FREQ_LABEL[c.frequency]} · {c.count} rating{c.count === 1 ? '' : 's'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <StarDisplay value={c.average} /> <b className="ml-1">{c.average}</b>
                          </td>
                          <td className="px-3 py-2.5">{c.last ?? '—'}★</td>
                          <td className="px-3 py-2.5">
                            {c.trend === 'up' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                <ArrowUpRight className="size-4" /> Improving
                              </span>
                            ) : c.trend === 'down' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                                <ArrowDownRight className="size-4" /> Slipping
                              </span>
                            ) : c.trend === 'steady' ? (
                              <span className="inline-flex items-center gap-1 text-muted">
                                <ArrowRight className="size-4" /> Steady
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5" aria-label="Notes">
              <h3 className="font-bold">Teacher notes</h3>
              {p.notes.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No notes in this period.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {p.notes.map((n) => (
                    <li key={n.id} className={`rounded-xl px-3 py-2 text-sm ${n.kind === 'positive' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      <span className="flex items-center gap-1.5 font-semibold">
                        {n.kind === 'positive' ? <ThumbsUp className="size-3.5 text-emerald-700" /> : <TriangleAlert className="size-3.5 text-amber-700" />}
                        {n.tags.join(' · ') || (n.kind === 'positive' ? 'Positive' : 'Needs attention')}
                      </span>
                      {n.text && <span className="mt-0.5 block">{n.text}</span>}
                      <span className="mt-0.5 block text-xs text-muted">
                        {shortDate(n.date)}
                        {n.by && ` · ${n.by}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5" aria-label="Activities">
              <h3 className="flex items-center gap-2 font-bold">
                <Palette className="size-4 text-violet-600" /> Activities
              </h3>
              {p.activities.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No activity feedback in this period.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {p.activities.map((a) => (
                    <li key={a.id} className="py-2.5 text-sm">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{a.title}</span>
                        {a.rating != null && <StarDisplay value={a.rating} size="size-3.5" />}
                      </span>
                      <span className="block text-xs text-muted">
                        {a.activity_type} · {a.place === 'outdoor' ? 'Outdoor' : 'Indoor'} · {shortDate(a.date)}
                      </span>
                      {a.comment && <span className="mt-0.5 block italic">“{a.comment}”</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
