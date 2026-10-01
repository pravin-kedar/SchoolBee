import { api } from './api'

export type StudentStatus = 'Active' | 'Inactive' | 'Draft'
export type Gender = 'Male' | 'Female' | 'Other'

/** Every editable field (matches StudentFields on the backend). */
export interface StudentFields {
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  date_of_birth: string | null
  gender: Gender | null
  blood_group: string | null
  nationality: string | null
  religion: string | null
  caste: string | null
  father_name: string | null
  father_phone: string | null
  father_email: string | null
  mother_name: string | null
  mother_phone: string | null
  mother_email: string | null
  guardian_name: string | null
  guardian_relation: string | null
  guardian_phone: string | null
  guardian_email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  emergency_name: string | null
  emergency_relation: string | null
  emergency_phone: string | null
  allergies: string | null
  medical_conditions: string | null
  notes: string | null
  academic_year_id: string | null
  class_id: string | null
  section_id: string | null
  admission_date: string | null
  admission_no: string | null
}

export interface Student extends StudentFields {
  id: string
  student_code: string
  admission_no: string
  status: StudentStatus
  full_name: string
  photo_url: string | null
  academic_year_name: string | null
  class_name: string | null
  section_name: string | null
  created_at: string
  updated_at: string
}

export interface StudentRow {
  id: string
  student_code: string
  admission_no: string
  full_name: string
  gender: string | null
  date_of_birth: string | null
  class_name: string | null
  section_name: string | null
  parent_name: string | null
  parent_phone: string | null
  status: StudentStatus
  photo_url: string | null
}

export interface StudentList {
  items: StudentRow[]
  total: number
  page: number
  page_size: number
  school_total: number
  classes_with_students: number
}

export interface ListParams {
  q?: string
  class_id?: string
  section_id?: string
  status?: string
  academic_year_id?: string
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

export interface ImportResult {
  total_rows: number
  valid_rows: number
  errors: { row: number; column: string; message: string }[]
  preview: { row: number; full_name: string; class_name: string; section_name: string | null }[]
  imported: number
}

const clean = (p: ListParams) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null))

/** Saves a response body as a file with the server-given name. */
async function download(url: string, params: object, fallbackName: string) {
  const res = await api.get<Blob>(url, { params, responseType: 'blob' })
  const disposition = String(res.headers['content-disposition'] ?? '')
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName
  const href = URL.createObjectURL(res.data)
  const a = Object.assign(document.createElement('a'), { href, download: name })
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}

export const studentsApi = {
  list: (params: ListParams) => api.get<StudentList>('/students', { params: clean(params) }).then((r) => r.data),
  get: (id: string) => api.get<Student>(`/students/${id}`).then((r) => r.data),
  create: (body: Partial<StudentFields> & { status?: StudentStatus }) =>
    api.post<Student>('/students', body).then((r) => r.data),
  update: (id: string, body: Partial<StudentFields> & { status?: StudentStatus }) =>
    api.patch<Student>(`/students/${id}`, body).then((r) => r.data),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Student>(`/students/${id}/photo`, form).then((r) => r.data)
  },
  bulkStatus: (ids: string[], status: 'Active' | 'Inactive') =>
    api.post<{ updated: number }>('/students/bulk-status', { ids, status }).then((r) => r.data),
  export: (format: 'xlsx' | 'csv', filters: ListParams) =>
    download('/students/export', { ...clean(filters), format }, `students.${format}`),
  downloadTemplate: () => download('/students/import/template', {}, 'schoolbee-students-template.xlsx'),
  import: (file: File, dryRun: boolean) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<ImportResult>('/students/import', form, { params: { dry_run: dryRun } })
      .then((r) => r.data)
  },
}

export function ageLabel(dob: string | null): string {
  if (!dob) return ''
  const d = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) years -= 1
  return years < 1 ? 'under 1 yr' : `${years} yr${years === 1 ? '' : 's'}`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
