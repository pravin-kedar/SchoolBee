/** SchoolBee licences, plans and payments (backend: api/v1/schoolbee/license.py). */
import { useEffect, useState } from 'react'

import { api, LICENSE_EVENT } from './api'
import { zapApi } from './zap'

export type LicenseStatusName = 'none' | 'trial' | 'active' | 'expired' | 'suspended'
export type Cycle = 'monthly' | 'yearly'

export interface LicenseStatus {
  status: LicenseStatusName
  plan: string | null
  plan_name: string
  ends_on: string | null
  days_left: number | null
  delete_on: string | null
  suspended_reason: string | null
  blocked: boolean
  reminder: 'none' | 'owner' | 'all'
  continues: boolean
  retention_days: number | null
}

export interface Plan {
  key: string
  name: string
  description: string | null
  is_trial: boolean
  trial_days: number | null
  price_monthly: number
  price_yearly: number | null
  students: number | null
  storage_mb: number
  staff_logins: number | null
  retention_days: number
  features: string[]
  is_active: boolean
  highlight: boolean
  sort_order: number
}

export interface Feature {
  name: string
  description: string
  ready: boolean
}

export interface LicenseRow {
  id: string
  plan: string
  plan_name: string
  kind: 'trial' | 'paid' | 'complimentary'
  source: 'system' | 'admin' | 'online'
  cycle: string | null
  starts_on: string
  ends_on: string
  amount: number
  payment_mode: string | null
  payment_reference: string | null
  note: string | null
  receipt_no: string | null
  created_by: string | null
  created_at: string
  cancelled_at: string | null
  cancel_reason: string | null
  state: 'Current' | 'Upcoming' | 'Ended' | 'Cancelled'
}

export interface LicenseDetail {
  status: LicenseStatus
  limits: { students: number | null; storage_mb: number; staff_logins: number | null }
  usage: { students: number; storage_mb: number; staff_logins: number; staff: number }
  features: string[]
  plans: Plan[]
  catalog: Record<string, Feature>
  trial: Plan | null
  history: LicenseRow[]
  online_payment: boolean
  contact: { name: string; email: string; phone: string }
}

export interface AdminLicenseDetail extends LicenseDetail {
  all_plans: Plan[]
  deletable: boolean
}

export interface Quote {
  plan: string
  plan_name: string
  cycle: Cycle
  list_price: number
  credit: number
  amount: number
  starts_on: string
  ends_on: string
  kind: 'new' | 'renewal' | 'upgrade' | 'downgrade'
}

interface Checkout {
  done: boolean
  detail: LicenseDetail | null
  order_id: string | null
  amount: number | null
  currency: string
  key_id: string | null
  name: string | null
  description: string | null
  prefill: Record<string, string> | null
}

export interface SchoolLicenseRow {
  id: string
  name: string
  owner_email: string | null
  joined: string
  plan: string | null
  plan_name: string
  status: LicenseStatusName
  ends_on: string | null
  days_left: number | null
  delete_on: string | null
  continues: boolean
  deletable: boolean
  suspended_reason: string | null
}

export interface LicenseOverview {
  counts: Record<LicenseStatusName, number>
  revenue_year: number
  revenue_month: number
  expiring: SchoolLicenseRow[]
  expired: SchoolLicenseRow[]
  deletable: number
}

export interface PaymentRow {
  id: string
  school_id: string | null
  school_name: string
  plan: string
  plan_name: string
  cycle: string | null
  amount: number
  credit: number
  gateway: 'razorpay' | 'manual'
  status: 'created' | 'paid' | 'failed'
  order_id: string | null
  gateway_payment_id: string | null
  method: string | null
  reference: string | null
  receipt_no: string | null
  error: string | null
  created_by: string | null
  created_at: string
  paid_at: string | null
}

export interface DeletedSchool {
  id: string
  name: string
  owner_name: string | null
  owner_email: string | null
  plan_name: string | null
  expired_on: string | null
  summary: Record<string, number | string>
  reason: string | null
  deleted_by: string | null
  deleted_at: string
}

export interface ApplyInput {
  plan: string
  kind: 'paid' | 'complimentary'
  months: number | null
  starts_on: string | null
  ends_on: string | null
  amount: number
  payment_mode: string | null
  payment_reference: string | null
  note: string | null
}

