import { api } from './api'
import { usePermission } from './auth'
import type { TemplateField } from './zapTemplates'

export interface CertTemplate {
  id: string
  name: string
  category: string
  description: string | null
  serial_prefix: string
  paper: 'A4' | 'Letter'
  orientation: 'portrait' | 'landscape'
  fields: TemplateField[]
  custom: boolean
}

export interface CertStudent {
  id: string
  full_name: string
  admission_no: string
  student_code: string
  class_id: string | null
  section_id: string | null
  class_name: string | null
  section_name: string | null
  gender: string | null
  photo_url: string | null
}

export interface IssueInput {
  template_id: string
  student_ids: string[]
  values: Record<string, string>
  issue_date?: string
}

export interface Check {
  field_problems: string[]
  school_missing: string[]
  students_missing: { id: string; full_name: string; missing: string[] }[]
  next_serial: string
  academic_year: string
}

export interface Issued {
  id: string
  serial_no: string
  template_id: string | null
  template_name: string
  category: string
  student_id: string | null
  student_name: string
  admission_no: string | null
  class_section: string | null
  academic_year: string
  issue_date: string
  field_values: Record<string, string>
  status: 'Issued' | 'Cancelled'
  cancel_reason: string | null
  cancelled_at: string | null
  issued_by: string | null
  created_at: string
  size_bytes: number
  file_name: string
  view_url: string | null
  download_url: string | null
}

export interface Batch {
  id: string
  template_name: string
  status: 'Queued' | 'Processing' | 'Done' | 'Failed'
  total: number
  done: number
  failed: number
  error: string | null
  zip_name: string | null
  zip_url: string | null
  created_at: string
}

export interface IssuedList {
  items: Issued[]
  total: number
  page: number
  page_size: number
  summary: { issued: number; this_month: number; cancelled: number }
}

const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null))
const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const certificatesApi = {
  templates: () => data(api.get<CertTemplate[]>('/certificates/templates')),
  templatePreview: (id: string) => data(api.get<{ html: string | null; problems: string[] }>(`/certificates/templates/${id}/preview`)),
  students: (p: { class_id?: string; section_id?: string; q?: string }) => data(api.get<CertStudent[]>('/certificates/students', { params: clean(p) })),
  check: (body: IssueInput) => data(api.post<Check>('/certificates/check', body)),
  preview: (body: Omit<IssueInput, 'student_ids'> & { student_id: string }) => data(api.post<{ html: string; serial_no: string }>('/certificates/preview', body)),
  generate: (body: IssueInput) => data(api.post<{ document: Issued | null; batch: Batch | null }>('/certificates/generate', body)),
  batch: (id: string) => data(api.get<Batch>(`/certificates/batches/${id}`)),
  issued: (p: { q?: string; category?: string; status?: string; student_id?: string; batch_id?: string; page?: number; page_size?: number }) =>
    data(api.get<IssuedList>('/certificates/issued', { params: clean(p) })),
  cancel: (id: string, reason: string) => data(api.post<Issued>(`/certificates/issued/${id}/cancel`, { reason })),
}

export const CATEGORY_TONE: Record<string, string> = {
  Bonafide: 'bg-sky-50 text-brand ring-sky-200',
  Leaving: 'bg-violet-50 text-violet-700 ring-violet-200',
  Character: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Achievement: 'bg-amber-50 text-amber-700 ring-amber-200',
  Other: 'bg-slate-100 text-ink/70 ring-line',
}

/** Can issue and cancel certificates (everyone else browses). */
export function useCanIssue() {
  return usePermission().can('certificates.issue')
}

export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
