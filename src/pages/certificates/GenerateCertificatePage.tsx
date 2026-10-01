import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  TriangleAlert,
  Users,
  UserRound,
  X,
} from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { Avatar } from '../../components/students/StudentUi'
import { selectCls } from '../../components/students/StudentTable'
import { PagePreview } from '../../components/ui/PagePreview'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import {
  certificatesApi,
  todayIso,
  useCanIssue,
  type Batch,
  type CertStudent,
  type CertTemplate,
  type Check,
  type Issued,
} from '../../lib/certificates'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { CATEGORY_LABEL, type TemplateCategory } from '../../lib/zapTemplates'

type Mode = 'one' | 'many'
const inputCls = `${selectCls} w-full`

export function GenerateCertificatePage() {
  const token = useAccessToken()
  const canIssue = useCanIssue()
  const options = useSchoolOptions()
  const [params] = useSearchParams()

  const [templates, setTemplates] = useState<CertTemplate[] | null>(null)
  const [templateId, setTemplateId] = useState(params.get('template') ?? '')
  const [mode, setMode] = useState<Mode>('one')
  const [student, setStudent] = useState<CertStudent | null>(null)
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [pool, setPool] = useState<CertStudent[] | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [values, setValues] = useState<Record<string, string>>({})
  const [issueDate, setIssueDate] = useState(todayIso())
  const [check, setCheck] = useState<Check | null>(null)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [preview, setPreview] = useState<{ html: string; serial_no: string } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState<Issued | null>(null)
  const [batch, setBatch] = useState<Batch | null>(null)

  const template = templates?.find((t) => t.id === templateId) ?? null

  useEffect(() => {
    certificatesApi.templates().then(
      (list) => {
        setTemplates(list)
        setTemplateId((id) => (list.some((t) => t.id === id) ? id : ''))
      },
      (err) => setError(errorMessage(err)),
    )
  }, [])

  // ?student=<id> (from a student profile) preselects that student.
  const preset = params.get('student')
  useEffect(() => {
    if (!preset) return
    certificatesApi.students({}).then((all) => setStudent(all.find((s) => s.id === preset) ?? null), () => undefined)
  }, [preset])

  // Class/section mode: load the roster, everyone ticked.
  useEffect(() => {
    if (mode !== 'many' || !classId) return
    let live = true
    certificatesApi.students({ class_id: classId, section_id: sectionId }).then((list) => {
      if (!live) return
      setPool(list)
      setChecked(new Set(list.map((s) => s.id)))
      setPreviewIdx(0)
    }, (err) => live && setError(errorMessage(err)))
    return () => {
      live = false
    }
  }, [mode, classId, sectionId])

  const studentIds = useMemo(
    () => (mode === 'one' ? (student ? [student.id] : []) : (pool ?? []).filter((s) => checked.has(s.id)).map((s) => s.id)),
    [mode, student, pool, checked],
  )
  const selectedStudents = mode === 'one' ? (student ? [student] : []) : (pool ?? []).filter((s) => checked.has(s.id))
  const current = selectedStudents[Math.min(previewIdx, Math.max(0, selectedStudents.length - 1))] ?? null
  const cleanValues = useMemo(() => Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim())), [values])

  // Warnings before generating (debounced).
  const checkKey = JSON.stringify([templateId, studentIds, cleanValues, issueDate])
  useEffect(() => {
    if (!templateId || !studentIds.length) {
      setCheck(null)
      return
    }
    let live = true
    const t = setTimeout(() => {
      certificatesApi.check({ template_id: templateId, student_ids: studentIds, values: cleanValues, issue_date: issueDate }).then(
        (c) => live && setCheck(c),
        () => undefined,
      )
    }, 350)
    return () => {
      live = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkKey])

  // Live preview of the current student (debounced).
  const previewKey = JSON.stringify([templateId, current?.id, cleanValues, issueDate])
  useEffect(() => {
    if (!templateId || !current) {
      setPreview(null)
      return
    }
    let live = true
    setPreviewing(true)
    const t = setTimeout(() => {
      certificatesApi
        .preview({ template_id: templateId, student_id: current.id, values: cleanValues, issue_date: issueDate })
        .then((p) => live && setPreview(p), (err) => live && setError(errorMessage(err)))
        .finally(() => live && setPreviewing(false))
    }, 400)
    return () => {
      live = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey])

  // Follow a bulk run until it's done.
  useEffect(() => {
    if (!batch || batch.status === 'Done' || batch.status === 'Failed') return
    const t = setTimeout(() => certificatesApi.batch(batch.id).then(setBatch, () => undefined), 1200)
    return () => clearTimeout(t)
  }, [batch])

  if (!token) return <Navigate to="/login" replace />
  if (!canIssue && templates) {
    return (
      <AppShell academicYear={options?.activeYear?.name}>
        <div className="p-6">
          <p className="rounded-xl bg-amber-50 px-4 py-3 font-semibold text-amber-800 ring-1 ring-amber-200">Only the school owner or an admin can issue certificates.</p>
        </div>
      </AppShell>
    )
  }

  const fieldProblems = check?.field_problems ?? []
  const done = Boolean(issued || batch)
  const steps = [Boolean(template), studentIds.length > 0, Boolean(template) && fieldProblems.length === 0 && studentIds.length > 0, done]
  const sections = options?.classes.find((c) => c.id === classId)?.sections ?? []

  function reset() {
    setIssued(null)
    setBatch(null)
    setError(null)
    setValues({})
    setIssueDate(todayIso())
  }

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      const out = await certificatesApi.generate({ template_id: templateId, student_ids: studentIds, values: cleanValues, issue_date: issueDate })
      setIssued(out.document)
      setBatch(out.batch)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Link to="/certificates" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
              <ArrowLeft className="size-4" /> Certificates
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Generate Certificate</h1>
            <p className="mt-0.5">Create certificates for one student or a whole class using your templates.</p>
          </div>
          <ol className="flex items-start gap-2" aria-label="Progress">
            {['Select Certificate', 'Select Student', 'Additional Information', 'Preview & Generate'].map((label, i) => (
              <li key={label} className="flex w-24 flex-col items-center text-center text-xs font-semibold sm:w-28">
                <span className={`grid size-8 place-items-center rounded-full text-sm font-bold ring-2 ${steps[i] ? 'bg-brand text-white ring-brand' : 'bg-white text-muted ring-line'}`}>
                  {steps[i] ? <CheckCircle2 className="size-4" /> : i + 1}
                </span>
                <span className={`mt-1 ${steps[i] ? 'text-ink' : 'text-muted'}`}>{label}</span>
              </li>
            ))}
          </ol>
        </div>

        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,34rem)_1fr]">
          {/* ---------------- left: the form ---------------- */}
          <div className="space-y-4">
            <Step n={1} title="Select Certificate" ok={steps[0]}>
              <select aria-label="Certificate type" value={templateId} onChange={(e) => (setTemplateId(e.target.value), setValues({}), reset())} className={inputCls} disabled={!templates}>
                <option value="">{templates ? 'Choose a certificate…' : 'Loading…'}</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.custom ? ' (your school)' : ''}
                  </option>
                ))}
              </select>
              {template?.description && (
                <p className="mt-2 flex gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-sm text-ink/80 ring-1 ring-sky-100">
                  <Info className="mt-0.5 size-4 shrink-0 text-brand" /> {template.description}
                </p>
              )}
              {templates && templates.length === 0 && <p className="mt-2 text-sm text-muted">No certificate templates are available yet.</p>}
            </Step>

            <Step n={2} title="Select Student" ok={steps[1]}>
              <div className="mb-3 flex gap-2">
                {(
                  [
                    ['one', 'One student', UserRound],
                    ['many', 'Class / section', Users],
                  ] as const
                ).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => (setMode(m), setPreviewIdx(0), reset())}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 ${mode === m ? 'bg-sky-50 text-brand ring-brand' : 'ring-line hover:bg-slate-50'}`}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
              {mode === 'one' ? (
                <StudentPicker value={student} onChange={(s) => (setStudent(s), reset())} />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select aria-label="Class" value={classId} onChange={(e) => (setClassId(e.target.value), setSectionId(''), setPool(null), reset())} className={inputCls}>
                      <option value="">Choose class…</option>
                      {options?.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select aria-label="Section" value={sectionId} onChange={(e) => (setSectionId(e.target.value), reset())} disabled={!classId} className={`${inputCls} disabled:bg-slate-50`}>
                      <option value="">All sections</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {pool && (
                    <div className="rounded-xl ring-1 ring-line">
                      <div className="flex items-center justify-between border-b border-line px-3 py-2 text-sm">
                        <span className="font-bold">
                          {checked.size} of {pool.length} selected
                        </span>
                        <span className="flex gap-3 text-xs font-bold text-brand">
                          <button type="button" onClick={() => setChecked(new Set(pool.map((s) => s.id)))}>
                            Select all
                          </button>
                          <button type="button" onClick={() => setChecked(new Set())}>
                            Clear
                          </button>
                        </span>
                      </div>
                      <ul className="max-h-56 overflow-auto p-1.5">
                        {pool.map((s) => (
                          <li key={s.id}>
                            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                className="size-4 accent-brand"
                                checked={checked.has(s.id)}
                                aria-label={s.full_name}
                                onChange={(e) =>
                                  setChecked((prev) => {
                                    const next = new Set(prev)
                                    if (e.target.checked) next.add(s.id)
                                    else next.delete(s.id)
                                    return next
                                  })
                                }
                              />
                              <Avatar name={s.full_name} url={s.photo_url} gender={s.gender} size="size-7 text-xs" />
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.full_name}</span>
                              <span className="text-xs text-muted">{s.section_name ?? ''}</span>
                            </label>
                          </li>
                        ))}
                        {pool.length === 0 && <li className="px-2 py-3 text-sm text-muted">No active students in this class.</li>}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Step>

            <Step n={3} title="Additional Information" ok={steps[2]}>
              {!template ? (
                <p className="text-sm text-muted">Choose a certificate first.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-ink">
                    Issue date <span className="text-rose-500">*</span>
                    <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={`${inputCls} mt-1 font-normal`} aria-label="Issue date" />
                  </label>
                  {template.fields.map((f) => (
                    <label key={f.key} className={`block text-sm font-bold text-ink ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                      {f.label} {f.required ? <span className="text-rose-500">*</span> : <span className="font-normal text-muted">(optional)</span>}
                      <FieldInput field={f} value={values[f.key] ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))} />
                    </label>
                  ))}
                </div>
              )}
            </Step>

            {check && (check.field_problems.length > 0 || check.school_missing.length > 0 || check.students_missing.length > 0) && (
              <section className="space-y-2 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60" aria-label="Before you generate">
                <p className="font-bold">Before you generate</p>
                {check.field_problems.map((p) => (
                  <p key={p} className="flex items-center gap-2 text-sm font-semibold text-rose-600">
                    <CircleAlert className="size-4 shrink-0" /> {p}
                  </p>
                ))}
                {check.school_missing.length > 0 && (
                  <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>
                      This certificate uses your school's <b>{check.school_missing.map((m) => m.replace(' (image URL)', '')).join(', ')}</b>, which{' '}
                      {check.school_missing.length === 1 ? "isn't" : "aren't"} set yet.{' '}
                      <Link to="/settings?tab=certificate" className="font-bold text-brand underline">
                        Add in Settings
                      </Link>
                    </span>
                  </p>
                )}
                {check.students_missing.length > 0 && (
                  <details className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                    <summary className="cursor-pointer font-semibold">
                      {check.students_missing.length} student{check.students_missing.length === 1 ? ' has' : 's have'} missing details (left blank on the certificate)
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {check.students_missing.map((s) => (
                        <li key={s.id}>
                          <Link to={`/students/${s.id}/edit`} className="font-bold text-brand underline">
                            {s.full_name}
                          </Link>
                          : {s.missing.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => (reset(), setStudent(null), setPool(null), setClassId(''), setSectionId(''))} className="btn-outline border-line text-ink">
                <RotateCcw className="size-4" /> Reset
              </button>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={busy || done || !template || !studentIds.length || fieldProblems.length > 0}
                className="btn-primary flex-1 justify-center py-3 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                {studentIds.length > 1 ? `Generate ${studentIds.length} Certificates` : 'Generate PDF'}
              </button>
            </div>
          </div>

          {/* ---------------- right: preview / result ---------------- */}
          <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 xl:sticky xl:top-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-bold">
                <FileText className="size-5 text-brand" /> Certificate Preview
                {previewing && <Loader2 className="size-4 animate-spin text-muted" />}
              </h2>
              {selectedStudents.length > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={() => setPreviewIdx((i) => Math.max(0, i - 1))} disabled={previewIdx === 0} className="grid size-8 place-items-center rounded-lg ring-1 ring-line disabled:opacity-40" aria-label="Previous student">
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="font-semibold">
                    {Math.min(previewIdx, selectedStudents.length - 1) + 1} / {selectedStudents.length}
                  </span>
                  <button
                    onClick={() => setPreviewIdx((i) => Math.min(selectedStudents.length - 1, i + 1))}
                    disabled={previewIdx >= selectedStudents.length - 1}
                    className="grid size-8 place-items-center rounded-lg ring-1 ring-line disabled:opacity-40"
                    aria-label="Next student"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {issued || batch ? (
              <Result issued={issued} batch={batch} onAnother={reset} />
            ) : template && current ? (
              <>
                <div className="rounded-xl bg-slate-100 p-4">
                  <PagePreview
                    html={preview?.html ?? null}
                    paper={template.paper}
                    orientation={template.orientation}
                    title="Certificate preview"
                    className={template.orientation === 'landscape' ? 'w-full' : 'mx-auto w-full max-w-xl'}
                  />
                </div>
                <p className="text-xs text-muted">
                  {current.full_name} · {CATEGORY_LABEL[template.category as TemplateCategory] ?? template.category} · next number{' '}
                  <b className="font-mono">{preview?.serial_no ?? check?.next_serial ?? '…'}</b> (assigned when you generate)
                </p>
              </>
            ) : (
              <div className="grid h-80 place-items-center rounded-xl bg-slate-50 text-center text-muted">
                <div>
                  <FileText className="mx-auto size-10" />
                  <p className="mt-2 font-semibold">{!template ? 'Choose a certificate' : 'Choose a student'} to see the preview</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  )
}

function Step({ n, title, ok, children }: { n: number; title: string; ok: boolean; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60" aria-label={title}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <span className="grid size-7 place-items-center rounded-full bg-brand text-sm text-white">{n}</span> {title}
        </h2>
        {ok && <CheckCircle2 className="size-5 text-emerald-500" />}
      </div>
      {children}
    </section>
  )
}

function FieldInput({ field, value, onChange }: { field: CertTemplate['fields'][number]; value: string; onChange: (v: string) => void }) {
  const cls = `${inputCls} mt-1 font-normal`
  if (field.type === 'select')
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cls} aria-label={field.label}>
        <option value="">Choose…</option>
        {field.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    )
  if (field.type === 'textarea')
    return <textarea rows={3} maxLength={500} value={value} placeholder={field.placeholder ?? ''} onChange={(e) => onChange(e.target.value)} className={`${cls} resize-none`} aria-label={field.label} />
  return (
    <input
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      maxLength={500}
      value={value}
      placeholder={field.placeholder ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={cls}
      aria-label={field.label}
    />
  )
}

function StudentPicker({ value, onChange }: { value: CertStudent | null; onChange: (s: CertStudent | null) => void }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<CertStudent[]>([])
  useEffect(() => {
    if (value) return
    let live = true
    const t = setTimeout(() => {
      certificatesApi.students({ q: q.trim() }).then((list) => live && setItems(list.slice(0, 6)), () => undefined)
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q, value])

  if (value)
    return (
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-line">
        <Avatar name={value.full_name} url={value.photo_url} gender={value.gender} size="size-10" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-bold">
            {value.full_name} <span className="font-normal text-muted">({value.student_code})</span>
          </p>
          <p className="text-xs text-muted">
            Class: {value.class_name ?? '—'} · Section: {value.section_name ?? '—'} · Admission No: {value.admission_no}
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-bold text-brand">
          Change
        </button>
      </div>
    )
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, ID or admission number…" aria-label="Search student" className={`${inputCls} pl-9`} />
      </div>
      <ul className="mt-2 space-y-0.5">
        {items.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onChange(s)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
              <Avatar name={s.full_name} url={s.photo_url} gender={s.gender} size="size-8" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.full_name}</span>
              <span className="text-xs text-muted">{[s.class_name, s.section_name].filter(Boolean).join(' - ')}</span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="px-2 py-2 text-sm text-muted">No students found</li>}
      </ul>
    </div>
  )
}

function Result({ issued, batch, onAnother }: { issued: Issued | null; batch: Batch | null; onAnother: () => void }) {
  if (issued)
    return (
      <div className="rounded-xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200" role="status">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <p className="mt-2 text-lg font-extrabold text-emerald-800">Certificate generated</p>
        <p className="text-sm text-emerald-900">
          {issued.template_name} for <b>{issued.student_name}</b> · <span className="font-mono font-bold">{issued.serial_no}</span>
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {issued.download_url && (
            <a href={issued.download_url} className="btn-primary">
              <Download className="size-4" /> Download PDF
            </a>
          )}
          {issued.view_url && (
            <a href={issued.view_url} target="_blank" rel="noreferrer" className="btn-outline">
              <ExternalLink className="size-4" /> Open & print
            </a>
          )}
          <button onClick={onAnother} className="btn-outline border-line text-ink">
            Issue another
          </button>
        </div>
        <p className="mt-3 text-xs text-emerald-900/70">{issued.file_name}</p>
      </div>
    )
  if (!batch) return null
  const pct = Math.round(((batch.done + batch.failed) / Math.max(1, batch.total)) * 100)
  const finished = batch.status === 'Done' || batch.status === 'Failed'
  return (
    <div className={`rounded-xl p-6 ring-1 ${batch.status === 'Failed' ? 'bg-rose-50 ring-rose-200' : 'bg-sky-50 ring-sky-200'}`} role="status" aria-label="Bulk progress">
      <p className="text-lg font-extrabold">
        {batch.status === 'Done' ? 'All done!' : batch.status === 'Failed' ? "Couldn't generate the certificates" : batch.status === 'Queued' ? 'Starting…' : 'Generating certificates…'}
      </p>
      <p className="text-sm">
        {batch.done} of {batch.total} ready{batch.failed ? ` · ${batch.failed} failed` : ''}
      </p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white ring-1 ring-line">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
      {batch.error && <p className="mt-2 text-sm font-semibold text-rose-700">{batch.error}</p>}
      {finished && (
        <div className="mt-4 flex flex-wrap gap-2">
          {batch.zip_url && (
            <a href={batch.zip_url} className="btn-primary">
              <Download className="size-4" /> Download ZIP ({batch.done})
            </a>
          )}
          <Link to={`/certificates?tab=issued&batch=${batch.id}`} className="btn-outline">
            See them in the register
          </Link>
          <button onClick={onAnother} className="btn-outline border-line text-ink">
            Issue more
          </button>
        </div>
      )}
      {finished && batch.zip_name && <p className="mt-3 text-xs text-muted">{batch.zip_name}</p>}
    </div>
  )
}
