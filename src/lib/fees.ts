/** Fees (backend: app/api/v1/schoolbee/fees.py). Amounts are whole rupees. */
import { api } from './api'

export type FeeStatus = 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'No structure'
export type InstallmentStatus = 'Paid' | 'Partial' | 'Due' | 'Overdue' | 'Upcoming'
export type PayMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cheque'
export const METHODS: PayMethod[] = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque']

export interface FeeItemInput {
  name: string
  amount: number
  optional: boolean
}
export interface FeeInstallmentInput {
  name: string
  due_date: string
  amount: number
}
export interface FeeStructure {
  class_id: string
  class_name: string
  academic_year_id: string
  academic_year: string
  exists: boolean
  items: (FeeItemInput & { id: string })[]
  installments: (FeeInstallmentInput & { id: string })[]
  notes: string | null
  total: number
  optional_total: number
  students: number
  paying_students: number
}
export interface FeeClassRow {
  class_id: string
  class_name: string
  students: number
  total: number | null
  optional_total: number
  items: number
  installments: number
  first_due: string | null
}

export interface FeeStudentRow {
  id: string
  full_name: string
  admission_no: string
  class_name: string | null
  section_name: string | null
  gender: string | null
  photo_url: string | null
  net: number
  discount: number
  paid: number
  balance: number
  overdue: number
  status: FeeStatus
  next_due_date: string | null
  next_due_amount: number
  next_due_name: string | null
  charges_due: number
}
export interface FeeSummary {
  expected: number
  collected: number
  pending: number
  overdue: number
  concessions: number
  students: number
  paid_students: number
  overdue_students: number
  no_structure_students: number
  charges_expected: number
}
export interface FeeStudents {
  academic_year_id: string
  academic_year: string
  summary: FeeSummary
  items: FeeStudentRow[]
  total: number
  page: number
  page_size: number
}

export interface Payment {
  id: string
  receipt_no: string
  amount: number
  paid_on: string
  method: PayMethod
  reference: string | null
  note: string | null
  status: 'Paid' | 'Void'
  void_reason: string | null
  received_by: string | null
  created_at: string
  student_id: string | null
  student_name: string | null
  class_name: string | null
  charge_line_id: string | null
  paid_for: string
}
export interface InstallmentDue {
  id: string | null
  name: string
  due_date: string | null
  amount: number
  paid: number
  balance: number
  status: InstallmentStatus
}
export interface StudentFee {
  student_id: string
  full_name: string
  admission_no: string
  class_name: string | null
  section_name: string | null
  photo_url: string | null
  gender: string | null
  father_name: string | null
  mother_name: string | null
  parent_phone: string | null
  academic_year_id: string
  academic_year: string
  has_structure: boolean
  items: { id: string; name: string; amount: number; optional: boolean; included: boolean }[]
  gross: number
  discount: number
  discount_type: 'amount' | 'percent' | null
  discount_value: number
  discount_reason: string | null
  net: number
  paid: number
  balance: number
  overdue: number
  status: FeeStatus
  installments: InstallmentDue[]
  payments: Payment[]
  last_payment_id: string | null
  charges: StudentCharge[]
  total_due: number
  total_paid: number
  total_balance: number
  total_overdue: number
  overall_status: FeeStatus
}
export interface StudentCharge {
  line_id: string
  charge_id: string
  name: string
  category: ChargeType
  description: string | null
  due_date: string
  amount: number
  paid: number
  balance: number
  status: string
  waived: boolean
  waive_reason: string | null
}
export interface PlanInput {
  discount_type: 'amount' | 'percent' | null
  discount_value: number
  discount_reason: string | null
  optional_item_ids: string[]
}
export interface PaymentInput {
  amount: number
  paid_on: string
  method: PayMethod
  reference?: string | null
  note?: string | null
  charge_line_id?: string | null
}
export interface Payments {
  items: Payment[]
  total: number
  page: number
  page_size: number
  collected: number
  by_method: Record<string, number>
}

// ------------------------------------------------------- additional charges

