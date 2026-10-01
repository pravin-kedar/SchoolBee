import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Eye, Loader2, Lock, MessageSquareText, Save, X } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { Avatar } from '../../components/students/StudentUi'
import { errorMessage } from '../../lib/api'
import { assessmentsApi, fmt, type Area, type StudentResult, type Value } from '../../lib/assessments'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { ageLabel } from '../../lib/students'
import { Badge, ReportPreviewDialog } from './AssessmentsPage'

const LEVEL_TONE = ['bg-rose-50 text-rose-700 ring-rose-200', 'bg-amber-50 text-amber-800 ring-amber-200', 'bg-sky-50 text-sky-700 ring-sky-200', 'bg-emerald-50 text-emerald-700 ring-emerald-200', 'bg-violet-50 text-violet-700 ring-violet-200']
const LEVEL_ON = ['bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500', 'bg-violet-500']
const tone = (i: number, n: number) => Math.min(LEVEL_TONE.length - 1, Math.round((i * (LEVEL_TONE.length - 1)) / Math.max(1, n - 1)))

type Form = { entries: Record<string, Value>; remarks: Record<string, string>; comment: string }

/** Individual mode: one student's results with remarks + their report. */
export function StudentResultPage() {
  const { id = '', studentId = '' } = useParams()
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const [r, setR] = useState<StudentResult | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (!token) return
    let live = true
    assessmentsApi.student(id, studentId).then(
      (x) => live && (setR(x), setForm({ entries: x.entries, remarks: x.remarks, comment: x.overall_comment ?? '' }), setError(null), setSaved(false)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [token, id, studentId])

  if (!token) return <Navigate to="/login" replace />

  const dirty = r && form && (JSON.stringify(form.entries) !== JSON.stringify(r.entries) || JSON.stringify(form.remarks) !== JSON.stringify(r.remarks) || form.comment !== (r.overall_comment ?? ''))
  const setValue = (area: Area, v: Value) => (setForm((f) => f && { ...f, entries: { ...f.entries, [area.id]: v } }), setSaved(false))

  async function save(goNext: boolean) {
    if (!r || !form) return
    setBusy(goNext ? 'next' : 'save')
    setError(null)
    try {
      const entries = Object.fromEntries(r.areas.map((a) => [a.id, form.entries[a.id] ?? null]))
      const remarks = Object.fromEntries(r.areas.map((a) => [a.id, form.remarks[a.id] ?? null]))
      const next = await assessmentsApi.saveStudent(id, studentId, { student_id: studentId, entries, remarks, overall_comment: form.comment, set_overall_comment: true })
      if (goNext && next.next_id) {
        navigate(`/assessments/${id}/students/${next.next_id}`)
        return
      }
      setR(next)
      setForm({ entries: next.entries, remarks: next.remarks, comment: next.overall_comment ?? '' })
      setSaved(true)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: { errors?: { area_id: string; message: string }[] } } } }).response?.data?.detail
      if (detail && typeof detail === 'object' && detail.errors && r) {
        setError(detail.errors.map((e) => `${r.areas.find((a) => a.id === e.area_id)?.name}: ${e.message}`).join(' · '))
      } else setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={r ? `/assessments/${id}/sections/${r.section.id}` : `/assessments/${id}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand">
            <ArrowLeft className="size-4" /> {r ? `${r.section.label} results` : 'Back'}
          </Link>
          {r && (
            <div className="flex gap-2">
              <button onClick={() => r.prev_id && navigate(`/assessments/${id}/students/${r.prev_id}`)} disabled={!r.prev_id} className="btn-outline py-1.5 text-sm disabled:opacity-40">
                <ChevronLeft className="size-4" /> Previous
              </button>
              <button onClick={() => r.next_id && navigate(`/assessments/${id}/students/${r.next_id}`)} disabled={!r.next_id} className="btn-outline py-1.5 text-sm disabled:opacity-40">
                Next <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}
        {!r || !form ? (
          !error && <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
              <Avatar name={r.student.full_name} url={r.student.photo_url} gender={r.student.gender} size="size-20 text-2xl" />
              <div className="min-w-0 flex-1">
                <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold">
                  {r.student.full_name} <Badge status={r.section.status} />
                </h1>
                <p className="text-sm text-muted">
                  {r.student.student_code} · {r.section.label}
                  {r.student.date_of_birth && ` · ${ageLabel(r.student.date_of_birth)}`}
                </p>
                <p className="text-sm font-semibold text-brand">
                  {r.assessment_name} · {r.academic_year}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-5 py-3 text-center ring-1 ring-amber-100">
                <p className="text-xs font-bold text-amber-800 uppercase">Progress</p>
                <p className="font-display text-xl font-extrabold">
                  {r.progress.required_filled}/{r.progress.required}
                </p>
                <p className="text-xs text-muted">required areas</p>
              </div>
            </section>

            {!r.can_edit && (
              <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink/80 ring-1 ring-line">
                <Lock className="size-4" /> Published — read-only.
              </p>
            )}

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5" aria-label="Assessment areas">
                  <h2 className="mb-3 text-lg font-bold">Assessment areas</h2>
                  <ul className="divide-y divide-line">
                    {r.areas.map((a) => (
                      <AreaRow
                        key={a.id}
                        area={a}
                        value={form.entries[a.id] ?? null}
                        remark={form.remarks[a.id] ?? ''}
                        editable={r.can_edit}
                        onValue={(v) => setValue(a, v)}
                        onRemark={(t) => (setForm({ ...form, remarks: { ...form.remarks, [a.id]: t } }), setSaved(false))}
                      />
                    ))}
                  </ul>
                </section>
                <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                  <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
                    <MessageSquareText className="size-5 text-brand" /> Teacher’s overall comment
                  </h2>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={form.comment}
                    disabled={!r.can_edit}
                    onChange={(e) => (setForm({ ...form, comment: e.target.value }), setSaved(false))}
                    placeholder="e.g. Good progress this term. Keep encouraging participation and focus."
                    aria-label="Overall comment"
                    className="w-full resize-y rounded-xl border border-line px-3 py-2.5 outline-none focus:border-brand disabled:bg-slate-50"
                  />
                  <p className="text-xs text-muted">Printed on the progress report.</p>
                </section>
              </div>

              <aside className="space-y-5">
                {r.progress.max != null && (
                  <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                    <h2 className="text-lg font-bold">Marks</h2>
                    <p className="mt-1 font-display text-3xl font-extrabold">
                      {fmt(r.progress.score ?? 0)} <span className="text-lg text-muted">/ {fmt(r.progress.max)}</span>
                    </p>
                    <p className="text-sm text-muted">{r.progress.percent != null ? `${r.progress.percent}% across the marks areas` : 'Percentage shows once every marks area is filled'}</p>
                  </section>
                )}
                {r.attendance && (
                  <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                    <h2 className="text-lg font-bold">Attendance in this period</h2>
                    <p className="mt-1 font-display text-3xl font-extrabold">{r.attendance.percent ?? '—'}%</p>
                    <p className="text-sm text-muted">
                      Present {r.attendance.present + r.attendance.late} of {r.attendance.days} days
                    </p>
                  </section>
                )}
                <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Progress report">
                  <h2 className="text-lg font-bold">Progress report</h2>
                  <p className="mb-3 text-sm text-muted">{r.section.status === 'Published' ? 'Preview it, then download the PDF.' : 'Preview anytime — the PDF is available once results are published.'}</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setPreview(true)} className="btn-outline py-2 text-sm">
                      <Eye className="size-4" /> Preview
                    </button>
                    {r.section.status === 'Published' && (
                      <button
                        onClick={async () => {
                          setBusy('pdf')
                          try {
                            const rep = await assessmentsApi.generate(id, studentId)
                            setR({ ...r, reports: [rep, ...r.reports] })
                            if (rep.url) window.location.assign(rep.url)
                          } catch (err) {
                            setError(errorMessage(err))
                          } finally {
                            setBusy(null)
                          }
                        }}
                        className="btn-primary py-2 text-sm"
                      >
                        {busy === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download PDF
                      </button>
                    )}
                  </div>
                  {r.reports.length > 0 && (
                    <ul className="mt-4 divide-y divide-line text-sm" aria-label="Report history">
                      {r.reports.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                          <span>
                            <span className="block font-semibold capitalize">{p.design} design</span>
                            <span className="text-xs text-muted">
                              {new Date(p.generated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {p.generated_by && ` · ${p.generated_by}`}
                            </span>
                          </span>
                          {p.url && (
                            <a href={p.url} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label="Download this report">
                              <Download className="size-4" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </aside>
            </div>

            {r.can_edit && (
              <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                {saved && !dirty && <span className="text-sm font-semibold text-emerald-700">Saved</span>}
                <button onClick={() => void save(false)} disabled={!dirty || busy !== null} className="btn-outline disabled:opacity-50">
                  {busy === 'save' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
                </button>
                {r.next_id && (
                  <button onClick={() => void save(true)} disabled={busy !== null} className="btn-primary px-5">
                    {busy === 'next' ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />} Save & next student
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {preview && r && <ReportPreviewDialog assessmentId={id} studentId={studentId} name={r.student.full_name} onClose={() => setPreview(false)} />}
    </AppShell>
  )
}

function AreaRow({ area, value, remark, editable, onValue, onRemark }: { area: Area; value: Value; remark: string; editable: boolean; onValue: (v: Value) => void; onRemark: (t: string) => void }) {
  const items = area.scale?.items ?? []
  const parts = area.components.length ? area.components : [null]
  const get = (key: string | null) => (key ? (value && typeof value === 'object' ? (value[key] ?? '') : '') : value == null || typeof value === 'object' ? '' : value)
  const put = (key: string | null, v: string | number) => {
    if (!key) return onValue(v === '' ? null : v)
    const obj = { ...(value && typeof value === 'object' ? value : {}) }
    if (v === '') delete obj[key]
    else obj[key] = v
    onValue(Object.keys(obj).length ? obj : null)
  }
  return (
    <li className="py-3" aria-label={area.name}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="min-w-40 font-bold">
          {area.name}
          {area.is_required && <span className="text-rose-500"> *</span>}
          <span className="block text-xs font-normal text-muted">
            {area.method === 'marks' ? `Marks · out of ${fmt(area.max_marks)}` : area.method === 'observation' ? 'Observation' : area.scale?.name}
          </span>
        </p>
        <div className="min-w-0 flex-1 space-y-2">
          {parts.map((comp) => (
            <div key={comp?.key ?? 'one'} className="flex flex-wrap items-center gap-2">
              {comp && <span className="w-24 text-sm text-muted">{comp.name}</span>}
              {area.method === 'marks' && (
                <span className="flex items-center gap-1.5">
                  <input
                    inputMode="decimal"
                    value={String(get(comp?.key ?? null))}
                    disabled={!editable}
                    onChange={(e) => put(comp?.key ?? null, e.target.value.replace(/[^\d.]/g, ''))}
                    aria-label={`${area.name}${comp ? ` ${comp.name}` : ''} marks`}
                    className="w-20 rounded-lg border border-line px-2 py-1.5 text-right font-semibold outline-none focus:border-brand disabled:bg-slate-50"
                  />
                  <span className="text-sm text-muted">/ {fmt(comp ? comp.max_marks : area.max_marks)}</span>
                </span>
              )}
              {(area.method === 'grade' || area.method === 'rating') && (
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${area.name}${comp ? ` ${comp.name}` : ''}`}>
                  {items.map((it, i) => {
                    const on = get(comp?.key ?? null) === it.code
                    const t = area.method === 'rating' ? tone(i, items.length) : 3
                    return (
                      <button
                        key={it.code}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={!editable}
                        onClick={() => put(comp?.key ?? null, on ? '' : it.code)}
                        title={it.label}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition disabled:cursor-not-allowed ${on ? `${LEVEL_ON[t]} text-white ring-transparent` : `${LEVEL_TONE[t]} hover:brightness-95`}`}
                      >
                        {area.method === 'grade' ? (
                          <>
                            <b>{it.code}</b> <span className={on ? 'text-white/90' : 'opacity-75'}>{it.label}</span>
                          </>
                        ) : (
                          it.label
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              {area.method === 'observation' && (
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={String(get(null))}
                  disabled={!editable}
                  onChange={(e) => put(null, e.target.value)}
                  placeholder="e.g. Participates actively in group activities and communicates confidently."
                  aria-label={`${area.name} notes`}
                  className="w-full resize-y rounded-xl border border-line px-3 py-2 outline-none focus:border-brand disabled:bg-slate-50"
                />
              )}
            </div>
          ))}
          {area.method !== 'observation' && (
            <input
              value={remark}
              maxLength={300}
              disabled={!editable}
              onChange={(e) => onRemark(e.target.value)}
              placeholder="Remark (optional), e.g. Speaks clearly and expresses needs well."
              aria-label={`${area.name} remark`}
              className="w-full rounded-lg border border-line px-3 py-1.5 text-sm outline-none focus:border-brand disabled:bg-slate-50"
            />
          )}
        </div>
      </div>
    </li>
  )
}
