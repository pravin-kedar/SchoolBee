import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Lock, Palette, Star, ThumbsUp, TriangleAlert } from 'lucide-react'

import { StarDisplay } from './Stars'
import { errorMessage } from '../../lib/api'
import { shortDate } from '../../lib/license'
import { FREQ_LABEL, PARTICIPATION_LABEL, REPORT_STATUS_TONE, addDays, progressApi, type StudentHistory as History } from '../../lib/progress'

type Entry =
  | { kind: 'rating'; date: string; label: string; items: History['ratings'] }
  | { kind: 'note'; date: string; note: History['notes'][number] }
  | { kind: 'activity'; date: string; activity: History['activities'][number] }

const RANGES = [
  [90, 'Last 3 months'],
  [180, 'Last 6 months'],
  [365, 'Last year'],
] as const

/** Everything recorded about a child, newest first: ratings (who and when),
 *  notes, activities - plus the child's performance reports. */
export function StudentHistory({ studentId, today }: { studentId: string; today: string }) {
  const [days, setDays] = useState(90)
  const [h, setH] = useState<History | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    progressApi.history(studentId, { date_from: addDays(today, -days), date_to: today }).then(
      (d) => live && (setH(d), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [studentId, days, today])

  const entries = useMemo(() => {
    if (!h) return []
    const out: Entry[] = []
    const groups = new Map<string, History['ratings']>()
    for (const r of h.ratings) {
      const k = `${r.period_start}|${r.frequency}`
      groups.set(k, [...(groups.get(k) ?? []), r])
    }
    for (const [k, items] of groups) {
      const [start, freq] = k.split('|')
      const label =
        freq === 'daily'
          ? 'Daily ratings'
          : freq === 'weekly'
            ? `Weekly ratings · week of ${shortDate(start)}`
            : `Monthly ratings · ${new Date(`${start}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
      out.push({ kind: 'rating', date: start, label, items })
    }
    for (const n of h.notes) out.push({ kind: 'note', date: n.date, note: n })
    for (const a of h.activities) out.push({ kind: 'activity', date: a.date, activity: a })
    return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [h])

  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>
  if (!h) return <div className="h-60 animate-pulse rounded-2xl bg-slate-200/60" />
  return (
    <div className="space-y-4">
      <section aria-label="Reports">
        <h3 className="flex items-center gap-2 font-bold">
          <FileText className="size-4 text-brand" /> Performance reports
        </h3>
        {h.reports.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No reports yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {h.reports.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/progress/reports/${r.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-line hover:bg-slate-50"
                >
                  <span className="font-semibold">{r.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ring-1 ${REPORT_STATUS_TONE[r.status]}`}>{r.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="History">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">History</h3>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="History period"
            className="rounded-lg border border-line px-2 py-1 text-sm font-semibold"
          >
            {RANGES.map(([d, l]) => (
              <option key={d} value={d}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing recorded in this period.</p>
        ) : (
          <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
            {entries.map((e, i) => (
              <li key={i} className="relative">
                <span
                  className={`absolute top-1.5 -left-[21px] size-2.5 rounded-full ring-2 ring-white ${e.kind === 'rating' ? 'bg-amber-400' : e.kind === 'note' ? (e.note.kind === 'positive' ? 'bg-emerald-500' : 'bg-orange-500') : 'bg-violet-500'}`}
                />
                <p className="text-xs font-semibold text-muted">{shortDate(e.date)}</p>
                {e.kind === 'rating' && (
                  <div className="mt-1 rounded-xl p-3 ring-1 ring-line">
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      <Star className="size-3.5 text-amber-500" /> {e.label}
                      {e.items[0].locked && <Lock className="size-3.5 text-muted" aria-label={`Locked by ${e.items[0].locked}`} />}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {e.items.map((r) => (
                        <li key={r.criterion} className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
                          <span>{r.criterion}</span>
                          <span className="flex items-center gap-2">
                            <StarDisplay value={r.rating} size="size-3.5" />
                            <span className="text-xs text-muted">{r.by ?? ''}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[11px] text-muted">{FREQ_LABEL[e.items[0].frequency]}</p>
                  </div>
                )}
                {e.kind === 'note' && (
                  <div className={`mt-1 rounded-xl px-3 py-2 text-sm ${e.note.kind === 'positive' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                    <p className="flex items-center gap-1.5 font-semibold">
                      {e.note.kind === 'positive' ? <ThumbsUp className="size-3.5 text-emerald-700" /> : <TriangleAlert className="size-3.5 text-amber-700" />}
                      {e.note.tags.join(' · ') || (e.note.kind === 'positive' ? 'Positive note' : 'Needs attention')}
                    </p>
                    {e.note.text && <p className="mt-0.5">{e.note.text}</p>}
                    <p className="mt-0.5 text-xs text-muted">{e.note.by}</p>
                  </div>
                )}
                {e.kind === 'activity' && (
                  <div className="mt-1 rounded-xl p-3 text-sm ring-1 ring-line">
                    <p className="flex items-center justify-between gap-2 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Palette className="size-3.5 text-violet-600" /> {e.activity.title}
                      </span>
                      {e.activity.status === 'participated' ? (
                        e.activity.rating != null && <StarDisplay value={e.activity.rating} size="size-3.5" />
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{PARTICIPATION_LABEL[e.activity.status]}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {e.activity.activity_type} · {e.activity.place === 'outdoor' ? 'Outdoor' : 'Indoor'}
                      {e.activity.by && ` · ${e.activity.by}`}
                    </p>
                    {e.activity.comment && <p className="mt-0.5 italic">“{e.activity.comment}”</p>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
