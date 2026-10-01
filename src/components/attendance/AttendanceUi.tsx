import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ListChecks } from 'lucide-react'

import { errorMessage } from '../../lib/api'
import {
  MARK_STYLE,
  attendanceApi,
  longDate,
  monthLabel,
  parseIso,
  shiftMonth,
  todayIso,
  type Mark,
  type Monthly,
  type StudentMonth,
} from '../../lib/attendance'

/** Percentage ring (green ≥ 90, amber ≥ 75, red below). */
export function Ring({ percent, size = 'size-24', label }: { percent: number | null; size?: string; label?: string }) {
  const r = 42
  const c = 2 * Math.PI * r
  const colour = percent == null ? '#cbd5e1' : percent >= 90 ? '#22b35e' : percent >= 75 ? '#f59e0b' : '#ef4444'
  return (
    <div className={`relative ${size} shrink-0`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={percent == null ? 'No data' : `${percent}%`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#eef1f7" strokeWidth="10" />
        {percent != null && (
          <circle cx="50" cy="50" r={r} fill="none" stroke={colour} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
        )}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center leading-tight">
        <span>
          <span className="block font-display text-xl font-extrabold text-ink">{percent == null ? '—' : `${percent}%`}</span>
          {label && <span className="text-[11px] text-muted">{label}</span>}
        </span>
      </span>
    </div>
  )
}

export function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const current = todayIso().slice(0, 7)
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(shiftMonth(month, -1))} className="grid size-8 place-items-center rounded-lg ring-1 ring-line hover:bg-slate-50" aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </button>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= current}
        className="grid size-8 place-items-center rounded-lg ring-1 ring-line hover:bg-slate-50 disabled:opacity-40"
        aria-label="Next month"
      >
        <ChevronRight className="size-4" />
      </button>
      <span className="text-lg font-extrabold text-ink">{monthLabel(month)}</span>
    </div>
  )
}