export type ChargeType = 'Event' | 'Exam' | 'Trip' | 'Activity' | 'Material' | 'Other'
export const CHARGE_TYPES: ChargeType[] = ['Event', 'Exam', 'Trip', 'Activity', 'Material', 'Other']
export const CHARGE_TONE: Record<ChargeType, string> = {
  Event: 'bg-violet-50 text-violet-700 ring-violet-200',
  Exam: 'bg-sky-50 text-brand ring-sky-200',
  Trip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Activity: 'bg-amber-50 text-amber-700 ring-amber-200',
  Material: 'bg-rose-50 text-rose-600 ring-rose-200',
  Other: 'bg-slate-100 text-ink/70 ring-line',
}

export interface ChargeBase {
  name: string
  category: ChargeType
  description: string | null
  amount: number
  due_date: string
}
export type ChargeTarget =
  | { mode: 'classes'; classes: { class_id: string; section_id: string | null }[]; student_ids?: never }
  | { mode: 'students'; student_ids: string[]; classes?: never }
export interface ChargeRow extends ChargeBase {
  id: string
  target_label: string
  students: number
  waived: number
  paid_students: number
  expected: number
  collected: number
  pending: number
  overdue: number
  created_at: string
}
export interface ChargeLine {
  id: string
  student_id: string
  full_name: string
  admission_no: string
  class_name: string | null
  section_name: string | null
  gender: string | null
  photo_url: string | null
  amount: number
  paid: number
  balance: number
  status: string
  waived: boolean
  waive_reason: string | null
  has_payments: boolean
}
export interface ChargeDetail extends ChargeRow {
  academic_year_id: string
  target: { mode?: 'classes' | 'students'; classes?: { class_id: string; section_id: string | null }[] }
  lines: ChargeLine[]
  missing_students: number
}
export interface LineInput {
  amount?: number
  waived?: boolean
  waive_reason?: string | null
}

export const chargesApi = {
  list: (year_id?: string) => data(api.get<{ academic_year_id: string; academic_year: string; items: ChargeRow[] }>('/fees/charges', yr(year_id))),
  get: (id: string) => data(api.get<ChargeDetail>(`/fees/charges/${id}`)),
  create: (body: ChargeBase & { target: ChargeTarget }, year_id?: string) => data(api.post<ChargeDetail>('/fees/charges', body, yr(year_id))),
  update: (id: string, body: ChargeBase) => data(api.put<ChargeDetail>(`/fees/charges/${id}`, body)),
  remove: (id: string) => api.delete(`/fees/charges/${id}`),
  addStudents: (id: string, student_ids: string[]) => data(api.post<ChargeDetail>(`/fees/charges/${id}/students`, { student_ids })),
  addNewJoiners: (id: string) => data(api.post<ChargeDetail>(`/fees/charges/${id}/sync`)),
  updateLine: (lineId: string, body: LineInput) => data(api.patch<ChargeDetail>(`/fees/charge-lines/${lineId}`, body)),
  removeLine: (lineId: string) => data(api.delete<ChargeDetail>(`/fees/charge-lines/${lineId}`)),
  // From a student's fee page (return that student's account)
  addForStudent: (studentId: string, body: ChargeBase, year_id?: string) => data(api.post<StudentFee>(`/fees/students/${studentId}/charges`, body, yr(year_id))),
  updateForStudent: (studentId: string, lineId: string, body: LineInput) => data(api.patch<StudentFee>(`/fees/students/${studentId}/charges/${lineId}`, body)),
  removeForStudent: (studentId: string, lineId: string) => data(api.delete<StudentFee>(`/fees/students/${studentId}/charges/${lineId}`)),
}

export type ChargeDraft = { name: string; category: ChargeType; amount: string; due_date: string; description: string }

export const toCharge = (d: ChargeDraft): ChargeBase => ({
  name: d.name.trim(),
  category: d.category,
  amount: Number(d.amount) || 0,
  due_date: d.due_date,
  description: d.description.trim() || null,
})

export const draftProblem = (d: ChargeDraft) =>
  d.name.trim().length < 2 ? 'Give it a name' : !(Number(d.amount) > 0) ? 'Enter the amount' : !d.due_date ? 'Pick a due date' : null

/** Quick names for a charge raised for classes / for one student. */
export const CLASS_PRESETS: [string, ChargeType][] = [
  ['Annual Day', 'Event'],
  ['Sports Day', 'Event'],
  ['Exam fee', 'Exam'],
  ['Olympiad', 'Exam'],
  ['Picnic / Field trip', 'Trip'],
  ['Summer camp', 'Activity'],
  ['Books & stationery', 'Material'],
]
export const STUDENT_PRESETS: [string, ChargeType][] = [
  ['Late fee', 'Other'],
  ['Lost ID card', 'Material'],
  ['Re-exam fee', 'Exam'],
  ['Extra books', 'Material'],
]

