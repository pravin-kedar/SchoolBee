/** School calendar + in-app notifications (backend: calendar.py). */
import { Cake, CalendarHeart, Bus, PartyPopper, Sparkles, Umbrella, type LucideIcon } from 'lucide-react'

import { api } from './api'

export type EventType = 'Holiday' | 'Special Day' | 'Trip' | 'Annual Event' | 'Other'
export const EVENT_TYPES: EventType[] = ['Holiday', 'Special Day', 'Trip', 'Annual Event', 'Other']

export interface ClassRef {
  id: string
  name: string
}

export interface CalEvent {
  id: string
  title: string
  event_type: EventType
  start_date: string
  end_date: string
  start_time: string | null // "09:00:00"
  end_time: string | null
  description: string | null
  whole_school: boolean
  classes: ClassRef[]
  when: string
  created_by: string | null
  updated_at: string
}

export interface Birthday {
  date: string
  kind: 'student' | 'staff'
  person_id: string
  name: string
  detail: string | null
  photo_url: string | null
  turning: number
}

export interface CalendarMonth {
  month: string
  weekly_off: number[]
  can_manage: boolean
  event_types: EventType[]
  classes: ClassRef[]
  events: CalEvent[]
  birthdays: Birthday[]
}

export interface UpcomingDay {
  date: string
  events: CalEvent[]
  birthdays: Birthday[]
}

export interface EventInput {
  title: string
  event_type: EventType
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  description: string | null
  class_ids: string[]
  notify: boolean
}

export interface AppNotification {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  created_at: string
  created_by: string | null
  unread: boolean
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const calendarApi = {
  month: (month: string) => data(api.get<CalendarMonth>('/calendar', { params: { month } })),
  upcoming: (days = 7) => data(api.get<{ start: string; end: string; days: UpcomingDay[] }>('/calendar/upcoming', { params: { days } })),
  create: (body: EventInput) => data(api.post<CalEvent>('/calendar/events', body)),
  update: (id: string, body: EventInput) => data(api.put<CalEvent>(`/calendar/events/${id}`, body)),
  remove: (id: string, notify: boolean) => api.delete(`/calendar/events/${id}`, { params: { notify } }),
}

export const notificationsApi = {
  list: () => data(api.get<{ unread: number; items: AppNotification[] }>('/notifications')),
  seen: () => api.post('/notifications/seen'),
}

/** Colour + icon per event type (chips, dots, list rows). */
export const EVENT_STYLE: Record<EventType, { icon: LucideIcon; chip: string; dot: string; soft: string }> = {
  Holiday: { icon: Umbrella, chip: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', soft: 'bg-rose-50 text-rose-600' },
  'Special Day': { icon: Sparkles, chip: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', soft: 'bg-violet-50 text-violet-600' },
  Trip: { icon: Bus, chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-600' },
  'Annual Event': { icon: PartyPopper, chip: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-600' },
  Other: { icon: CalendarHeart, chip: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500', soft: 'bg-sky-50 text-brand' },
}
export const BIRTHDAY_STYLE = { icon: Cake, chip: 'bg-pink-100 text-pink-700', dot: 'bg-pink-500', soft: 'bg-pink-50 text-pink-600' }

/** "9:00 AM" from "09:00:00". */
export const timeLabel = (t: string | null) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export const audienceLabel = (e: CalEvent) => (e.whole_school ? 'Whole school' : e.classes.map((c) => c.name).join(', '))

const pad = (n: number) => String(n).padStart(2, '0')
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayIso = () => isoOf(new Date())
export const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoOf(new Date(y, m - 1, d + n))
}
export const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
export const monthTitle = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
export const dayTitle = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
