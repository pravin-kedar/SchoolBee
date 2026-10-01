import { api } from './api'

export type Mark = 'Present' | 'Absent' | 'Late'
export type SessionStatus = 'Draft' | 'Final'

export interface SheetStudent {
  student_id: string
  full_name: string
  student_code: string
  gender: string | null
  date_of_birth: string | null
  photo_url: string | null
  status: Mark | null
  remark: string | null
}

export interface Sheet {
  date: string
  class_id: string
  class_name: string
  section_id: string | null
  section_name: string | null
  session_status: SessionStatus | null
  marked_by: string | null
  updated_at: string | null
  can_edit: boolean
  students: SheetStudent[]
  weekly_off: number[] // School Settings: 0 = Sunday … 6 = Saturday
  allow_late: boolean
  holiday: string | null // school calendar holiday for this class that day
  lock_days: number // 0 = never locks
  locked: boolean // older than lock_days: only the owner may change it
  history_count: number
}

/** One save of a register (who, when, and each student's mark before → after). */
export interface AttendanceChange {
  id: string
  changed_at: string
  changed_by: string | null
  action: 'Created' | 'Updated'
  status_from: SessionStatus | null
  status_to: SessionStatus
  after_lock: boolean
  changes: { student_id: string; name: string; before: Mark | null; after: Mark | null; remark_before: string | null; remark_after: string | null }[]
}

export interface SectionDay {
  class_id: string
  class_name: string
  section_id: string | null
  section_name: string | null
  teacher_name: string | null
  students: number
  status: SessionStatus | null
  present: number
  absent: number
  late: number
  can_edit: boolean
}

export interface AttendanceOverview {
  date: string
  totals: { students: number; present: number; absent: number; late: number; marked_sections: number; total_sections: number }
  sections: SectionDay[]
  trend: { date: string; percent: number | null }[]
  weekly_off: number[]
  holiday: string | null // whole-school holiday that day
}

export interface StudentMonth {
  student_id: string
  full_name: string
  student_code: string
  class_name: string | null
  section_name: string | null
  photo_url: string | null
  month: string
  days: { date: string; status: Mark; remark: string | null }[]
  present: number
  absent: number
  late: number
  percent: number | null
  weekly_off: number[]
  holidays: { date: string; title: string }[] // school calendar holidays for their class
}

export interface Monthly {
  month: string
  class_name: string
  section_name: string | null
  working_days: number
  rows: { student_id: string; full_name: string; student_code: string; present: number; absent: number; late: number; percent: number | null }[]
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)
const opt = (sectionId: string | null | undefined) => (sectionId ? { section_id: sectionId } : {})

export const attendanceApi = {
  sheet: (classId: string, sectionId: string | null, date: string) =>
    data(api.get<Sheet>('/attendance/sheet', { params: { class_id: classId, ...opt(sectionId), date } })),
  save: (body: {
    class_id: string
    section_id: string | null
    date: string
    status: SessionStatus
    records: { student_id: string; status: Mark; remark: string | null }[]
  }) => data(api.put<Sheet>('/attendance/sheet', body)),
  history: (classId: string, sectionId: string | null, date: string) =>
    data(api.get<AttendanceChange[]>('/attendance/sheet/history', { params: { class_id: classId, ...opt(sectionId), date } })),
  overview: (date: string) => data(api.get<AttendanceOverview>('/attendance/overview', { params: { date } })),
  studentMonth: (studentId: string, month: string) =>
    data(api.get<StudentMonth>(`/attendance/students/${studentId}`, { params: { month } })),
  monthly: (classId: string, sectionId: string | null, month: string) =>
    data(api.get<Monthly>('/attendance/monthly', { params: { class_id: classId, ...opt(sectionId), month } })),
  exportMonthly: async (classId: string, sectionId: string | null, month: string, format: 'xlsx' | 'csv') => {
    const res = await api.get<Blob>('/attendance/monthly/export', {
      params: { class_id: classId, ...opt(sectionId), month, format },
      responseType: 'blob',
    })
    const name = /filename="([^"]+)"/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? `attendance-${month}.${format}`
    const href = URL.createObjectURL(res.data)
    const a = Object.assign(document.createElement('a'), { href, download: name })
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  },
}

// ---- dates in the school's LOCAL time (toISOString would be UTC) ----

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayIso = () => isoDate(new Date())
export const monthOf = (iso: string) => iso.slice(0, 7)
export const parseIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const shiftDay = (iso: string, days: number) => {
  const d = parseIso(iso)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}
export const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
export const longDate = (iso: string) =>
  parseIso(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' })
export const monthLabel = (month: string) =>
  parseIso(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

export const MARK_STYLE: Record<Mark, { dot: string; soft: string; text: string; ring: string }> = {
  Present: { dot: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  Absent: { dot: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200' },
  Late: { dot: 'bg-amber-400', soft: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
}

export const pct = (present: number, late: number, total: number) => (total ? Math.round(((present + late) * 100) / total) : null)
