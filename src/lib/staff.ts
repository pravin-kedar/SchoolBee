/** Staff, payroll and staff letters (backend: staff.py, payroll.py, staff_letters.py). */
import { api } from './api'
import type { CertTemplate } from './certificates'

export type StaffType = 'Teacher' | 'Shadow Teacher' | 'Nanny / Helper' | 'Office Admin' | 'Accountant' | 'Driver' | 'Other'

export interface StaffInput {
  full_name: string
  staff_type: StaffType
  designation: string | null
  gender: 'Male' | 'Female' | 'Other' | null
  date_of_birth: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  emergency_name: string | null
  emergency_relation: string | null
  emergency_phone: string | null
  joining_date: string | null
  qualification: string | null
  experience_years: number | null
  previous_employer: string | null
  bank_account_name: string | null
  bank_name: string | null
  bank_account_no: string | null
  bank_ifsc: string | null
  pan: string | null
  aadhaar_no: string | null
  notes: string | null
}

export interface StaffRow {
  id: string
  employee_code: string
  full_name: string
  photo_url: string | null
  gender: string | null
  staff_type: StaffType
  designation: string | null
  phone: string | null
  email: string | null
  joining_date: string | null
  status: 'Active' | 'Relieved'
  has_login: boolean
  login_active: boolean
  username: string | null
  class_teacher_of: string[]
  monthly_salary: number | null
}

export interface SalaryLine {
  name: string
  amount: number
}
export interface Salary {
  entered_as: 'monthly' | 'annual'
  earnings: SalaryLine[]
  deductions: SalaryLine[]
  gross: number
  total_deductions: number
  net: number
  annual: number
  effective_from: string | null
}

export interface StaffDoc {
  id: string
  doc_type: string
  title: string | null
  file_name: string
  content_type: string
  size_bytes: number
  uploaded_at: string
  url: string | null
  download_url: string | null
}

export interface StaffLetter {
  id: string
  template_name: string
  category: string
  serial_no: string
  issue_date: string
  status: 'Issued' | 'Cancelled'
  created_at: string
  download_url: string | null
  view_url: string | null
}

export interface StaffDetail extends StaffInput {
  id: string
  employee_code: string
  photo_url: string | null
  status: 'Active' | 'Relieved'
  relieving_date: string | null
  relieving_reason: string | null
  has_login: boolean
  login_active: boolean
  login_email: string | null
  username: string | null
  last_login_at: string | null
  can_reset_password: boolean
  shared_account: boolean
  permissions: string[]
  effective_permissions: string[]
  class_teacher_of: { id: string; label: string }[]
  documents: StaffDoc[]
  salary: Salary | null
  letters: StaffLetter[]
  payslips: { id: string; month: string; net: number; status: string; slip_no: string | null }[]
}

export interface StaffMeta {
  staff_types: StaffType[]
  permissions: { key: string; group: string; label: string }[]
  presets: Record<string, string[]>
  document_types: string[]
  sections: { id: string; label: string }[]
}

export interface Payslip {
  id: string
  staff_id: string
  employee_code: string
  full_name: string
  staff_type: string
  photo_url: string | null
  earnings: SalaryLine[]
  deductions: SalaryLine[]
  extra_earnings: SalaryLine[]
  extra_deductions: SalaryLine[]
  lop_days: string
  lop_amount: number
  gross: number
  total_deductions: number
  net: number
  status: 'Draft' | 'Approved' | 'Paid'
  slip_no: string | null
  paid_on: string | null
  payment_mode: string | null
  payment_reference: string | null
  note: string | null
}

export interface Run {
  id: string
  month: string
  working_days: number
  status: 'Draft' | 'Approved'
  approved_at: string | null
  approved_by: string | null
  slips: Payslip[]
  totals: { staff: number; gross: number; deductions: number; net: number; paid: number }
  missing_salary: string[]
}

export interface RunRow {
  id: string
  month: string
  status: 'Draft' | 'Approved'
  staff: number
  net: number
  paid: number
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)
const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null))

