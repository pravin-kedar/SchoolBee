import { api } from './api'

export type StepKey = 'school' | 'academic_year' | 'classes' | 'sections' | 'users'

export interface SchoolInfo {
  name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  principal_name: string | null
  registration_number: string | null
}

export interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
}

export interface SchoolClass {
  id: string
  name: string
  sections: { id: string; name: string }[]
}

export interface StaffMember {
  member_id: string
  full_name: string
  email: string | null
  role: string
}

export interface SetupState {
  school: SchoolInfo
  academic_years: AcademicYear[]
  classes: SchoolClass[]
  staff: StaffMember[]
  steps: { key: StepKey; label: string; done: boolean }[]
  percent: number
  completed: boolean
}

export interface SchoolInfoInput {
  name: string
  address: string
  phone: string
  email: string
  principal_name: string
  registration_number: string | null
}

export interface StaffInput {
  full_name: string
  email: string
  role: 'Admin' | 'Teacher'
  password: string
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

/** All calls hit /api/v1/schoolbee/setup/...; every write returns the new state. */
export const setupApi = {
  get: () => data(api.get<SetupState>('/setup')),
  saveSchool: (input: SchoolInfoInput) => data(api.put<SetupState>('/setup/school', input)),
  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return data(api.post<SetupState>('/setup/school/logo', form))
  },
  saveAcademicYear: (name: string, start_date: string, end_date: string) =>
    data(api.put<SetupState>('/setup/academic-year', { name, start_date, end_date })),
  saveClasses: (names: string[]) => data(api.put<SetupState>('/setup/classes', { names })),
  saveSections: (classes: { class_id: string; sections: string[] }[]) =>
    data(api.put<SetupState>('/setup/sections', { classes })),
  addStaff: (input: StaffInput) => data(api.post<SetupState>('/setup/staff', input)),
  removeStaff: (memberId: string) => data(api.delete<SetupState>(`/setup/staff/${memberId}`)),
  complete: () => data(api.post<SetupState>('/setup/complete')),
}

/** "2026-27" for the academic year running on `today` (years start in June). */
export function currentAcademicYear(today = new Date()) {
  const start = today.getMonth() >= 5 ? today.getFullYear() : today.getFullYear() - 1
  return {
    name: `${start}-${String((start + 1) % 100).padStart(2, '0')}`,
    start_date: `${start}-06-01`,
    end_date: `${start + 1}-04-30`,
  }
}
