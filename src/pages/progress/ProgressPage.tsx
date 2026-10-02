import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Archive,
  ClipboardList,
  FileText,
  Loader2,
  Lock,
  MessageSquarePlus,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Star,
  Sun,
  Trees,
  X,
} from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { NoteDialog } from '../../components/progress/NoteDialog'
import { PeriodPicker } from '../../components/progress/PeriodPicker'
import { StudentDrawer } from '../../components/progress/StudentDrawer'
import { ReportsTab } from './ReportsTab'
import { StarInput } from '../../components/progress/Stars'
import { Avatar } from '../../components/students/StudentUi'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { useMediaQuery } from '../../lib/useMediaQuery'
import {
  FREQ_LABEL,
  groupKey,
  groupLabel,
  progressApi,
  type ActivityRow,
  type Criterion,
  type Frequency,
  type ProgressGroup,
  type ProgressMeta,
  type RatingSheet,
} from '../../lib/progress'
import { shortDate } from '../../lib/license'

type Tab = 'rate' | 'activities' | 'reports' | 'criteria'
const TABS: { key: Tab; label: string; icon: typeof Star }[] = [
  { key: 'rate', label: 'Rate progress', icon: Star },
  { key: 'activities', label: 'Activities', icon: Palette },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'criteria', label: 'Criteria', icon: ClipboardList },
]
const selectCls = 'rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand'

