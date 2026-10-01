import { useSyncExternalStore } from 'react'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

const STORAGE_KEY = 'schoolbee_tokens'

// "Remember me" keeps the session in localStorage; otherwise sessionStorage,
// which the browser clears when it closes.
function read(storage: Storage): TokenPair | null {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TokenPair) : null
  } catch {
    return null
  }
}

let tokens: TokenPair | null = read(localStorage) ?? read(sessionStorage)
let remember = read(localStorage) !== null
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function getAccessToken(): string | null {
  return tokens?.accessToken ?? null
}

export function getRefreshToken(): string | null {
  return tokens?.refreshToken ?? null
}

/** `rememberMe` is only passed at login; refreshes keep the current choice. */
export function setTokens(next: TokenPair, rememberMe: boolean = remember) {
  tokens = next
  remember = rememberMe
  try {
    ;(remember ? sessionStorage : localStorage).removeItem(STORAGE_KEY)
    ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage blocked (private mode etc.) - session still works in memory.
  }
  notify()
}

export function clearTokens() {
  tokens = null
  try {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Re-renders whenever tokens change (login, refresh, logout). */
export function useAccessToken(): string | null {
  return useSyncExternalStore(subscribe, getAccessToken)
}
