/** Reports (backend: reports.py + services/schoolbee_reports.py). */
import { api } from './api'
import type { ChartSpec } from '../components/reports/ReportChart'

export interface ReportFilter {
  key: string
  label: string
  kind: 'year' | 'class' | 'section' | 'date' | 'range' | 'month' | 'assessment' | 'choice' | 'number' | 'search'
  default: string | null
  options: { value: string; label: string }[] | null
  required: boolean
}

export interface ReportInfo {
  key: string
  group: string
  title: string
  description: string
  icon: string
  filters: ReportFilter[]
  locked: string | null // plan needed (e.g. "Standard") when the licence doesn't include it
}

export interface Catalogue {
  reports: ReportInfo[]
  options: {
    years: { id: string; name: string; is_active: boolean }[]
    classes: { id: string; name: string; sections: { id: string; name: string }[] }[]
    assessments: { id: string; name: string; year_id: string }[]
    limited: boolean
  }
}

export interface Column {
  key: string
  label: string
  kind: 'text' | 'number' | 'money' | 'percent' | 'date' | 'badge'
  width: number | null
}

export interface ReportData {
  key: string
  title: string
  group: string
  total_rows: number
  columns: Column[]
  rows: Record<string, string | number | null>[]
  summary: { label: string; value: string | number; hint?: string; kind?: 'money'; tone?: 'rose' | null }[]
  chart: ChartSpec | null
  totals: Record<string, string | number | null> | null
  note: string | null
  subtitle: string
  landscape: boolean
  empty: string
}

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const reportsApi = {
  catalogue: () => data(api.get<Catalogue>('/reports')),
  run: (key: string, params: Record<string, string>) => data(api.get<ReportData>(`/reports/${key}`, { params })),
  export: async (key: string, params: Record<string, string>, format: 'xlsx' | 'pdf') => {
    const res = await api.get<Blob>(`/reports/${key}/export`, { params: { ...params, format }, responseType: 'blob' })
    const name = /filename="([^"]+)"/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? `report.${format}`
    const href = URL.createObjectURL(res.data)
    Object.assign(document.createElement('a'), { href, download: name }).click()
    setTimeout(() => URL.revokeObjectURL(href), 10_000)
  },
}

export const GROUP_ORDER = ['Students', 'Attendance', 'Documents', 'Fees', 'Assessments', 'Certificates', 'Staff', 'Calendar']

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** The values a report opens with (shown in the filter bar). */
export function defaults(r: ReportInfo, cat: Catalogue): Record<string, string> {
  const now = new Date()
  const today = iso(now)
  const out: Record<string, string> = {}
  for (const f of r.filters) {
    if (f.kind === 'year') out.year_id = cat.options.years.find((y) => y.is_active)?.id ?? cat.options.years[0]?.id ?? ''
    else if (f.kind === 'date') out[f.key] = today
    else if (f.kind === 'month') out[f.key] = f.default === 'last_run' ? '' : today.slice(0, 7)
    else if (f.kind === 'range') {
      out.date_from = f.default === 'year' ? '' : `${today.slice(0, 8)}01`
      out.date_to = f.default === 'year' ? '' : today
    } else if (f.kind === 'choice' && f.default) out[f.key] = f.default
  }
  return out
}
