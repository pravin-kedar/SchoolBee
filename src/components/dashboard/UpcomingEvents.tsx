import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import beeReading from '../../assets/bees/bee-reading.webp'
import { Avatar } from '../students/StudentUi'
import { Card } from './Widgets'
import { BIRTHDAY_STYLE, EVENT_STYLE, addDays, audienceLabel, calendarApi, timeLabel, todayIso, type UpcomingDay } from '../../lib/calendar'

const dayLabel = (iso: string, today: string) =>
  iso === today
    ? 'Today'
    : iso === addDays(today, 1)
      ? 'Tomorrow'
      : new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

/** Dashboard: today + the next 6 days - events and birthdays. */
export function UpcomingEvents({ className = '' }: { className?: string }) {
  const [days, setDays] = useState<UpcomingDay[] | null>(null)
  useEffect(() => {
    calendarApi.upcoming(7).then(
      (d) => {
        // A multi-day event is listed once - on its first day here ("till ...").
        const seen = new Set<string>()
        const list = d.days
          .map((day) => ({ ...day, events: day.events.filter((e) => !seen.has(e.id) && (seen.add(e.id), true)) }))
          .filter((day) => day.events.length || day.birthdays.length)
        setDays(list)
      },
      () => setDays([]),
    )
  }, [])
  const today = todayIso()

  return (
    <Card title="Upcoming Events" action={{ label: 'View Calendar', to: '/calendar' }} className={className}>
      {!days ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-3 text-center">
          <img src={beeReading} alt="" className="mb-1 h-14 w-auto opacity-90" />
          <p className="font-bold text-ink">Nothing in the next 7 days</p>
          <p className="text-sm text-muted">Holidays, events and birthdays will show up here.</p>
        </div>
      ) : (
        <ol className="space-y-4" aria-label="Upcoming events">
          {days.map((d) => (
            <li key={d.date}>
              <Link to={`/calendar?date=${d.date}`} className={`mb-1.5 inline-block text-xs font-bold tracking-wide uppercase hover:underline ${d.date === today ? 'text-brand' : 'text-muted'}`}>
                {dayLabel(d.date, today)}
              </Link>
              <ul className="space-y-1.5">
                {d.events.map((e) => {
                  const S = EVENT_STYLE[e.event_type]
                  return (
                    <li key={e.id} className="flex items-center gap-3" aria-label={e.title}>
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${S.soft}`}>
                        <S.icon className="size-4" />
                      </span>
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-sm font-bold text-ink">{e.title}</span>
                        <span className="text-xs text-muted">
                          {e.event_type}
                          {e.start_time ? ` · ${timeLabel(e.start_time)}` : ''}
                          {e.start_date !== e.end_date ? ` · till ${new Date(`${e.end_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''} · {audienceLabel(e)}
                        </span>
                      </span>
                    </li>
                  )
                })}
                {d.birthdays.map((b) => (
                  <li key={`${b.kind}-${b.person_id}`} className="flex items-center gap-3" aria-label={`Birthday ${b.name}`}>
                    <span className="relative shrink-0">
                      <Avatar name={b.name} url={b.photo_url} size="size-9" />
                      <span className={`absolute -right-1 -bottom-1 grid size-4.5 place-items-center rounded-full ring-2 ring-white ${BIRTHDAY_STYLE.soft}`}>
                        <BIRTHDAY_STYLE.icon className="size-3" />
                      </span>
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-sm font-bold text-ink">
                        {b.name} {d.date === today ? 'turns' : 'will turn'} {b.turning} 🎂
                      </span>
                      <span className="text-xs text-muted">
                        {b.kind === 'staff' ? 'Staff' : 'Student'}
                        {b.detail ? ` · ${b.detail}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
