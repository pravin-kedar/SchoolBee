/** Website admin area (/zap) - us, not a school owner. The admin logs in on
 *  the normal login page with the backend's .env credentials and gets a
 *  token of its own (8 hours, no refresh), kept apart from school sessions. */
import axios from 'axios'
import { useSyncExternalStore } from 'react'

import { SCHOOLBEE_API } from '../config'

const KEY = 'schoolbee_zap_token'
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setZapToken(token: string) {
  try {
    localStorage.setItem(KEY, token)
  } catch {
    /* private mode: session lasts until reload */
  }
  notify()
}

export function clearZapToken() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  notify()
}

export function useZapToken() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
  )
}

export const zapApi = axios.create({ baseURL: `${SCHOOLBEE_API}/zap` })

zapApi.interceptors.request.use((config) => {
  const token = read()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

zapApi.interceptors.response.use(
  (r) => r,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearZapToken()
      window.location.href = '/login?zap=expired'
    }
    throw error
  },
)

export interface ZapLoginRow {
  at: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  school_id: string | null
  school_name: string | null
  ip_address: string | null
}

export interface ZapSchoolRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  owner_name: string | null
  owner_email: string | null
  created_at: string
  setup_done: boolean
  students: number
  teachers: number
  staff: number
  last_login_at: string | null
  blocked_at: string | null
  blocked_reason: string | null
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface ZapOverview {
  schools: number
  schools_blocked: number
  schools_setup_done: number
  schools_new_7d: number
  schools_new_30d: number
  students: number
  teachers: number
  users: number
  users_blocked: number
  logins_today: number
  active_schools_today: number
  signups: { day: string; count: number }[]
  recent_schools: ZapSchoolRow[]
  recent_logins: ZapLoginRow[]
}

export interface ZapMember {
  user_id: string
  member_id: string
  full_name: string
  email: string | null
  username: string | null
  role: string
  status: string
  joined_at: string
  last_login_at: string | null
  blocked_reason: string | null
  blocked_at: string | null
}

export interface ZapSchoolDetail {
  school: ZapSchoolRow
  principal_name: string | null
  website: string | null
  registration_number: string | null
  logo_url: string | null
  setup_completed_at: string | null
  stats: {
    students: number
    students_inactive: number
    classes: number
    sections: number
    teachers: number
    staff: number
    documents: number
    attendance_days: number
  }
  members: ZapMember[]
  logins: ZapLoginRow[]
}

export type SchoolFilter = '' | 'active' | 'blocked' | 'setup_pending'
export type SchoolSort = 'newest' | 'oldest' | 'name' | 'students' | 'last_login'

const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null))
const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const zap = {
  overview: () => data(zapApi.get<ZapOverview>('/overview')),
  schools: (p: { q?: string; status?: SchoolFilter; sort?: SchoolSort; page?: number; page_size?: number }) =>
    data(zapApi.get<Paged<ZapSchoolRow>>('/schools', { params: clean(p) })),
  school: (id: string) => data(zapApi.get<ZapSchoolDetail>(`/schools/${id}`)),
  blockSchool: (id: string, reason: string) => data(zapApi.post<ZapSchoolDetail>(`/schools/${id}/block`, { reason })),
  unblockSchool: (id: string) => data(zapApi.post<ZapSchoolDetail>(`/schools/${id}/unblock`)),
  blockUser: (schoolId: string, userId: string, reason: string) =>
    data(zapApi.post<ZapSchoolDetail>(`/schools/${schoolId}/users/${userId}/block`, { reason })),
  unblockUser: (schoolId: string, userId: string) => data(zapApi.post<ZapSchoolDetail>(`/schools/${schoolId}/users/${userId}/unblock`)),
  logins: (p: { school_id?: string; q?: string; page?: number; page_size?: number }) =>
    data(zapApi.get<Paged<ZapLoginRow>>('/logins', { params: clean(p) })),
}

/** "5 min ago", "3 h ago", "2 days ago", then the date. */
export function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  if (mins < 60 * 24 * 7) return `${Math.round(mins / 60 / 24)} days ago`
  return dateTime(iso, false)
}

export const dateTime = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
