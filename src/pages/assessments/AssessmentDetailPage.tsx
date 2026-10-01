import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  CheckCircle2,
  Download,
  Lock,
  LockOpen,
  NotebookPen,
  Pencil,
  Play,
  Plus,
  Save,
  Split,
  Trash2,
  X,
} from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { selectCls } from '../../components/students/StudentTable'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import {
  METHOD_HINT,
  METHOD_LABEL,
  assessmentsApi,
  emptyArea,
  fmt,
  toInput,
  type Assessment,
  type AreaInput,
  type Batch,
  type Meta,
  type Method,
  type SectionRow,
} from '../../lib/assessments'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { Badge, Bar } from './AssessmentsPage'

const inputCls = `${selectCls} w-full`
const METHODS: Method[] = ['marks', 'grade', 'rating', 'observation']

/** One assessment: its areas (structure) and every class's result workflow. */
export function AssessmentDetailPage() {
  const { id = '' } = useParams()
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [a, setA] = useState<Assessment | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [templating, setTemplating] = useState(false)

  useEffect(() => {
    if (!token) return
    assessmentsApi.get(id).then(setA, (err) => setError(errorMessage(err)))
    assessmentsApi.meta().then(setMeta, () => undefined)
  }, [token, id])

  if (!token) return <Navigate to="/login" replace />
  const tab = params.get('tab') ?? (a?.status === 'Active' ? 'classes' : 'areas')
  const setTab = (t: string) => setParams({ tab: t }, { replace: true })

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <Link to="/assessments" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
          <ArrowLeft className="size-4" /> Assessments
        </Link>
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
        {!a ? (
          !error && <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
              <div className="min-w-0">
                <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold">
                  {a.name} <Badge status={a.status} />
                </h1>
                <p className="text-sm text-muted">
                  Academic Year {a.academic_year} · {a.classes.map((c) => c.name).join(', ')}
                  {a.start_date && ` · ${new Date(`${a.start_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${a.end_date ? ` – ${new Date(`${a.end_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`}
                </p>
                {a.description && <p className="mt-1 text-sm">{a.description}</p>}
              </div>
              {a.can_manage && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEditing(true)} className="btn-outline py-2 text-sm">
                    <Pencil className="size-4" /> Details & classes
                  </button>
                  <button onClick={() => setTemplating(true)} disabled={!a.areas.length} className="btn-outline py-2 text-sm">
                    Save as template
                  </button>
                  {!a.areas.some((x) => x.has_results) && (
                    <button onClick={() => setDeleting(true)} className="btn-outline border-rose-200 py-2 text-sm text-rose-600">
                      <Trash2 className="size-4" /> Delete
                    </button>
                  )}
                </div>
              )}
            </section>

            {a.status === 'Draft' && a.can_manage && (
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
                <p className="text-sm text-amber-900">
                  <b>Almost there.</b> Check the areas below (what you’ll evaluate and how), then start result entry — class teachers can then enter results.
                </p>
                <button
                  onClick={async () => {
                    setError(null)
                    try {
                      setA(await assessmentsApi.start(a.id))
                      setTab('classes')
                      setNotice('Result entry started — class teachers can now enter results')
                    } catch (err) {
                      setError(errorMessage(err))
                    }
                  }}
                  className="btn-primary"
                >
                  <Play className="size-4" /> Start result entry
                </button>
              </section>
            )}

            <div className="flex overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
              {(
                [
                  ['areas', `Areas (${new Set(a.areas.map((x) => x.name)).size})`],
                  ['classes', 'Classes & Results'],
                ] as const
              ).map(([key, label]) => (
                <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap ${tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'areas' && meta && <AreasTab a={a} meta={meta} onChange={setA} onError={setError} onNotice={setNotice} />}
            {tab === 'classes' && <ClassesTab a={a} onChange={setA} onError={setError} onNotice={setNotice} />}
          </>
        )}
      </div>

      {editing && a && meta && <DetailsDialog a={a} meta={meta} onClose={() => setEditing(false)} onSaved={(x) => (setA(x), setNotice('Details saved'))} />}
      {deleting && a && (
        <Dialog
          title={`Delete “${a.name}”?`}
          subtitle="Its areas and set-up are removed. (Assessments with results can’t be deleted.)"
          submitLabel="Delete"
          danger
          onClose={() => setDeleting(false)}
          onSubmit={async () => {
            await assessmentsApi.remove(a.id)
            navigate('/assessments', { replace: true })
          }}
        />
      )}
      {templating && a && <TemplateDialog a={a} onClose={() => setTemplating(false)} onSaved={() => setNotice('Saved as a template — pick it when you create the next assessment')} />}
    </AppShell>
  )
}

// ------------------------------------------------------------------ areas

function AreasTab({ a, meta, onChange, onError, onNotice }: { a: Assessment; meta: Meta; onChange: (a: Assessment) => void; onError: (m: string | null) => void; onNotice: (m: string) => void }) {
  const [scope, setScope] = useState<string | null>(null) // null = shared
  const customised = new Set(a.classes.filter((c) => c.customised).map((c) => c.id))
  const scopeAreas = useMemo(() => a.areas.filter((x) => x.class_id === scope).sort((x, y) => x.sort_order - y.sort_order), [a.areas, scope])
  const usesShared = a.classes.filter((c) => !c.customised)
  const editable = a.can_manage && (scope === null || customised.has(scope))
  const published = new Set(a.sections.filter((s) => s.status === 'Published').map((s) => s.class_id))
  const locked = scope ? published.has(scope) : usesShared.some((c) => published.has(c.id))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-card ring-1 ring-line/60" role="group" aria-label="Areas for">
        <span className="px-1 text-sm font-bold text-muted">Areas for:</span>
        <button onClick={() => setScope(null)} aria-pressed={scope === null} className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${scope === null ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}>
          All classes {usesShared.length < a.classes.length && `(${usesShared.map((c) => c.name).join(', ') || 'none'})`}
        </button>
        {a.classes.map((c) => (
          <button key={c.id} onClick={() => setScope(c.id)} aria-pressed={scope === c.id} className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${scope === c.id ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}>
            {c.name} {c.customised ? '· own list' : ''}
          </button>
        ))}
      </div>

      {scope && !customised.has(scope) ? (
        <section className="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-line/60">
          <p className="font-bold">{a.classes.find((c) => c.id === scope)?.name} uses the shared areas.</p>
          <p className="mt-1 text-sm text-muted">Give it its own list if it’s evaluated differently (e.g. Play Group on development areas, UKG on subjects).</p>
          {a.can_manage && (
            <button
              onClick={async () => {
                onError(null)
                try {
                  onChange(await assessmentsApi.customise(a.id, scope))
                } catch (err) {
                  onError(errorMessage(err))
                }
              }}
              className="btn-primary mt-4"
            >
              <Split className="size-4" /> Give {a.classes.find((c) => c.id === scope)?.name} its own areas
            </button>
          )}
        </section>
      ) : (
        <AreaEditor
          key={`${scope}-${a.areas.map((x) => x.id + x.name + x.sort_order).join()}`}
          initial={scopeAreas.map(toInput)}
          hasResults={new Set(scopeAreas.filter((x) => x.has_results).map((x) => x.id))}
          meta={meta}
          editable={editable && !locked}
          lockedReason={locked ? 'Results are published for these classes — unlock them to change the areas.' : null}
          onSave={async (areas) => {
            onError(null)
            try {
              onChange(await assessmentsApi.saveAreas(a.id, scope, areas))
              onNotice('Areas saved')
            } catch (err) {
              onError(errorMessage(err))
            }
          }}
          extra={
            scope && a.can_manage ? (
              <button
                onClick={async () => {
                  onError(null)
                  try {
                    onChange(await assessmentsApi.uncustomise(a.id, scope))
                    setScope(null)
                  } catch (err) {
                    onError(errorMessage(err))
                  }
                }}
                className="text-sm font-bold text-brand"
              >
                Use the shared areas again
              </button>
            ) : null
          }
        />
      )}
    </div>
  )
}

function AreaEditor({
  initial,
  hasResults,
  meta,
  editable,
  lockedReason,
  onSave,
  extra,
}: {
  initial: AreaInput[]
  hasResults: Set<string>
  meta: Meta
  editable: boolean
  lockedReason: string | null
  onSave: (areas: AreaInput[]) => Promise<void>
  extra?: React.ReactNode
}) {
  const [areas, setAreas] = useState<AreaInput[]>(initial)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(areas) !== JSON.stringify(initial)
  const set = (i: number, patch: Partial<AreaInput>) => setAreas((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, by: number) =>
    setAreas((xs) => {
      const n = [...xs]
      const [x] = n.splice(i, 1)
      n.splice(i + by, 0, x)
      return n
    })
  const problems = areas
    .map((x) => {
      if (!x.name.trim()) return 'Every area needs a name'
      if (x.method === 'marks' && !x.components.length && !(Number(x.max_marks) > 0)) return `Give ${x.name} its maximum marks`
      if (x.method === 'marks' && x.components.some((c) => !c.name.trim() || !(Number(c.max_marks) > 0))) return `Name each part of ${x.name} and give it maximum marks`
      if ((x.method === 'grade' || x.method === 'rating') && !x.scale_id) return `Pick a scale for ${x.name}`
      return null
    })
    .filter(Boolean)
  const total = areas.filter((x) => x.method === 'marks').reduce((t, x) => t + (x.components.length ? x.components.reduce((s, c) => s + (Number(c.max_marks) || 0), 0) : Number(x.max_marks) || 0), 0)

  return (
    <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5" aria-label="Areas">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">What will be evaluated?</h2>
          <p className="text-sm text-muted">
            {areas.length} area{areas.length === 1 ? '' : 's'}
            {total > 0 && ` · marks total ${fmt(total)} (percentage only covers marks)`}
          </p>
        </div>
        {extra}
      </div>
      {lockedReason && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-muted ring-1 ring-line">
          <Lock className="size-4" /> {lockedReason}
        </p>
      )}
      {areas.length === 0 && <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-muted">No areas yet — add the first one below.</p>}
      <ol className="space-y-3">
        {areas.map((x, i) => {
          const used = Boolean(x.id && hasResults.has(x.id))
          const scales = meta.scales.filter((s) => s.kind === x.method)
          const scale = meta.scales.find((s) => s.id === x.scale_id)
          return (
            <li key={x.id ?? `new-${i}`} aria-label={x.name || `Area ${i + 1}`} className="rounded-xl p-3 ring-1 ring-line">
              <div className="flex flex-wrap items-start gap-2">
                <span className="mt-2 grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input value={x.name} maxLength={80} disabled={!editable} onChange={(e) => set(i, { name: e.target.value })} placeholder="e.g. English, Communication Skills" aria-label="Area name" className={`${selectCls} min-w-48 flex-1 font-semibold`} />
                    <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label={`Method for ${x.name || `area ${i + 1}`}`}>
                      {METHODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          disabled={!editable || (used && m !== x.method)}
                          title={used && m !== x.method ? 'Has results — the method can’t change' : METHOD_HINT[m]}
                          aria-pressed={x.method === m}
                          onClick={() => set(i, { ...emptyArea(m, meta.scales), id: x.id, name: x.name, is_required: m === 'observation' ? false : x.is_required })}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-40 ${x.method === m ? 'bg-white text-brand shadow' : 'text-muted'}`}
                        >
                          {METHOD_LABEL[m]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    {x.method === 'marks' && !x.components.length && (
                      <label className="flex items-center gap-2">
                        Out of
                        <input type="number" min={1} max={1000} step="0.5" value={x.max_marks ?? ''} disabled={!editable} onChange={(e) => set(i, { max_marks: e.target.value ? Number(e.target.value) : null })} aria-label="Maximum marks" className={`${selectCls} w-24`} />
                      </label>
                    )}
                    {(x.method === 'grade' || x.method === 'rating') && (
                      <label className="flex items-center gap-2">
                        Scale
                        <select value={x.scale_id ?? ''} disabled={!editable} onChange={(e) => set(i, { scale_id: e.target.value || null })} aria-label="Scale" className={selectCls}>
                          {!scale && <option value="">Choose…</option>}
                          {scales.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {scale && <span className="text-xs text-muted">{scale.items.map((it) => (scale.kind === 'grade' ? it.code : it.label)).join(' · ')}</span>}
                      </label>
                    )}
                    {x.method !== 'observation' && (
                      <button
                        type="button"
                        disabled={!editable || used}
                        onClick={() =>
                          set(i, x.components.length ? { components: [], max_marks: x.method === 'marks' ? 20 : null } : { components: [{ name: '', max_marks: x.method === 'marks' ? 5 : null }, { name: '', max_marks: x.method === 'marks' ? 5 : null }] })
                        }
                        className="text-xs font-bold text-brand disabled:text-muted"
                      >
                        {x.components.length ? 'One value (no parts)' : 'Split into parts (e.g. Reading, Writing)'}
                      </button>
                    )}
                    <label className="flex items-center gap-1.5 text-xs font-semibold">
                      <input type="checkbox" checked={x.is_required} disabled={!editable} onChange={(e) => set(i, { is_required: e.target.checked })} className="size-4 accent-brand" aria-label={`${x.name} required`} />
                      Required
                    </label>
                    {used && <span className="text-xs text-amber-700">Has results</span>}
                  </div>
                  {x.components.length > 0 && (
                    <ul className="space-y-1.5 rounded-lg bg-slate-50 p-2">
                      {x.components.map((c, k) => (
                        <li key={k} className="flex items-center gap-2">
                          <input
                            value={c.name}
                            maxLength={40}
                            disabled={!editable || used}
                            onChange={(e) => set(i, { components: x.components.map((y, j) => (j === k ? { ...y, name: e.target.value } : y)) })}
                            placeholder={`Part ${k + 1}, e.g. Reading`}
                            aria-label={`Part ${k + 1} name`}
                            className={`${selectCls} flex-1 bg-white`}
                          />
                          {x.method === 'marks' && (
                            <input
                              type="number"
                              min={0.5}
                              step="0.5"
                              value={c.max_marks ?? ''}
                              disabled={!editable || used}
                              onChange={(e) => set(i, { components: x.components.map((y, j) => (j === k ? { ...y, max_marks: e.target.value ? Number(e.target.value) : null } : y)) })}
                              aria-label={`Part ${k + 1} maximum`}
                              className={`${selectCls} w-20 bg-white`}
                            />
                          )}
                          <button type="button" disabled={!editable || used || x.components.length <= 2} onClick={() => set(i, { components: x.components.filter((_, j) => j !== k) })} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30" aria-label={`Remove part ${k + 1}`}>
                            <X className="size-4" />
                          </button>
                        </li>
                      ))}
                      {editable && !used && x.components.length < 8 && (
                        <button type="button" onClick={() => set(i, { components: [...x.components, { name: '', max_marks: x.method === 'marks' ? 5 : null }] })} className="px-1 text-xs font-bold text-brand">
                          + Add part
                        </button>
                      )}
                    </ul>
                  )}
                </div>
                {editable && (
                  <div className="flex shrink-0 gap-0.5">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30" aria-label="Move up">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" disabled={i === areas.length - 1} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30" aria-label="Move down">
                      <ArrowDown className="size-4" />
                    </button>
                    <button type="button" disabled={used} title={used ? 'Has results — can’t be removed' : undefined} onClick={() => setAreas(areas.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30" aria-label={`Remove ${x.name || 'area'}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {editable && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <button key={m} type="button" onClick={() => setAreas([...areas, emptyArea(m, meta.scales)])} className="btn-outline py-1.5 text-sm" aria-label={`Add ${METHOD_LABEL[m]} area`}>
                <Plus className="size-4" /> {METHOD_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {problems[0] && dirty && <span className="text-sm font-semibold text-rose-600">{problems[0]}</span>}
            <button
              onClick={async () => {
                setBusy(true)
                await onSave(areas.map((x) => ({ ...x, name: x.name.trim(), components: x.components.map((c) => ({ ...c, name: c.name.trim() })) })))
                setBusy(false)
              }}
              disabled={!dirty || busy || problems.length > 0}
              className="btn-primary disabled:opacity-50"
            >
              <Save className="size-4" /> Save areas
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ------------------------------------------------------------------ classes

function ClassesTab({ a, onChange, onError, onNotice }: { a: Assessment; onChange: (a: Assessment) => void; onError: (m: string | null) => void; onNotice: (m: string) => void }) {
  const [unlocking, setUnlocking] = useState<SectionRow | null>(null)
  const [batches, setBatches] = useState<Record<string, Batch>>({})
  const replace = (row: SectionRow) => onChange({ ...a, sections: a.sections.map((s) => (s.id === row.id ? row : s)) })
  const act = async (fn: () => Promise<SectionRow>, text: string) => {
    onError(null)
    try {
      replace(await fn())
      onNotice(text)
    } catch (err) {
      onError(errorMessage(err))
    }
  }

  useEffect(() => {
    const running = Object.entries(batches).filter(([, b]) => b.status === 'Queued' || b.status === 'Processing')
    if (!running.length) return
    const t = setTimeout(async () => {
      for (const [rowId, b] of running) {
        try {
          const nb = await assessmentsApi.batch(b.id)
          setBatches((x) => ({ ...x, [rowId]: nb }))
        } catch {
          /* keep polling */
        }
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [batches])

  if (a.status === 'Draft')
    return <p className="rounded-2xl bg-white p-8 text-center text-sm text-muted shadow-card ring-1 ring-line/60">Result entry hasn’t started yet. Finish the areas, then press “Start result entry”.</p>

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60" aria-label="Classes">
      {a.sections.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted">You’re not the class teacher of any class in this assessment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-56 px-4 py-3">Students complete</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {a.sections.map((s) => {
                const b = batches[s.id]
                return (
                  <tr key={s.id} aria-label={s.label}>
                    <td className="px-4 py-3">
                      <span className="block font-bold">{s.label}</span>
                      <span className="text-xs text-muted">{s.teacher_name ? `Class teacher: ${s.teacher_name}` : 'No class teacher'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={s.status} />
                      <span className="mt-0.5 block text-xs text-muted">
                        {s.status === 'Published' && s.published_by ? `by ${s.published_by}` : s.status === 'Completed' && s.completed_by ? `by ${s.completed_by}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Bar done={s.complete} total={s.students} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap justify-end gap-1.5">
                        {s.can_enter && (
                          <Link to={`/assessments/${a.id}/sections/${s.id}`} className={s.status === 'Published' ? 'btn-outline py-1.5 text-xs' : 'btn-primary py-1.5 text-xs'}>
                            <NotebookPen className="size-3.5" /> {s.status === 'Published' ? 'View results' : 'Enter results'}
                          </Link>
                        )}
                        {s.status === 'Completed' && s.can_publish && (
                          <button onClick={() => void act(() => assessmentsApi.publish(a.id, s.id), `${s.label} published — progress reports can now be generated`)} className="btn-outline border-emerald-200 py-1.5 text-xs text-emerald-700">
                            <BadgeCheck className="size-3.5" /> Publish
                          </button>
                        )}
                        {s.status === 'Published' && (
                          <>
                            {b?.status === 'Done' && b.zip_url ? (
                              <a href={b.zip_url} className="btn-outline border-emerald-200 py-1.5 text-xs text-emerald-700">
                                <Download className="size-3.5" /> ZIP ({b.done})
                              </a>
                            ) : (
                              <button
                                disabled={b?.status === 'Queued' || b?.status === 'Processing'}
                                onClick={async () => {
                                  onError(null)
                                  try {
                                    const nb = await assessmentsApi.generateSection(a.id, s.id)
                                    setBatches((x) => ({ ...x, [s.id]: nb }))
                                  } catch (err) {
                                    onError(errorMessage(err))
                                  }
                                }}
                                className="btn-outline py-1.5 text-xs"
                              >
                                <Download className="size-3.5" />
                                {b && (b.status === 'Queued' || b.status === 'Processing') ? `Reports ${b.done}/${b.total}…` : b?.status === 'Failed' ? 'Retry reports' : 'All reports (ZIP)'}
                              </button>
                            )}
                            {s.can_unlock && (
                              <button onClick={() => setUnlocking(s)} className="btn-outline py-1.5 text-xs">
                                <LockOpen className="size-3.5" /> Unlock
                              </button>
                            )}
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {unlocking && <UnlockDialog s={unlocking} onClose={() => setUnlocking(null)} onDone={(row) => (replace(row), onNotice(`${row.label} unlocked for corrections`))} assessmentId={a.id} />}
    </section>
  )
}

function UnlockDialog({ s, assessmentId, onClose, onDone }: { s: SectionRow; assessmentId: string; onClose: () => void; onDone: (row: SectionRow) => void }) {
  const [note, setNote] = useState('')
  return (
    <Dialog
      title={`Unlock ${s.label}?`}
      subtitle="Results become editable again and the class goes back to result entry. Publish again when corrections are done. This is recorded."
      submitLabel="Unlock"
      onClose={onClose}
      onSubmit={async () => onDone(await assessmentsApi.unlock(assessmentId, s.id, note.trim() || null))}
    >
      <label className="block text-sm font-bold">
        Reason <span className="font-normal text-muted">(optional)</span>
        <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Correct Aarav’s EVS grade" aria-label="Unlock reason" className={`${inputCls} mt-1 font-normal`} />
      </label>
    </Dialog>
  )
}

function DetailsDialog({ a, meta, onClose, onSaved }: { a: Assessment; meta: Meta; onClose: () => void; onSaved: (a: Assessment) => void }) {
  const [f, setF] = useState({ name: a.name, description: a.description ?? '', start_date: a.start_date ?? '', end_date: a.end_date ?? '', class_ids: a.classes.map((c) => c.id) })
  return (
    <Dialog
      title="Details & classes"
      submitLabel="Save"
      size="lg"
      submitDisabled={f.name.trim().length < 2 || !f.class_ids.length}
      onClose={onClose}
      onSubmit={async () =>
        onSaved(await assessmentsApi.update(a.id, { name: f.name.trim(), description: f.description.trim() || null, start_date: f.start_date || null, end_date: f.end_date || null, class_ids: f.class_ids }))
      }
    >
      <label className="block text-sm font-bold">
        Name
        <input value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label="Assessment name" className={`${inputCls} mt-1 font-normal`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold">
          From
          <input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} aria-label="Start date" className={`${inputCls} mt-1 font-normal`} />
        </label>
        <label className="block text-sm font-bold">
          To
          <input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} aria-label="End date" className={`${inputCls} mt-1 font-normal`} />
        </label>
      </div>
      <div>
        <p className="text-sm font-bold">Classes</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {meta.classes.map((c) => {
            const on = f.class_ids.includes(c.id)
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => setF({ ...f, class_ids: on ? f.class_ids.filter((x) => x !== c.id) : [...f.class_ids, c.id] })} className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${on ? 'bg-brand text-white ring-brand' : 'ring-line'}`}>
                {c.name}
              </button>
            )
          })}
        </div>
      </div>
      <label className="block text-sm font-bold">
        Notes
        <textarea rows={2} maxLength={500} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} aria-label="Notes" className={`${inputCls} mt-1 resize-none font-normal`} />
      </label>
    </Dialog>
  )
}

function TemplateDialog({ a, onClose, onSaved }: { a: Assessment; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(`${a.name} areas`)
  const scopes = [{ id: null as string | null, name: 'Shared areas' }, ...a.classes.filter((c) => c.customised).map((c) => ({ id: c.id as string | null, name: `${c.name}'s own areas` }))]
  const [scope, setScope] = useState<string | null>(null)
  return (
    <Dialog
      title="Save as template"
      subtitle="Reuse these areas when you create the next assessment."
      submitLabel="Save template"
      submitDisabled={name.trim().length < 2}
      onClose={onClose}
      onSubmit={async () => {
        await assessmentsApi.saveTemplate({ name: name.trim(), description: null, assessment_id: a.id, class_id: scope })
        onSaved()
      }}
    >
      <label className="block text-sm font-bold">
        Template name
        <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-label="Template name" className={`${inputCls} mt-1 font-normal`} />
      </label>
      {scopes.length > 1 && (
        <label className="block text-sm font-bold">
          Which areas
          <select value={scope ?? ''} onChange={(e) => setScope(e.target.value || null)} aria-label="Which areas" className={`${inputCls} mt-1 font-normal`}>
            {scopes.map((s) => (
              <option key={s.id ?? 'shared'} value={s.id ?? ''}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </Dialog>
  )
}