/** Student progress: rate the class in stars, quick notes, activities, criteria. */
export function ProgressPage() {
  const token = useAccessToken()
  const [params, setParams] = useSearchParams()
  const [meta, setMeta] = useState<ProgressMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!token) return
    progressApi.meta().then(setMeta, (err) => setError(errorMessage(err)))
  }, [token])

  if (!token) return <Navigate to="/login" replace />

  const tab = (params.get('tab') as Tab) || 'rate'
  const groups = meta?.groups ?? []
  const group = groups.find((g) => groupKey(g) === params.get('g')) ?? groups[0]
  const set = (patch: Record<string, string>) => {
    if (dirty && !window.confirm('You have unsaved ratings. Leave without saving?')) return
    setDirty(false)
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

  return (
    <AppShell>
      <div className="space-y-5 p-4 sm:p-6">
        <section className="rounded-2xl bg-gradient-to-r from-white via-amber-50 to-emerald-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Student Progress</h1>
          <p className="mt-0.5">Tap stars to rate your class — add a quick note only when something stands out.</p>
        </section>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        {meta && !group && tab !== 'criteria' ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-line/60">
            <p className="text-lg font-bold">You aren&rsquo;t class teacher of any section yet</p>
            <p className="mt-1 text-muted">Ask the school owner to make you class teacher (Classes page) to rate your children.</p>
          </section>
        ) : (
          <>
            <section className="flex flex-wrap items-center gap-3">
              {groups.length > 0 && (
                <select
                  aria-label="Class"
                  value={group ? groupKey(group) : ''}
                  onChange={(e) => set({ g: e.target.value })}
                  className={`${selectCls} min-w-44`}
                >
                  {groups.map((g) => (
                    <option key={groupKey(g)} value={groupKey(g)}>
                      {groupLabel(g)}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-card ring-1 ring-line/60" role="tablist">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => set({ tab: key === 'rate' ? '' : key })}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'}`}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
            </section>

            {!meta ? (
              !error && <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
            ) : tab === 'rate' && group ? (
              <RateTab meta={meta} group={group} params={params} set={set} onDirty={setDirty} />
            ) : tab === 'activities' && group ? (
              <ActivitiesTab meta={meta} group={group} />
            ) : tab === 'reports' && group ? (
              <ReportsTab meta={meta} group={group} />
            ) : tab === 'criteria' ? (
              <CriteriaTab meta={meta} />
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  )
}

// ------------------------------------------------------------------ rating grid

type Edits = Record<string, number | null> // `${studentId}|${criterionId}`

function RateTab({
  meta,
  group,
  params,
  set,
  onDirty,
}: {
  meta: ProgressMeta
  group: ProgressGroup
  params: URLSearchParams
  set: (p: Record<string, string>) => void
  onDirty: (d: boolean) => void
}) {
  const frequency = (params.get('f') as Frequency) || 'daily'
  const date = params.get('date') || meta.today
  const [sheet, setSheet] = useState<RatingSheet | null>(null)
  const [loadedKey, setLoadedKey] = useState('')
  const [edits, setEdits] = useState<Edits>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fill, setFill] = useState<number | null>(4)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [noteFor, setNoteFor] = useState<{ student_id: string; full_name: string }[] | null>(null)
  const [reload, setReload] = useState(0)
  const [covVersion, setCovVersion] = useState(0)
  const [drawer, setDrawer] = useState<{ id: string; name: string } | null>(null)
  const wide = useMediaQuery('(min-width: 768px)')

  const key = `${groupKey(group)}|${frequency}|${date}|${reload}`
  useEffect(() => {
    let live = true
    progressApi
      .sheet({
        class_id: group.class_id,
        section_id: group.section_id,
        frequency,
        date,
      })
      .then(
        (s) => {
          if (!live) return
          setSheet(s)
          setEdits({})
          setSelected(new Set())
          setError(null)
          setLoadedKey(key)
        },
        (err) => live && (setError(errorMessage(err)), setLoadedKey(key)),
      )
    return () => {
      live = false
    }
  }, [group.class_id, group.section_id, frequency, date, key])

  const changes = Object.keys(edits).length
  useEffect(() => onDirty(changes > 0), [changes, onDirty])

  const value = (sid: string, cid: string) => {
    const k = `${sid}|${cid}`
    return k in edits ? edits[k] : (sheet?.students.find((s) => s.student_id === sid)?.ratings[cid] ?? null)
  }
  const setCell = (sid: string, cid: string, v: number | null) =>
    setEdits((e) => {
      const saved = sheet?.students.find((s) => s.student_id === sid)?.ratings[cid] ?? null
      const next = { ...e }
      if (v === saved) delete next[`${sid}|${cid}`]
      else next[`${sid}|${cid}`] = v
      return next
    })
  const fillable = (s: RatingSheet['students'][number]) => !s.absent && !s.locked
  const empty = useMemo(() => {
    if (!sheet) return 0
    let n = 0
    for (const s of sheet.students) if (fillable(s)) for (const c of sheet.criteria) if (value(s.student_id, c.id) == null) n += 1
    return n
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, edits])

  async function save() {
    if (!sheet) return
    setSaving(true)
    setError(null)
    try {
      const ratings = Object.entries(edits).map(([k, rating]) => {
        const [student_id, criterion_id] = k.split('|')
        return { student_id, criterion_id, rating }
      })
      const s = await progressApi.saveSheet({
        class_id: group.class_id,
        section_id: group.section_id,
        frequency,
        date,
        ratings,
      })
      setSheet(s)
      setEdits({})
      setCovVersion((v) => v + 1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const nameBlock = (s: RatingSheet['students'][number]) => (
    <span className="flex items-start gap-3">
      <input
        type="checkbox"
        aria-label={`Select ${s.full_name}`}
        disabled={!editable || Boolean(s.locked)}
        checked={selected.has(s.student_id)}
        onChange={() =>
          setSelected((cur) => {
            const n = new Set(cur)
            if (n.has(s.student_id)) n.delete(s.student_id)
            else n.add(s.student_id)
            return n
          })
        }
        className="mt-3 size-4 accent-brand"
      />
      <Avatar name={s.full_name} url={s.photo_url} gender={s.gender} size="size-9" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDrawer({ id: s.student_id, name: s.full_name })}
            className="truncate text-left font-bold hover:text-brand hover:underline"
            aria-label={`Open ${s.full_name} history`}
          >
            {s.full_name}
          </button>
          {editable && !s.locked && (
            <button
              type="button"
              onClick={() => setNoteFor([s])}
              className="shrink-0 rounded-lg p-1 text-brand hover:bg-sky-50"
              aria-label={`Add note for ${s.full_name}`}
              title="Add a note"
            >
              <MessageSquarePlus className="size-4" />
            </button>
          )}
        </span>
        {(s.absent || s.locked) && (
          <span className="mt-1 flex flex-wrap gap-1">
            {s.absent && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Absent today</span>}
            {s.locked && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600"
                title="A published report covers this period"
              >
                <Lock className="size-3" /> {s.locked}
              </span>
            )}
          </span>
        )}
        {s.notes.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {s.notes.map((n) => (
              <span
                key={n.id}
                className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${n.kind === 'positive' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}
                title={n.text ?? undefined}
              >
                <span className="truncate">{[...n.tags, n.text].filter(Boolean).join(' · ')}</span>
                {editable && !s.locked && (
                  <button
                    type="button"
                    aria-label="Remove note"
                    onClick={async () => {
                      try {
                        await progressApi.deleteNote(n.id)
                        setReload((r) => r + 1)
                      } catch (err) {
                        setError(errorMessage(err))
                      }
                    }}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
          </span>
        )}
      </span>
    </span>
  )
  const loading = loadedKey !== key
  const editable = Boolean(sheet?.can_edit)
  const allChecked = Boolean(sheet?.students.length) && sheet!.students.every((s) => selected.has(s.student_id))
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 xl:sticky xl:top-0">
        <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1" role="group" aria-label="Frequency">
          {(['daily', 'weekly', 'monthly'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={frequency === f}
              onClick={() => set({ f: f === 'daily' ? '' : f })}
              className={`rounded-lg px-2 py-1.5 text-sm font-bold ${frequency === f ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              {FREQ_LABEL[f]}
            </button>
          ))}
        </div>
        <PeriodPicker
          key={`${frequency}|${groupKey(group)}`}
          group={group}
          frequency={frequency}
          date={date}
          today={meta.today}
          version={covVersion}
          onPick={(d) => set({ date: d })}
        />
      </aside>
      <div className="min-w-0 space-y-4">
        <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card ring-1 ring-line/60">
          <p className="text-lg font-extrabold">{sheet?.label ?? '…'}</p>
          {editable && sheet && sheet.criteria.length > 0 && (
            <div className="ml-auto flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
              <Sparkles className="size-4 text-amber-600" />
              <span className="text-sm font-semibold">Quick fill</span>
              <StarInput value={fill} onChange={setFill} label="Quick fill rating" size="size-4" />
              <button
                type="button"
                disabled={!fill || !empty}
                onClick={() =>
                  setEdits((e) => {
                    const next = { ...e }
                    for (const s of sheet.students)
                      if (fillable(s)) for (const c of sheet.criteria) if (value(s.student_id, c.id) == null) next[`${s.student_id}|${c.id}`] = fill
                    return next
                  })
                }
                className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold ring-1 ring-amber-300 hover:bg-amber-100 disabled:opacity-50"
              >
                Fill {empty} empty
              </button>
            </div>
          )}
        </section>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        {sheet && sheet.criteria.length === 0 ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-line/60">
            <p className="font-bold">No {FREQ_LABEL[frequency].toLowerCase()} criteria for this class</p>
            <p className="mt-1 text-sm text-muted">Try another frequency, or add criteria on the Criteria tab.</p>
          </section>
        ) : (
          <section className="rounded-2xl bg-white shadow-card ring-1 ring-line/60">
            {editable && selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
                <span className="text-sm font-bold">{selected.size} selected</span>
                <button
                  type="button"
                  onClick={() => setNoteFor(sheet!.students.filter((s) => selected.has(s.student_id)))}
                  className="btn-outline py-1.5 text-sm"
                >
                  <MessageSquarePlus className="size-4" /> Add a note for them
                </button>
              </div>
            )}
            {!wide ? (
              <div className={loading ? 'opacity-60' : ''}>
                <label className="flex items-center gap-3 border-b border-line bg-slate-50 px-4 py-2.5 text-xs font-bold text-ink/80">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    disabled={!editable || !sheet?.students.length}
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(sheet!.students.map((s) => s.student_id)))}
                    className="size-4 accent-brand"
                  />
                  Select all
                </label>
                <ul className="divide-y divide-line" aria-label="Children">
                  {sheet?.students.map((s) => (
                    <li key={s.student_id} aria-label={s.full_name} className={`px-4 py-3 ${selected.has(s.student_id) ? 'bg-sky-50/60' : ''}`}>
                      {nameBlock(s)}
                      <ul className="mt-2 space-y-1">
                        {sheet.criteria.map((c) => (
                          <li
                            key={c.id}
                            className={`flex items-center justify-between gap-2 rounded-lg py-1 pr-1 pl-7 ${`${s.student_id}|${c.id}` in edits ? 'bg-amber-50' : ''}`}
                          >
                            <span className="min-w-0 text-sm leading-tight">{c.name}</span>
                            <StarInput
                              value={value(s.student_id, c.id)}
                              onChange={(v) => setCell(s.student_id, c.id, v)}
                              label={`${s.full_name} – ${c.name}`}
                              disabled={!editable || Boolean(s.locked)}
                              size="size-6"
                            />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
                {!sheet && loading && <div className="m-4 h-40 animate-pulse rounded-xl bg-slate-100" />}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className={`w-full text-sm ${loading ? 'opacity-60' : ''}`}
                  style={{
                    minWidth: `${300 + (sheet?.criteria.length ?? 3) * 150}px`,
                  }}
                >
                  <thead>
                    <tr className="text-xs font-bold text-ink/80">
                      <th className="sticky left-0 z-10 w-72 bg-slate-50 px-4 py-3 text-left">
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            aria-label="Select all"
                            disabled={!editable || !sheet?.students.length}
                            checked={allChecked}
                            onChange={() => setSelected(allChecked ? new Set() : new Set(sheet!.students.map((s) => s.student_id)))}
                            className="size-4 accent-brand"
                          />
                          Student
                        </span>
                      </th>
                      {sheet?.criteria.map((c) => (
                        <th key={c.id} className="bg-slate-50 px-2 py-3 text-center align-bottom">
                          <span className="block text-[10px] font-bold tracking-wide text-muted uppercase">{c.area}</span>
                          <span className="block leading-tight">{c.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {!sheet && loading
                      ? Array.from({ length: 6 }, (_, i) => (
                          <tr key={i}>
                            <td colSpan={4} className="px-4 py-3">
                              <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      : sheet?.students.map((s) => (
                          <tr key={s.student_id} aria-label={s.full_name} className={selected.has(s.student_id) ? 'bg-sky-50/60' : ''}>
                            <td className="sticky left-0 z-10 bg-white px-4 py-2.5">{nameBlock(s)}</td>
                            {sheet.criteria.map((c) => {
                              const changed = `${s.student_id}|${c.id}` in edits
                              return (
                                <td key={c.id} className={`px-2 py-2.5 text-center ${changed ? 'bg-amber-50/70' : ''}`}>
                                  <StarInput
                                    value={value(s.student_id, c.id)}
                                    onChange={(v) => setCell(s.student_id, c.id, v)}
                                    label={`${s.full_name} – ${c.name}`}
                                    disabled={!editable || Boolean(s.locked)}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            )}
            {sheet && sheet.students.length === 0 && <p className="py-10 text-center text-muted">No active students in this class yet.</p>}
          </section>
        )}

        {changes > 0 && (
          <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <span className="text-sm font-semibold">
              {changes} unsaved rating{changes === 1 ? '' : 's'} · {sheet?.label}
            </span>
            <span className="flex gap-2">
              <button type="button" onClick={() => setEdits({})} className="btn-outline">
                <RotateCcw className="size-4" /> Discard
              </button>
              <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save ratings
              </button>
            </span>
          </div>
        )}

        {drawer && <StudentDrawer studentId={drawer.id} name={drawer.name} today={meta.today} onClose={() => setDrawer(null)} />}
        {noteFor && sheet && (
          <NoteDialog
            students={noteFor}
            date={date}
            tags={meta.note_tags}
            onClose={() => setNoteFor(null)}
            onSaved={() => {
              setSelected(new Set())
              setReload((r) => r + 1)
            }}
          />
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ activities

export function ActivityDialog({
  meta,
  group,
  initial,
  onClose,
  onSaved,
}: {
  meta: ProgressMeta
  group: ProgressGroup
  initial?: ActivityRow
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState(initial?.activity_type ?? meta.activity_types[0])
  const [place, setPlace] = useState<'indoor' | 'outdoor'>(initial?.place ?? 'indoor')
  const [date, setDate] = useState(initial?.date ?? meta.today)
  const [description, setDescription] = useState(initial?.description ?? '')
  return (
    <Dialog
      title={initial ? 'Edit activity' : `New activity · ${groupLabel(group)}`}
      subtitle="Then give each child stars (and a comment only if you want)."
      submitLabel={initial ? 'Save activity' : 'Create activity'}
      submitDisabled={title.trim().length < 2 || !date}
      onClose={onClose}
      onSubmit={async () => {
        const body = {
          class_id: group.class_id,
          section_id: group.section_id,
          date,
          title: title.trim(),
          activity_type: type,
          place,
          description: description.trim() || null,
        }
        const a = initial ? await progressApi.updateActivity(initial.id, body) : await progressApi.createActivity(body)
        onSaved(a.id)
      }}
    >
      <label className="block text-sm font-bold">
        What did the class do?
        <input
          autoFocus
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Colour painting – My family"
          aria-label="Activity title"
          className={`${selectCls} mt-1 w-full font-normal`}
        />
      </label>
      <div>
        <p className="text-sm font-bold">Type</p>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Activity type">
          {meta.activity_types.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${type === t ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-sm font-bold">Where</p>
          <div className="mt-1 grid grid-cols-2 gap-1.5" role="group" aria-label="Where">
            {(
              [
                ['indoor', 'Indoor', Sun],
                ['outdoor', 'Outdoor', Trees],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                aria-pressed={place === k}
                onClick={() => setPlace(k)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-bold ring-1 ${place === k ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'ring-line hover:bg-slate-50'}`}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-sm font-bold">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Activity date" className={`${selectCls} mt-1 w-full`} />
        </label>
      </div>
      <label className="block text-sm font-bold">
        Details <span className="font-normal text-muted">(optional)</span>
        <textarea
          value={description}
          maxLength={500}
          rows={2}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Activity details"
          className={`${selectCls} mt-1 w-full font-normal`}
        />
      </label>
    </Dialog>
  )
}

function ActivitiesTab({ meta, group }: { meta: ProgressMeta; group: ProgressGroup }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ActivityRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let live = true
    progressApi
      .activities({
        class_id: group.class_id,
        section_id: group.section_id ?? undefined,
      })
      .then(
        (r) => live && setRows(r),
        (err) => live && setError(errorMessage(err)),
      )
    return () => {
      live = false
    }
  }, [group.class_id, group.section_id])

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Painting, outdoor play, rhymes… create the activity, then rate each child.</p>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="size-4" /> New activity
        </button>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Activities">
        {rows?.map((a) => (
          <li key={a.id}>
            <Link
              to={`/progress/activities/${a.id}`}
              className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 transition hover:ring-brand/40"
              aria-label={a.title}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-bold">{a.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${a.place === 'outdoor' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-brand'}`}
                >
                  {a.place === 'outdoor' ? 'Outdoor' : 'Indoor'}
                </span>
              </span>
              <span className="mt-1 text-sm text-muted">
                {a.activity_type} · {shortDate(a.date)}
              </span>
              <span className="mt-3 flex items-center gap-2 text-sm">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{
                      width: `${a.total ? Math.round((a.rated * 100) / a.total) : 0}%`,
                    }}
                  />
                </span>
                <span className="text-xs font-semibold text-muted">
                  {a.rated}/{a.total} rated
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!rows && !error && <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />}
      {rows && rows.length === 0 && (
        <section className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-line/60">
          <p className="font-bold">No activities in the last two months</p>
          <p className="mt-1 text-sm text-muted">Add today&rsquo;s activity to start.</p>
        </section>
      )}
      {creating && <ActivityDialog meta={meta} group={group} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/progress/activities/${id}`)} />}
    </section>
  )
}

// ------------------------------------------------------------------ criteria

function CriteriaTab({ meta }: { meta: ProgressMeta }) {
  const [rows, setRows] = useState<Criterion[] | null>(null)
  const [archived, setArchived] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Criterion | 'new' | null>(null)
  const [reload, setReload] = useState(0)
  const myClasses = useMemo(() => {
    const seen = new Map<string, string>()
    for (const g of meta.groups) seen.set(g.class_id, g.class_name)
    return [...seen].map(([id, name]) => ({ id, name }))
  }, [meta.groups])

  useEffect(() => {
    let live = true
    progressApi.criteria({ include_archived: archived }).then(
      (r) => live && setRows(r),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [archived, reload])

  const canEdit = (c: Criterion) => meta.can_manage || (c.class_id != null && myClasses.some((m) => m.id === c.class_id))
  const areas = meta.areas.filter((a) => rows?.some((r) => r.area === a))
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          What teachers rate.{' '}
          {meta.can_manage ? 'School-wide criteria apply to every class; class teachers can add their own.' : 'You can add criteria for your own class.'}
        </p>
        <span className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="size-4 accent-brand" /> Show archived
          </label>
          <button onClick={() => setEditing('new')} className="btn-primary">
            <Plus className="size-4" /> Add criterion
          </button>
        </span>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
      {!rows && !error && <div className="h-60 animate-pulse rounded-2xl bg-slate-200/60" />}
      <div className="grid gap-4 lg:grid-cols-2">
        {areas.map((area) => (
          <section key={area} className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60" aria-label={area}>
            <h3 className="font-extrabold">{area}</h3>
            <ul className="mt-2 divide-y divide-line">
              {rows!
                .filter((r) => r.area === area)
                .map((c) => (
                  <li key={c.id} className={`flex items-center gap-2 py-2.5 text-sm ${c.is_active ? '' : 'opacity-60'}`} aria-label={c.name}>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{c.name}</span>
                      <span className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">{FREQ_LABEL[c.frequency]}</span>
                        <span className="rounded bg-sky-50 px-1.5 py-0.5 font-semibold text-brand">{c.class_name ?? 'All classes'}</span>
                        {!c.is_active && <span className="rounded bg-slate-200 px-1.5 py-0.5 font-semibold">Archived</span>}
                      </span>
                    </span>
                    {canEdit(c) && (
                      <button
                        onClick={() => setEditing(c)}
                        className="grid size-8 place-items-center rounded-lg hover:bg-slate-100"
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      {editing && (
        <CriterionDialog
          meta={meta}
          classes={myClasses}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setReload((r) => r + 1)}
        />
      )}
    </section>
  )
}

function CriterionDialog({
  meta,
  classes,
  initial,
  onClose,
  onSaved,
}: {
  meta: ProgressMeta
  classes: { id: string; name: string }[]
  initial: Criterion | null
  onClose: () => void
  onSaved: () => void
}) {
  const [area, setArea] = useState(initial?.area ?? meta.areas[0])
  const [name, setName] = useState(initial?.name ?? '')
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'weekly')
  const [scope, setScope] = useState(initial ? (initial.class_id ?? '') : meta.can_manage ? '' : (classes[0]?.id ?? ''))
  const [active, setActive] = useState(initial?.is_active ?? true)
  return (
    <Dialog
      title={initial ? 'Edit criterion' : 'Add criterion'}
      subtitle="Keep it short — teachers rate it with 1 to 5 stars."
      submitLabel={initial ? 'Save' : 'Add criterion'}
      submitDisabled={name.trim().length < 2 || (!meta.can_manage && !scope)}
      onClose={onClose}
      onSubmit={async () => {
        if (initial)
          await progressApi.updateCriterion(initial.id, {
            area,
            name: name.trim(),
            frequency,
            is_active: active,
          })
        else
          await progressApi.createCriterion({
            area,
            name: name.trim(),
            frequency,
            class_id: scope || null,
          })
        onSaved()
      }}
    >
      <label className="block text-sm font-bold">
        Criterion
        <input
          autoFocus
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Says please and thank you"
          aria-label="Criterion name"
          className={`${selectCls} mt-1 w-full font-normal`}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          Area
          <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area" className={`${selectCls} mt-1 w-full`}>
            {meta.areas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          Rated
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} aria-label="How often" className={`${selectCls} mt-1 w-full`}>
            {meta.frequencies.map((f) => (
              <option key={f} value={f}>
                {FREQ_LABEL[f]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!initial && (
        <label className="block text-sm font-bold">
          For
          <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="For which class" className={`${selectCls} mt-1 w-full`}>
            {meta.can_manage && <option value="">All classes</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} only
              </option>
            ))}
          </select>
        </label>
      )}
      {initial && (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={!active} onChange={(e) => setActive(!e.target.checked)} className="size-4 accent-brand" />
          <Archive className="size-4" /> Archived (hidden from the rating grid; past ratings stay)
        </label>
      )}
    </Dialog>
  )
}
