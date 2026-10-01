import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, School, Users, X } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { ChargeFields } from '../../components/fees/ChargeFields'
import { StudentChecklist } from '../../components/fees/StudentChecklist'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { certificatesApi, type CertStudent } from '../../lib/certificates'
import { CLASS_PRESETS, chargesApi, draftProblem, inr, toCharge, type ChargeDraft } from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'

/** class_id -> null (every section) or the set of picked section ids */
type ClassPick = Map<string, Set<string> | null>

export function NewChargePage() {
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const [params] = useSearchParams()
  const yearId = params.get('year') ?? undefined
  const [draft, setDraft] = useState<ChargeDraft>({ name: '', category: 'Event', amount: '', due_date: '', description: '' })
  const [mode, setMode] = useState<'classes' | 'students'>('classes')
  const [picked, setPicked] = useState<ClassPick>(new Map())
  const [studentIds, setStudentIds] = useState<Set<string>>(new Set())
  const [students, setStudents] = useState<CertStudent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    certificatesApi.students({}).then(setStudents, (err) => setError(errorMessage(err)))
  }, [])

  const count = useMemo(() => {
    if (mode === 'students') return studentIds.size
    return students.filter((s) => {
      if (!s.class_id || !picked.has(s.class_id)) return false
      const secs = picked.get(s.class_id)
      return secs === null || (s.section_id !== null && secs!.has(s.section_id))
    }).length
  }, [mode, studentIds, students, picked])

  if (!token) return <Navigate to="/login" replace />

  function toggleClass(id: string, on: boolean) {
    setPicked((prev) => {
      const next = new Map(prev)
      if (on) next.set(id, null)
      else next.delete(id)
      return next
    })
  }
  function toggleSection(classId: string, sectionId: string | null) {
    setPicked((prev) => {
      const next = new Map(prev)
      if (sectionId === null) next.set(classId, null)
      else {
        const secs = new Set(prev.get(classId) ?? [])
        if (secs.has(sectionId)) secs.delete(sectionId)
        else secs.add(sectionId)
        next.set(classId, secs.size ? secs : null)
      }
      return next
    })
  }

  const problem = draftProblem(draft) ?? (count === 0 ? (mode === 'classes' ? 'Pick at least one class' : 'Pick at least one student') : null)

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const target =
        mode === 'classes'
          ? {
              mode: 'classes' as const,
              classes: [...picked.entries()].flatMap(([class_id, secs]): { class_id: string; section_id: string | null }[] =>
                secs === null ? [{ class_id, section_id: null }] : [...secs].map((section_id) => ({ class_id, section_id })),
              ),
            }
          : { mode: 'students' as const, student_ids: [...studentIds] }
      const c = await chargesApi.create({ ...toCharge(draft), target }, yearId)
      navigate(`/fees/charges/${c.id}`, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <div>
          <Link to={`/fees?tab=charges${yearId ? `&year=${yearId}` : ''}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand">
            <ArrowLeft className="size-4" /> Additional charges
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">New charge</h1>
          <p className="mt-0.5">A one-off fee for an event, exam, trip or material — added to each chosen student's dues.</p>
        </div>

        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Charge details">
            <h2 className="mb-4 text-lg font-bold">1. What is it for?</h2>
            <ChargeFields draft={draft} onChange={setDraft} presets={CLASS_PRESETS} />
          </section>

          <section className="space-y-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Who pays">
            <h2 className="text-lg font-bold">2. Who pays?</h2>
            <div className="flex gap-2">
              {(
                [
                  ['classes', 'Classes / sections', School],
                  ['students', 'Selected students', Users],
                ] as const
              ).map(([m, label, Icon]) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 ${mode === m ? 'bg-sky-50 text-brand ring-brand' : 'ring-line hover:bg-slate-50'}`}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            {mode === 'classes' ? (
              <ul className="space-y-2">
                {options?.classes.map((c) => {
                  const on = picked.has(c.id)
                  const secs = picked.get(c.id)
                  return (
                    <li key={c.id} className={`rounded-xl p-3 ring-1 ${on ? 'bg-sky-50/50 ring-brand/40' : 'ring-line'}`}>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input type="checkbox" className="size-4 accent-brand" checked={on} onChange={(e) => toggleClass(c.id, e.target.checked)} aria-label={`Class ${c.name}`} />
                        <span className="flex-1 font-bold">{c.name}</span>
                        <span className="text-xs text-muted">{students.filter((s) => s.class_id === c.id).length} students</span>
                      </label>
                      {on && c.sections.length > 1 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                          <button type="button" onClick={() => toggleSection(c.id, null)} aria-pressed={secs === null} className={`rounded-full px-3 py-0.5 text-xs font-bold ring-1 ${secs === null ? 'bg-brand text-white ring-brand' : 'ring-line'}`}>
                            All sections
                          </button>
                          {c.sections.map((sec) => (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => toggleSection(c.id, sec.id)}
                              aria-pressed={Boolean(secs?.has(sec.id))}
                              className={`rounded-full px-3 py-0.5 text-xs font-bold ring-1 ${secs?.has(sec.id) ? 'bg-brand text-white ring-brand' : 'ring-line'}`}
                            >
                              Section {sec.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <StudentChecklist students={students} classes={options?.classes ?? []} selected={studentIds} onChange={setStudentIds} />
            )}

            <div className="rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-line">
              <p className="text-muted">{mode === 'classes' ? 'Everyone active in these classes (you can waive it for some later)' : 'Only the students you ticked'}</p>
              <p className="font-display text-xl font-extrabold" aria-label="Charge total">
                {inr(Number(draft.amount) || 0)} × {count} student{count === 1 ? '' : 's'} = {inr((Number(draft.amount) || 0) * count)}
              </p>
            </div>
            <button onClick={() => void create()} disabled={busy || Boolean(problem)} className="btn-primary w-full justify-center py-3 disabled:opacity-60">
              {busy && <Loader2 className="size-4 animate-spin" />} {problem ?? `Create charge for ${count} student${count === 1 ? '' : 's'}`}
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
