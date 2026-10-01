/** Assessments & student results (backend: assessments.py). */
import { api } from './api'

export type Method = 'marks' | 'grade' | 'rating' | 'observation'
export type Design = 'colourful' | 'classic'
export type SectionStatus = 'Open' | 'Completed' | 'Published'

export interface ScaleItem {
  code: string
  label: string
  description?: string | null
}
export interface Scale {
  id: string
  name: string
  kind: 'grade' | 'rating'
  display: 'label' | 'stars' | 'number'
  items: ScaleItem[]
  default_key: string | null
  active: boolean
}

export interface Component {
  key: string
  name: string
  max_marks: number | null
}

export interface Area {
  id: string
  class_id: string | null
  name: string
  method: Method
  max_marks: number | null
  scale_id: string | null
  scale: { name: string; kind: string; display: 'label' | 'stars' | 'number'; items: ScaleItem[] } | null
  components: Component[]
  is_required: boolean
  sort_order: number
  has_results: boolean
}

export interface AreaInput {
  id?: string
  name: string
  method: Method
  max_marks: number | null
  scale_id: string | null
  components: { key?: string; name: string; max_marks: number | null }[]
  is_required: boolean
}

export interface SectionRow {
  id: string
  class_id: string
  class_name: string
  section_id: string | null
  section_name: string | null
  label: string
  teacher_name: string | null
  status: SectionStatus
  students: number
  complete: number
  can_enter: boolean
  can_publish: boolean
  can_unlock: boolean
  completed_by: string | null
  completed_at: string | null
  published_by: string | null
  published_at: string | null
  log: { action: string; by: string | null; at: string; note: string | null }[]
}

export interface Assessment {
  id: string
  name: string
  description: string | null
  academic_year_id: string
  academic_year: string
  start_date: string | null
  end_date: string | null
  status: 'Draft' | 'Active'
  classes: { id: string; name: string; customised: boolean }[]
  areas: Area[]
  sections: SectionRow[]
  can_manage: boolean
  can_unlock: boolean
  created_at: string
}

export interface AssessmentRow {
  id: string
  name: string
  academic_year: string
  status: 'Draft' | 'Active'
  start_date: string | null
  end_date: string | null
  classes: string[]
  sections: number
  sections_completed: number
  sections_published: number
  students: number
  students_complete: number
  my_sections: SectionRow[]
}

export interface Starter {
  key: string
  name: string
  description: string
  areas: { name: string; method: Method; max_marks: number | null; components: { name: string; max_marks: number | null }[] }[]
}

export interface Meta {
  years: { id: string; name: string; is_active: boolean; start_date: string; end_date: string }[]
  classes: { id: string; name: string; sections: { id: string; name: string }[] }[]
  scales: Scale[]
  starters: Starter[]
  templates: { id: string; name: string; description: string | null; areas: Starter['areas'] }[]
  report_design: Design
  can_manage: boolean
  can_enter: boolean
}

export interface Progress {
  filled: number
  total: number
  required: number
  required_filled: number
  complete: boolean
  score: number | null
  max: number | null
  percent: number | null
}

export type Value = number | string | Record<string, number | string> | null
export type Entries = Record<string, Value>

export interface SheetStudent {
  student_id: string
  full_name: string
  student_code: string
  admission_no: string | null
  photo_url: string | null
  gender: string | null
  entries: Entries
  remarks: Record<string, string>
  overall_comment: string | null
  progress: Progress
  updated_by: string | null
  updated_at: string | null
}

export interface Sheet {
  assessment_id: string
  assessment_name: string
  section: SectionRow
  areas: Area[]
  students: SheetStudent[]
  can_edit: boolean
}

export interface Report {
  id: string
  design: Design
  file_name: string
  generated_at: string
  generated_by: string | null
  url: string | null
}

