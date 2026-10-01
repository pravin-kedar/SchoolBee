/** Website admin: school document templates (see backend zap_templates.py). */
import { zapApi } from './zap'

export type TemplateCategory = 'Bonafide' | 'Leaving' | 'Character' | 'Achievement' | 'Appointment' | 'Experience' | 'Other'
/** Who a template is issued to: certificates for students, letters for staff. */
export type Audience = 'student' | 'staff'
export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'select'
export type Paper = 'A4' | 'Letter'
export type Orientation = 'portrait' | 'landscape'

export interface TemplateField {
  key: string
  label: string
  type: FieldType
  required: boolean
  options: string[]
  placeholder?: string | null
}

export interface TemplateInput {
  name: string
  category: TemplateCategory
  serial_prefix: string
  description: string | null
  paper: Paper
  orientation: Orientation
  content: string
  fields: TemplateField[]
  status: 'Draft' | 'Published'
  school_id: string | null
  audience: Audience
}

export interface Template extends TemplateInput {
  id: string
  school_name: string | null
  starter_key: string | null
  created_at: string
  updated_at: string
}

export interface TemplateRow {
  id: string
  name: string
  category: TemplateCategory
  serial_prefix: string
  description: string | null
  paper: Paper
  orientation: Orientation
  status: 'Draft' | 'Published'
  school_id: string | null
  school_name: string | null
  fields_count: number
  starter_key: string | null
  updated_at: string
  audience: Audience
}

export interface TemplateList {
  items: TemplateRow[]
  starters_missing: number
}

export interface Preview {
  html: string | null
  problems: string[]
}

export interface TemplateMeta {
  categories: Record<TemplateCategory, string>
  placeholders: Record<string, { key: string; label: string; sample: string }[]>
  staff_placeholders: Record<string, { key: string; label: string; sample: string }[]>
  audience_categories: Record<Audience, TemplateCategory[]>
}

type Design = Pick<TemplateInput, 'name' | 'serial_prefix' | 'paper' | 'orientation' | 'content' | 'fields' | 'school_id' | 'audience'>

const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null))
const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const templatesApi = {
  meta: () => data(zapApi.get<TemplateMeta>('/templates/meta')),
  list: (p: { q?: string; category?: string; status?: string; scope?: string; audience?: string }) => data(zapApi.get<TemplateList>('/templates', { params: clean(p) })),
  loadStarters: () => data(zapApi.post<TemplateList>('/templates/starters')),
  get: (id: string) => data(zapApi.get<Template>(`/templates/${id}`)),
  create: (t: TemplateInput) => data(zapApi.post<Template>('/templates', t)),
  update: (id: string, t: TemplateInput) => data(zapApi.put<Template>(`/templates/${id}`, t)),
  duplicate: (id: string) => data(zapApi.post<Template>(`/templates/${id}/duplicate`)),
  remove: (id: string) => zapApi.delete(`/templates/${id}`),
  preview: (d: Design) => data(zapApi.post<Preview>('/templates/preview', d)),
  savedPreview: (id: string) => data(zapApi.get<Preview>(`/templates/${id}/preview`)),
  previewPdf: (d: Design) => data(zapApi.post<Blob>('/templates/preview/pdf', d, { responseType: 'blob' })),
}

export const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  Bonafide: 'Bonafide',
  Leaving: 'Leaving / Transfer',
  Character: 'Character',
  Achievement: 'Achievement / Participation',
  Appointment: 'Appointment letter',
  Experience: 'Experience letter',
  Other: 'Other',
}

export const AUDIENCE_LABEL: Record<Audience, string> = { student: 'Student certificates', staff: 'Staff letters' }

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  date: 'Date',
  number: 'Number',
  select: 'Dropdown',
}

/** Page size in CSS px (96 dpi), for scaling previews. */
export function pagePx(paper: Paper, orientation: Orientation) {
  const [w, h] = paper === 'Letter' ? [215.9, 279.4] : [210, 297]
  const px = (mm: number) => (mm * 96) / 25.4
  return orientation === 'landscape' ? { w: px(h), h: px(w) } : { w: px(w), h: px(h) }
}

export const slugKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'f_$1')
    .slice(0, 40) || 'field'

export const BLANK_TEMPLATE = `<style>
  .box { position: absolute; inset: 15mm; border: 2px solid #1e3a8a; padding: 15mm; text-align: center; }
  h1 { font-family: 'Cinzel', serif; color: #1e3a8a; margin: 0; }
  .title { margin-top: 12mm; font-size: 20pt; font-weight: 700; }
  .body { margin-top: 10mm; font-size: 13pt; line-height: 2; text-align: justify; }
</style>
<div class="box">
  {% if school.logo %}<img src="{{ school.logo }}" style="height: 22mm" alt="">{% endif %}
  <h1>{{ school.name }}</h1>
  <div>{{ school.address }}</div>
  <div class="title">{{ certificate.title }}</div>
  <div class="body">
    This is to certify that <b>{{ student.full_name }}</b> of <b>{{ student.class_section }}</b> ...
  </div>
</div>
`
