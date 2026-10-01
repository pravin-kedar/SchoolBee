import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  CloudUpload,
  FileText,
  RotateCcw,
  Search,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react'

import beeReading from '../assets/bees/bee-reading.webp'
import { AppShell } from '../components/app/AppShell'
import { StudentDocsPanel } from '../components/documents/StudentDocsPanel'
import { Avatar } from '../components/students/StudentUi'
import { selectCls } from '../components/students/StudentTable'
import { Dialog } from '../components/ui/Dialog'
import { errorMessage } from '../lib/api'
import { useAccessToken } from '../lib/auth-store'
import { ACCEPTED, documentsApi, fileProblem, fileSize, type DocFilterStatus, type DocRow, type DocStudents } from '../lib/documents'
import { useSchoolOptions } from '../lib/schoolOptions'

const PAGE_SIZE = 8

export function DocumentsPage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<DocStudents | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [showUpload, setShowUpload] = useState(false)

  // URL is the source of truth for filters and the selected student.
  const filters = useMemo(
    () => ({
      q: params.get('q') ?? '',
      class_id: params.get('class_id') ?? '',
      status: (params.get('status') ?? '') as DocFilterStatus,
      type_id: params.get('type_id') ?? '',
      page: Number(params.get('page') ?? 1),
      page_size: PAGE_SIZE,
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
        return next
      },
      { replace: true },
    )

  const [search, setSearch] = useState(filters.q)
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
    documentsApi
      .students(filters)
      .then((d) => live && (setData(d), setError(null)))
      .catch((err) => live && setError(errorMessage(err)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [filters, token, reload])

  if (!token) return <Navigate to="/login" replace />

  const rows = data?.items ?? []
  const selectedId = params.get('student') ?? rows[0]?.id ?? null
  const hasFilters = Boolean(filters.q || filters.class_id || filters.status || filters.type_id)
  const summary = data?.summary
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  const stats: { key: DocFilterStatus; label: string; value: number | undefined; hint: string; icon: LucideIcon; tone: string; bg: string }[] = [
    { key: 'complete', label: 'Complete', value: summary?.complete_students, hint: 'Students with all required documents', icon: CircleCheck, tone: 'text-emerald-600', bg: 'bg-emerald-50 ring-emerald-100' },
    { key: 'pending', label: 'Pending', value: summary?.pending_documents, hint: 'Documents under review', icon: Clock, tone: 'text-amber-500', bg: 'bg-amber-50 ring-amber-100' },
    { key: 'missing', label: 'Missing', value: summary?.missing_documents, hint: 'Required documents to be submitted', icon: CircleX, tone: 'text-rose-500', bg: 'bg-rose-50 ring-rose-100' },
    { key: '', label: 'Total Students', value: summary?.total_students, hint: options?.activeYear ? `For academic year ${options.activeYear.name}` : 'Active students', icon: Users, tone: 'text-brand', bg: 'bg-sky-50 ring-sky-100' },
  ]

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Student Documents</h1>
            <p className="mt-0.5">Collect and manage documents submitted by parents for each student.</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary px-5 py-3">
            <Upload className="size-5" /> Upload Documents
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {stats.map(({ key, label, value, hint, icon: Icon, tone, bg }) => {
            const active = key !== '' && filters.status === key
            return (
              <button
                key={label}
                onClick={() => update({ status: active ? '' : key, student: '' })}
                aria-pressed={active}
                className={`flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3 text-left ring-1 transition hover:shadow-card min-[480px]:flex-row min-[480px]:items-center min-[480px]:gap-4 sm:p-4 ${bg} ${active ? 'shadow-card ring-2 ring-brand' : ''}`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-2xl bg-white shadow-sm sm:size-14 ${tone}`}>
                  <Icon className="size-5 sm:size-7" />
                </span>
                <span className="leading-tight">
                  <span className="block font-display text-2xl font-extrabold text-ink sm:text-3xl">{value ?? '—'}</span>
                  <span className="block text-sm font-bold text-ink">{label}</span>
                  <span className="text-xs text-muted">{hint}</span>
                </span>
              </button>
            )
          })}
        </section>

        <section className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
          <div className="relative min-w-60 flex-[2]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID or admission number…"
              aria-label="Search students"
              className={`${selectCls} w-full pl-9`}
            />
          </div>
          <select aria-label="Class" value={filters.class_id} onChange={(e) => update({ class_id: e.target.value, student: '' })} className={`${selectCls} flex-1`}>
            <option value="">All Classes</option>
            {options?.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select aria-label="Document status" value={filters.status} onChange={(e) => update({ status: e.target.value, student: '' })} className={`${selectCls} flex-1`}>
            <option value="">All Status</option>
            <option value="complete">Complete</option>
            <option value="pending">Pending verification</option>
            <option value="missing">Missing documents</option>
          </select>
          <select aria-label="Document type" value={filters.type_id} onChange={(e) => update({ type_id: e.target.value, student: '' })} className={`${selectCls} flex-1`}>
            <option value="">All Document Types</option>
            {data?.types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[20rem_1fr]">
          {/* Student list */}
          <section className="rounded-2xl bg-white shadow-card ring-1 ring-line/60" aria-label="Students">
            <p className="border-b border-line px-4 py-3 text-sm font-bold text-ink">
              Students <span className="font-semibold text-muted">({data?.total ?? 0})</span>
            </p>
            {loading && !data ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <img src={beeReading} alt="" className="mx-auto h-20" />
                <p className="mt-3 font-bold text-ink">{hasFilters ? 'No students match your filters' : 'No active students yet'}</p>
              </div>
            ) : (
              <ul className={`divide-y divide-line/70 p-2 ${loading ? 'opacity-60' : ''}`}>
                {rows.map((row) => (
                  <StudentItem key={row.id} row={row} selected={row.id === selectedId} onSelect={() => update({ student: row.id }, false)} />
                ))}
              </ul>
            )}
            {data && data.total > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-sm">
                <button
                  onClick={() => update({ page: filters.page - 1, student: '' }, false)}
                  disabled={filters.page <= 1}
                  className="grid size-8 place-items-center rounded-lg ring-1 ring-line disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-muted">
                  Page {filters.page} of {pages}
                </span>
                <button
                  onClick={() => update({ page: filters.page + 1, student: '' }, false)}
                  disabled={filters.page >= pages}
                  className="grid size-8 place-items-center rounded-lg ring-1 ring-line disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </section>

          {/* Selected student's documents */}
          <section className="min-w-0 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-6">
            {selectedId ? (
              <StudentDocsPanel key={selectedId} studentId={selectedId} header onChanged={() => setReload((n) => n + 1)} />
            ) : (
              <div className="py-16 text-center">
                <FileText className="mx-auto size-10 text-muted" />
                <p className="mt-3 font-bold text-ink">Pick a student to see their documents</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {showUpload && (
        <UploadDialog
          types={data?.types ?? []}
          onClose={() => setShowUpload(false)}
          onUploaded={(studentId) => {
            update({ student: studentId }, false)
            setReload((n) => n + 1)
          }}
        />
      )}
    </AppShell>
  )
}

function StudentItem({ row, selected, onSelect }: { row: DocRow; selected: boolean; onSelect: () => void }) {
  const done = row.submitted >= row.total
  const tone = done
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : row.required_missing > 0
      ? 'bg-rose-50 text-rose-600 ring-rose-200'
      : 'bg-amber-50 text-amber-700 ring-amber-200'
  return (
    <li>
      <button
        onClick={onSelect}
        aria-current={selected}
        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${selected ? 'bg-sky-50 ring-1 ring-brand/40' : 'hover:bg-slate-50'}`}
      >
        <Avatar name={row.full_name} url={row.photo_url} gender={row.gender} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-bold text-ink">{row.full_name}</span>
          <span className="block truncate text-xs text-muted">
            {row.class_name ?? 'No class'}
            {row.section_name ? ` - ${row.section_name}` : ''} · {row.admission_no}
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold ring-1 ${tone}`} title={`${row.submitted} of ${row.total} documents submitted`}>
          {row.submitted} / {row.total}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted" />
      </button>
    </li>
  )
}

function UploadDialog({
  types,
  onClose,
  onUploaded,
}: {
  types: DocStudents['types']
  onClose: () => void
  onUploaded: (studentId: string) => void
}) {
  const [q, setQ] = useState('')
  const [matches, setMatches] = useState<DocRow[]>([])
  const [student, setStudent] = useState<DocRow | null>(null)
  const [typeId, setTypeId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (student) return
    let live = true
    const t = setTimeout(() => {
      documentsApi
        .students({ q: q.trim(), page_size: 5 })
        .then((d) => live && setMatches(d.items))
        .catch(() => live && setMatches([]))
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q, student])

  const pick = (f: File | undefined) => {
    if (!f) return
    const p = fileProblem(f)
    setProblem(p)
    setFile(p ? null : f)
  }

  return (
    <Dialog
      title="Upload Document"
      subtitle="Pick a student and the document you're uploading."
      submitLabel="Upload"
      submitDisabled={!student || !typeId || !file}
      onClose={onClose}
      onSubmit={async () => {
        await documentsApi.upload(student!.id, typeId, file!)
        onUploaded(student!.id)
      }}
    >
      <div className="text-sm font-bold text-ink">
        Student
        {student ? (
          <div className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-line">
            <Avatar name={student.full_name} url={student.photo_url} gender={student.gender} size="size-8" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate">{student.full_name}</span>
              <span className="block text-xs font-normal text-muted">
                {student.class_name ?? 'No class'} · {student.admission_no}
              </span>
            </span>
            <button type="button" onClick={() => setStudent(null)} className="text-xs font-bold text-brand">
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or admission number…"
              aria-label="Search student"
              className={`${selectCls} mt-1 w-full font-normal`}
            />
            <ul className="mt-2 max-h-48 space-y-1 overflow-auto">
              {matches.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setStudent(m)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50">
                    <Avatar name={m.full_name} url={m.photo_url} gender={m.gender} size="size-8" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{m.full_name}</span>
                    <span className="text-xs font-normal text-muted">
                      {m.submitted} / {m.total}
                    </span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && <li className="px-2 py-1.5 text-xs font-normal text-muted">No students found</li>}
            </ul>
          </>
        )}
      </div>

      <label className="block text-sm font-bold text-ink">
        Document type
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={`${selectCls} mt-1 w-full font-normal`}>
          <option value="">Select document</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.required ? ' (required)' : ''}
            </option>
          ))}
        </select>
      </label>

      <div
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          pick(e.dataTransfer.files[0])
        }}
        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center ${drag ? 'border-brand bg-sky-50' : 'border-sky-200 bg-sky-50/40'}`}
      >
        <CloudUpload className="size-7 text-sky-400" />
        {file ? (
          <p className="text-sm font-bold text-ink">
            {file.name} <span className="font-normal text-muted">· {fileSize(file.size)}</span>
          </p>
        ) : (
          <p className="text-sm text-muted">Drop a file here or</p>
        )}
        <button type="button" onClick={() => input.current?.click()} className="btn-outline py-1.5 text-sm">
          {file ? 'Choose another' : 'Browse file'}
        </button>
        <p className="text-[11px] text-muted">PDF, JPG or PNG · up to 5 MB</p>
        {problem && <p className="text-xs font-semibold text-rose-600">{problem}</p>}
        <input
          ref={input}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          aria-label="Document file"
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
    </Dialog>
  )
}
