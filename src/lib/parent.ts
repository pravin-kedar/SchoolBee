/** Parent portal (backend: api/v1/schoolbee/parent.py). A parent session is
 *  separate from staff logins: its own token, kept in this browser. */
import axios from 'axios'
import { useSyncExternalStore } from 'react'

import { SCHOOLBEE_API } from '../config'
import type { AiResult } from './ai'
import { api } from './api'
import type { StudentProgress } from './progress'

const KEY = 'schoolbee_parent_token'
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
export function setParentToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {
    /* storage blocked: the session lasts until reload */
  }
  listeners.forEach((l) => l())
}
export function useParentToken(): string | null {
  return useSyncExternalStore((cb) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, read)
}

export const PARENT_GOOGLE_URL = `${SCHOOLBEE_API}/parent/google/login`

/** What the session token says: how they signed in, and whether they still
 *  have to replace the school's default password. */
export function parentClaims(token: string | null): { method: 'email' | 'phone'; mustChange: boolean } | null {
  if (!token) return null
  try {
    const body = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const sub = String(body.sub ?? '')
    return { method: sub.startsWith('phone:') ? 'phone' : 'email', mustChange: Boolean(body.mc) }
  } catch {
    return null
  }
}

const parentHttp = axios.create({ baseURL: `${SCHOOLBEE_API}/parent` })
parentHttp.interceptors.request.use((config) => {
  const token = read()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
parentHttp.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url ?? ''
    if (axios.isAxiosError(error) && error.response?.status === 401 && !url.endsWith('/exchange') && !url.endsWith('/login') && !url.endsWith('/password')) {
      setParentToken(null)
      window.location.href = '/parent/login'
    }
    if (axios.isAxiosError(error) && error.response?.status === 403 && /set your own password/i.test(String(error.response.data?.detail ?? ''))) {
      window.location.href = '/parent/password'
    }
    throw error
  },
)

export interface ParentChild {
  id: string
  name: string
  first_name: string
  gender: string | null
  photo_url: string | null
  school_name: string | null
  class_name: string | null
  section_name: string | null
  available: boolean
  unavailable_reason: string | null
}

export interface ChildOverview {
  child: {
    id: string
    name: string
    first_name: string
    gender: string | null
    photo_url: string | null
    class_name: string | null
    section_name: string | null
    class_teacher: string | null
  }
  school: { name: string }
  days: number
  summary: Omit<StudentProgress, 'full_name' | 'days'>
  reports: {
    id: string
    title: string
    period_kind: string
    date_from: string
    date_to: string
    published_at: string | null
    overall: number | null
    remarks: string | null
  }[]
  events: { id: string; title: string; event_type: string; start_date: string; end_date: string; description: string | null }[]
}

export interface ParentReport {
  id: string
  title: string
  period_kind: string
  date_from: string
  date_to: string
  published_at: string | null
  remarks: string | null
  summary: Omit<StudentProgress, 'full_name' | 'days'>
  student: { id: string; name: string; code: string | null; class: string | null; section: string | null }
  class_teacher: string | null
  school: { name: string | null }
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const parentApi = {
  exchange: (code: string) => data(parentHttp.post<{ access_token: string; email: string }>('/exchange', { code })),
  login: (phone: string, password: string) => data(parentHttp.post<{ access_token: string; must_change_password: boolean }>('/login', { phone, password })),
  changePassword: (new_password: string, current_password: string | null) =>
    data(parentHttp.post<{ access_token: string }>('/password', { new_password, current_password })),
  me: () => data(parentHttp.get<{ signed_in_as: string; method: 'email' | 'phone'; children: ParentChild[] }>('/me')),
  child: (id: string, days = 30) => data(parentHttp.get<ChildOverview>(`/children/${id}`, { params: { days } })),
  report: (childId: string, reportId: string) => data(parentHttp.get<ParentReport>(`/children/${childId}/reports/${reportId}`)),
  reportAi: (childId: string, reportId: string) => data(parentHttp.post<AiResult>(`/children/${childId}/reports/${reportId}/ai`)),
  reportPdf: async (childId: string, reportId: string) => {
    const res = await parentHttp.get<Blob>(`/children/${childId}/reports/${reportId}/pdf`, { responseType: 'blob' })
    const name = /filename="?([^";]+)"?/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? 'progress-report.pdf'
    const href = URL.createObjectURL(res.data)
    Object.assign(document.createElement('a'), { href, download: name }).click()
    setTimeout(() => URL.revokeObjectURL(href), 10_000)
  },
}

/** School side (owner): the default parent password + resetting a parent. */
export const parentLoginSettingsApi = {
  get: () => data(api.get<{ default_is_custom: boolean; set_at: string | null; built_in_default: string }>('/settings/parent-login')),
  setDefault: (password: string) =>
    data(api.put<{ default_is_custom: boolean; set_at: string | null; built_in_default: string }>('/settings/parent-login', { password })),
  reset: (phone: string) => data(api.post<{ phone: string; reset: boolean }>('/settings/parent-login/reset', { phone })),
}
