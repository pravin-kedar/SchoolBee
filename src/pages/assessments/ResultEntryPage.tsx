import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, BadgeCheck, Check, CheckCircle2, Cloud, Loader2, Lock, RotateCcw, Search, X } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { Avatar } from '../../components/students/StudentUi'
import { errorMessage } from '../../lib/api'
import { assessmentsApi, fmt, type Area, type EntryPayload, type Sheet, type Value } from '../../lib/assessments'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { Badge } from './AssessmentsPage'

type Col = { area: Area; comp: { key: string; name: string; max_marks: number | null } | null }
type Edits = Record<string, Record<string, string>> // student -> cellKey -> raw text
const cellKey = (c: Col) => (c.comp ? `${c.area.id}:${c.comp.key}` : c.area.id)

/** Raw cell text -> error message (client-side check; the server checks again). */
function check(col: Col, raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (col.area.method === 'marks') {
    const n = Number(v)
    const max = col.comp ? col.comp.max_marks : col.area.max_marks
    if (!Number.isFinite(n)) return 'Enter a number'
    if (n < 0) return 'Can’t be negative'
    if (max != null && n > max) return `Out of ${fmt(max)}`
    if (Math.round(n * 10) !== n * 10) return 'One decimal at most'
  }
  return null
}

function rawOf(col: Col, entries: Record<string, Value>): string {
  const v = entries[col.area.id]
  if (v == null) return ''
  if (col.comp) return typeof v === 'object' && v[col.comp.key] != null ? String(v[col.comp.key]) : ''
  return typeof v === 'object' ? '' : String(v)
}

