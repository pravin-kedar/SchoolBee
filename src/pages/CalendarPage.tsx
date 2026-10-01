import { useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2, Users, X } from 'lucide-react'

import schoolBand from '../assets/school-band.webp'
import { AppShell } from '../components/app/AppShell'
import { Avatar } from '../components/students/StudentUi'
import { Dialog } from '../components/ui/Dialog'
import { errorMessage } from '../lib/api'
import { useAccessToken } from '../lib/auth-store'
import {
  BIRTHDAY_STYLE,
  EVENT_STYLE,
  EVENT_TYPES,
  addDays,
  audienceLabel,
  calendarApi,
  dayTitle,
  isoOf,
  todayIso,
  monthTitle,
  shiftMonth,
  timeLabel,
  type CalEvent,
  type CalendarMonth,
  type EventInput,
  type EventType,
} from '../lib/calendar'
import { useSchoolOptions } from '../lib/schoolOptions'

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const inputCls = 'mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-brand'

/** School calendar: month grid of events, holidays and birthdays. Everyone
 *  sees it; only the owner adds/edits events. */
export function CalendarPage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const today = todayIso()
  const selected = params.get('date') ?? today
  const month = selected.slice(0, 7) // the month always follows the selected day
  const [data, setData] = useState<CalendarMonth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<CalEvent | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CalEvent | null>(null)

  useEffect(() => {
    if (!token) return
    let live = true
    calendarApi.month(month).then(
      (d) => live && (setData(d), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [token, month, reload])

  const byDay = useMemo(() => {
    const map = new Map<string, { events: CalEvent[]; birthdays: CalendarMonth['birthdays'] }>()
    if (!data) return map
    const get = (d: string) => map.get(d) ?? (map.set(d, { events: [], birthdays: [] }), map.get(d)!)
    for (const e of data.events) {
      if (hidden.has(e.event_type)) continue
      for (let d = e.start_date; d <= e.end_date; d = addDays(d, 1)) if (d.startsWith(month)) get(d).events.push(e)
    }
    if (!hidden.has('Birthday')) for (const b of data.birthdays) get(b.date).birthdays.push(b)
    return map
  }, [data, hidden, month])

  if (!token) return <Navigate to="/login" replace />

  const select = (iso: string) => setParams({ date: iso }, { replace: true })
  const goMonth = (m: string) => select(m === today.slice(0, 7) ? today : `${m}-01`)
  const toggle = (key: string) =>
    setHidden((h) => {
      const n = new Set(h)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })

  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const cells: (string | null)[] = [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => isoOf(new Date(y, m - 1, i + 1))),
  ]
  while (cells.length % 7) cells.push(null)
  const day = byDay.get(selected) ?? { events: [], birthdays: [] }
  const monthEvents = (data?.events ?? []).filter((e) => !hidden.has(e.event_type))

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-amber-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <img src={schoolBand} alt="" className="pointer-events-none absolute top-0 right-10 hidden h-full [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] 2xl:block" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">School Calendar</h1>
              <p className="mt-0.5">Holidays, special days, trips, events and birthdays — all in one place.</p>
            </div>
            {data?.can_manage && (
              <button onClick={() => setEditing('new')} className="btn-primary px-5 py-3">
                <Plus className="size-5" /> Add Event
              </button>
            )}
          </div>
        </section>

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => goMonth(shiftMonth(month, -1))} className="grid size-9 place-items-center rounded-lg ring-1 ring-line hover:bg-slate-50" aria-label="Previous month">
                  <ChevronLeft className="size-4" />
                </button>
                <button onClick={() => goMonth(shiftMonth(month, 1))} className="grid size-9 place-items-center rounded-lg ring-1 ring-line hover:bg-slate-50" aria-label="Next month">
                  <ChevronRight className="size-4" />
                </button>
                <h2 className="ml-1 text-xl font-extrabold" aria-live="polite">
                  {monthTitle(month)}
                </h2>
                {month !== today.slice(0, 7) && (
                  <button onClick={() => select(today)} className="ml-2 rounded-lg px-3 py-1.5 text-sm font-bold text-brand ring-1 ring-sky-200 hover:bg-sky-50">
                    Today
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
                {[...EVENT_TYPES, 'Birthday' as const].map((t) => {
                  const style = t === 'Birthday' ? BIRTHDAY_STYLE : EVENT_STYLE[t]
                  const off = hidden.has(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={!off}
                      onClick={() => toggle(t)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition ${off ? 'text-muted ring-line line-through' : `${style.chip} ring-transparent`}`}
                    >
                      <span className={`size-2 rounded-full ${off ? 'bg-slate-300' : style.dot}`} /> {t === 'Birthday' ? 'Birthdays' : t}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid" aria-label={monthTitle(month)}>
              {WEEK.map((d, i) => (
                <div key={d} className={`rounded-lg py-1.5 text-center text-xs font-bold ${data?.weekly_off.includes(i) ? 'bg-slate-100 text-muted' : 'bg-slate-50 text-ink/70'}`}>
                  {d}
                </div>
              ))}
              {cells.map((iso, i) => {
                if (!iso) return <div key={`e${i}`} />
                const info = byDay.get(iso)
                const holiday = info?.events.find((e) => e.event_type === 'Holiday')
                const off = data?.weekly_off.includes(i % 7)
                const chips = [
                  ...(info?.events ?? []).map((e) => ({ key: e.id, label: e.title, cls: EVENT_STYLE[e.event_type].chip })),
                  ...(info?.birthdays.length
                    ? [{ key: 'b', label: info.birthdays.length === 1 ? `🎂 ${info.birthdays[0].name.split(' ')[0]}` : `🎂 ${info.birthdays.length} birthdays`, cls: BIRTHDAY_STYLE.chip }]
                    : []),
                ]
                return (
                  <button
                    key={iso}
                    role="gridcell"
                    aria-label={`${dayTitle(iso)}${info ? `, ${info.events.length} event(s), ${info.birthdays.length} birthday(s)` : ''}`}
                    aria-selected={iso === selected}
                    onClick={() => select(iso)}
                    className={`flex min-h-20 flex-col gap-1 rounded-xl p-1.5 text-left ring-1 transition sm:min-h-28 sm:p-2 ${
                      iso === selected ? 'ring-2 ring-brand' : 'ring-line hover:ring-slate-300'
                    } ${holiday ? 'bg-rose-50/70' : off ? 'bg-slate-50' : 'bg-white'}`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                        iso === today ? 'bg-brand text-white' : holiday ? 'text-rose-600' : off ? 'text-muted' : 'text-ink'
                      }`}
                    >
                      {Number(iso.slice(8))}
                    </span>
                    <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                      {chips.slice(0, 3).map((c) => (
                        <span key={c.key} className={`truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${c.cls}`}>
                          {c.label}
                        </span>
                      ))}
                      {chips.length > 3 && <span className="px-1 text-[11px] font-bold text-muted">+{chips.length - 3} more</span>}
                    </span>
                    {chips.length > 0 && (
                      <span className="flex gap-0.5 sm:hidden">
                        {(info?.events ?? []).slice(0, 3).map((e) => (
                          <span key={e.id} className={`size-1.5 rounded-full ${EVENT_STYLE[e.event_type].dot}`} />
                        ))}
                        {info?.birthdays.length ? <span className={`size-1.5 rounded-full ${BIRTHDAY_STYLE.dot}`} /> : null}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Selected day">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold tracking-wide text-muted uppercase">{selected === today ? 'Today' : selected === addDays(today, 1) ? 'Tomorrow' : ''}</p>
                  <h2 className="text-lg font-bold">{dayTitle(selected)}</h2>
                </div>
                {data?.can_manage && (
                  <button onClick={() => setEditing('new')} className="grid size-9 shrink-0 place-items-center rounded-lg text-brand ring-1 ring-sky-200 hover:bg-sky-50" aria-label="Add event on this day">
                    <Plus className="size-4" />
                  </button>
                )}
              </div>
              {day.events.length === 0 && day.birthdays.length === 0 && <p className="text-sm text-muted">Nothing on this day.</p>}
              <ul className="space-y-3">
                {day.events.map((e) => (
                  <EventRow key={e.id} e={e} canManage={!!data?.can_manage} onEdit={() => setEditing(e)} onDelete={() => setDeleting(e)} />
                ))}
              </ul>
              {day.birthdays.length > 0 && (
                <>
                  <p className="mt-4 mb-2 flex items-center gap-1.5 text-sm font-bold text-pink-600">
                    <BIRTHDAY_STYLE.icon className="size-4" /> Birthdays
                  </p>
                  <ul className="space-y-2">
                    {day.birthdays.map((b) => (
                      <li key={`${b.kind}-${b.person_id}`} className="flex items-center gap-3">
                        <Avatar name={b.name} url={b.photo_url} size="size-9" />
                        <span className="min-w-0 text-sm leading-tight">
                          <span className="block font-bold">{b.name}</span>
                          <span className="text-xs text-muted">
                            {b.kind === 'staff' ? 'Staff' : 'Student'}
                            {b.detail ? ` · ${b.detail}` : ''} · turns {b.turning}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="This month">
              <h2 className="mb-3 text-lg font-bold">This month</h2>
              {monthEvents.length === 0 ? (
                <p className="text-sm text-muted">No events in {monthTitle(month)}.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {monthEvents.map((e) => {
                    const S = EVENT_STYLE[e.event_type]
                    return (
                      <li key={e.id}>
                        <button onClick={() => select(e.start_date < `${month}-01` ? `${month}-01` : e.start_date)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-50">
                          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${S.soft}`}>
                            <S.icon className="size-4" />
                          </span>
                          <span className="min-w-0 leading-tight">
                            <span className="block truncate text-sm font-bold">{e.title}</span>
                            <span className="text-xs text-muted">{e.when}</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>

      {editing && data && (
        <EventDialog
          event={editing === 'new' ? null : editing}
          day={selected}
          classes={data.classes}
          onClose={() => setEditing(null)}
          onSaved={(e) => {
            setEditing(null)
            select(e.start_date)
            setReload((n) => n + 1)
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          event={deleting}
          onClose={() => setDeleting(null)}
          onDone={() => {
            setDeleting(null)
            setReload((n) => n + 1)
          }}
        />
      )}
    </AppShell>
  )
}

function EventRow({ e, canManage, onEdit, onDelete }: { e: CalEvent; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const S = EVENT_STYLE[e.event_type]
  return (
    <li className="rounded-xl p-3 ring-1 ring-line" aria-label={e.title}>
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${S.soft}`}>
          <S.icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">{e.title}</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${S.chip}`}>{e.event_type}</span>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <CalendarDays className="size-3.5" /> {e.start_date === e.end_date ? 'One day' : e.when.split(',')[0]}
          </p>
          {e.start_time && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="size-3.5" /> {timeLabel(e.start_time)}
              {e.end_time ? ` – ${timeLabel(e.end_time)}` : ''}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Users className="size-3.5" /> {audienceLabel(e)}
          </p>
          {e.description && <p className="mt-1.5 text-sm whitespace-pre-line">{e.description}</p>}
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-0.5">
            <button onClick={onEdit} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label={`Edit ${e.title}`}>
              <Pencil className="size-4" />
            </button>
            <button onClick={onDelete} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Delete ${e.title}`}>
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

function EventDialog({
  event,
  day,
  classes,
  onClose,
  onSaved,
}: {
  event: CalEvent | null
  day: string
  classes: { id: string; name: string }[]
  onClose: () => void
  onSaved: (e: CalEvent) => void
}) {
  const today = todayIso()
  const [f, setF] = useState<EventInput>(() =>
    event
      ? {
          title: event.title,
          event_type: event.event_type,
          start_date: event.start_date,
          end_date: event.end_date,
          start_time: event.start_time?.slice(0, 5) ?? null,
          end_time: event.end_time?.slice(0, 5) ?? null,
          description: event.description,
          class_ids: event.classes.map((c) => c.id),
          notify: true,
        }
      : { title: '', event_type: 'Holiday', start_date: day, end_date: day, start_time: null, end_time: null, description: null, class_ids: [], notify: day >= today },
  )
  const set = (patch: Partial<EventInput>) => setF((x) => ({ ...x, ...patch }))
  const whole = f.class_ids.length === 0
  const invalid = f.title.trim().length < 2 || !f.start_date || (f.end_date ?? f.start_date) < f.start_date

  return (
    <Dialog
      title={event ? 'Edit event' : 'Add event'}
      subtitle={event ? undefined : 'It shows on everyone’s calendar. Holidays also count as days off for attendance and payroll.'}
      submitLabel={event ? 'Save changes' : 'Add event'}
      submitDisabled={invalid}
      size="lg"
      onClose={onClose}
      onSubmit={async () => {
        const body = { ...f, title: f.title.trim(), description: f.description?.trim() || null, end_date: f.end_date || f.start_date }
        onSaved(event ? await calendarApi.update(event.id, body) : await calendarApi.create(body))
      }}
    >
      <label className="block text-sm font-bold">
        Title
        <input autoFocus value={f.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Diwali vacation, Annual Day" aria-label="Event title" className={inputCls} />
      </label>
      <div>
        <p className="text-sm font-bold">Type</p>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Event type">
          {EVENT_TYPES.map((t: EventType) => {
            const S = EVENT_STYLE[t]
            return (
              <button
                key={t}
                type="button"
                aria-pressed={f.event_type === t}
                onClick={() => set({ event_type: t })}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${f.event_type === t ? `${S.chip} ring-current` : 'ring-line hover:bg-slate-50'}`}
              >
                <S.icon className="size-4" /> {t}
              </button>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold">
          From
          <input
            type="date"
            value={f.start_date}
            onChange={(e) => set({ start_date: e.target.value, end_date: !f.end_date || f.end_date < e.target.value ? e.target.value : f.end_date })}
            aria-label="Start date"
            className={inputCls}
          />
        </label>
        <label className="block text-sm font-bold">
          To <span className="font-normal text-muted">(optional)</span>
          <input type="date" value={f.end_date ?? ''} min={f.start_date} onChange={(e) => set({ end_date: e.target.value })} aria-label="End date" className={inputCls} />
        </label>
        <label className="block text-sm font-bold">
          Start time <span className="hidden font-normal text-muted sm:inline">(optional)</span>
          <input type="time" value={f.start_time ?? ''} onChange={(e) => set({ start_time: e.target.value || null, ...(e.target.value ? {} : { end_time: null }) })} aria-label="Start time" className={inputCls} />
        </label>
        <label className="block text-sm font-bold">
          End time <span className="hidden font-normal text-muted sm:inline">(optional)</span>
          <input type="time" value={f.end_time ?? ''} disabled={!f.start_time} onChange={(e) => set({ end_time: e.target.value || null })} aria-label="End time" className={`${inputCls} disabled:bg-slate-50`} />
        </label>
      </div>
      <div>
        <p className="text-sm font-bold">For</p>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Event for">
          <button type="button" aria-pressed={whole} onClick={() => set({ class_ids: [] })} className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${whole ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}>
            Whole school
          </button>
          {classes.map((c) => {
            const on = f.class_ids.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => set({ class_ids: on ? f.class_ids.filter((x) => x !== c.id) : [...f.class_ids, c.id] })}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${on ? 'bg-sky-100 text-brand ring-brand' : 'ring-line hover:bg-slate-50'}`}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </div>
      <label className="block text-sm font-bold">
        Details <span className="font-normal text-muted">(optional)</span>
        <textarea rows={2} maxLength={500} value={f.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder="e.g. Costume: traditional wear. Pick-up at 1 PM." aria-label="Event details" className={`${inputCls} resize-none`} />
      </label>
      <label className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-line">
        <input type="checkbox" checked={f.notify} onChange={(e) => set({ notify: e.target.checked })} className="size-4 accent-brand" aria-label="Notify staff" />
        <span>
          <span className="font-bold">Notify staff</span>
          <span className="block text-xs text-muted">{event ? 'Only if the date, time, type, title or classes change.' : 'Bell + a pop-up when they next log in.'}</span>
        </span>
      </label>
    </Dialog>
  )
}

function DeleteDialog({ event, onClose, onDone }: { event: CalEvent; onClose: () => void; onDone: () => void }) {
  const upcoming = event.end_date >= todayIso()
  const [notify, setNotify] = useState(upcoming)
  return (
    <Dialog
      title={`Delete “${event.title}”?`}
      subtitle={`${event.event_type} · ${event.when}. It disappears from everyone’s calendar.`}
      submitLabel="Delete event"
      danger
      onClose={onClose}
      onSubmit={async () => {
        await calendarApi.remove(event.id, notify)
        onDone()
      }}
    >
      {upcoming && (
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-brand" aria-label="Tell staff it is cancelled" />
          Tell staff it’s cancelled
        </label>
      )}
      {!upcoming && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <X className="size-4" /> This event is over — staff won’t be notified.
        </p>
      )}
    </Dialog>
  )
}
