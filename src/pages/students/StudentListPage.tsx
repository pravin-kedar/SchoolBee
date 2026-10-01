import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Upload,
  Users,
} from 'lucide-react'

import beeReading from '../../assets/bees/bee-reading.webp'
import { AppShell } from '../../components/app/AppShell'
import { ImportDialog } from '../../components/students/ImportDialog'
import { PageBanner } from '../../components/students/StudentUi'
import { ExportMenu, Pagination, StudentTable, selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { usePermission } from '../../lib/auth'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { studentsApi, type ListParams, type StudentList } from '../../lib/students'

export function StudentListPage() {
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const canManage = usePermission().can('students.manage')
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<StudentList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [showImport, setShowImport] = useState(params.get('import') === '1')
  const [reload, setReload] = useState(0)

  // URL is the source of truth for filters, so back/refresh keep the view.
  const filters: ListParams = useMemo(
    () => ({
      q: params.get('q') ?? '',
      class_id: params.get('class_id') ?? '',
      section_id: params.get('section_id') ?? '',
      status: params.get('status') ?? '',
      academic_year_id: params.get('academic_year_id') ?? '',
      sort: params.get('sort') ?? 'student_code',
      order: (params.get('order') as 'asc' | 'desc') ?? 'asc',
      page: Number(params.get('page') ?? 1),
      page_size: Number(params.get('page_size') ?? 10),
    }),
    [params],
  )
  const update = (patch: Record<string, string | number>, resetPage = true) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v === '' || v == null) next.delete(k)
          else next.set(k, String(v))
        }
        if (resetPage) next.delete('page')
        next.delete('import')
        return next
      },
      { replace: true },
    )

  // Debounced search box → URL
  const [search, setSearch] = useState(filters.q ?? '')
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const t = setTimeout(() => update({ q: search.trim() }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    if (!token) return
    let live = true
    setLoading(true)
    studentsApi
      .list(filters)
      .then((d) => {
        if (!live) return
        setData(d)
        setError(null)
        setSelected(new Set())
      })
      .catch((err) => live && setError(errorMessage(err)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [filters, token, reload])

  if (!token) return <Navigate to="/login" replace />

  const sections = options?.classes.find((c) => c.id === filters.class_id)?.sections ?? []
  const hasFilters = Boolean(filters.q || filters.class_id || filters.section_id || filters.status || filters.academic_year_id)
  const rows = data?.items ?? []

  async function setStatus(status: 'Active' | 'Inactive') {
    setBusy(true)
    try {
      await studentsApi.bulkStatus([...selected], status)
      setReload((n) => n + 1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <PageBanner
          title="Students"
          subtitle="Manage all your students, view details and keep their information up to date."
          message="Our little learners make a big difference!"
        />

        {/* Summary + primary actions */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-sky-100 text-brand">
              <Users className="size-7" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-ink/80">Total Students</p>
              <p className="font-display text-3xl font-extrabold text-ink">{data?.school_total ?? '—'}</p>
              <p className="text-xs text-muted">
                Across {data?.classes_with_students ?? 0} Class{data?.classes_with_students === 1 ? '' : 'es'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3" hidden={!canManage}>
            <Link to="/students/new" className="btn-primary px-5 py-3">
              <Plus className="size-5" /> Add Student
            </Link>
            <button onClick={() => setShowImport(true)} className="btn-outline px-5 py-3">
              <Upload className="size-5" /> Import Students
            </button>
          </div>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
          <div className="relative min-w-60 flex-[2]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, admission number or parent…"
              aria-label="Search students"
              className={`${selectCls} w-full pl-9`}
            />
          </div>
          <select aria-label="Class" value={filters.class_id} onChange={(e) => update({ class_id: e.target.value, section_id: '' })} className={`${selectCls} flex-1`}>
            <option value="">All Classes</option>
            {options?.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Section"
            value={filters.section_id}
            onChange={(e) => update({ section_id: e.target.value })}
            disabled={!filters.class_id}
            className={`${selectCls} flex-1 disabled:bg-slate-50 disabled:text-muted`}
            title={filters.class_id ? undefined : 'Pick a class first'}
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select aria-label="Status" value={filters.status} onChange={(e) => update({ status: e.target.value })} className={`${selectCls} flex-1`}>
            <option value="">All Status</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Draft</option>
          </select>
          <select
            aria-label="Academic year"
            value={filters.academic_year_id}
            onChange={(e) => update({ academic_year_id: e.target.value })}
            className={`${selectCls} flex-1`}
          >
            <option value="">All Years</option>
            {options?.years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearch('')
              setParams({}, { replace: true })
            }}
            disabled={!hasFilters}
            className="btn-outline border-line text-ink disabled:opacity-50"
          >
            <RotateCcw className="size-4" /> Reset
          </button>
        </section>

        {/* Table */}
        <section className="rounded-2xl bg-white shadow-card ring-1 ring-line/60">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 ring-1 ring-sky-100">
                <span className="text-sm font-bold text-ink">{selected.size} selected</span>
                <button disabled={busy} onClick={() => void setStatus('Active')} className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-emerald-700 ring-1 ring-line hover:bg-emerald-50">
                  Mark Active
                </button>
                <button disabled={busy} onClick={() => void setStatus('Inactive')} className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-rose-600 ring-1 ring-line hover:bg-rose-50">
                  Mark Inactive
                </button>
                {busy && <Loader2 className="size-4 animate-spin text-brand" />}
              </div>
            ) : (
              <p className="text-sm text-muted">{data ? `${data.total} student${data.total === 1 ? '' : 's'}${hasFilters ? ' match your filters' : ''}` : ''}</p>
            )}
            <ExportMenu filters={filters} disabled={!data?.total} onError={setError} />
          </div>

          {error && (
            <p role="alert" className="mx-4 mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}

          <div className="mt-3 overflow-x-auto">
            <StudentTable
              rows={rows}
              loading={loading}
              firstLoad={loading && !data}
              selected={selected}
              onSelect={setSelected}
              sort={filters.sort ?? 'student_code'}
              order={filters.order ?? 'asc'}
              onSort={(sort, order) => update({ sort, order }, false)}
            />

            {!loading && rows.length === 0 && (
              <div className="py-12 text-center">
                <img src={beeReading} alt="" className="mx-auto h-24" />
                {hasFilters ? (
                  <>
                    <p className="mt-3 text-lg font-bold text-ink">No students match your filters</p>
                    <p className="text-sm">Try a different search or reset the filters.</p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-lg font-bold text-ink">No students yet</p>
                    <p className="text-sm">Add them one by one, or import your whole list from Excel.</p>
                    <div className="mt-4 flex justify-center gap-3" hidden={!canManage}>
                      <button onClick={() => navigate('/students/new')} className="btn-primary">
                        <Plus className="size-4" /> Add Student
                      </button>
                      <button onClick={() => setShowImport(true)} className="btn-outline">
                        <Upload className="size-4" /> Import from Excel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {data && data.total > 0 && <Pagination data={data} onPage={(page) => update({ page }, false)} onSize={(page_size) => update({ page_size })} />}
        </section>
      </div>

      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImported={() => setReload((n) => n + 1)}
        />
      )}
    </AppShell>
  )
}
