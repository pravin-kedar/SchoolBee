import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { SCHOOLBEE_API } from '../config'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth-store'

export interface TokenResponse {
  access_token: string
  refresh_token: string
}

/** Every call goes to /api/v1/schoolbee/... */
export const api = axios.create({ baseURL: SCHOOLBEE_API })

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const NO_REFRESH = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout', '/auth/google/exchange']

// Concurrent 401s share one in-flight refresh - refresh tokens are
// single-use, so a second parallel refresh would just be rejected.
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token available')

  const { data } = await axios.post<TokenResponse>(`${SCHOOLBEE_API}/auth/refresh`, {
    refresh_token: refreshToken,
  })
  setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token })
  return data.access_token
}

export const BLOCKED_KEY = 'schoolbee_blocked'

/** Window event: the school's licence turned out to be blocked (expired /
 *  suspended / no plan) - lib/license.ts reloads the status, the app gates. */
export const LICENSE_EVENT = 'schoolbee:license-blocked'

/** 423 = the website admin blocked this person or their school: end the
 *  session and let the login page say why. */
function kickOutIfBlocked(error: unknown) {
  if (!axios.isAxiosError(error) || error.response?.status !== 423) return
  if (error.config?.url?.endsWith('/auth/login')) return // the login form shows it itself
  try {
    sessionStorage.setItem(BLOCKED_KEY, errorMessage(error))
  } catch {
    /* ignore */
  }
  clearTokens()
  window.location.href = '/login'
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    kickOutIfBlocked(error)
    if (error.response?.status === 402 && error.response.headers['x-schoolbee-license'] === 'blocked') {
      window.dispatchEvent(new Event(LICENSE_EVENT))
    }
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    if (error.response?.status !== 401 || !original || original._retried || !getRefreshToken()) {
      throw error
    }
    // A 401 from these means wrong credentials / dead session - refreshing
    // can't help. Everything else (incl. /auth/me) gets one refresh + retry.
    if (NO_REFRESH.some((path) => original.url?.endsWith(path))) throw error

    original._retried = true
    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      original.headers.Authorization = `Bearer ${await refreshPromise}`
      return api(original)
    } catch (refreshError) {
      kickOutIfBlocked(refreshError)
      clearTokens()
      window.location.href = '/login'
      throw refreshError
    }
  },
)

/** Human-readable message from a FastAPI error (string or validation list). */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Can’t reach the server. Check your connection and try again.'
    const detail = (error.response.data as { detail?: unknown } | undefined)?.detail
    if (typeof detail === 'string') return detail.replace(' - ', ' — ')
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
    return fallback
  }
  // Client-side checks reject with a plain Error carrying the message to show.
  if (error instanceof Error && error.message) return error.message
  return fallback
}