export const staffApi = {
  meta: () => data(api.get<StaffMeta>('/staff/meta')),
  list: (p: { q?: string; staff_type?: string; status?: string }) =>
    data(api.get<{ items: StaffRow[]; total: number; summary: Record<string, number> }>('/staff', { params: clean(p) })),
  get: (id: string) => data(api.get<StaffDetail>(`/staff/${id}`)),
  me: () => data(api.get<StaffDetail>('/staff/me')),
  create: (body: StaffInput) => data(api.post<StaffDetail>('/staff', body)),
  update: (id: string, body: StaffInput) => data(api.put<StaffDetail>(`/staff/${id}`, body)),
  photo: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return data(api.post<StaffDetail>(`/staff/${id}/photo`, form))
  },
  setAccess: (id: string, permissions: string[]) => data(api.put<StaffDetail>(`/staff/${id}/access`, { permissions })),
  loginOn: (id: string, body: { email: string; username?: string | null; password: string }) => data(api.post<StaffDetail>(`/staff/${id}/login`, body)),
  loginOff: (id: string) => data(api.delete<StaffDetail>(`/staff/${id}/login`)),
  resetPassword: (id: string, password: string) => data(api.post<StaffDetail>(`/staff/${id}/password`, { password })),
  setSections: (id: string, section_ids: string[]) => data(api.put<StaffDetail>(`/staff/${id}/sections`, { section_ids })),
  relieve: (id: string, body: { relieving_date: string; reason: string | null }) => data(api.post<StaffDetail>(`/staff/${id}/relieve`, body)),
  rejoin: (id: string) => data(api.post<StaffDetail>(`/staff/${id}/rejoin`)),
  uploadDoc: (id: string, docType: string, file: File, title?: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('doc_type', docType)
    if (title) form.append('title', title)
    return data(api.post<StaffDetail>(`/staff/${id}/documents`, form))
  },
  deleteDoc: (id: string, docId: string) => data(api.delete<StaffDetail>(`/staff/${id}/documents/${docId}`)),
  // Letters
  letterTemplates: () => data(api.get<CertTemplate[]>('/staff-letters/templates')),
  previewLetter: (id: string, body: { template_id: string; values: Record<string, string>; issue_date?: string }) =>
    data(api.post<{ html: string; serial_no: string; field_problems: string[] }>(`/staff/${id}/letters/preview`, body)),
  issueLetter: (id: string, body: { template_id: string; values: Record<string, string>; issue_date?: string }) => data(api.post<StaffDetail>(`/staff/${id}/letters`, body)),
  cancelLetter: (id: string, letterId: string) => data(api.post<StaffDetail>(`/staff/${id}/letters/${letterId}/cancel`)),
}

export const payrollApi = {
  setSalary: (staffId: string, body: { entered_as: 'monthly' | 'annual'; earnings: SalaryLine[]; deductions: SalaryLine[]; effective_from?: string | null }) =>
    data(api.put<StaffDetail>(`/payroll/salaries/${staffId}`, body)),
  runs: () => data(api.get<RunRow[]>('/payroll/runs')),
  createRun: (month: string, working_days?: number) => data(api.post<Run>('/payroll/runs', { month, working_days })),
  run: (id: string) => data(api.get<Run>(`/payroll/runs/${id}`)),
  updateRun: (id: string, working_days: number, month: string) => data(api.patch<Run>(`/payroll/runs/${id}`, { month, working_days })),
  refresh: (id: string) => data(api.post<Run>(`/payroll/runs/${id}/refresh`)),
  deleteRun: (id: string) => api.delete(`/payroll/runs/${id}`),
  approve: (id: string) => data(api.post<Run>(`/payroll/runs/${id}/approve`)),
  reopen: (id: string) => data(api.post<Run>(`/payroll/runs/${id}/reopen`)),
  updateSlip: (id: string, body: { extra_earnings: SalaryLine[]; extra_deductions: SalaryLine[]; lop_days: string; note: string | null }) =>
    data(api.put<Run>(`/payroll/slips/${id}`, body)),
  removeSlip: (id: string) => data(api.delete<Run>(`/payroll/slips/${id}`)),
  markPaid: (id: string, body: { paid_on: string; payment_mode: string; payment_reference: string | null }) => data(api.post<Run>(`/payroll/slips/${id}/paid`, body)),
  slipPdf: async (id: string) => {
    const res = await api.get<Blob>(`/payroll/slips/${id}/pdf`, { responseType: 'blob' })
    const name = /filename="([^"]+)"/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? 'salary-slip.pdf'
    const url = URL.createObjectURL(res.data)
    Object.assign(document.createElement('a'), { href: url, download: name }).click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  },
}

export const monthLabel = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

export const PERMISSION_GROUP_ORDER = ['Students', 'Classes', 'Attendance', 'Assessments', 'Documents', 'Certificates', 'Fees', 'Settings']

export const EMPTY_STAFF: StaffInput = {
  full_name: '',
  staff_type: 'Teacher',
  designation: null,
  gender: null,
  date_of_birth: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  state: null,
  pincode: null,
  emergency_name: null,
  emergency_relation: null,
  emergency_phone: null,
  joining_date: null,
  qualification: null,
  experience_years: null,
  previous_employer: null,
  bank_account_name: null,
  bank_name: null,
  bank_account_no: null,
  bank_ifsc: null,
  pan: null,
  aadhaar_no: null,
  notes: null,
}
