import { useEffect, useState, useSyncExternalStore } from 'react'

import { SCHOOLBEE_API } from '../config'
import { api, type TokenResponse } from './api'
import { clearTokens, getRefreshToken, setTokens, useAccessToken } from './auth-store'
import { setZapToken } from './zap'

export interface School {
  id: string
  name: string
  role: string
  logo_url: string | null
}

export interface Me {
  id: string
  full_name: string
  email: string | null
  active_school_id: string | null
  schools: School[]
  photo_url: string | null
  start_page: string
  /** What they may do in the active school (the API enforces it too). */
  permissions: string[]
  is_owner: boolean
  has_staff_record: boolean
}

export interface SignupInput {
  full_name: string
  school_name: string
  email: string
  phone: string
  password: string
}

// Same rule as the backend (app/schemas/schoolbee.py): digits plus + ( ) - and spaces.
export const PHONE_PATTERN = '\\+?[0-9][0-9 \\(\\)\\-]{6,18}'

/** Browser navigates here (not an XHR) to start Google sign-in. */
export const GOOGLE_LOGIN_URL = `${SCHOOLBEE_API}/auth/google/login`

function store(data: TokenResponse, rememberMe?: boolean) {
  setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token }, rememberMe)
}

/** Returns 'zap' when these were the website admin's credentials (the
 *  caller opens /zap), 'school' for a normal login. */
export async function login(email: string, password: string, rememberMe: boolean): Promise<'zap' | 'school'> {
  const { data } = await api.post<TokenResponse & { zap?: boolean }>('/auth/login', { email, password })
  if (data.zap) {
    clearTokens()
    setZapToken(data.access_token)
    return 'zap'
  }
  store(data, rememberMe)
  return 'school'
}

export async function signup(input: SignupInput) {
  const { data } = await api.post<TokenResponse>('/auth/signup', input)
  store(data, true)
}

export async function exchangeGoogleCode(code: string) {
  const { data } = await api.post<TokenResponse>('/auth/google/exchange', { code })
  store(data, true)
}

export async function createSchool(school_name: string, phone?: string) {
  const { data } = await api.post<TokenResponse>('/schools', { school_name, phone: phone || null })
  store(data)
}

/** Ends the session locally right away; revoking the refresh token on the
 *  server happens in the background so a slow/failed call can't block it. */
export async function logout() {
  const refresh_token = getRefreshToken()
  clearTokens()
  if (refresh_token) void api.post('/auth/logout', { refresh_token }).catch(() => undefined)
}

// One /auth/me per session token, shared by every page and component - the
// sidebar/top bar don't re-request it on each navigation. refreshMe() forces
// a reload (e.g. after the school name or logo changes).
let meCache: { token: string; version: number; promise: Promise<Me>; value?: Me } | null = null
let meVersion = 0
const meListeners = new Set<() => void>()

export function refreshMe() {
  meVersion += 1
  for (const listener of meListeners) listener()
}

function fetchMe(token: string): Promise<Me> {
  if (!meCache || meCache.token !== token || meCache.version !== meVersion) {
    const entry: NonNullable<typeof meCache> = {
      token,
      version: meVersion,
      promise: api.get<Me>('/auth/me').then((r) => r.data),
    }
    entry.promise.then(
      (me) => (entry.value = me),
      () => meCache === entry && (meCache = null),
    )
    meCache = entry
  }
  return meCache.promise
}

const subscribeMe = (listener: () => void) => {
  meListeners.add(listener)
  return () => meListeners.delete(listener)
}

/** Current user + schools, from the per-token cache. The previous result
 *  stays visible while a refetch is in flight (no loading flash). */
export function useMe() {
  const token = useAccessToken()
  const version = useSyncExternalStore(subscribeMe, () => meVersion)
  const [result, setResult] = useState<{ me: Me | null; failed: boolean } | null>(() =>
    meCache?.token === token && meCache.value ? { me: meCache.value, failed: false } : null,
  )

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetchMe(token).then(
      (me) => !cancelled && setResult({ me, failed: false }),
      () => !cancelled && setResult({ me: null, failed: true }),
    )
    return () => {
      cancelled = true
    }
  }, [token, version])

  return {
    me: token ? (result?.me ?? null) : null,
    loading: Boolean(token) && result === null,
    failed: Boolean(token) && Boolean(result?.failed),
    isLoggedIn: Boolean(token),
  }
}

/** The user's role in the active school: undefined while /auth/me loads,
 *  null if they have none. */
export function useSchoolRole(): string | null | undefined {
  const { me } = useMe()
  if (!me) return undefined
  return me.schools.find((s) => s.id === me.active_school_id)?.role ?? null
}

/** Permission checks for the active school. `ready` is false while /auth/me
 *  loads - render nothing permission-dependent until then. */
export function usePermission() {
  const { me } = useMe()
  const perms = new Set(me?.permissions ?? [])
  const isOwner = Boolean(me?.is_owner)
  return {
    ready: Boolean(me),
    isOwner,
    can: (permission: string) => isOwner || perms.has(permission),
  }
}