export interface StudentResult {
  assessment_id: string
  assessment_name: string
  academic_year: string
  section: SectionRow
  student: { id: string; full_name: string; student_code: string; admission_no: string | null; gender: string | null; date_of_birth: string | null; photo_url: string | null }
  areas: Area[]
  entries: Entries
  remarks: Record<string, string>
  overall_comment: string | null
  progress: Progress
  attendance: { from_date: string; to_date: string; days: number; present: number; absent: number; late: number; percent: number | null } | null
  can_edit: boolean
  prev_id: string | null
  next_id: string | null
  reports: Report[]
}

export interface ResultRow {
  assessment_id: string
  assessment_name: string
  academic_year: string
  section: SectionRow
  student_id: string
  full_name: string
  student_code: string
  photo_url: string | null
  progress: Progress
  summary: string
  last_report: Report | null
}

export interface Batch {
  id: string
  status: 'Queued' | 'Processing' | 'Done' | 'Failed'
  total: number
  done: number
  failed: number
  error: string | null
  zip_url: string | null
  zip_name: string | null
}

export type EntryPayload = { student_id: string; entries: Entries; remarks?: Record<string, string | null>; overall_comment?: string | null; set_overall_comment?: boolean }

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)
const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null))

export const assessmentsApi = {
  meta: () => data(api.get<Meta>('/assessments/meta')),
  saveSettings: (report_design: Design) => data(api.put<Meta>('/assessments/settings', { report_design })),
  list: (year_id?: string) => data(api.get<{ items: AssessmentRow[]; summary: Record<string, number> }>('/assessments', { params: clean({ year_id }) })),
  get: (id: string) => data(api.get<Assessment>(`/assessments/${id}`)),
  create: (body: {
    name: string
    academic_year_id: string
    description: string | null
    start_date: string | null
    end_date: string | null
    class_ids: string[]
    starter_key?: string
    template_id?: string
    copy_from_id?: string
  }) => data(api.post<Assessment>('/assessments', body)),
  update: (id: string, body: { name: string; description: string | null; start_date: string | null; end_date: string | null; class_ids: string[] }) =>
    data(api.put<Assessment>(`/assessments/${id}`, body)),
  remove: (id: string) => api.delete(`/assessments/${id}`),
  saveAreas: (id: string, class_id: string | null, areas: AreaInput[]) => data(api.put<Assessment>(`/assessments/${id}/areas`, { class_id, areas })),
  customise: (id: string, classId: string) => data(api.post<Assessment>(`/assessments/${id}/customise/${classId}`)),
  uncustomise: (id: string, classId: string) => data(api.delete<Assessment>(`/assessments/${id}/customise/${classId}`)),
  start: (id: string) => data(api.post<Assessment>(`/assessments/${id}/start`)),
  saveTemplate: (body: { name: string; description: string | null; assessment_id: string; class_id: string | null }) => data(api.post('/assessments/templates', body)),
  deleteTemplate: (id: string) => api.delete(`/assessments/templates/${id}`),
  // scales
  createScale: (body: Omit<Scale, 'id' | 'default_key' | 'active'>) => data(api.post<Scale>('/assessments/scales', body)),
  updateScale: (id: string, body: Omit<Scale, 'id' | 'default_key' | 'active'>) => data(api.put<Scale>(`/assessments/scales/${id}`, body)),
  deleteScale: (id: string) => api.delete(`/assessments/scales/${id}`),
  // entry + workflow
  sheet: (id: string, rowId: string) => data(api.get<Sheet>(`/assessments/${id}/sections/${rowId}/sheet`)),
  saveSheet: (id: string, rowId: string, results: EntryPayload[]) => data(api.put<Sheet>(`/assessments/${id}/sections/${rowId}/sheet`, { results })),
  student: (id: string, studentId: string) => data(api.get<StudentResult>(`/assessments/${id}/students/${studentId}`)),
  saveStudent: (id: string, studentId: string, result: EntryPayload) => data(api.put<StudentResult>(`/assessments/${id}/students/${studentId}`, { results: [result] })),
  complete: (id: string, rowId: string) => data(api.post<SectionRow>(`/assessments/${id}/sections/${rowId}/complete`)),
  reopen: (id: string, rowId: string) => data(api.post<SectionRow>(`/assessments/${id}/sections/${rowId}/reopen`)),
  publish: (id: string, rowId: string) => data(api.post<SectionRow>(`/assessments/${id}/sections/${rowId}/publish`, {})),
  unlock: (id: string, rowId: string, note: string | null) => data(api.post<SectionRow>(`/assessments/${id}/sections/${rowId}/unlock`, { note })),
  // reports
  preview: (id: string, studentId: string, design?: Design) =>
    data(api.get<{ html: string; design: Design; published: boolean }>(`/assessments/${id}/students/${studentId}/report/preview`, { params: clean({ design }) })),
  generate: (id: string, studentId: string, design?: Design) => data(api.post<Report>(`/assessments/${id}/students/${studentId}/report`, { design })),
  generateSection: (id: string, rowId: string, design?: Design) => data(api.post<Batch>(`/assessments/${id}/sections/${rowId}/reports`, { design })),
  batch: (batchId: string) => data(api.get<Batch>(`/assessments/report-batches/${batchId}`)),
  results: (p: { year_id?: string; assessment_id?: string; class_id?: string; section_id?: string; q?: string }) =>
    data(api.get<{ items: ResultRow[]; total: number }>('/assessments/results', { params: clean(p) })),
  history: (studentId: string) =>
    data(
      api.get<{ assessment_id: string; assessment_name: string; academic_year: string; status: SectionStatus; summary: string; results: { area: string; result: string }[]; reports: Report[] }[]>(
        `/assessments/students/${studentId}/history`,
      ),
    ),
}

