import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { addDays, isoDate, mondayOf, monthStart, parseDate, progressApi, shiftMonth, type Frequency, type ProgressGroup } from '../../lib/progress'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => parseDate(iso).toLocaleDateString('en-IN', o)

type Coverage = { expected: number; periods: Record<string, number> }

/** Daily: a month calendar. Weekly: recent weeks. Monthly: the months of a
 *  year. Each period shows how much of the class has been rated. */
export function PeriodPicker({
  group,
  frequency,
  date,
  today,
  version,
  onPick,
}: {
  group: ProgressGroup
  frequency: Frequency
  date: string
  today: string
  version: number // bump to reload the dots after saving
  onPick: (date: string) => void
}) {
  // what's on screen: a month (daily), the 8 weeks ending at a week (weekly), a year (monthly)
  const [view, setView] = useState(() => (frequency === 'daily' ? monthStart(date) : frequency === 'weekly' ? mondayOf(date) : `${date.slice(0, 4)}-01-01`))
  const [cov, setCov] = useState<Coverage | null>(null)
  const range =
    frequency === 'daily'
      ? { from: view, to: addDays(shiftMonth(view, 1), -1) }
      : frequency === 'weekly'
        ? { from: addDays(view, -7 * 7), to: addDays(view, 6) }
        : { from: view, to: `${view.slice(0, 4)}-12-31` }

  useEffect(() => {
    let live = true
    progressApi.coverage({ class_id: group.class_id, section_id: group.section_id, frequency, date_from: range.from, date_to: range.to }).then(
      (c) => live && setCov(c),
      () => live && setCov(null),
    )
    return () => {
      live = false
    }
  }, [group.class_id, group.section_id, frequency, range.from, range.to, version])

  const dot = (periodStart: string) => {
    const n = cov?.periods[periodStart] ?? 0
    if (!n || !cov?.expected) return null
    return n >= cov.expected ? 'bg-emerald-500' : 'bg-amber-400'
  }
  const nav = (label: string, prev: () => void, next: (() => void) | null) => (
    <div className="flex items-center justify-between gap-2">
      <button type="button" onClick={prev} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label="Previous">
        <ChevronLeft className="size-4" />
      </button>
      <span className="text-sm font-bold">{label}</span>
      <button
        type="button"
        onClick={next ?? undefined}
        disabled={!next}
        className="grid size-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30"
        aria-label="Next"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )

  let body
  if (frequency === 'daily') {
    const first = parseDate(view)
    const lead = (first.getDay() + 6) % 7
    const days = parseDate(addDays(shiftMonth(view, 1), -1)).getDate()
    const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => isoDate(new Date(first.getFullYear(), first.getMonth(), i + 1)))]
    body = (
      <>
        {nav(
          fmt(view, { month: 'long', year: 'numeric' }),
          () => setView(shiftMonth(view, -1)),
          shiftMonth(view, 1) <= today ? () => setView(shiftMonth(view, 1)) : null,
        )}
        <div className="mt-2 grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Pick a day">
          {WEEKDAYS.map((d) => (
            <span key={d} className="text-[11px] font-bold text-muted">
              {d}
            </span>
          ))}
          {cells.map((d, i) =>
            d === null ? (
              <span key={`x${i}`} />
            ) : (
              <button
                key={d}
                type="button"
                disabled={d > today}
                onClick={() => onPick(d)}
                aria-label={fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}
                aria-pressed={d === date}
                className={`relative grid h-9 place-items-center rounded-lg text-sm font-semibold transition disabled:text-slate-300 ${
                  d === date ? 'bg-brand text-white' : d === today ? 'ring-1 ring-brand' : 'hover:bg-slate-100'
                }`}
              >
                {Number(d.slice(8))}
                {dot(d) && <span className={`absolute bottom-1 size-1.5 rounded-full ${d === date ? 'bg-white' : dot(d)}`} />}
              </button>
            ),
          )}
        </div>
      </>
    )
  } else if (frequency === 'weekly') {
    const weeks = Array.from({ length: 8 }, (_, i) => addDays(view, -7 * i))
    body = (
      <>
        {nav(
          'Weeks',
          () => setView(addDays(view, -56)),
          addDays(view, 7) <= today ? () => setView(addDays(view, 56) > mondayOf(today) ? mondayOf(today) : addDays(view, 56)) : null,
        )}
        <ul className="mt-2 space-y-1" aria-label="Pick a week">
          {weeks.map((w) => {
            const n = cov?.periods[w] ?? 0
            const pct = cov?.expected ? Math.min(100, Math.round((n * 100) / cov.expected)) : 0
            const on = mondayOf(date) === w
            return (
              <li key={w}>
                <button
                  type="button"
                  onClick={() => onPick(w > today ? today : w)}
                  aria-pressed={on}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${on ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}
                >
                  <span className="flex items-center justify-between gap-2 font-semibold">
                    {fmt(w, { day: 'numeric', month: 'short' })} – {fmt(addDays(w, 6), { day: 'numeric', month: 'short' })}
                    <span className={`text-xs ${on ? 'text-white/80' : 'text-muted'}`}>{pct ? `${pct}%` : '—'}</span>
                  </span>
                  <span className={`mt-1 block h-1 overflow-hidden rounded-full ${on ? 'bg-white/30' : 'bg-slate-100'}`}>
                    <span className={`block h-full ${on ? 'bg-white' : pct >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </>
    )
  } else {
    const year = Number(view.slice(0, 4))
    body = (
      <>
        {nav(String(year), () => setView(`${year - 1}-01-01`), `${year + 1}-01-01` <= today ? () => setView(`${year + 1}-01-01`) : null)}
        <div className="mt-2 grid grid-cols-3 gap-1.5" role="grid" aria-label="Pick a month">
          {MONTHS.map((m, i) => {
            const start = `${year}-${String(i + 1).padStart(2, '0')}-01`
            const on = monthStart(date) === start
            return (
              <button
                key={m}
                type="button"
                disabled={start > today}
                onClick={() => onPick(start)}
                aria-pressed={on}
                aria-label={`${m} ${year}`}
                className={`relative rounded-xl px-2 py-2.5 text-sm font-semibold transition disabled:text-slate-300 ${on ? 'bg-brand text-white' : 'hover:bg-slate-100'}`}
              >
                {m}
                {dot(start) && <span className={`absolute top-1.5 right-1.5 size-1.5 rounded-full ${on ? 'bg-white' : dot(start)}`} />}
              </button>
            )
          })}
        </div>
      </>
    )
  }
  return (
    <div>
      {body}
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-500" /> all rated
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-amber-400" /> partly rated
        </span>
      </p>
    </div>
  )
}