/** Bulk result entry for one class-section (spreadsheet-like, auto-saves). */
export function ResultEntryPage() {
  const { id = '', rowId = '' } = useParams()
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [edits, setEdits] = useState<Edits>({})
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(0)

  useEffect(() => {
    if (!token) return
    assessmentsApi.sheet(id, rowId).then(setSheet, (err) => setError(errorMessage(err)))
  }, [token, id, rowId])

  const cols: Col[] = useMemo(
    () => (sheet?.areas ?? []).flatMap((a): Col[] => (a.components.length ? a.components.map((c) => ({ area: a, comp: c })) : [{ area: a, comp: null }])),
    [sheet?.areas],
  )

  const valueOf = (studentId: string, col: Col) => edits[studentId]?.[cellKey(col)] ?? rawOf(col, sheet?.students.find((s) => s.student_id === studentId)?.entries ?? {})
  const cellError = (studentId: string, col: Col) => check(col, valueOf(studentId, col)) ?? serverErrors[`${studentId}|${col.area.id}`] ?? null
  const badCells = sheet ? sheet.students.reduce((t, s) => t + cols.filter((c) => cellError(s.student_id, c)).length, 0) : 0
  const dirty = Object.values(edits).some((e) => Object.keys(e).length > 0)

  // Auto-save: 1.2 s after the last change, every valid edited cell.
  const save = useCallback(async () => {
    if (!sheet) return
    const payload: EntryPayload[] = []
    const sent: Edits = {}
    for (const [sid, cells] of Object.entries(edits)) {
      const student = sheet.students.find((s) => s.student_id === sid)
      if (!student) continue
      const entries: Record<string, Value> = {}
      for (const area of sheet.areas) {
        const areaCols = cols.filter((c) => c.area.id === area.id)
        const touched = areaCols.filter((c) => cellKey(c) in cells)
        if (!touched.length || areaCols.some((c) => check(c, cells[cellKey(c)] ?? rawOf(c, student.entries)))) continue
        if (area.components.length) {
          const obj: Record<string, string> = {}
          for (const c of areaCols) {
            const v = (cells[cellKey(c)] ?? rawOf(c, student.entries)).trim()
            if (v) obj[c.comp!.key] = v
          }
          entries[area.id] = Object.keys(obj).length ? obj : null
        } else {
          const v = cells[area.id].trim()
          entries[area.id] = v === '' ? null : v
        }
        for (const c of touched) (sent[sid] ??= {})[cellKey(c)] = cells[cellKey(c)]
      }
      if (Object.keys(entries).length) payload.push({ student_id: sid, entries })
    }
    if (!payload.length) return
    const ticket = ++pending.current
    setSaving(true)
    try {
      const next = await assessmentsApi.saveSheet(id, rowId, payload)
      setSheet(next)
      setServerErrors({})
      // drop edits that were saved and not changed again since
      setEdits((cur) => {
        const out: Edits = {}
        for (const [sid, cells] of Object.entries(cur)) {
          const keep = Object.fromEntries(Object.entries(cells).filter(([k, v]) => sent[sid]?.[k] !== v))
          if (Object.keys(keep).length) out[sid] = keep
        }
        return out
      })
      setSavedAt(new Date())
      setError(null)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: { errors?: { student_id: string; area_id: string; message: string }[] } } } }).response?.data?.detail
      if (detail && typeof detail === 'object' && detail.errors) {
        setServerErrors(Object.fromEntries(detail.errors.map((e) => [`${e.student_id}|${e.area_id}`, e.message])))
      } else setError(errorMessage(err))
    } finally {
      if (ticket === pending.current) setSaving(false)
    }
  }, [edits, sheet, cols, id, rowId])

  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => void save(), 1200)
    return () => clearTimeout(t)
  }, [edits, dirty, save])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!token) return <Navigate to="/login" replace />

  const setCell = (sid: string, col: Col, raw: string) => {
    setEdits((e) => ({ ...e, [sid]: { ...e[sid], [cellKey(col)]: raw } }))
    setServerErrors((x) => {
      const k = `${sid}|${col.area.id}`
      if (!(k in x)) return x
      const n = { ...x }
      delete n[k]
      return n
    })
  }
  const fillEmpty = (col: Col, value: string) => {
    if (!sheet || !value) return
    setEdits((e) => {
      const n = { ...e }
      for (const s of sheet.students) if (!valueOf(s.student_id, col)) n[s.student_id] = { ...n[s.student_id], [cellKey(col)]: value }
      return n
    })
  }
  const onKey = (e: KeyboardEvent<HTMLElement>, row: number, col: number) => {
    if (e.key !== 'Enter' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
    e.preventDefault()
    document.querySelector<HTMLElement>(`[data-cell="${row + (e.shiftKey ? -1 : 1)}-${col}"]`)?.focus()
  }

  const students = (sheet?.students ?? []).filter((s) => !q.trim() || `${s.full_name} ${s.student_code} ${s.admission_no ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
  const complete = sheet?.students.filter((s) => s.progress.complete).length ?? 0
  const marksMax = sheet?.areas.filter((a) => a.method === 'marks').reduce((t, a) => t + (a.max_marks ?? 0), 0) ?? 0
  const s = sheet?.section

  async function workflow(fn: () => Promise<unknown>, text: string) {
    setBusy(true)
    setError(null)
    try {
      if (dirty) await save()
      await fn()
      setSheet(await assessmentsApi.sheet(id, rowId))
      setNotice(text)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-4 p-4 pb-0 sm:p-6 sm:pb-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link to={`/assessments/${id}?tab=classes`} className="inline-flex items-center gap-1 text-sm font-bold text-brand">
              <ArrowLeft className="size-4" /> {sheet?.assessment_name ?? 'Assessment'}
            </Link>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-extrabold">
              {s ? `${s.label} results` : 'Results'} {s && <Badge status={s.status} />}
            </h1>
            <p className="text-sm text-muted">
              {sheet ? `${complete} of ${sheet.students.length} students complete` : '…'}
              {s?.teacher_name && ` · Class teacher: ${s.teacher_name}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm" role="status" aria-label="Save status">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin text-brand" /> Saving…
                </>
              ) : badCells ? (
                <span className="flex items-center gap-1.5 font-semibold text-rose-600">
                  <AlertTriangle className="size-4" /> {badCells} cell{badCells === 1 ? '' : 's'} to fix
                </span>
              ) : dirty ? (
                <span className="text-muted">Unsaved…</span>
              ) : savedAt ? (
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <Cloud className="size-4" /> All changes saved
                </span>
              ) : null}
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find student…" aria-label="Find student" className="w-48 rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-brand" />
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}
        {notice && (
          <p role="status" className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> {notice}
            </span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}
        {sheet && !sheet.can_edit && (
          <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink/80 ring-1 ring-line">
            <Lock className="size-4" /> Published — results are read-only. {sheet.section.can_unlock ? 'Unlock the class on the assessment page to correct them.' : 'Ask the school owner to unlock them for corrections.'}
          </p>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
          {!sheet ? (
            <div className="m-4 h-64 animate-pulse rounded-xl bg-slate-100" />
          ) : sheet.students.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted">No students in this class.</p>
          ) : (
            <div className="max-h-[calc(100dvh-20rem)] overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-sm" aria-label="Results">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold text-ink/80">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-56 border-b border-line bg-slate-50 px-3 py-2.5">Student</th>
                    {cols.map((c) => (
                      <th key={cellKey(c)} className="min-w-28 border-b border-l border-line px-2 py-2 align-bottom">
                        <span className="block leading-tight">
                          {c.area.name}
                          {c.area.is_required && <span className="text-rose-500" title="Required"> *</span>}
                        </span>
                        <span className="block font-normal text-muted">
                          {c.comp ? `${c.comp.name}${c.comp.max_marks ? ` /${fmt(c.comp.max_marks)}` : ''}` : c.area.method === 'marks' ? `out of ${fmt(c.area.max_marks)}` : c.area.method === 'observation' ? 'Notes' : c.area.scale?.name}
                        </span>
                        {sheet.can_edit && (c.area.method === 'grade' || c.area.method === 'rating') && (
                          <select value="" onChange={(e) => fillEmpty(c, e.target.value)} aria-label={`Fill empty ${c.area.name}${c.comp ? ` ${c.comp.name}` : ''}`} className="mt-1 w-full rounded-md border border-line bg-white px-1 py-0.5 text-[11px] font-normal">
                            <option value="">Fill empty…</option>
                            {c.area.scale?.items.map((i) => (
                              <option key={i.code} value={i.code}>
                                {c.area.method === 'grade' ? `${i.code} ${i.label}` : i.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </th>
                    ))}
                    {marksMax > 0 && <th className="border-b border-l border-line px-3 py-2.5 text-right">Total /{fmt(marksMax)}</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, r) => (
                    <tr key={st.student_id} aria-label={st.full_name} className="group">
                      <td className="sticky left-0 z-[5] border-b border-line bg-white px-3 py-2 group-hover:bg-slate-50">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={st.full_name} url={st.photo_url} gender={st.gender} size="size-8" />
                          <span className="min-w-0 leading-tight">
                            <Link to={`/assessments/${id}/students/${st.student_id}`} className="block truncate font-bold hover:text-brand">
                              {st.full_name}
                            </Link>
                            <span className="text-xs text-muted">
                              {st.progress.complete ? (
                                <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600">
                                  <Check className="size-3" /> Complete
                                </span>
                              ) : (
                                `${st.progress.required_filled}/${st.progress.required} required`
                              )}
                            </span>
                          </span>
                        </span>
                      </td>
                      {cols.map((c, k) => {
                        const v = valueOf(st.student_id, c)
                        const err = cellError(st.student_id, c)
                        const ring = err ? 'border-rose-400 bg-rose-50' : st.student_id in edits && cellKey(c) in edits[st.student_id] ? 'border-amber-300 bg-amber-50/40' : 'border-transparent'
                        const common = {
                          'data-cell': `${r}-${k}`,
                          'aria-label': `${st.full_name} ${c.area.name}${c.comp ? ` ${c.comp.name}` : ''}`,
                          title: err ?? undefined,
                          onKeyDown: (e: KeyboardEvent<HTMLElement>) => onKey(e, r, k),
                        }
                        return (
                          <td key={cellKey(c)} className="border-b border-l border-line p-1 group-hover:bg-slate-50/60">
                            {!sheet.can_edit ? (
                              <span className="block px-2 py-1.5">{v ? (c.area.method === 'marks' ? v : c.area.scale?.items.find((i) => i.code === v)?.[c.area.method === 'grade' ? 'code' : 'label'] ?? v) : <span className="text-muted">—</span>}</span>
                            ) : c.area.method === 'marks' ? (
                              <input {...common} inputMode="decimal" value={v} onChange={(e) => setCell(st.student_id, c, e.target.value.replace(/[^\d.]/g, ''))} className={`w-full min-w-16 rounded-lg border px-2 py-1.5 text-right font-semibold outline-none focus:border-brand focus:bg-white ${ring}`} />
                            ) : c.area.method === 'observation' ? (
                              <input {...common} value={v} maxLength={1000} onChange={(e) => setCell(st.student_id, c, e.target.value)} placeholder="Add a note…" className={`w-full min-w-48 rounded-lg border px-2 py-1.5 outline-none focus:border-brand focus:bg-white ${ring}`} />
                            ) : (
                              <select {...common} value={v} onChange={(e) => setCell(st.student_id, c, e.target.value)} className={`w-full rounded-lg border px-1.5 py-1.5 font-semibold outline-none focus:border-brand ${ring}`}>
                                <option value="">—</option>
                                {c.area.scale?.items.map((i) => (
                                  <option key={i.code} value={i.code}>
                                    {c.area.method === 'grade' ? i.code : i.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            {err && <span className="block px-1 text-[11px] font-semibold text-rose-600">{err}</span>}
                          </td>
                        )
                      })}
                      {marksMax > 0 && (
                        <td className="border-b border-l border-line px-3 py-2 text-right font-bold whitespace-nowrap group-hover:bg-slate-50/60">
                          {st.progress.score != null ? fmt(st.progress.score) : '—'}
                          {st.progress.percent != null && <span className="block text-xs font-semibold text-muted">{st.progress.percent}%</span>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Workflow footer */}
        {sheet && s && (
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <p className="text-sm text-muted">
              {s.status === 'Open' && 'When everyone’s results are in, mark the class complete so the school can publish them.'}
              {s.status === 'Completed' && (s.can_publish ? 'Results are ready — publish them to lock them and enable progress reports.' : 'Marked complete — waiting for the school to publish.')}
              {s.status === 'Published' && 'Published — progress reports can be generated from Result Reports.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {s.status === 'Open' && sheet.can_edit && (
                <button onClick={() => void workflow(() => assessmentsApi.complete(id, rowId), 'Class marked complete')} disabled={busy || badCells > 0} className="btn-primary px-5 disabled:opacity-60">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Mark class complete
                </button>
              )}
              {s.status === 'Completed' && (
                <>
                  <button onClick={() => void workflow(() => assessmentsApi.reopen(id, rowId), 'Reopened for changes')} disabled={busy} className="btn-outline">
                    <RotateCcw className="size-4" /> Reopen
                  </button>
                  {s.can_publish && (
                    <button onClick={() => void workflow(() => assessmentsApi.publish(id, rowId), 'Published — results are locked')} disabled={busy} className="btn-primary px-5">
                      <BadgeCheck className="size-4" /> Publish results
                    </button>
                  )}
                </>
              )}
              {s.status === 'Published' && (
                <Link to="/assessments?tab=results" className="btn-primary">
                  Result Reports
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