export type PlanInput = Omit<Plan, 'key'>
export interface LicenseSettings {
  reminder_days: number
  all_staff_days: number
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

async function download(p: Promise<{ data: Blob; headers: Record<string, unknown> }>, fallback: string) {
  const res = await p
  const name = /filename="?([^";]+)"?/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? fallback
  const href = URL.createObjectURL(res.data)
  Object.assign(document.createElement('a'), { href, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(href), 10_000)
}

export const licenseApi = {
  status: () => data(api.get<LicenseStatus>('/license/status')),
  detail: () => data(api.get<LicenseDetail>('/license')),
  startTrial: () => data(api.post<LicenseDetail>('/license/trial')),
  quote: (plan: string, cycle: Cycle) => data(api.post<Quote>('/license/quote', { plan, cycle })),
  checkout: (plan: string, cycle: Cycle) => data(api.post<Checkout>('/license/checkout', { plan, cycle })),
  verify: (body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    data(api.post<LicenseDetail>('/license/checkout/verify', body)),
  receipt: (id: string) => download(api.get<Blob>(`/license/${id}/receipt`, { responseType: 'blob' }), 'receipt.pdf'),
  publicPlans: () => data(api.get<{ plans: Plan[]; catalog: Record<string, Feature> }>('/plans')),
}

export const zapLicenseApi = {
  school: (schoolId: string) => data(zapApi.get<AdminLicenseDetail>(`/schools/${schoolId}/license`)),
  apply: (schoolId: string, body: ApplyInput) => data(zapApi.post<AdminLicenseDetail>(`/schools/${schoolId}/license`, body)),
  edit: (id: string, ends_on: string, note: string | null) => data(zapApi.put<AdminLicenseDetail>(`/licenses/${id}`, { ends_on, note })),
  cancel: (id: string, reason: string) => data(zapApi.post<AdminLicenseDetail>(`/licenses/${id}/cancel`, { reason })),
  receipt: (id: string) => download(zapApi.get<Blob>(`/licenses/${id}/receipt`, { responseType: 'blob' }), 'receipt.pdf'),
  suspend: (schoolId: string, reason: string) => data(zapApi.post<AdminLicenseDetail>(`/schools/${schoolId}/license/suspend`, { reason })),
  resume: (schoolId: string) => data(zapApi.post<AdminLicenseDetail>(`/schools/${schoolId}/license/resume`)),
  list: (params: { status?: string; q?: string }) => data(zapApi.get<SchoolLicenseRow[]>('/licenses', { params })),
  overview: () => data(zapApi.get<LicenseOverview>('/license-overview')),
  payments: (params: { status?: string; q?: string }) => data(zapApi.get<PaymentRow[]>('/payments', { params })),
  plans: () => data(zapApi.get<{ plans: (Plan & { schools: number })[]; features: Record<string, Feature> }>('/plans')),
  createPlan: (body: PlanInput) => data(zapApi.post<Plan>('/plans', body)),
  updatePlan: (key: string, body: PlanInput) => data(zapApi.put<Plan>(`/plans/${key}`, body)),
  settings: () => data(zapApi.get<LicenseSettings>('/license-settings')),
  saveSettings: (body: LicenseSettings) => data(zapApi.put<LicenseSettings>('/license-settings', body)),
  backup: (schoolId: string) => download(zapApi.get<Blob>(`/schools/${schoolId}/backup`, { responseType: 'blob', timeout: 0 }), 'backup.zip'),
  deleteSchool: (schoolId: string, body: { confirm_name: string; backup_taken: boolean; reason: string | null }) =>
    data(zapApi.post<{ name: string; summary: Record<string, number> }>(`/schools/${schoolId}/delete`, body)),
  deleted: () => data(zapApi.get<DeletedSchool[]>('/deleted-schools')),
}

// ------------------------------------------------------------------ the school's status, shared

let statusCache: { key: string; at: number; value: LicenseStatus } | null = null
let inflight: string | null = null
const listeners = new Set<() => void>()

/** Forget the cached status (after paying, or when the API says "blocked"). */
export function refreshLicenseStatus() {
  statusCache = null
  listeners.forEach((l) => l())
}

// lib/api.ts fires this when any call comes back "licence blocked".
window.addEventListener(LICENSE_EVENT, refreshLicenseStatus)

/** The active school's licence status, cached for a minute across pages.
 *  `key` = `${userId}:${schoolId}` (null while unknown / no school). */
export function useLicenseStatus(key: string | null): { status: LicenseStatus | null; loading: boolean } {
  const [, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick((t) => t + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  useEffect(() => {
    const fresh = statusCache && statusCache.key === key && Date.now() - statusCache.at < 60_000
    if (!key || fresh || inflight === key) return
    inflight = key
    licenseApi
      .status()
      .then(
        (value) => {
          statusCache = { key, at: Date.now(), value }
          listeners.forEach((l) => l())
        },
        () => undefined,
      )
      .finally(() => {
        if (inflight === key) inflight = null
      })
  })
  const value = statusCache && statusCache.key === key ? statusCache.value : null
  return { status: value, loading: Boolean(key) && !value }
}

// ------------------------------------------------------------------ Razorpay Checkout

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: unknown) => void) => void }
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src: 'https://checkout.razorpay.com/v1/checkout.js', async: true })
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection and try again.'))
    document.body.appendChild(s)
  })
}

