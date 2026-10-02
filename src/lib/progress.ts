/** Student progress: star ratings, quick notes, activities (backend: api/v1/schoolbee/progress.py). */
import type { AiResult } from './ai'
import { api } from './api'

export type Frequency = 'daily' | 'weekly' | 'monthly'
export type NoteKind = 'positive' | 'attention'

export interface ProgressGroup {
  class_id: string
  class_name: string
  section_id: string | null
  section_name: string | null
}

export interface ProgressMeta {
  areas: string[]
  frequencies: Frequency[]
  note_tags: Record<NoteKind, string[]>
  activity_types: string[]
  can_manage: boolean
  groups: ProgressGroup[]
  today: string
}

export interface Criterion {
  id: string
  area: string
  name: string
  frequency: Frequency
  class_id: string | null
  class_name: string | null
  is_active: boolean
  sort_order: number
}

export interface Note {
  id: string
  kind: NoteKind
  tags: string[]
  text: string | null
}

export interface SheetStudent {
  student_id: string
  full_name: string
  gender: string | null
  photo_url: string | null
  ratings: Record<string, number> // criterion id -> 1..5
  notes: Note[]
  absent: boolean // marked absent in today's attendance (daily sheet)
  locked: string | null // title of the published report that locks this period
}

export interface RatingSheet {
  class_id: string
  class_name: string
  section_id: string | null
  section_name: string | null
  frequency: Frequency
  date: string
  period_start: string
  period_end: string
  label: string
  criteria: { id: string; area: string; name: string }[]
  students: SheetStudent[]
  can_edit: boolean
}

export interface ActivityRow {
  id: string
  class_id: string
  class_name: string
  section_id: string | null
  section_name: string | null
  date: string
  title: string
  activity_type: string
  place: 'indoor' | 'outdoor'
  description: string | null
  rated: number
  total: number
  created_by: string | null
}

export type Participation = 'participated' | 'absent' | 'not_applicable'

export interface ActivityDetail extends ActivityRow {
  can_edit: boolean
  students: {
    student_id: string
    full_name: string
    gender: string | null
    photo_url: string | null
    status: Participation | null
    auto_absent: boolean // absent in attendance, nothing recorded yet
    absent_in_attendance: boolean
    rating: number | null
    comment: string | null
    locked: string | null
  }[]
}

export interface ActivityInput {
  class_id: string
  section_id: string | null
  date: string
  title: string
  activity_type: string
  place: 'indoor' | 'outdoor'
  description: string | null
}

export interface StudentProgress {
  student_id: string
  full_name: string
  since: string
  until: string
  days: number
  overall: number | null
  ratings_count: number
  areas: { area: string; average: number | null; count: number }[]
  criteria: {
    criterion_id: string
    name: string
    area: string
    frequency: Frequency
    last: number | null
    average: number | null
    count: number
    trend: 'up' | 'down' | 'steady' | null
  }[]
  weekly: { week_start: string; average: number | null; count: number }[]
  notes: { id: string; date: string; kind: NoteKind; tags: string[]; text: string | null; by: string | null }[]
  activities: {
    id: string
    date: string
    title: string
    activity_type: string
    place: string
    status: Participation
    rating: number | null
    comment: string | null
  }[]
  positives: number
  attention: number
  attendance: { days: number; present: number; late: number; absent: number; percent: number | null }
}

export interface StudentHistory {
  student_id: string
  full_name: string
  since: string
  until: string
  ratings: {
    period_start: string
    period_end: string
    frequency: Frequency
    criterion: string
    area: string
    rating: number
    by: string | null
    updated_at: string
    locked: string | null
  }[]
  notes: { id: string; date: string; kind: NoteKind; tags: string[]; text: string | null; by: string | null; created_at: string; locked: string | null }[]
  activities: {
    id: string
    date: string
    title: string
    activity_type: string
    place: string
    status: Participation
    rating: number | null
    comment: string | null
    by: string | null
    locked: string | null
  }[]
  reports: {
    id: string
    title: string
    status: ReportStatus
    period_kind: PeriodKind
    date_from: string
    date_to: string
    published_at: string | null
    published_by: string | null
  }[]
}

export type ReportStatus = 'draft' | 'published' | 'withdrawn'
export type PeriodKind = 'week' | 'month' | 'custom'

export interface ReportRow {
  id: string
  student_id: string
  student_name: string
  title: string
  status: ReportStatus
  period_kind: PeriodKind
  date_from: string
  date_to: string
  overall: number | null
  has_remarks: boolean
  created_by: string | null
  created_at: string
  published_at: string | null
  published_by: string | null
}

