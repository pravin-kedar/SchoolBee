import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Copy, FilePlus2, LayoutTemplate, Loader2, Sparkles } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { METHOD_LABEL, assessmentsApi, type AssessmentRow, type Meta } from '../../lib/assessments'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'

const inputCls = `${selectCls} mt-1 w-full font-normal`
type Source = { kind: 'starter' | 'template' | 'copy' | 'blank'; id: string }

/** Step 1 of setting up an assessment: basics, classes, what to start from. */
export function NewAssessmentPage() {
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [previous, setPrevious] = useState<AssessmentRow[]>([])
  const [f, setF] = useState({ name: '', academic_year_id: '', start_date: '', end_date: '', description: '', class_ids: [] as string[] })
  const [source, setSource] = useState<Source>({ kind: 'starter', id: 'preschool-development' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    assessmentsApi.meta().then(
      (m) => {
        setMeta(m)
        setF((x) => ({ ...x, academic_year_id: m.years.find((y) => y.is_active)?.id ?? m.years[0]?.id ?? '', class_ids: m.classes.map((c) => c.id) }))
      },
      (err) => setError(errorMessage(err)),
    )
    assessmentsApi.list().then((d) => setPrevious(d.items), () => undefined)
  }, [token])

  if (!token) return <Navigate to="/login" replace />

  const toggle = (id: string) => setF((x) => ({ ...x, class_ids: x.class_ids.includes(id) ? x.class_ids.filter((c) => c !== id) : [...x.class_ids, id] }))
  const ok = f.name.trim().length >= 2 && f.academic_year_id && f.class_ids.length > 0 && !(f.start_date && f.end_date && f.end_date < f.start_date)

  async function create() {
    setBusy(true)
    setError(null)
    try {
      const a = await assessmentsApi.create({
        name: f.name.trim(),
        academic_year_id: f.academic_year_id,
        description: f.description.trim() || null,
        start_date: f.start_date || null,
        end_date: f.end_date || null,
        class_ids: f.class_ids,
        ...(source.kind === 'starter' ? { starter_key: source.id } : source.kind === 'template' ? { template_id: source.id } : source.kind === 'copy' ? { copy_from_id: source.id } : {}),
      })
      navigate(`/assessments/${a.id}?new=1`, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  const card = (s: Source, title: string, text: string, Icon: typeof Sparkles) => {
    const on = source.kind === s.kind && source.id === s.id
    return (
      <button key={`${s.kind}-${s.id}`} type="button" aria-pressed={on} onClick={() => setSource(s)} className={`flex w-full items-start gap-3 rounded-xl p-3.5 text-left ring-1 transition ${on ? 'bg-sky-50 ring-2 ring-brand' : 'ring-line hover:bg-slate-50'}`}>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${on ? 'bg-brand text-white' : 'bg-slate-100 text-ink/70'}`}>{on ? <Check className="size-5" /> : <Icon className="size-5" />}</span>
        <span className="min-w-0">
          <span className="block font-bold">{title}</span>
          <span className="block text-xs text-muted">{text}</span>
        </span>
      </button>
    )
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <div>
          <Link to="/assessments" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
            <ArrowLeft className="size-4" /> Assessments
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">New assessment</h1>
          <p className="mt-0.5">Name it, pick the classes, and start from a ready template — you can change everything on the next screen.</p>
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
        {!meta ? (
          !error && <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <div className="space-y-5">
              <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Basic information">
                <h2 className="mb-3 text-lg font-bold">1 · Basic information</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold sm:col-span-2">
                    Assessment name *
                    <input autoFocus value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Term 1 Assessment" aria-label="Assessment name" className={inputCls} />
                  </label>
                  <label className="block text-sm font-bold">
                    Academic year *
                    <select value={f.academic_year_id} onChange={(e) => setF({ ...f, academic_year_id: e.target.value })} aria-label="Academic year" className={inputCls}>
                      {meta.years.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="hidden sm:block" />
                  <label className="block text-sm font-bold">
                    From <span className="font-normal text-muted">(optional)</span>
                    <input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} aria-label="Start date" className={inputCls} />
                  </label>
                  <label className="block text-sm font-bold">
                    To <span className="font-normal text-muted">(optional)</span>
                    <input type="date" value={f.end_date} min={f.start_date || undefined} onChange={(e) => setF({ ...f, end_date: e.target.value })} aria-label="End date" className={inputCls} />
                  </label>
                  <p className="text-xs text-muted sm:col-span-2">With dates, the progress report also shows each child’s attendance for this period.</p>
                  <label className="block text-sm font-bold sm:col-span-2">
                    Notes <span className="font-normal text-muted">(optional, internal)</span>
                    <textarea rows={2} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Notes" className={`${inputCls} resize-none`} />
                  </label>
                </div>
              </section>
              <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Classes">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">2 · Classes</h2>
                  <button type="button" onClick={() => setF({ ...f, class_ids: f.class_ids.length === meta.classes.length ? [] : meta.classes.map((c) => c.id) })} className="text-sm font-bold text-brand">
                    {f.class_ids.length === meta.classes.length ? 'Clear' : 'Select all'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meta.classes.map((c) => {
                    const on = f.class_ids.includes(c.id)
                    return (
                      <button key={c.id} type="button" aria-pressed={on} onClick={() => toggle(c.id)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${on ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}>
                        {on && <Check className="size-4" />} {c.name}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">All chosen classes share the same areas; you can give a class its own list later.</p>
              </section>
            </div>
            <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Start from">
              <h2 className="mb-3 text-lg font-bold">3 · Start from</h2>
              <div className="space-y-2">
                {meta.starters.map((s) =>
                  card({ kind: 'starter', id: s.key }, s.name, s.areas.map((a) => `${a.name} (${METHOD_LABEL[a.method].toLowerCase()})`).join(' · '), Sparkles),
                )}
                {meta.templates.map((t) => card({ kind: 'template', id: t.id }, t.name, `Your template · ${t.areas.map((a) => a.name).join(', ')}`, LayoutTemplate))}
                {previous.length > 0 && (
                  <div className={`rounded-xl p-3.5 ring-1 ${source.kind === 'copy' ? 'bg-sky-50 ring-2 ring-brand' : 'ring-line'}`}>
                    <p className="flex items-center gap-2 font-bold">
                      <Copy className="size-4" /> Copy an earlier assessment
                    </p>
                    <select
                      value={source.kind === 'copy' ? source.id : ''}
                      onChange={(e) => e.target.value && setSource({ kind: 'copy', id: e.target.value })}
                      aria-label="Copy from"
                      className={`${inputCls} bg-white`}
                    >
                      <option value="">Choose… (e.g. Term 1 for Term 2)</option>
                      {previous.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} · {a.academic_year}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {card({ kind: 'blank', id: '' }, 'Start blank', 'Add every area yourself.', FilePlus2)}
              </div>
              <button onClick={() => void create()} disabled={!ok || busy} className="btn-primary mt-5 w-full justify-center py-3 disabled:opacity-60">
                {busy && <Loader2 className="size-5 animate-spin" />} Create & set up areas
              </button>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  )
}