/** Pays for `plan`: opens Razorpay Checkout and confirms the payment with
 *  the server. Resolves with the new licence detail, or null if they closed
 *  the window. When credit covers the price, the plan switches with no payment. */
export async function payForPlan(plan: string, cycle: Cycle): Promise<LicenseDetail | null> {
  const c = await licenseApi.checkout(plan, cycle)
  if (c.done && c.detail) {
    refreshLicenseStatus()
    return c.detail
  }
  await loadCheckout()
  const Razorpay = window.Razorpay
  if (!Razorpay) throw new Error('Could not load the payment window. Please try again.')
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: c.key_id,
      order_id: c.order_id,
      amount: c.amount,
      currency: c.currency,
      name: c.name,
      description: c.description,
      prefill: c.prefill ?? {},
      theme: { color: '#2563eb' },
      handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        licenseApi.verify(r).then((detail) => {
          refreshLicenseStatus()
          resolve(detail)
        }, reject)
      },
      modal: { ondismiss: () => resolve(null) },
    })
    rzp.on('payment.failed', () => undefined) // Checkout shows the failure and lets them retry
    rzp.open()
  })
}

// ------------------------------------------------------------------ display helpers

export const STATUS_TEXT: Record<LicenseStatusName, string> = { none: 'No plan', trial: 'Free trial', active: 'Active', expired: 'Expired', suspended: 'On hold' }
export const STATUS_TONE: Record<LicenseStatusName, string> = {
  none: 'bg-slate-100 text-slate-700 ring-slate-200',
  trial: 'bg-violet-50 text-violet-700 ring-violet-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  expired: 'bg-rose-50 text-rose-700 ring-rose-200',
  suspended: 'bg-amber-50 text-amber-800 ring-amber-200',
}

export const limitText = (n: number | null, unit = '') => (n == null ? 'Unlimited' : `${n.toLocaleString('en-IN')}${unit}`)
export const gb = (mb: number) => (mb >= 1024 ? `${Math.round((mb / 1024) * 10) / 10} GB` : `${mb} MB`)
export const shortDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`
export const yearlySaving = (p: Plan) => (p.price_yearly ? p.price_monthly * 12 - p.price_yearly : 0)

// ------------------------------------------------------------------ "plan ending" reminders

/** Does this person get the reminder now? Owner: once a day from the
 *  reminder window. Everyone (owner too): every login in the last days. */
function reminderKey(s: LicenseStatus, owner: boolean, key: string): { store: Storage; name: string } | null {
  if (s.reminder === 'all') return { store: sessionStorage, name: `sb-licence-reminder-all:${key}:${s.ends_on}` }
  if (s.reminder === 'owner' && owner) return { store: localStorage, name: `sb-licence-reminder:${key}:${new Date().toDateString()}` }
  return null
}

export function reminderDue(s: LicenseStatus, owner: boolean, key: string): boolean {
  const k = reminderKey(s, owner, key)
  if (!k) return false
  try {
    return !k.store.getItem(k.name)
  } catch {
    return false // storage blocked: the banner still says it
  }
}

export function markReminded(s: LicenseStatus, owner: boolean, key: string) {
  const k = reminderKey(s, owner, key)
  try {
    if (k) k.store.setItem(k.name, '1')
  } catch {
    /* ignore */
  }
}