export function MarkDot({ mark }: { mark: Mark }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${MARK_STYLE[mark].text}`}>
      <span className={`size-2.5 rounded-full ${MARK_STYLE[mark].dot}`} /> {mark}
    </span>
  )
}

/** Stat tiles for a student's month. */
export function StudentMonthStats({ data }: { data: StudentMonth }) {
  const marked = data.present + data.absent + data.late
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <li className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <Ring percent={data.percent} size="size-20" />
        <span className="font-bold text-ink">
          Attendance
          <br />
          Percentage
        </span>
      </li>
      <Tile tone="bg-emerald-100 text-emerald-600" value={data.present} label="Present Days" sub={`out of ${marked} marked day${marked === 1 ? '' : 's'}`} />
      <Tile tone="bg-rose-100 text-rose-500" value={data.absent} label="Absent Days" />
      <Tile tone="bg-amber-100 text-amber-600" value={data.late} label="Late Days" sub="counted as attended" />
    </ul>
  )
}

function Tile({ tone, value, label, sub }: { tone: string; value: number; label: string; sub?: string }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
      <span className={`grid size-14 place-items-center rounded-full font-display text-xl font-extrabold ${tone}`}>{value}</span>
      <span className="leading-tight">
        <span className="block font-bold text-ink">{label}</span>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </span>
    </li>
  )
}

/** Month grid: Sundays shaded, each marked day coloured by its status. */
export function MonthCalendar({ data }: { data: StudentMonth }) {
  const marks = new Map(data.days.map((d) => [d.date, d]))
  const holidays = new Map((data.holidays ?? []).map((h) => [h.date, h.title]))
  const first = parseIso(`${data.month}-01`)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const today = todayIso()
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const tone: Record<Mark, string> = { Present: 'bg-emerald-50 ring-emerald-100', Absent: 'bg-rose-50 ring-rose-200', Late: 'bg-amber-50 ring-amber-200' }
  return (
    <div>
      <div className="mb-3 flex flex-wrap justify-end gap-4 text-xs font-semibold">
        {(['Present', 'Absent', 'Late'] as Mark[]).map((m) => (
          <span key={m} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${MARK_STYLE[m].dot}`} /> {m}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-200" /> Holiday
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-slate-300" /> Weekly off / not marked
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="rounded-lg bg-slate-50 py-1.5">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />
          const iso = `${data.month}-${String(day).padStart(2, '0')}`
          const mark = marks.get(iso)
          const off = data.weekly_off.includes(i % 7)
          const holiday = holidays.get(iso)
          return (
            <div
              key={iso}
              title={`${longDate(iso)}${holiday ? ` - Holiday: ${holiday}` : ''}${mark ? ` - ${mark.status}${mark.remark ? ` (${mark.remark})` : ''}` : ''}`}
              className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg ring-1 ${
                mark ? tone[mark.status] : holiday ? 'bg-rose-50 ring-rose-100' : off ? 'bg-slate-100 ring-transparent' : 'bg-white ring-line'
              } ${iso === today ? 'outline-2 outline-brand' : ''}`}
            >
              <span className={`text-sm ${mark ? 'font-extrabold text-ink' : 'text-muted'}`}>{day}</span>
              {mark && <span className={`size-2 rounded-full ${MARK_STYLE[mark.status].dot}`} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Month tiles + % bars (the "Monthly Summary" card in the design). */
export function MonthSummaryCard({ data }: { data: StudentMonth }) {
  const marked = data.present + data.absent + data.late
  const items: { mark: Mark; value: number }[] = [
    { mark: 'Present', value: data.present },
    { mark: 'Absent', value: data.absent },
    { mark: 'Late', value: data.late },
  ]
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
      <h2 className="text-lg font-bold">Monthly Summary - {monthLabel(data.month)}</h2>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {items.map(({ mark, value }) => {
          const share = marked ? Math.round((value * 100) / marked) : 0
          return (
            <li key={mark} className={`rounded-xl p-3 text-center ring-1 ${MARK_STYLE[mark].soft} ${MARK_STYLE[mark].ring}`}>
              <p className={`font-display text-2xl font-extrabold ${MARK_STYLE[mark].text}`}>{value}</p>
              <p className="text-xs font-semibold text-ink/80">{mark}</p>
              <p className="text-xs text-muted">{share}%</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-white">
                <div className={`h-full rounded-full ${MARK_STYLE[mark].dot}`} style={{ width: `${share}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function DetailedHistory({ data }: { data: StudentMonth }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <ListChecks className="size-5 text-brand" /> Detailed History - {monthLabel(data.month)}
      </h2>
      {data.days.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No attendance marked this month.</p>
      ) : (
        <div className="mt-3 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-ink/80">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.days.map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-2 whitespace-nowrap">{longDate(d.date)}</td>
                  <td className="px-3 py-2">
                    <MarkDot mark={d.status} />
                  </td>
                  <td className="px-3 py-2 text-muted">{d.remark ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** Per-student month table for a class/section. */
export function MonthlySummaryTable({
  classId,
  sectionId,
  month,
  onPick,
  selectedId,
}: {
  classId: string
  sectionId: string | null
  month: string
  onPick?: (studentId: string) => void
  selectedId?: string | null
}) {
  const [data, setData] = useState<Monthly | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    attendanceApi
      .monthly(classId, sectionId, month)
      .then((d) => live && (setData(d), setError(null)))
      .catch((err) => live && setError(errorMessage(err)))
    return () => {
      live = false
    }
  }, [classId, sectionId, month])

  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>
  if (!data) return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
  return (
    <div>
      <p className="mb-2 text-sm text-muted">
        {data.working_days} school day{data.working_days === 1 ? '' : 's'} with attendance in {monthLabel(month)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-xs font-bold text-ink/80">
              <th className="px-3 py-2.5">Student</th>
              <th className="px-3 py-2.5 text-center">Present</th>
              <th className="px-3 py-2.5 text-center">Absent</th>
              <th className="px-3 py-2.5 text-center">Late</th>
              <th className="px-3 py-2.5">Attendance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.rows.map((r) => (
              <tr
                key={r.student_id}
                onClick={onPick ? () => onPick(r.student_id) : undefined}
                className={`${onPick ? 'cursor-pointer hover:bg-sky-50/50' : ''} ${selectedId === r.student_id ? 'bg-sky-50' : ''}`}
              >
                <td className="px-3 py-2">
                  <span className="font-semibold text-ink">{r.full_name}</span>
                  <span className="ml-2 text-xs text-muted">{r.student_code}</span>
                </td>
                <td className="px-3 py-2 text-center font-semibold text-emerald-700">{r.present}</td>
                <td className="px-3 py-2 text-center font-semibold text-rose-600">{r.absent}</td>
                <td className="px-3 py-2 text-center font-semibold text-amber-700">{r.late}</td>
                <td className="px-3 py-2">
                  {r.percent == null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-24 rounded-full bg-slate-100">
                        <span
                          className={`block h-full rounded-full ${r.percent >= 90 ? 'bg-emerald-500' : r.percent >= 75 ? 'bg-amber-400' : 'bg-rose-500'}`}
                          style={{ width: `${r.percent}%` }}
                        />
                      </span>
                      <span className="font-bold text-ink">{r.percent}%</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length === 0 && <p className="py-6 text-center text-sm text-muted">No students in this class/section.</p>}
      </div>
    </div>
  )
}