/** What a payment can be recorded against: the yearly fee or one charge. */
export interface PayTarget {
  lineId: string | null
  label: string
  balance: number
  suggested: number
}

export function payTargets(fee: StudentFee): PayTarget[] {
  const targets: PayTarget[] = []
  if (fee.has_structure && fee.balance > 0) {
    const next = fee.installments.find((i) => i.balance > 0)
    targets.push({ lineId: null, label: `Yearly fee${next ? ` (${next.name})` : ''}`, balance: fee.balance, suggested: next?.balance ?? fee.balance })
  }
  for (const c of fee.charges) {
    if (c.balance > 0) targets.push({ lineId: c.line_id, label: c.name, balance: c.balance, suggested: c.balance })
  }
  return targets
}

const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null && v !== false))
const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)
const yr = (year_id?: string) => (year_id ? { params: { year_id } } : {})

export const feesApi = {
  structures: (year_id?: string) =>
    data(api.get<{ academic_year_id: string; academic_year: string; classes: FeeClassRow[] }>('/fees/structures', yr(year_id))),
  structure: (classId: string, year_id?: string) => data(api.get<FeeStructure>(`/fees/structures/${classId}`, yr(year_id))),
  saveStructure: (classId: string, body: { items: FeeItemInput[]; installments: FeeInstallmentInput[]; notes: string | null }, year_id?: string) =>
    data(api.put<FeeStructure>(`/fees/structures/${classId}`, body, yr(year_id))),
  deleteStructure: (classId: string, year_id?: string) => data(api.delete<FeeStructure>(`/fees/structures/${classId}`, yr(year_id))),
  students: (p: { year_id?: string; class_id?: string; section_id?: string; status?: string; q?: string; sort?: string; page?: number; page_size?: number }) =>
    data(api.get<FeeStudents>('/fees/students', { params: clean(p) })),
  student: (id: string, year_id?: string) => data(api.get<StudentFee>(`/fees/students/${id}`, yr(year_id))),
  savePlan: (id: string, body: PlanInput, year_id?: string) => data(api.put<StudentFee>(`/fees/students/${id}/plan`, body, yr(year_id))),
  pay: (id: string, body: PaymentInput, year_id?: string) => data(api.post<StudentFee>(`/fees/students/${id}/payments`, body, yr(year_id))),
  void: (paymentId: string, reason: string) => data(api.post<StudentFee>(`/fees/payments/${paymentId}/void`, { reason })),
  payments: (p: { year_id?: string; from?: string; to?: string; method?: string; q?: string; include_void?: boolean; page?: number; page_size?: number }) =>
    data(api.get<Payments>('/fees/payments', { params: clean(p) })),
  invoice: (studentId: string, year_id?: string) => downloadPdf(`/fees/students/${studentId}/invoice.pdf`, year_id),
  receipt: (paymentId: string) => downloadPdf(`/fees/payments/${paymentId}/receipt.pdf`),
}

/** PDFs need the bearer token, so fetch them and hand the browser a file. */
async function downloadPdf(path: string, year_id?: string) {
  const res = await api.get<Blob>(path, { ...yr(year_id), responseType: 'blob' })
  const disposition = String(res.headers['content-disposition'] ?? '')
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'document.pdf'
  const url = URL.createObjectURL(res.data)
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const inr = (n: number) => INR.format(n)

export const STATUS_TONE: Record<string, string> = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Partial: 'bg-amber-50 text-amber-700 ring-amber-200',
  Due: 'bg-amber-50 text-amber-700 ring-amber-200',
  Pending: 'bg-sky-50 text-brand ring-sky-200',
  Upcoming: 'bg-slate-100 text-ink/70 ring-line',
  Overdue: 'bg-rose-50 text-rose-600 ring-rose-200',
  'No structure': 'bg-slate-100 text-muted ring-line',
  Void: 'bg-slate-100 text-muted ring-line',
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Relieved: 'bg-slate-100 text-muted ring-line',
  Approved: 'bg-sky-50 text-brand ring-sky-200',
  Draft: 'bg-slate-100 text-ink/70 ring-line',
  Issued: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-600 ring-rose-200',
}

export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const shortDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
