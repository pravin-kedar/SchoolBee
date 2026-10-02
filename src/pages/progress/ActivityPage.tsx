import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Lock, MessageSquare, Pencil, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { StarInput } from '../../components/progress/Stars'
import { Avatar } from '../../components/students/StudentUi'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { shortDate } from '../../lib/license'
import { PARTICIPATION_LABEL, groupLabel, progressApi, type ActivityDetail, type Participation, type ProgressMeta } from '../../lib/progress'
import { ActivityDialog } from './ProgressPage'

type Entry = { status: Participation | null; rating: number | null; comment: string }
const STATUS_BUTTONS: [Participation, string][] = [
  ['participated', 'Stars'],
  ['absent', 'Absent'],
  ['not_applicable', 'N/A'],
]

/** One activity: give each child stars; a comment only when you want. */
export function ActivityPage() {
  const token = useAccessToken()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [a, setA] = useState<ActivityDetail | null>(null)
  const [meta, setMeta] = useState<ProgressMeta | null>(null)
  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fill, setFill] = useState<number | null>(4)
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)

  const load = (d: ActivityDetail) => {
    setA(d)
    setEntries(Object.fromEntries(d.students.map((s) => [s.student_id, { status: s.status, rating: s.rating, comment: s.comment ?? '' }])))
    setOpen(new Set(d.students.filter((s) => s.comment).map((s) => s.student_id)))
  }
  useEffect(() => {
    if (!token) return
    progressApi.activity(id).then(load, (err) => setError(errorMessage(err)))
    progressApi.meta().then(setMeta, () => undefined)
  }, [token, id])

  const changed = useMemo(
    () =>
      a
        ? a.students.filter((s) => {
            const e = entries[s.student_id]
            return e && ((e.status ?? 'participated') !== (s.status ?? 'participated') || e.rating !== s.rating || e.comment.trim() !== (s.comment ?? ''))
          })
        : [],
    [a, entries],
  )

  if (!token) return <Navigate to="/login" replace />

  const set = (sid: string, patch: Partial<Entry>) => setEntries((e) => ({ ...e, [sid]: { ...e[sid], ...patch } }))
  // quick fill: children taking part who have no stars yet (not absent / N/A / locked)
  const fillable = (sid: string) => {
    const e = entries[sid]
    const kid = a?.students.find((x) => x.student_id === sid)
    return Boolean(e) && !kid?.locked && (e.status ?? 'participated') === 'participated' && e.rating == null
  }
  const unrated = a?.students.filter((s) => fillable(s.student_id)).length ?? 0

  async function save() {
    if (!a) return
    setSaving(true)
    setError(null)
    try {
      load(
        await progressApi.saveFeedback(
          a.id,
          changed.map((s) => {
            const e = entries[s.student_id]
            const status = e.status ?? 'participated'
            return { student_id: s.student_id, status, rating: status === 'participated' ? e.rating : null, comment: e.comment.trim() || null }
          }),
        ),
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-5 p-4 sm:p-6">
        <Link
          to={a ? `/progress?tab=activities&g=${a.class_id}:${a.section_id ?? ''}` : '/progress?tab=activities'}
          className="inline-flex items-center gap-1 text-sm font-bold text-brand"
        >
          <ArrowLeft className="size-4" /> Activities
        </Link>
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}
        {!a ? (
          !error && <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-white via-amber-50 to-emerald-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
              <div>
                <h1 className="text-2xl font-extrabold sm:text-3xl">{a.title}</h1>
                <p className="mt-1 text-sm">
                  {a.activity_type} · {a.place === 'outdoor' ? 'Outdoor' : 'Indoor'} · {shortDate(a.date)} · {groupLabel(a)}
                  {a.created_by && <span className="text-muted"> · added by {a.created_by}</span>}
                </p>
                {a.description && <p className="mt-2 max-w-2xl text-sm text-muted">{a.description}</p>}
              </div>
              {a.can_edit && (
                <span className="flex gap-2">
                  <button onClick={() => setDialog('edit')} className="btn-outline bg-white py-2 text-sm">
                    <Pencil className="size-4" /> Edit
                  </button>
                  <button onClick={() => setDialog('delete')} className="btn-outline bg-white py-2 text-sm text-rose-600" aria-label="Delete activity">
                    <Trash2 className="size-4" />
                  </button>
                </span>
              )}
            </section>

            {a.can_edit && (
              <section className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                <Sparkles className="size-4 text-amber-600" />
                <span className="text-sm font-semibold">Quick fill</span>
                <StarInput value={fill} onChange={setFill} label="Quick fill rating" size="size-4" />
                <button
                  type="button"
                  disabled={!fill || !unrated}
                  onClick={() =>
                    setEntries((e) =>
                      Object.fromEntries(Object.entries(e).map(([sid, x]) => [sid, fillable(sid) ? { ...x, status: 'participated', rating: fill } : x])),
                    )
                  }
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold ring-1 ring-amber-300 hover:bg-amber-100 disabled:opacity-50"
                >
                  Give {unrated} unrated
                </button>
                <span className="text-xs text-muted">Absent / not applicable children are skipped. Then change only the children who did differently.</span>
              </section>
            )}

            <ul className="divide-y divide-line rounded-2xl bg-white shadow-card ring-1 ring-line/60" aria-label="Children">
              {a.students.map((s) => {
                const e = entries[s.student_id] ?? { status: null, rating: null, comment: '' }
                const dirty = changed.some((c) => c.student_id === s.student_id)
                const canEdit = a.can_edit && !s.locked
                const st = e.status ?? 'participated'
                return (
                  <li key={s.student_id} aria-label={s.full_name} className={`px-4 py-3 ${dirty ? 'bg-amber-50/60' : ''}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar name={s.full_name} url={s.photo_url} gender={s.gender} size="size-9" />
                      <span className="min-w-40 flex-1">
                        <span className="font-bold">{s.full_name}</span>
                        <span className="flex flex-wrap gap-1">
                          {s.absent_in_attendance && (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Absent in attendance</span>
                          )}
                          {s.locked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              <Lock className="size-3" /> {s.locked}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={`${s.full_name} participation`}>
                        {STATUS_BUTTONS.map(([k, label]) => (
                          <button
                            key={k}
                            type="button"
                            disabled={!canEdit}
                            aria-pressed={st === k}
                            onClick={() => set(s.student_id, { status: k, rating: k === 'participated' ? e.rating : null })}
                            className={`rounded-md px-2 py-1 text-xs font-bold ${st === k ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'} disabled:cursor-default`}
                          >
                            {label}
                          </button>
                        ))}
                      </span>
                      {st === 'participated' ? (
                        <StarInput
                          value={e.rating}
                          onChange={(v) => set(s.student_id, { status: 'participated', rating: v })}
                          label={s.full_name}
                          disabled={!canEdit}
                        />
                      ) : (
                        <span className="w-[124px] text-center text-sm font-semibold text-muted">{PARTICIPATION_LABEL[st]}</span>
                      )}
                      {canEdit && !open.has(s.student_id) && (
                        <button
                          type="button"
                          onClick={() => setOpen((o) => new Set(o).add(s.student_id))}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-brand hover:bg-sky-50"
                          aria-label={`Add comment for ${s.full_name}`}
                        >
                          <MessageSquare className="size-3.5" /> Comment
                        </button>
                      )}
                    </div>
                    {(open.has(s.student_id) || (!canEdit && e.comment)) && (
                      <input
                        value={e.comment}
                        disabled={!canEdit}
                        maxLength={500}
                        onChange={(ev) => set(s.student_id, { comment: ev.target.value })}
                        placeholder="e.g. Lovely use of colours"
                        aria-label={`Comment for ${s.full_name}`}
                        className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand sm:ml-12 sm:w-[calc(100%-3rem)]"
                      />
                    )}
                  </li>
                )
              })}
              {a.students.length === 0 && <li className="py-10 text-center text-muted">No children in this class.</li>}
            </ul>

            {changed.length > 0 && (
              <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                <span className="text-sm font-semibold">
                  {changed.length} child{changed.length === 1 ? '' : 'ren'} changed
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => load(a)} className="btn-outline">
                    <RotateCcw className="size-4" /> Discard
                  </button>
                  <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save feedback
                  </button>
                </span>
              </div>
            )}
          </>
        )}
      </div>
      {dialog === 'edit' && a && meta && (
        <ActivityDialog
          meta={meta}
          group={a}
          initial={a}
          onClose={() => setDialog(null)}
          onSaved={() => progressApi.activity(a.id).then(load, (err) => setError(errorMessage(err)))}
        />
      )}
      {dialog === 'delete' && a && (
        <Dialog
          title="Delete this activity?"
          subtitle={`“${a.title}” and every child's feedback on it will be removed.`}
          submitLabel="Delete activity"
          danger
          onClose={() => setDialog(null)}
          onSubmit={async () => {
            await progressApi.deleteActivity(a.id)
            navigate(`/progress?tab=activities&g=${a.class_id}:${a.section_id ?? ''}`, { replace: true })
          }}
        />
      )}
    </AppShell>
  )
}
