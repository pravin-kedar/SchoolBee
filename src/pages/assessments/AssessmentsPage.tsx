import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { BadgeCheck, ClipboardList, Download, Eye, FileText, Loader2, NotebookPen, Plus, Search, Settings2, Star, Trash2, X } from 'lucide-react'

import schoolBand from '../../assets/school-band.webp'
import beeReading from '../../assets/bees/bee-reading.webp'
import { AppShell } from '../../components/app/AppShell'
import { MoneyCard } from '../../components/fees/FeeUi'
import { Avatar } from '../../components/students/StudentUi'
import { selectCls } from '../../components/students/StudentTable'
import { Dialog } from '../../components/ui/Dialog'
import { PagePreview } from '../../components/ui/PagePreview'
import { errorMessage } from '../../lib/api'
import { assessmentsApi, STATUS_LABEL, STATUS_STYLE, type AssessmentRow, type Design, type Meta, type ResultRow, type Scale, type ScaleItem } from '../../lib/assessments'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'

type Tab = 'list' | 'results' | 'settings'

export function Badge({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ring-1 ${STATUS_STYLE[status] ?? STATUS_STYLE.Draft}`}>{STATUS_LABEL[status] ?? status}</span>
}

export function Bar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done * 100) / total) : 0
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <span className={`block h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-14 text-right text-xs font-semibold text-muted">
        {done}/{total}
      </span>
    </span>
  )
}

/** Assessments home: dashboard + list, Result Reports, Scales & Settings. */
export function AssessmentsPage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [meta, setMeta] = useState<Meta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const tab = (['results', 'settings'].includes(params.get('tab') ?? '') ? params.get('tab') : 'list') as Tab

  useEffect(() => {
    if (!token) return
    assessmentsApi.meta().then(setMeta, (err) => setError(errorMessage(err)))
  }, [token])

  if (!token) return <Navigate to="/login" replace />
  const tabs: [Tab, string][] = [
    ['list', 'Assessments'],
    ['results', 'Result Reports'],
    ...(meta?.can_manage ? ([['settings', 'Scales & Settings']] as [Tab, string][]) : []),
  ]

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-amber-50 to-sky-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <img src={schoolBand} alt="" className="pointer-events-none absolute top-0 right-10 hidden h-full [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] 2xl:block" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">Assessments</h1>
              <p className="mt-0.5">Set up what to evaluate, enter results quickly, and share beautiful progress reports.</p>
            </div>
            {meta?.can_manage && (
              <Link to="/assessments/new" className="btn-primary px-5 py-3">
                <Plus className="size-5" /> New Assessment
              </Link>
            )}
          </div>
        </section>

        <div className="flex overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setParams(key === 'list' ? {} : { tab: key }, { replace: true })}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition ${tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
        {meta && tab === 'list' && <ListTab meta={meta} />}
        {meta && tab === 'results' && <ResultsTab meta={meta} />}
        {meta && tab === 'settings' && meta.can_manage && <SettingsTab meta={meta} onChange={setMeta} />}
        {!meta && !error && <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />}
      </div>
    </AppShell>
  )
}

// ------------------------------------------------------------------ list

