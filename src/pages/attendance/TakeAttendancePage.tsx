import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  History,
  Lightbulb,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Users,
  X,
} from 'lucide-react'

import schoolBand from '../../assets/school-band.webp'
import beeReading from '../../assets/bees/bee-reading.webp'
import { AppShell } from '../../components/app/AppShell'
import { Avatar } from '../../components/students/StudentUi'
import { errorMessage } from '../../lib/api'
import { MARK_STYLE, attendanceApi, longDate, parseIso, todayIso, type AttendanceChange, type Mark, type Sheet, type SessionStatus } from '../../lib/attendance'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { ageLabel } from '../../lib/students'

type Marks = Record<string, { status: Mark | null; remark: string }>
const MARKS: { mark: Mark; icon: typeof CircleCheck }[] = [
  { mark: 'Present', icon: CircleCheck },
  { mark: 'Absent', icon: CircleX },
  { mark: 'Late', icon: Clock },
]
const RADIO: Record<Mark, string> = {
  Present: 'border-emerald-500 bg-emerald-500',
  Absent: 'border-rose-500 bg-rose-500',
  Late: 'border-amber-400 bg-amber-400',
}

const fromSheet = (sheet: Sheet): Marks =>
  Object.fromEntries(sheet.students.map((s) => [s.student_id, { status: s.status, remark: s.remark ?? '' }]))

