import { api } from './api'
import { refreshMe } from './auth'
import { loadSchoolOptions } from './schoolOptions'
import type { AcademicYear } from './setup'

export interface SchoolSettings {
  can_edit: boolean
  school: {
    name: string
    registration_number: string | null
    address: string | null
    phone: string | null
    email: string | null
    website: string | null
    principal_name: string | null
    about: string | null
    logo_url: string | null
  }
  certificate: {
    signature_url: string | null
    stamp_url: string | null
    principal_name: string | null
    principal_designation: string | null
    footer_text: string | null
  }
  document_types: { id: string; name: string; required: boolean; active: boolean }[]
  academic_years: AcademicYear[]
  system: { weekly_off: number[]; allow_late: boolean; attendance_lock_days: number }
}

export type SchoolInfoInput = {
  name: string
  registration_number: string | null
  address: string
  phone: string
  email: string
  website: string | null
  principal_name: string
  about: string | null
}
export type AssetKind = 'logo' | 'signature' | 'stamp'

type Res = Promise<{ data: SchoolSettings }>
const data = (p: Res) => p.then((r) => r.data)
/** School name/logo show in the top bar (cached /auth/me); years and
 *  classes feed every picker (cached school options). */
const withMe = (p: Res) => data(p).then((s) => (refreshMe(), s))
const withYears = (p: Res) => data(p).then((s) => (void loadSchoolOptions(true).catch(() => undefined), s))

export const settingsApi = {
  get: () => data(api.get('/settings')),
  saveSchool: (body: SchoolInfoInput) => withMe(api.put('/settings/school', body)),
  uploadAsset: (kind: AssetKind, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return withMe(api.post(`/settings/assets/${kind}`, form))
  },
  removeAsset: (kind: AssetKind) => withMe(api.delete(`/settings/assets/${kind}`)),
  saveCertificate: (body: { principal_name: string; principal_designation: string | null; footer_text: string | null }) =>
    data(api.put('/settings/certificate', body)),
  addDocumentType: (name: string, required: boolean) => data(api.post('/settings/document-types', { name, required })),
  updateDocumentType: (id: string, body: { name?: string; required?: boolean; active?: boolean }) =>
    data(api.patch(`/settings/document-types/${id}`, body)),
  deleteDocumentType: (id: string) => data(api.delete(`/settings/document-types/${id}`)),
  addYear: (body: { name: string; start_date: string; end_date: string; make_active: boolean }) =>
    withYears(api.post('/settings/academic-years', body)),
  updateYear: (id: string, body: { start_date?: string; end_date?: string; is_active?: true }) =>
    withYears(api.patch(`/settings/academic-years/${id}`, body)),
  saveSystem: (body: { weekly_off: number[]; allow_late: boolean; attendance_lock_days?: number }) => data(api.put('/settings/system', body)),
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
