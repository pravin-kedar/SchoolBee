import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, ChartColumn, Download, List, Loader2 } from 'lucide-react'

import schoolBand from '../../assets/school-band.webp'
import beeSearch from '../../assets/bees/bee-search.webp'
import { AppShell } from '../../components/app/AppShell'
import {
  DetailedHistory,
  MonthCalendar,
  MonthNav,
  MonthSummaryCard,
  MonthlySummaryTable,
  StudentMonthStats,
} from '../../components/attendance/AttendanceUi'
import { useStudentMonth } from '../../lib/useStudentMonth'
import { errorMessage } from '../../lib/api'
import { attendanceApi, todayIso } from '../../lib/attendance'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { studentsApi, type StudentRow } from '../../lib/students'

type Tab = 'calendar' | 'monthly' | 'detailed'

export function AttendanceHistoryPage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [students, setStudents] = useState<StudentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const classes = options?.classes ?? []
  const classId = params.get('class_id') ?? classes[0]?.id ?? ''
  const cls = classes.find((c) => c.id === classId)
  const sectionId = params.get('section_id') ?? cls?.sections[0]?.id ?? ''
  const month = params.get('month') ?? todayIso().slice(0, 7)
  const studentId = params.get('student_id')
  const tab = (params.get('tab') as Tab) ?? (studentId ? 'calendar' : 'monthly')
  const { data: student, error: studentError, loading } = useStudentMonth(studentId, month)

  const set = (patch: Record<string, string | null>) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        for (const [k, v] of Object.entries(patch)) {
          if (v) n.set(k, v)
          else n.delete(k)
        }
        return n
      },
      { replace: true },
    )

  // Students of the chosen class/section, for the picker (active roster).
  useEffect(() => {
    if (!token || !classId) return
    let live = true
    studentsApi
      .list({ class_id: classId, section_id: sectionId, status: 'Active', sort: 'name', page_size: 100 })
      .then((d) => live && setStudents(d.items))
      .catch((err) => live && setError(errorMessage(err)))
    return () => {
      live = false
    }
  }, [token, classId, sectionId])

  if (!token) return <Navigate to="/login" replace />

  async function exportRegister() {
    setExporting(true)
    try {
      await attendanceApi.exportMonthly(classId, sectionId || null, month, 'xlsx')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const TABS: { key: Tab; label: string; icon: typeof CalendarDays; needsStudent: boolean }[] = [
    { key: 'calendar', label: 'Calendar View', icon: CalendarDays, needsStudent: true },
    { key: 'monthly', label: 'Monthly Summary', icon: ChartColumn, needsStudent: false },
    { key: 'detailed', label: 'Detailed History', icon: List, needsStudent: true },
  ]

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-amber-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <img src={schoolBand} alt="" className="pointer-events-none absolute top-0 right-10 hidden h-full [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] 2xl:block" />
          <div className="relative">
            <h1 className="text-2xl font-extrabold sm:text-3xl">Attendance History</h1>
            <p className="mt-0.5">View and analyze attendance records.</p>
          </div>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
          <Pick label="Class" value={classId} onChange={(v) => set({ class_id: v, section_id: null, student_id: null })}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Pick>
          <Pick label="Section" value={sectionId} disabled={!cls?.sections.length} onChange={(v) => set({ section_id: v, student_id: null })}>
            {cls?.sections.length ? (
              cls.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))
            ) : (
              <option value="">No sections</option>
            )}
          </Pick>
          <Pick label="Student" value={studentId ?? ''} onChange={(v) => set({ student_id: v || null, tab: v ? 'calendar' : 'monthly' })} wide>
            <option value="">All students (monthly summary)</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.student_code})
              </option>
            ))}
          </Pick>
          <label className="block text-sm font-bold text-ink">
            Month
            <input
              type="month"
              value={month}
              max={todayIso().slice(0, 7)}
              onChange={(e) => e.target.value && set({ month: e.target.value })}
              className="mt-1 block rounded-xl border border-line px-3 py-2 font-semibold outline-none focus:border-brand"
            />
          </label>
          <button onClick={() => void exportRegister()} disabled={!classId || exporting} className="btn-outline ml-auto">
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export Register
          </button>
        </section>

        {(error || studentError) && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error ?? studentError}
          </p>
        )}

        {student && <StudentMonthStats data={student} />}

        <div className={`grid gap-5 ${student ? 'xl:grid-cols-[minmax(0,1fr)_420px]' : ''}`}>
          <div className="min-w-0 space-y-4">
            <div className="flex overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
              {TABS.map(({ key, label, icon: Icon, needsStudent }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  disabled={needsStudent && !studentId}
                  title={needsStudent && !studentId ? 'Pick a student first' : undefined}
                  onClick={() => set({ tab: key })}
                  className={`flex min-w-40 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-40 ${
                    tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <MonthNav month={month} onChange={(m) => set({ month: m })} />
                {student && (
                  <p className="text-sm font-semibold text-ink/80">
                    {student.full_name} · {student.class_name}
                    {student.section_name ? ` - ${student.section_name}` : ''}
                  </p>
                )}
              </div>
              {tab === 'monthly' || !studentId ? (
                classId ? (
                  <MonthlySummaryTable
                    classId={classId}
                    sectionId={sectionId || null}
                    month={month}
                    selectedId={studentId}
                    onPick={(id) => set({ student_id: id, tab: 'calendar' })}
                  />
                ) : (
                  <p className="text-sm text-muted">Add classes first.</p>
                )
              ) : loading && !student ? (
                <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
              ) : student ? (
                tab === 'calendar' ? <MonthCalendar data={student} /> : <DetailedHistory data={student} />
              ) : null}
              {!studentId && (
                <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <img src={beeSearch} alt="" className="h-8" /> Click a student (or pick one above) to see their calendar and daily history.
                </p>
              )}
            </section>
          </div>

          {student && (
            <aside className="space-y-4">
              <MonthSummaryCard data={student} />
              {tab !== 'detailed' && <DetailedHistory data={student} />}
            </aside>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function Pick({
  label,
  value,
  onChange,
  disabled,
  wide,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`block text-sm font-bold text-ink ${wide ? 'min-w-64 flex-1' : ''}`}>
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl border border-line px-3 py-2 font-semibold outline-none focus:border-brand disabled:bg-slate-50"
      >
        {children}
      </select>
    </label>
  )
}
