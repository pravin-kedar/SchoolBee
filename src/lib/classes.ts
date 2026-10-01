import { api } from './api'
import { loadSchoolOptions } from './schoolOptions'

export interface Teacher {
  member_id: string
  name: string
  email: string | null
}

export interface SectionSummary {
  id: string
  name: string
  students: number
  boys: number
  girls: number
  teacher: Teacher | null
}

export interface ClassDetail {
  id: string
  name: string
  status: 'Active' | 'Archived'
  students: number
  boys: number
  girls: number
  unassigned: number
  sections: SectionSummary[]
}

export interface ClassesOverview {
  academic_year_id: string | null
  classes: ClassDetail[]
}

export interface TeacherOption extends Teacher {
  role: string
  sections: string[]
}

type Year = string | null | undefined
const params = (year: Year) => (year ? { academic_year_id: year } : {})
const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

/** Writes return the refreshed overview; they also refresh the cached
 *  class/section pickers used by the student screens. */
const write = (p: Promise<{ data: ClassesOverview }>) =>
  data(p).then((o) => {
    void loadSchoolOptions(true).catch(() => undefined)
    return o
  })

export const classesApi = {
  overview: (year?: Year) => data(api.get<ClassesOverview>('/classes', { params: params(year) })),
  teachers: () => data(api.get<TeacherOption[]>('/classes/teachers')),
  createClass: (name: string, year?: Year) => write(api.post('/classes', { name }, { params: params(year) })),
  updateClass: (id: string, body: { name?: string; status?: 'Active' | 'Archived' }, year?: Year) =>
    write(api.patch(`/classes/${id}`, body, { params: params(year) })),
  createSection: (classId: string, name: string, year?: Year) =>
    write(api.post(`/classes/${classId}/sections`, { name }, { params: params(year) })),
  updateSection: (classId: string, sectionId: string, body: { name?: string; teacher_member_id?: string | null }, year?: Year) =>
    write(api.patch(`/classes/${classId}/sections/${sectionId}`, body, { params: params(year) })),
  deleteSection: (classId: string, sectionId: string, year?: Year) =>
    write(api.delete(`/classes/${classId}/sections/${sectionId}`, { params: params(year) })),
  moveStudents: (ids: string[], classId: string, sectionId: string | null) =>
    data(api.post<{ moved: number }>('/students/move', { ids, class_id: classId, section_id: sectionId })),
}

/** Soft colour per class, by position (Play Group pink, Nursery amber…). */
export const CLASS_TONES = [
  { card: 'bg-rose-50 ring-rose-100', chip: 'bg-rose-100 text-rose-700', icon: 'bg-rose-100' },
  { card: 'bg-amber-50 ring-amber-100', chip: 'bg-amber-100 text-amber-800', icon: 'bg-amber-100' },
  { card: 'bg-sky-50 ring-sky-100', chip: 'bg-sky-100 text-sky-700', icon: 'bg-sky-100' },
  { card: 'bg-violet-50 ring-violet-100', chip: 'bg-violet-100 text-violet-700', icon: 'bg-violet-100' },
  { card: 'bg-emerald-50 ring-emerald-100', chip: 'bg-emerald-100 text-emerald-700', icon: 'bg-emerald-100' },
  { card: 'bg-orange-50 ring-orange-100', chip: 'bg-orange-100 text-orange-700', icon: 'bg-orange-100' },
]
