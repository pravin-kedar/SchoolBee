import { api } from './api'

export type DocStatus = 'Uploaded' | 'Verified' | 'Rejected'
export type DocFilterStatus = '' | 'complete' | 'pending' | 'missing'

export interface DocRow {
  id: string
  full_name: string
  student_code: string
  admission_no: string
  class_name: string | null
  section_name: string | null
  gender: string | null
  photo_url: string | null
  submitted: number
  total: number
  required_missing: number
  pending: number
}

export interface DocStudents {
  summary: { total_students: number; complete_students: number; pending_documents: number; missing_documents: number }
  types: { id: string; name: string; required: boolean }[]
  items: DocRow[]
  total: number
  page: number
  page_size: number
}

export interface StudentDoc {
  id: string
  file_name: string
  content_type: string
  size_bytes: number
  status: DocStatus
  remark: string | null
  uploaded_at: string
  uploaded_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  url: string | null
  download_url: string | null
}

export interface DocSlot {
  type_id: string
  type_name: string
  required: boolean
  active: boolean
  document: StudentDoc | null
}

export interface DocStudentDetail {
  id: string
  full_name: string
  student_code: string
  admission_no: string
  class_name: string | null
  section_name: string | null
  gender: string | null
  date_of_birth: string | null
  father_name: string | null
  mother_name: string | null
  photo_url: string | null
  submitted: number
  total: number
  can_review: boolean
  slots: DocSlot[]
}

export interface DocListParams {
  q?: string
  class_id?: string
  section_id?: string
  status?: DocFilterStatus
  type_id?: string
  page?: number
  page_size?: number
}

const clean = (p: DocListParams) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null))
const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const documentsApi = {
  students: (params: DocListParams) => data(api.get<DocStudents>('/documents/students', { params: clean(params) })),
  student: (id: string) => data(api.get<DocStudentDetail>(`/documents/students/${id}`)),
  upload: (studentId: string, typeId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return data(api.post<DocStudentDetail>(`/documents/students/${studentId}/${typeId}`, form))
  },
  review: (docId: string, status: DocStatus, remark?: string) =>
    data(api.patch<DocStudentDetail>(`/documents/${docId}`, { status, remark: remark ?? null })),
  remove: (docId: string) => data(api.delete<DocStudentDetail>(`/documents/${docId}`)),
}

export const ACCEPTED = 'application/pdf,image/jpeg,image/png'
export const MAX_BYTES = 5 * 1024 * 1024

/** Client-side check before uploading (the server checks again). */
export function fileProblem(file: File): string | null {
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) return 'Upload a PDF, JPG or PNG file'
  if (file.size > MAX_BYTES) return 'File must be under 5 MB'
  if (!file.size) return 'The file is empty'
  return null
}

export const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)