export function TakeAttendancePage() {
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [marks, setMarks] = useState<Marks>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<SessionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const today = todayIso()
  const date = params.get('date') ?? today
  const classes = options?.classes ?? []
  const classId = params.get('class_id') ?? classes[0]?.id ?? ''
  const cls = classes.find((c) => c.id === classId)
  const sectionId = params.get('section_id') ?? cls?.sections[0]?.id ?? ''

  const dirty = useMemo(() => {
    if (!sheet) return false
    const saved = fromSheet(sheet)
    return Object.entries(marks).some(([id, m]) => m.status !== saved[id]?.status || m.remark !== saved[id]?.remark)
  }, [marks, sheet])

  // Loading = the register on screen isn't the one the pickers point at.
  const sheetKey = `${classId}|${sectionId}|${date}`
  const loading = Boolean(classId) && loadedKey !== sheetKey
  useEffect(() => {
    if (!token || !classId) return
    let live = true
    attendanceApi
      .sheet(classId, sectionId || null, date)
      .then((s) => {
        if (!live) return
        setSheet(s)
        setMarks(fromSheet(s))
        setSelected(new Set())
        setError(null)
      })
      .catch((err) => live && (setSheet(null), setError(errorMessage(err))))
      .finally(() => live && setLoadedKey(sheetKey))
    return () => {
      live = false
    }
  }, [token, classId, sectionId, date, sheetKey])

  if (!token) return <Navigate to="/login" replace />

  const choose = (patch: Record<string, string>) => {
    if (dirty && !window.confirm('You have unsaved attendance. Switch anyway?')) return
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
  }

  const editable = Boolean(sheet?.can_edit)
  // School Settings can turn Late marking off.
  const markOptions = sheet && !sheet.allow_late ? MARKS.filter((m) => m.mark !== 'Late') : MARKS
  const offDay = sheet ? sheet.weekly_off.includes(parseIso(sheet.date).getDay()) : false
  const setMark = (ids: string[], status: Mark | null) =>
    setMarks((m) => {
      const next = { ...m }
      for (const id of ids) next[id] = { status, remark: status === 'Present' || status === null ? '' : (m[id]?.remark ?? '') }
      return next
    })

  const counts = { Present: 0, Absent: 0, Late: 0, none: 0 }
  for (const s of sheet?.students ?? []) {
    const st = marks[s.student_id]?.status
    if (st) counts[st] += 1
    else counts.none += 1
  }
  const total = sheet?.students.length ?? 0

  async function save(status: SessionStatus) {
    if (!sheet) return
    if (status === 'Final' && counts.none > 0) {
      setError(`Mark every student before saving — ${counts.none} left. Use “Mark All Present” to start quickly.`)
      return
    }
    setSaving(status)
    setError(null)
    try {
      const saved = await attendanceApi.save({
        class_id: sheet.class_id,
        section_id: sheet.section_id,
        date: sheet.date,
        status,
        records: sheet.students
          .filter((s) => marks[s.student_id]?.status)
          .map((s) => ({ student_id: s.student_id, status: marks[s.student_id].status as Mark, remark: marks[s.student_id].remark.trim() || null })),
      })
      setSheet(saved)
      setMarks(fromSheet(saved))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  const allChecked = total > 0 && sheet!.students.every((s) => selected.has(s.student_id))

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 pb-0 sm:p-6 sm:pb-0">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-emerald-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <img
            src={schoolBand}
            alt=""
            className="pointer-events-none absolute top-0 right-10 hidden h-full [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] 2xl:block"
          />
          <div className="relative">
            <h1 className="text-2xl font-extrabold sm:text-3xl">Take Attendance</h1>
            <p className="mt-0.5">Mark daily attendance for your class. It’s quick and easy!</p>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-4">
            {/* Pickers */}
            <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:grid-cols-3">
              <label className="block text-sm font-bold text-ink">
                Date
                <span className="relative mt-1 block">
                  <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                  <input
                    type="date"
                    value={date}
                    max={today}
                    onChange={(e) => e.target.value && choose({ date: e.target.value })}
                    className="w-full rounded-xl border border-line py-2.5 pr-3 pl-9 font-semibold outline-none focus:border-brand"
                  />
                </span>
                <span className="mt-1 block text-xs font-normal text-muted">{longDate(date)}</span>
              </label>
              <label className="block text-sm font-bold text-ink">
                Class
                <select
                  value={classId}
                  onChange={(e) => choose({ class_id: e.target.value, section_id: '' })}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 font-semibold outline-none focus:border-brand"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold text-ink">
                Section
                <select
                  value={sectionId}
                  onChange={(e) => choose({ section_id: e.target.value })}
                  disabled={!cls?.sections.length}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 font-semibold outline-none focus:border-brand disabled:bg-slate-50"
                >
                  {cls?.sections.length ? (
                    cls.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No sections</option>
                  )}
                </select>
              </label>
            </section>

            {sheet && (
              <SessionBanner sheet={sheet} />
            )}
            {sheet?.holiday && (
              <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                <CalendarDays className="size-4" /> {longDate(date)} is a school holiday — {sheet.holiday}. You can still take attendance if school was open.
              </p>
            )}
            {offDay && !sheet?.holiday && (
              <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                {longDate(date)} is a weekly off day in School Settings. You can still take attendance if school was open.
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}

            {/* Register */}
            <section className="rounded-2xl bg-white shadow-card ring-1 ring-line/60">
              {editable && selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
                  <span className="text-sm font-bold text-ink">{selected.size} selected — mark as</span>
                  {markOptions.map(({ mark }) => (
                    <button
                      key={mark}
                      onClick={() => setMark([...selected], mark)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ${MARK_STYLE[mark].soft} ${MARK_STYLE[mark].text} ${MARK_STYLE[mark].ring}`}
                    >
                      {mark}
                    </button>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-ink/80">
                      <th className="w-12 bg-slate-50/80 px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          disabled={!editable || !total}
                          checked={allChecked}
                          onChange={() => setSelected(allChecked ? new Set() : new Set(sheet!.students.map((s) => s.student_id)))}
                          className="size-4 accent-brand"
                        />
                      </th>
                      <th className="w-10 bg-slate-50/80 px-2 py-3">#</th>
                      <th className="bg-slate-50/80 px-3 py-3">Student Name</th>
                      {markOptions.map(({ mark, icon: Icon }) => (
                        <th key={mark} className={`w-28 px-2 py-3 text-center ${MARK_STYLE[mark].soft}`}>
                          <span className={`inline-flex items-center gap-1.5 ${MARK_STYLE[mark].text}`}>
                            <Icon className="size-4" /> {mark}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {loading && !sheet
                      ? Array.from({ length: 6 }, (_, i) => (
                          <tr key={i}>
                            <td colSpan={6} className="px-4 py-3">
                              <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      : sheet?.students.map((s, i) => {
                          const m = marks[s.student_id] ?? { status: null, remark: '' }
                          return (
                            <tr key={s.student_id} className={`${loading ? 'opacity-60' : ''} ${selected.has(s.student_id) ? 'bg-sky-50/60' : ''}`}>
                              <td className="px-4 py-2.5">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${s.full_name}`}
                                  disabled={!editable}
                                  checked={selected.has(s.student_id)}
                                  onChange={() =>
                                    setSelected((cur) => {
                                      const n = new Set(cur)
                                      if (n.has(s.student_id)) n.delete(s.student_id)
                                      else n.add(s.student_id)
                                      return n
                                    })
                                  }
                                  className="size-4 accent-brand"
                                />
                              </td>
                              <td className="px-2 py-2.5 text-muted">{i + 1}</td>
                              <td className="px-3 py-2">
                                <span className="flex items-center gap-3">
                                  <Avatar name={s.full_name} url={s.photo_url} gender={s.gender} />
                                  <span className="min-w-0 leading-tight">
                                    <span className="block font-bold text-ink">{s.full_name}</span>
                                    <span className="text-xs text-muted">{[s.gender, ageLabel(s.date_of_birth)].filter(Boolean).join(', ')}</span>
                                    {(m.status === 'Absent' || m.status === 'Late') && (
                                      <input
                                        value={m.remark}
                                        maxLength={200}
                                        disabled={!editable}
                                        onChange={(e) => setMarks((cur) => ({ ...cur, [s.student_id]: { ...m, remark: e.target.value } }))}
                                        placeholder={m.status === 'Late' ? 'Note, e.g. came at 9:30' : 'Reason, e.g. sick'}
                                        aria-label={`Note for ${s.full_name}`}
                                        className="mt-1 block w-56 rounded-lg border border-line px-2 py-1 text-xs outline-none focus:border-brand"
                                      />
                                    )}
                                  </span>
                                </span>
                              </td>
                              {markOptions.map(({ mark }) => (
                                <td key={mark} className="px-2 py-2.5 text-center">
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={m.status === mark}
                                    aria-label={`${s.full_name} ${mark}`}
                                    disabled={!editable}
                                    onClick={() => setMark([s.student_id], mark)}
                                    className={`mx-auto grid size-6 place-items-center rounded-full border-2 transition disabled:cursor-not-allowed ${
                                      m.status === mark ? RADIO[mark] : 'border-slate-300 bg-white hover:border-slate-400'
                                    }`}
                                  >
                                    {m.status === mark && <span className="size-2 rounded-full bg-white" />}
                                  </button>
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                  </tbody>
                </table>
                {sheet && total === 0 && (
                  <div className="py-10 text-center">
                    <img src={beeReading} alt="" className="mx-auto h-20" />
                    <p className="mt-2 font-bold text-ink">No active students in this class/section</p>
                    <Link to="/students/new" className="btn-outline mt-3">
                      Add Student
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right rail */}
          <aside className="space-y-4">
            <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
              <h2 className="text-lg font-bold">Class Summary</h2>
              <ul className="mt-3 grid grid-cols-2 gap-3">
                <SummaryTile icon={Users} tone="bg-sky-50 text-brand ring-sky-100" value={total} label="Total" />
                <SummaryTile icon={CircleCheck} tone="bg-emerald-50 text-emerald-600 ring-emerald-100" value={counts.Present} label="Present" />
                <SummaryTile icon={CircleX} tone="bg-rose-50 text-rose-500 ring-rose-100" value={counts.Absent} label="Absent" />
                {sheet?.allow_late !== false && <SummaryTile icon={Clock} tone="bg-amber-50 text-amber-600 ring-amber-100" value={counts.Late} label="Late" />}
              </ul>
              {counts.none > 0 && total > 0 && <p className="mt-3 text-center text-xs font-semibold text-muted">{counts.none} not marked yet</p>}
            </section>
            {editable && (
              <section className="space-y-3 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                <h2 className="text-lg font-bold">Quick Actions</h2>
                <button onClick={() => setMark(sheet!.students.map((s) => s.student_id), 'Present')} disabled={!total} className="btn-primary w-full py-3">
                  <Check className="size-4" /> Mark All Present
                </button>
                <button onClick={() => setMark(sheet!.students.map((s) => s.student_id), null)} disabled={!total} className="btn-outline w-full py-3">
                  <RotateCcw className="size-4" /> Reset Attendance
                </button>
              </section>
            )}
            <section className="flex gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
              <Lightbulb className="size-6 shrink-0 fill-honey text-amber-500" />
              <div>
                <p className="font-bold text-ink">Tip</p>
                <p className="text-sm">Mark everyone present first, then change the few who are absent or late.</p>
              </div>
            </section>
            {sheet && sheet.history_count > 0 && (
              <button onClick={() => setShowHistory(true)} className="btn-outline w-full justify-center py-2.5">
                <History className="size-4" /> Change history ({sheet.history_count})
              </button>
            )}
            <Link to="/attendance/history" className="block text-center text-sm font-bold text-brand hover:underline">
              View attendance history →
            </Link>
          </aside>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <button onClick={() => (!dirty || window.confirm('Discard unsaved attendance?')) && navigate('/attendance')} className="btn-outline border-line text-ink">
            <X className="size-4" /> Cancel
          </button>
          <div className="flex gap-2">
            {editable && sheet?.session_status !== 'Final' && (
              <button onClick={() => void save('Draft')} disabled={Boolean(saving) || !total} className="btn-outline">
                {saving === 'Draft' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save as Draft
              </button>
            )}
            {editable && (
              <button onClick={() => void save('Final')} disabled={Boolean(saving) || !total} className="btn-primary px-6">
                {saving === 'Final' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {sheet?.session_status === 'Final' ? 'Update Attendance' : 'Save Attendance'}
              </button>
            )}
          </div>
        </div>
      </div>
      {showHistory && sheet && <HistoryPanel sheet={sheet} onClose={() => setShowHistory(false)} />}
    </AppShell>
  )
}

const MARK_TEXT: Record<Mark, string> = { Present: 'text-emerald-700', Absent: 'text-rose-600', Late: 'text-amber-600' }

function MarkWord({ mark }: { mark: Mark | null }) {
  return mark ? <span className={`font-bold ${MARK_TEXT[mark]}`}>{mark}</span> : <span className="text-muted">not marked</span>
}

/** Every save of this register, newest first: who, when, what changed. */
function HistoryPanel({ sheet, onClose }: { sheet: Sheet; onClose: () => void }) {
  const [rows, setRows] = useState<AttendanceChange[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    attendanceApi.history(sheet.class_id, sheet.section_id, sheet.date).then(setRows, (err) => setError(errorMessage(err)))
  }, [sheet.class_id, sheet.section_id, sheet.date, sheet.history_count])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <aside role="dialog" aria-label="Change history" onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <History className="size-5 text-brand" /> Change history
            </h2>
            <p className="text-sm text-muted">
              {sheet.class_name}
              {sheet.section_name ? ` - ${sheet.section_name}` : ''} · {longDate(sheet.date)}
            </p>
          </div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100" aria-label="Close history">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
          {!rows && !error && <div className="h-40 animate-pulse rounded-xl bg-slate-100" />}
          <ol className="relative space-y-5 border-l-2 border-line pl-5">
            {rows?.map((r) => {
              const counts: Record<string, number> = {}
              for (const c of r.changes) if (c.after) counts[c.after] = (counts[c.after] ?? 0) + 1
              return (
                <li key={r.id} className="relative" aria-label={`${r.action} by ${r.changed_by ?? 'unknown'}`}>
                  <span
                    className={`absolute top-1 -left-[27px] size-3 rounded-full ring-4 ring-white ${r.after_lock ? 'bg-amber-500' : r.action === 'Created' ? 'bg-emerald-500' : 'bg-brand'}`}
                  />
                  <p className="text-sm">
                    <span className="font-bold">{r.action === 'Created' ? 'Taken' : 'Updated'}</span> by{' '}
                    <span className="font-bold">{r.changed_by ?? 'a former member'}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(r.changed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {r.status_from !== r.status_to && ` · ${r.status_from ? `${r.status_from} → ` : ''}${r.status_to}`}
                  </p>
                  {r.after_lock && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200">
                      <Lock className="size-3" /> {r.action === 'Created' ? 'Taken' : 'Changed'} after lock
                    </span>
                  )}
                  {r.action === 'Created' ? (
                    <p className="mt-1.5 text-sm">
                      Marked {r.changes.length} student{r.changes.length === 1 ? '' : 's'}
                      {Object.keys(counts).length > 0 &&
                        `: ${Object.entries(counts)
                          .map(([k, n]) => `${n} ${k}`)
                          .join(', ')}`}
                    </p>
                  ) : r.changes.length === 0 ? (
                    <p className="mt-1.5 text-sm text-muted">No marks changed.</p>
                  ) : (
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {r.changes.map((c) => (
                        <li key={c.student_id}>
                          <span className="font-semibold">{c.name}</span>: <MarkWord mark={c.before} /> → <MarkWord mark={c.after} />
                          {c.remark_after && c.remark_after !== c.remark_before && <span className="text-muted"> ({c.remark_after})</span>}
                          {c.remark_before && !c.remark_after && <span className="text-muted"> (note removed)</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
          {rows && rows.length === 0 && <p className="text-sm text-muted">No changes recorded yet.</p>}
        </div>
      </aside>
    </div>
  )
}

function SessionBanner({ sheet }: { sheet: Sheet }) {
  const when = sheet.updated_at ? new Date(sheet.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  if (!sheet.can_edit) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink/80 ring-1 ring-line">
        <Lock className="size-4" />
        {sheet.date > todayIso()
          ? 'Attendance can’t be taken for a future date.'
          : sheet.locked
            ? `Locked — registers older than ${sheet.lock_days} days can only be changed by the school owner.`
            : 'View only — only this section’s class teacher or an admin can take attendance.'}
      </p>
    )
  }
  if (sheet.locked) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
        <Lock className="size-4" />
        Locked for staff (older than {sheet.lock_days} days). As the owner you can still correct it — changes are recorded in the history.
      </p>
    )
  }
  if (!sheet.session_status) return null
  const final = sheet.session_status === 'Final'
  return (
    <p className={`flex flex-wrap items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ${final ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>
      {final ? <CircleCheck className="size-4" /> : <Save className="size-4" />}
      {final ? 'Attendance saved' : 'Draft saved'}
      {sheet.marked_by && ` by ${sheet.marked_by}`}
      {when && ` at ${when}`}
      {final && <span className="font-normal">— you can still correct it.</span>}
    </p>
  )
}

function SummaryTile({ icon: Icon, tone, value, label }: { icon: typeof Users; tone: string; value: number; label: string }) {
  return (
    <li className={`rounded-xl p-3 ring-1 ${tone}`}>
      <span className="flex items-center gap-2">
        <Icon className="size-6" />
        <span className="font-display text-2xl font-extrabold text-ink">{value}</span>
      </span>
      <span className="text-sm font-semibold text-ink/70">{label}</span>
    </li>
  )
}
