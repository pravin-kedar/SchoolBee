import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { CalendarCheck, ChevronLeft, ChevronRight, CircleCheck, CircleX, Clock, History, LayoutGrid } from 'lucide-react'

import beeCalendar from '../../assets/bees/bee-calendar.webp'
import { AppShell } from '../../components/app/AppShell'
import { Ring } from '../../components/attendance/AttendanceUi'
import { errorMessage } from '../../lib/api'
import { attendanceApi, longDate, parseIso, pct, shiftDay, todayIso, type AttendanceOverview, type SectionDay } from '../../lib/attendance'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'

export function AttendanceDashboardPage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<AttendanceOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = todayIso()
  const date = params.get('date') ?? today

  useEffect(() => {
    if (!token) return
    let live = true
    attendanceApi
      .overview(date)
      .then((d) => live && (setData(d), setError(null)))
      .catch((err) => live && setError(errorMessage(err)))
    return () => {
      live = false
    }
  }, [token, date])

  if (!token) return <Navigate to="/login" replace />
  const setDate = (d: string) => setParams(d === today ? {} : { date: d }, { replace: true })
  const t = data?.totals
  const marked = t ? t.present + t.absent + t.late : 0

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-emerald-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={beeCalendar} alt="" className="hidden w-20 sm:block" />
              <div>
                <h1 className="text-2xl font-extrabold sm:text-3xl">Attendance</h1>
                <p className="mt-0.5">Daily attendance across your classes, at a glance.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
                <button onClick={() => setDate(shiftDay(date, -1))} className="grid size-9 place-items-center rounded-lg hover:bg-slate-50" aria-label="Previous day">
                  <ChevronLeft className="size-4" />
                </button>
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  aria-label="Date"
                  className="rounded-lg px-2 py-1.5 text-sm font-bold text-ink outline-none"
                />
                <button onClick={() => setDate(shiftDay(date, 1))} disabled={date >= today} className="grid size-9 place-items-center rounded-lg hover:bg-slate-50 disabled:opacity-40" aria-label="Next day">
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <Link to="/attendance/history" className="btn-outline">
                <History className="size-4" /> History
              </Link>
              <Link to={`/attendance/take${date !== today ? `?date=${date}` : ''}`} className="btn-primary">
                <CalendarCheck className="size-4" /> Take Attendance
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        {/* Stats */}
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          <li className="col-span-2 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 lg:col-span-1">
            <Ring percent={t ? pct(t.present, t.late, marked) : null} size="size-20" />
            <span className="font-bold leading-tight text-ink">
              Attendance
              <span className="block text-xs font-normal text-muted">{date === today ? 'today' : longDate(date)}</span>
            </span>
          </li>
          <Stat icon={CircleCheck} tone="bg-emerald-100 text-emerald-600" label="Present" value={t?.present} />
          <Stat icon={CircleX} tone="bg-rose-100 text-rose-500" label="Absent" value={t?.absent} />
          <Stat icon={Clock} tone="bg-amber-100 text-amber-600" label="Late" value={t?.late} />
          <Stat
            icon={LayoutGrid}
            tone="bg-sky-100 text-brand"
            label="Sections marked"
            value={t ? `${t.marked_sections} / ${t.total_sections}` : undefined}
          />
        </ul>

        {data?.holiday && (
          <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {longDate(date)} is a school holiday — {data.holiday}. No attendance is expected.
          </p>
        )}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Sections */}
          <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
            <h2 className="text-lg font-bold">Classes · {longDate(date)}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-xs font-bold text-ink/80">
                    <th className="px-3 py-2.5">Class</th>
                    <th className="px-3 py-2.5">Class Teacher</th>
                    <th className="px-3 py-2.5 text-center">Students</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Present / Absent / Late</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {!data
                    ? Array.from({ length: 4 }, (_, i) => (
                        <tr key={i}>
                          <td colSpan={6} className="px-3 py-3">
                            <div className="h-7 animate-pulse rounded-lg bg-slate-100" />
                          </td>
                        </tr>
                      ))
                    : data.sections.map((s) => <SectionRow key={`${s.class_id}${s.section_id}`} s={s} date={date} />)}
                </tbody>
              </table>
              {data && data.sections.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">
                  No classes yet — <Link to="/classes" className="font-bold text-brand">add them</Link> first.
                </p>
              )}
            </div>
          </section>

          {/* Trend */}
          <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
            <h2 className="text-lg font-bold">Last 14 Days</h2>
            <p className="text-xs text-muted">School-wide attendance % (saved registers only)</p>
            <div className="mt-4 flex h-44 items-end gap-1.5" role="list" aria-label="Attendance trend">
              {(data?.trend ?? []).map((p) => {
                const d = parseIso(p.date)
                const off = data?.weekly_off.includes(d.getDay())
                return (
                  <div key={p.date} role="listitem" className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${longDate(p.date)}: ${p.percent == null ? 'no data' : `${p.percent}%`}`}>
                    {p.percent != null && <span className="text-[10px] font-bold text-ink/70">{p.percent}</span>}
                    <div
                      className={`w-full rounded-t-md ${p.percent == null ? 'bg-slate-100' : p.percent >= 90 ? 'bg-emerald-400' : p.percent >= 75 ? 'bg-amber-400' : 'bg-rose-400'} ${p.date === date ? 'ring-2 ring-brand' : ''}`}
                      style={{ height: `${p.percent == null ? 6 : Math.max(8, p.percent)}%` }}
                    />
                    <span className={`text-[10px] ${off ? 'text-rose-400' : 'text-muted'}`}>{d.getDate()}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}

function Stat({ icon: Icon, tone, label, value }: { icon: typeof CircleCheck; tone: string; label: string; value: number | string | undefined }) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-line/60 sm:gap-4 sm:p-4">
      <span className={`grid size-10 shrink-0 place-items-center rounded-2xl sm:size-12 ${tone}`}>
        <Icon className="size-6" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-ink/80">{label}</span>
        <span className="font-display text-2xl font-extrabold text-ink">{value ?? '—'}</span>
      </span>
    </li>
  )
}

function SectionRow({ s, date }: { s: SectionDay; date: string }) {
  const name = `${s.class_name}${s.section_name ? ` - ${s.section_name}` : ''}`
  const href = `/attendance/take?class_id=${s.class_id}${s.section_id ? `&section_id=${s.section_id}` : ''}&date=${date}`
  const marked = s.present + s.absent + s.late
  const badge =
    s.status === 'Final'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : s.status === 'Draft'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-slate-100 text-muted ring-line'
  return (
    <tr className={s.students === 0 ? 'opacity-60' : ''}>
      <td className="px-3 py-2.5 font-bold text-ink">{name}</td>
      <td className="px-3 py-2.5">{s.teacher_name ?? <span className="text-muted">—</span>}</td>
      <td className="px-3 py-2.5 text-center">{s.students}</td>
      <td className="px-3 py-2.5">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${badge}`}>{s.status === 'Final' ? 'Marked' : s.status === 'Draft' ? 'Draft' : 'Not taken'}</span>
      </td>
      <td className="px-3 py-2.5">
        {marked ? (
          <span className="flex items-center gap-3">
            <span className="flex h-2 w-28 overflow-hidden rounded-full bg-slate-100">
              <span className="bg-emerald-500" style={{ width: `${(s.present * 100) / marked}%` }} />
              <span className="bg-amber-400" style={{ width: `${(s.late * 100) / marked}%` }} />
              <span className="bg-rose-500" style={{ width: `${(s.absent * 100) / marked}%` }} />
            </span>
            <span className="text-xs font-semibold whitespace-nowrap">
              <span className="text-emerald-700">{s.present}</span> / <span className="text-rose-600">{s.absent}</span> / <span className="text-amber-700">{s.late}</span>
            </span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right">
        {s.students > 0 && (
          <Link to={href} className={s.can_edit && s.status !== 'Final' ? 'btn-primary py-1.5 text-sm' : 'btn-outline border-line py-1.5 text-sm text-ink'}>
            {!s.can_edit ? 'View' : s.status === 'Final' ? 'Edit' : s.status === 'Draft' ? 'Continue' : 'Take Attendance'}
          </Link>
        )}
      </td>
    </tr>
  )
}