export const METHOD_LABEL: Record<Method, string> = { marks: 'Marks', grade: 'Grade', rating: 'Rating', observation: 'Observation' }
export const METHOD_HINT: Record<Method, string> = {
  marks: 'A number out of a maximum, e.g. 18 / 20',
  grade: 'A grade from a scale, e.g. A+, A, B',
  rating: 'A level, e.g. Beginning → Excellent',
  observation: 'Written notes about the child',
}
export const STATUS_STYLE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600 ring-slate-200',
  Active: 'bg-sky-50 text-brand ring-sky-200',
  Open: 'bg-amber-50 text-amber-700 ring-amber-200',
  Completed: 'bg-violet-50 text-violet-700 ring-violet-200',
  Published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}
export const STATUS_LABEL: Record<string, string> = { Open: 'Result entry', Completed: 'Ready to publish', Published: 'Published', Draft: 'Draft', Active: 'Active' }

export const fmt = (n: number | null | undefined) => (n == null ? '' : Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10))

/** Plain text for a value (summaries, read-only cells). */
export function display(area: Area, v: Value): string {
  if (v == null || v === '') return ''
  if (area.method === 'observation') return String(v)
  const label = (code: string) => area.scale?.items.find((i) => i.code === code)?.label ?? code
  if (area.components.length && typeof v === 'object') {
    if (area.method === 'marks') {
      const sum = area.components.reduce((t, c) => t + (Number(v[c.key]) || 0), 0)
      return `${fmt(sum)} / ${fmt(area.max_marks)}`
    }
    return area.components.map((c) => (v[c.key] ? `${c.name}: ${label(String(v[c.key]))}` : '')).filter(Boolean).join(', ')
  }
  if (area.method === 'marks') return `${fmt(Number(v))} / ${fmt(area.max_marks)}`
  if (area.method === 'grade') return `${v} (${label(String(v))})`
  return label(String(v))
}

export const emptyArea = (method: Method, scales: Scale[]): AreaInput => ({
  name: '',
  method,
  max_marks: method === 'marks' ? 20 : null,
  scale_id: method === 'grade' || method === 'rating' ? (scales.find((s) => s.kind === method)?.id ?? null) : null,
  components: [],
  is_required: method !== 'observation',
})

export const toInput = (a: Area): AreaInput => ({
  id: a.id,
  name: a.name,
  method: a.method,
  max_marks: a.components.length ? null : a.max_marks,
  scale_id: a.scale_id,
  components: a.components.map((c) => ({ key: c.key, name: c.name, max_marks: c.max_marks })),
  is_required: a.is_required,
})