function ListTab({ meta }: { meta: Meta }) {
  const [year, setYear] = useState(meta.years.find((y) => y.is_active)?.id ?? meta.years[0]?.id ?? '')
  const [data, setData] = useState<{ items: AssessmentRow[]; summary: Record<string, number> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    assessmentsApi.list(year || undefined).then(
      (d) => live && setData(d),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [year])
  const s = data?.summary

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MoneyCard label="Assessments" value={String(s?.total ?? '—')} hint={s ? `${s.draft} being set up` : undefined} icon={ClipboardList} tone="bg-sky-100 text-brand" />
        <MoneyCard label="Classes entering results" value={String(s?.sections_open ?? '—')} icon={NotebookPen} tone="bg-amber-100 text-amber-600" />
        <MoneyCard label="Ready to publish" value={String(s?.sections_completed ?? '—')} icon={BadgeCheck} tone="bg-violet-100 text-violet-600" />
        <MoneyCard label="Fully published" value={String(s?.published ?? '—')} icon={Star} tone="bg-emerald-100 text-emerald-600" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Assessments</h2>
        <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Academic year" className={selectCls}>
          {meta.years.map((y) => (
            <option key={y.id} value={y.id}>
              Academic Year {y.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
      {!data ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl bg-white py-14 text-center shadow-card ring-1 ring-line/60">
          <img src={beeReading} alt="" className="mx-auto h-20" />
          <p className="mt-2 text-lg font-bold">No assessments yet</p>
          <p className="text-muted">{meta.can_manage ? 'Create your first one in a minute — start from a ready template.' : 'Your school hasn’t opened any assessment for your class yet.'}</p>
          {meta.can_manage && (
            <Link to="/assessments/new" className="btn-primary mt-4">
              <Plus className="size-4" /> New Assessment
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {data.items.map((a) => (
            <li key={a.id} aria-label={a.name} className="flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/assessments/${a.id}`} className="text-lg font-bold hover:text-brand">
                    {a.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {a.classes.join(', ')} · {a.academic_year}
                  </p>
                </div>
                <Badge status={a.status === 'Draft' ? 'Draft' : a.sections && a.sections_published === a.sections ? 'Published' : 'Active'} />
              </div>
              {a.status === 'Draft' ? (
                <p className="mt-4 flex-1 text-sm text-muted">Being set up — add what to evaluate, then start result entry.</p>
              ) : (
                <div className="mt-4 flex-1 space-y-2 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-bold text-muted uppercase">Students with complete results</p>
                    <Bar done={a.students_complete} total={a.students} />
                  </div>
                  <p className="text-xs text-muted">
                    {a.sections_published} of {a.sections} class{a.sections === 1 ? '' : 'es'} published · {a.sections_completed} ready to publish
                  </p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                {a.my_sections.slice(0, 3).map((s) => (
                  <Link key={s.id} to={`/assessments/${a.id}/sections/${s.id}`} className="btn-primary py-1.5 text-sm">
                    <NotebookPen className="size-4" /> {s.label}
                    <span className="rounded-full bg-white/25 px-1.5 text-xs">
                      {s.complete}/{s.students}
                    </span>
                  </Link>
                ))}
                <Link to={`/assessments/${a.id}`} className="btn-outline py-1.5 text-sm">
                  {a.status === 'Draft' ? 'Continue setup' : 'Open'}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ result reports

function ResultsTab({ meta }: { meta: Meta }) {
  const [f, setF] = useState({ year_id: meta.years.find((y) => y.is_active)?.id ?? '', assessment_id: '', class_id: '', section_id: '', q: '' })
  const [rows, setRows] = useState<ResultRow[] | null>(null)
  const [list, setList] = useState<AssessmentRow[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ResultRow | null>(null)
  const cls = meta.classes.find((c) => c.id === f.class_id)

  useEffect(() => {
    assessmentsApi.list(f.year_id || undefined).then((d) => setList(d.items.filter((a) => a.status === 'Active')), () => undefined)
  }, [f.year_id])
  useEffect(() => {
    const t = setTimeout(() => setF((x) => (x.q === q.trim() ? x : { ...x, q: q.trim() })), 300)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    let live = true
    assessmentsApi.results(f).then(
      (d) => live && (setRows(d.items), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [f])

  async function generate(r: ResultRow) {
    setBusy(r.student_id + r.assessment_id)
    setError(null)
    try {
      const rep = await assessmentsApi.generate(r.assessment_id, r.student_id)
      setRows((all) => all?.map((x) => (x === r ? { ...x, last_report: rep } : x)) ?? null)
      if (rep.url) window.location.assign(rep.url)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <div className="relative min-w-56 flex-[2]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search student name or ID…" aria-label="Search results" className={`${selectCls} w-full pl-9`} />
        </div>
        <select value={f.year_id} onChange={(e) => setF({ ...f, year_id: e.target.value, assessment_id: '' })} aria-label="Year" className={`${selectCls} flex-1`}>
          {meta.years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
        <select value={f.assessment_id} onChange={(e) => setF({ ...f, assessment_id: e.target.value })} aria-label="Assessment" className={`${selectCls} flex-1`}>
          <option value="">All assessments</option>
          {list.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value, section_id: '' })} aria-label="Class" className={`${selectCls} flex-1`}>
          <option value="">All classes</option>
          {meta.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={f.section_id} onChange={(e) => setF({ ...f, section_id: e.target.value })} disabled={!cls?.sections.length} aria-label="Section" className={`${selectCls} flex-1`}>
          <option value="">All sections</option>
          {cls?.sections.map((s) => (
            <option key={s.id} value={s.id}>
              Section {s.name}
            </option>
          ))}
        </select>
      </section>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        {!rows ? (
          <div className="m-4 h-32 animate-pulse rounded-xl bg-slate-100" />
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto size-10 text-muted" />
            <p className="mt-2 font-bold">No published results here yet</p>
            <p className="text-sm text-muted">Results appear once a class is published.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Last report</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.assessment_id + r.student_id} aria-label={r.full_name}>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-3">
                        <Avatar name={r.full_name} url={r.photo_url} />
                        <span>
                          <Link to={`/assessments/${r.assessment_id}/students/${r.student_id}`} className="block font-bold hover:text-brand">
                            {r.full_name}
                          </Link>
                          <span className="text-xs text-muted">
                            {r.student_code} · {r.section.label}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.assessment_name}
                      <span className="block text-xs text-muted">{r.academic_year}</span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold">{r.summary}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {r.last_report ? new Date(r.last_report.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not generated'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex justify-end gap-1.5">
                        <button onClick={() => setPreview(r)} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label={`Preview report ${r.full_name}`}>
                          <Eye className="size-4" />
                        </button>
                        <button onClick={() => void generate(r)} disabled={busy !== null} className="btn-outline py-1.5 text-xs" aria-label={`Download report ${r.full_name}`}>
                          {busy === r.student_id + r.assessment_id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} PDF
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {preview && <ReportPreviewDialog assessmentId={preview.assessment_id} studentId={preview.student_id} name={preview.full_name} onClose={() => setPreview(null)} />}
    </div>
  )
}

/** On-screen preview of a student's progress report (either design). */
export function ReportPreviewDialog({ assessmentId, studentId, name, onClose }: { assessmentId: string; studentId: string; name: string; onClose: () => void }) {
  const [design, setDesign] = useState<Design | undefined>(undefined)
  const [p, setP] = useState<{ html: string; design: Design; published: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    assessmentsApi.preview(assessmentId, studentId, design).then((x) => live && setP(x), (err) => live && setError(errorMessage(err)))
    return () => {
      live = false
    }
  }, [assessmentId, studentId, design])
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/50 p-0 sm:p-4" role="dialog" aria-modal aria-label="Report preview">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden bg-white sm:rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-extrabold">Progress report · {name}</h2>
            {p && !p.published && <p className="text-xs font-semibold text-amber-700">Draft preview — results aren’t published yet</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Design">
              {(['colourful', 'classic'] as Design[]).map((d) => (
                <button key={d} onClick={() => setDesign(d)} aria-pressed={(p?.design ?? design) === d} className={`rounded-lg px-3 py-1 text-xs font-bold capitalize ${(p?.design ?? design) === d ? 'bg-white shadow' : 'text-muted'}`}>
                  {d}
                </button>
              ))}
            </div>
            {p?.published && (
              <button
                onClick={async () => {
                  setBusy(true)
                  try {
                    const rep = await assessmentsApi.generate(assessmentId, studentId, p.design)
                    if (rep.url) window.location.assign(rep.url)
                  } catch (err) {
                    setError(errorMessage(err))
                  } finally {
                    setBusy(false)
                  }
                }}
                className="btn-primary py-1.5 text-sm"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download PDF
              </button>
            )}
            <button onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100" aria-label="Close preview">
              <X className="size-5" />
            </button>
          </div>
        </div>
        {error && <p className="mx-4 mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">{error}</p>}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
          {p ? <PagePreview html={p.html} title="Progress report" className="mx-auto w-full max-w-2xl" /> : <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-xl bg-white" />}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ settings

function SettingsTab({ meta, onChange }: { meta: Meta; onChange: (m: Meta) => void }) {
  const [editing, setEditing] = useState<Scale | 'grade' | 'rating' | null>(null)
  const [deleting, setDeleting] = useState<Scale | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const reload = async () => onChange(await assessmentsApi.meta())
  const groups = useMemo(() => (['grade', 'rating'] as const).map((k) => [k, meta.scales.filter((s) => s.kind === k)] as const), [meta.scales])

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        {groups.map(([kind, list]) => (
          <section key={kind} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label={kind === 'grade' ? 'Grading scales' : 'Rating scales'}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{kind === 'grade' ? 'Grading scales' : 'Rating scales'}</h2>
                <p className="text-sm text-muted">{kind === 'grade' ? 'Letter grades like A+, A, B.' : 'Levels like Beginning → Excellent, shown as words, stars or numbers.'}</p>
              </div>
              <button onClick={() => setEditing(kind)} className="btn-outline py-1.5 text-sm">
                <Plus className="size-4" /> New
              </button>
            </div>
            <ul className="space-y-2">
              {list.map((s) => (
                <li key={s.id} aria-label={s.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-line">
                  <span className="min-w-0">
                    <span className="block font-bold">
                      {s.name} {s.default_key && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-muted uppercase">SchoolBee default</span>}
                    </span>
                    <span className="flex flex-wrap gap-1 pt-1">
                      {s.items.map((i) => (
                        <span key={i.code} className="rounded-md bg-slate-50 px-2 py-0.5 text-xs ring-1 ring-line">
                          {kind === 'grade' ? <b>{i.code} </b> : null}
                          {i.label}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="flex gap-1">
                    <button onClick={() => setEditing(s)} className="btn-outline py-1 text-xs">
                      Edit
                    </button>
                    <button onClick={() => setDeleting(s)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Delete ${s.name}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {meta.templates.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Your templates">
            <h2 className="mb-3 text-lg font-bold">Your templates</h2>
            <ul className="space-y-2">
              {meta.templates.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-line">
                  <span>
                    <span className="block font-bold">{t.name}</span>
                    <span className="text-xs text-muted">{t.areas.map((a) => a.name).join(', ')}</span>
                  </span>
                  <button
                    onClick={async () => {
                      await assessmentsApi.deleteTemplate(t.id)
                      await reload()
                    }}
                    className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"
                    aria-label={`Delete template ${t.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Report design">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Settings2 className="size-5 text-brand" /> Progress report design
        </h2>
        <p className="mb-3 text-sm text-muted">Used for every progress report PDF. You can still pick the other one when previewing.</p>
        {(
          [
            ['colourful', 'Colourful', 'Friendly preschool look: colours, rating stars, photo card.'],
            ['classic', 'Classic', 'Clean, formal report card in black and blue.'],
          ] as [Design, string, string][]
        ).map(([d, label, hint]) => (
          <button
            key={d}
            onClick={async () => {
              onChange(await assessmentsApi.saveSettings(d))
              setNotice(`${label} design saved`)
            }}
            aria-pressed={meta.report_design === d}
            className={`mb-2 block w-full rounded-xl p-3 text-left ring-1 ${meta.report_design === d ? 'bg-sky-50 ring-2 ring-brand' : 'ring-line hover:bg-slate-50'}`}
          >
            <span className="block font-bold">{label}</span>
            <span className="text-sm text-muted">{hint}</span>
          </button>
        ))}
        {notice && <p className="text-sm font-semibold text-emerald-700">{notice}</p>}
      </section>
      {editing && <ScaleDialog scale={typeof editing === 'string' ? null : editing} kind={typeof editing === 'string' ? editing : editing.kind} onClose={() => setEditing(null)} onSaved={reload} />}
      {deleting && (
        <Dialog
          title={`Delete “${deleting.name}”?`}
          subtitle="Assessments that already use it keep their own copy, so no results change."
          submitLabel="Delete"
          danger
          onClose={() => setDeleting(null)}
          onSubmit={async () => {
            await assessmentsApi.deleteScale(deleting.id)
            await reload()
          }}
        />
      )}
    </div>
  )
}

function ScaleDialog({ scale, kind, onClose, onSaved }: { scale: Scale | null; kind: 'grade' | 'rating'; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(scale?.name ?? '')
  const [display, setDisplay] = useState<Scale['display']>(scale?.display ?? (kind === 'rating' ? 'stars' : 'label'))
  const [items, setItems] = useState<ScaleItem[]>(
    scale?.items ?? (kind === 'grade' ? [{ code: 'A', label: 'Excellent' }, { code: 'B', label: 'Good' }, { code: 'C', label: 'Developing' }] : [{ code: '1', label: 'Beginning' }, { code: '2', label: 'Developing' }, { code: '3', label: 'Excellent' }]),
  )
  const ok = name.trim().length >= 2 && items.length >= 2 && items.every((i) => i.label.trim() && (kind === 'rating' || i.code.trim()))
  return (
    <Dialog
      title={scale ? `Edit ${scale.name}` : kind === 'grade' ? 'New grading scale' : 'New rating scale'}
      subtitle={kind === 'rating' ? 'List the levels from lowest to highest.' : 'List the grades from best to lowest.'}
      submitLabel="Save scale"
      submitDisabled={!ok}
      onClose={onClose}
      onSubmit={async () => {
        const body = { name: name.trim(), kind, display, items }
        if (scale) await assessmentsApi.updateScale(scale.id, body)
        else await assessmentsApi.createScale(body)
        await onSaved()
      }}
    >
      <label className="block text-sm font-bold">
        Name
        <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Scale name" className={`${selectCls} mt-1 w-full font-normal`} />
      </label>
      {kind === 'rating' && (
        <div>
          <p className="text-sm font-bold">Show as</p>
          <div className="mt-1 flex gap-1.5">
            {(['label', 'stars', 'number'] as const).map((d) => (
              <button key={d} type="button" aria-pressed={display === d} onClick={() => setDisplay(d)} className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ring-1 ${display === d ? 'bg-sky-50 text-brand ring-brand' : 'ring-line'}`}>
                {d === 'label' ? 'Words' : d}
              </button>
            ))}
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {kind === 'grade' ? (
              <input value={it.code} maxLength={10} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)))} aria-label={`Grade ${i + 1} code`} placeholder="A+" className={`${selectCls} w-20`} />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-bold">{i + 1}</span>
            )}
            <input value={it.label} maxLength={40} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} aria-label={`Level ${i + 1} label`} placeholder="e.g. Excellent" className={`${selectCls} flex-1`} />
            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} disabled={items.length <= 2} className="grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-30" aria-label={`Remove level ${i + 1}`}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {items.length < 12 && (
        <button type="button" onClick={() => setItems([...items, { code: '', label: '' }])} className="text-sm font-bold text-brand">
          + Add {kind === 'grade' ? 'grade' : 'level'}
        </button>
      )}
    </Dialog>
  )
}
