import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Download, Eye, Loader2, Pencil } from 'lucide-react'

import { Avatar, StatusBadge } from './StudentUi'
import { errorMessage } from '../../lib/api'
import { ageLabel, studentsApi, type ListParams, type StudentList, type StudentRow } from '../../lib/students'

export const selectCls =
  'rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10'

type Column = { key: string; label: string; sort?: string }
const ALL_COLUMNS: Column[] = [
  { key: 'name', label: 'Student Name', sort: 'name' },
  { key: 'code', label: 'Student ID', sort: 'student_code' },
  { key: 'adm', label: 'Admission No.', sort: 'admission_no' },
  { key: 'class', label: 'Class', sort: 'class' },
  { key: 'section', label: 'Section', sort: 'section' },
  { key: 'parent', label: 'Parent Name', sort: 'parent' },
  { key: 'mobile', label: 'Parent Mobile' },
  { key: 'status', label: 'Status', sort: 'status' },
]

/** The students table shared by the Students page and class/section rosters. */
export function StudentTable({
  rows,
  loading,
  firstLoad,
  selected,
  onSelect,
  sort,
  order,
  onSort,
  hideClass = false,
  rowOffset,
}: {
  rows: StudentRow[]
  loading: boolean
  firstLoad: boolean
  selected: Set<string>
  onSelect: (next: Set<string>) => void
  sort: string
  order: 'asc' | 'desc'
  onSort: (sort: string, order: 'asc' | 'desc') => void
  /** Roster pages already know the class/section. */
  hideClass?: boolean
  /** Show a "#" column numbered from this offset. */
  rowOffset?: number
}) {
  const columns = hideClass ? ALL_COLUMNS.filter((c) => c.key !== 'class' && c.key !== 'section') : ALL_COLUMNS
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const numbered = rowOffset !== undefined
  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelect(next)
  }
  return (
    <table className="w-full min-w-[900px] text-left text-sm">
      <thead>
        <tr className="bg-slate-50/80 text-xs font-bold text-ink/80">
          <th className="w-12 px-4 py-3">
            <input
              type="checkbox"
              aria-label="Select all on this page"
              checked={allChecked}
              onChange={() => onSelect(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
              className="size-4 accent-brand"
            />
          </th>
          {numbered && <th className="w-10 px-2 py-3">#</th>}
          {columns.map((c) => (
            <th key={c.key} className="px-3 py-3 whitespace-nowrap">
              {c.sort ? (
                <button
                  onClick={() => onSort(c.sort!, sort === c.sort && order === 'asc' ? 'desc' : 'asc')}
                  className="inline-flex items-center gap-1 hover:text-brand"
                >
                  {c.label}
                  {sort === c.sort ? (
                    order === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                  ) : (
                    <ArrowUpDown className="size-3.5 text-muted/60" />
                  )}
                </button>
              ) : (
                c.label
              )}
            </th>
          ))}
          <th className="px-3 py-3">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {firstLoad
          ? Array.from({ length: 6 }, (_, i) => (
              <tr key={i}>
                <td colSpan={columns.length + (numbered ? 3 : 2)} className="px-4 py-3">
                  <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                </td>
              </tr>
            ))
          : rows.map((r, i) => (
              <tr key={r.id} className={`transition hover:bg-sky-50/40 ${selected.has(r.id) ? 'bg-sky-50/60' : ''} ${loading ? 'opacity-60' : ''}`}>
                <td className="px-4 py-2.5">
                  <input type="checkbox" aria-label={`Select ${r.full_name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-brand" />
                </td>
                {numbered && <td className="px-2 py-2.5 text-muted">{rowOffset + i + 1}</td>}
                <td className="px-3 py-2.5">
                  <Link to={`/students/${r.id}`} className="flex items-center gap-3">
                    <Avatar name={r.full_name} url={r.photo_url} gender={r.gender} />
                    <span className="leading-tight">
                      <span className="block font-bold text-brand hover:underline">{r.full_name}</span>
                      <span className="text-xs text-muted">{[r.gender, ageLabel(r.date_of_birth)].filter(Boolean).join(', ')}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-ink/80">{r.student_code}</td>
                <td className="px-3 py-2.5 text-ink/80">{r.admission_no}</td>
                {!hideClass && <td className="px-3 py-2.5">{r.class_name ?? '—'}</td>}
                {!hideClass && <td className="px-3 py-2.5">{r.section_name ?? '—'}</td>}
                <td className="px-3 py-2.5">{r.parent_name ?? '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{r.parent_phone ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex gap-1.5">
                    <Link to={`/students/${r.id}`} className="grid size-8 place-items-center rounded-lg ring-1 ring-line hover:bg-slate-50" aria-label={`View ${r.full_name}`}>
                      <Eye className="size-4" />
                    </Link>
                    <Link to={`/students/${r.id}/edit`} className="grid size-8 place-items-center rounded-lg ring-1 ring-line hover:bg-slate-50" aria-label={`Edit ${r.full_name}`}>
                      <Pencil className="size-4" />
                    </Link>
                  </span>
                </td>
              </tr>
            ))}
      </tbody>
    </table>
  )
}

export function Pagination({ data, onPage, onSize }: { data: StudentList; onPage: (p: number) => void; onSize: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(data.total / data.page_size))
  const from = (data.page - 1) * data.page_size + 1
  const to = Math.min(data.total, data.page * data.page_size)
  // 1 … 4 5 [6] 7 8 … 20
  const nums: (number | '…')[] = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - data.page) <= 2) nums.push(p)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  const btn = 'grid size-9 place-items-center rounded-lg text-sm font-bold ring-1 ring-line disabled:opacity-40'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-sm text-muted">
        Showing {from} - {to} of {data.total} students
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={data.page_size} onChange={(e) => onSize(Number(e.target.value))} aria-label="Rows per page" className={selectCls}>
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
        <button className={btn} disabled={data.page <= 1} onClick={() => onPage(data.page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="px-1 text-muted">
              …
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              aria-current={n === data.page ? 'page' : undefined}
              className={`${btn} ${n === data.page ? 'bg-brand text-white ring-brand' : 'bg-white text-ink hover:bg-slate-50'}`}
            >
              {n}
            </button>
          ),
        )}
        <button className={btn} disabled={data.page >= pages} onClick={() => onPage(data.page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** Excel/CSV export of the given filters (all pages). */
export function ExportMenu({ filters, disabled, onError }: { filters: ListParams; disabled: boolean; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function run(format: 'xlsx' | 'csv') {
    setOpen(false)
    setBusy(true)
    try {
      const { q, class_id, section_id, status, academic_year_id } = filters
      await studentsApi.export(format, { q, class_id, section_id, status, academic_year_id })
    } catch (err) {
      onError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} disabled={disabled || busy} className="btn-outline border-line py-2 text-ink disabled:opacity-50" aria-expanded={open}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export <ChevronDown className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl bg-white p-1.5 shadow-float ring-1 ring-line">
          <button onClick={() => void run('xlsx')} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-slate-50">
            Excel (.xlsx)
          </button>
          <button onClick={() => void run('csv')} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-slate-50">
            CSV (.csv)
          </button>
        </div>
      )}
    </div>
  )
}