export interface ReportDetail extends ReportRow {
  snapshot: {
    school: { name: string }
    student: { id: string; name: string; code: string | null; class: string | null; section: string | null }
    summary: Omit<StudentProgress, 'full_name' | 'days'>
    made_at: string
  }
  remarks: string | null
  updated_at: string
  withdrawn_at: string | null
  withdrawn_by: string | null
  withdraw_reason: string | null
  can_edit: boolean
  can_withdraw: boolean
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const progressApi = {
  meta: () => data(api.get<ProgressMeta>('/progress/meta')),
  criteria: (params: { class_id?: string; include_archived?: boolean } = {}) => data(api.get<Criterion[]>('/progress/criteria', { params })),
  createCriterion: (body: { area: string; name: string; frequency: Frequency; class_id: string | null }) =>
    data(api.post<Criterion>('/progress/criteria', body)),
  updateCriterion: (id: string, body: { area: string; name: string; frequency: Frequency; is_active: boolean }) =>
    data(api.put<Criterion>(`/progress/criteria/${id}`, body)),
  sheet: (p: { class_id: string; section_id: string | null; frequency: Frequency; date: string }) =>
    data(api.get<RatingSheet>('/progress/sheet', { params: { ...p, section_id: p.section_id ?? undefined } })),
  saveSheet: (body: {
    class_id: string
    section_id: string | null
    frequency: Frequency
    date: string
    ratings: { student_id: string; criterion_id: string; rating: number | null }[]
  }) => data(api.put<RatingSheet>('/progress/sheet', body)),
  addNotes: (body: { student_ids: string[]; date: string; kind: NoteKind; tags: string[]; text: string | null }) =>
    data(api.post<{ added: number }>('/progress/notes', body)),
  deleteNote: (id: string) => api.delete(`/progress/notes/${id}`),
  activities: (params: { class_id?: string; section_id?: string; date_from?: string; date_to?: string } = {}) =>
    data(api.get<ActivityRow[]>('/progress/activities', { params })),
  activity: (id: string) => data(api.get<ActivityDetail>(`/progress/activities/${id}`)),
  createActivity: (body: ActivityInput) => data(api.post<ActivityDetail>('/progress/activities', body)),
  updateActivity: (id: string, body: ActivityInput) => data(api.put<ActivityDetail>(`/progress/activities/${id}`, body)),
  deleteActivity: (id: string) => api.delete(`/progress/activities/${id}`),
  saveFeedback: (id: string, items: { student_id: string; status: Participation; rating: number | null; comment: string | null }[]) =>
    data(api.put<ActivityDetail>(`/progress/activities/${id}/feedback`, { items })),
  student: (id: string, days = 30) => data(api.get<StudentProgress>(`/progress/students/${id}`, { params: { days } })),
  history: (id: string, params: { date_from?: string; date_to?: string } = {}) => data(api.get<StudentHistory>(`/progress/students/${id}/history`, { params })),
  coverage: (p: { class_id: string; section_id: string | null; frequency: Frequency; date_from: string; date_to: string }) =>
    data(api.get<{ expected: number; periods: Record<string, number> }>('/progress/coverage', { params: { ...p, section_id: p.section_id ?? undefined } })),
  reports: (params: { class_id?: string; section_id?: string; student_id?: string; status?: string } = {}) =>
    data(api.get<ReportRow[]>('/progress/reports', { params })),
  generateReports: (body: {
    class_id: string
    section_id: string | null
    period_kind: PeriodKind
    date?: string
    date_from?: string
    date_to?: string
    student_ids?: string[] | null
  }) => data(api.post<{ title: string; reports: ReportRow[]; skipped: string[] }>('/progress/reports/generate', body)),
  report: (id: string) => data(api.get<ReportDetail>(`/progress/reports/${id}`)),
  reportAi: (id: string, regenerate = false) => data(api.post<AiResult>(`/progress/reports/${id}/ai`, { regenerate })),
  saveRemarks: (id: string, remarks: string | null) => data(api.put<ReportDetail>(`/progress/reports/${id}`, { remarks })),
  refreshReport: (id: string) => data(api.post<ReportDetail>(`/progress/reports/${id}/refresh`)),
  publishReport: (id: string) => data(api.post<ReportDetail>(`/progress/reports/${id}/publish`)),
  publishReports: (ids: string[]) => data(api.post<{ published: number }>('/progress/reports/publish', { ids })),
  deleteReport: (id: string) => api.delete(`/progress/reports/${id}`),
  withdrawReport: (id: string, reason: string) => data(api.post<ReportDetail>(`/progress/reports/${id}/withdraw`, { reason })),
  reportPdf: async (id: string) => {
    const res = await api.get<Blob>(`/progress/reports/${id}/pdf`, { responseType: 'blob' })
    const name = /filename="?([^";]+)"?/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? 'progress-report.pdf'
    const href = URL.createObjectURL(res.data)
    Object.assign(document.createElement('a'), { href, download: name }).click()
    setTimeout(() => URL.revokeObjectURL(href), 10_000)
  },
}

export const PARTICIPATION_LABEL: Record<Participation, string> = { participated: 'Participated', absent: 'Absent', not_applicable: 'Not applicable' }
export const REPORT_STATUS_TONE: Record<ReportStatus, string> = {
  draft: 'bg-amber-50 text-amber-800 ring-amber-200',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  withdrawn: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseDate = (iso: string) => new Date(`${iso}T00:00:00`)
export const addDays = (iso: string, n: number) => {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}
export const mondayOf = (iso: string) => addDays(iso, -((parseDate(iso).getDay() + 6) % 7))
export const monthStart = (iso: string) => `${iso.slice(0, 8)}01`
export const shiftMonth = (iso: string, n: number) => {
  const d = parseDate(monthStart(iso))
  d.setMonth(d.getMonth() + n)
  return isoDate(d)
}

export const FREQ_LABEL: Record<Frequency, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
export const groupLabel = (g: { class_name: string; section_name: string | null }) => (g.section_name ? `${g.class_name} – ${g.section_name}` : g.class_name)
export const groupKey = (g: { class_id: string; section_id: string | null }) => `${g.class_id}:${g.section_id ?? ''}`
