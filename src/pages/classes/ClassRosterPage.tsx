import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRightLeft,
  CalendarCheck,
  ChevronRight,
  LayoutGrid,
  Plus,
  Search,
  Star,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

import schoolBand from '../../assets/school-band.webp'
import beeDesk from '../../assets/bees/bee-desk.webp'
import beeReading from '../../assets/bees/bee-reading.webp'
import { AppShell } from '../../components/app/AppShell'
import { MonthNav, MonthlySummaryTable } from '../../components/attendance/AttendanceUi'
import { todayIso } from '../../lib/attendance'
import { ExportMenu, Pagination, StudentTable, selectCls } from '../../components/students/StudentTable'
import { SelectField } from '../../components/students/StudentUi'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { usePermission } from '../../lib/auth'
import { useAccessToken } from '../../lib/auth-store'
import { classesApi, type ClassesOverview } from '../../lib/classes'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { studentsApi, type ListParams, type StudentList } from '../../lib/students'

/** Roster for a whole class (/classes/:classId) or one section
 *  (/classes/:classId/sections/:sectionId). */
export function ClassRosterPage() {
  const { classId = '', sectionId } = useParams()
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [overview, setOverview] = useState<ClassesOverview | null>(null)
  const [data, setData] = useState<StudentList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'students' | 'attendance' | 'assessment'>('students')
  const [moving, setMoving] = useState(false)
  const [reload, setReload] = useState(0)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const navigate = useNavigate()

  const access = usePermission()
  const isAdmin = access.can('classes.manage')

  const filters: ListParams = useMemo(
    () => ({
      class_id: classId,
      section_id: sectionId ?? '',
      q: params.get('q') ?? '',
      status: params.get('status') ?? '',
      sort: params.get('sort') ?? 'name',
      order: (params.get('order') as 'asc' | 'desc') ?? 'asc',
      page: Number(params.get('page') ?? 1),
      page_size: Number(params.get('page_size') ?? 10),
    }),
    [classId, sectionId, params],
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

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== search.trim()) update({ q: search.trim() })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Header numbers (counts, teacher) - the same light overview as /classes.
  useEffect(() => {
    if (!token) return
    classesApi.overview().then(setOverview, (err) => setError(errorMessage(err)))
  }, [token, reload])

  useEffect(() => {
    if (!token) return
    let live = true
    setLoading(true)
    studentsApi
      .list(filters)
      .then((d) => {
        if (!live) return
        setData(d)
        setSelected(new Set())
      })
      .catch((err) => live && setError(errorMessage(err)))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [filters, token, reload])

  if (!token) return <Navigate to="/login" replace />

  const cls = overview?.classes.find((c) => c.id === classId)
  const section = cls?.sections.find((s) => s.id === sectionId)
  const notFound = overview && (!cls || (sectionId && !section))
  const title = cls ? (section ? `${cls.name} - Section ${section.name}` : cls.name) : '…'
  const stats = section ?? cls
  const addStudentHref = `/students/new?class_id=${classId}${sectionId ? `&section_id=${sectionId}` : ''}`

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <nav className="flex items-center gap-1.5 text-sm font-semibold" aria-label="Breadcrumb">
          <Link to="/classes" className="text-muted hover:text-brand">
            Classes
          </Link>
          <ChevronRight className="size-4 text-muted" />
          {section ? (
            <>
              <Link to={`/classes?class=${classId}`} className="text-muted hover:text-brand">
                {cls?.name}
              </Link>
              <ChevronRight className="size-4 text-muted" />
              <span className="text-ink">Section {section.name}</span>
            </>
          ) : (
            <span className="text-ink">{cls?.name ?? '…'}</span>
          )}
        </nav>

        {notFound ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-card ring-1 ring-line/60">
            <p className="text-lg font-bold text-ink">This class or section doesn’t exist anymore.</p>
            <Link to="/classes" className="btn-primary mt-4">
              Back to Classes
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-amber-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
              <img
                src={schoolBand}
                alt=""
                className="pointer-events-none absolute top-0 left-[62%] hidden h-full -translate-x-1/2 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] 2xl:block"
              />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
                  {cls && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${cls.status === 'Active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-muted ring-line'}`}>
                      {cls.status}
                    </span>
                  )}
                </div>
                <p className="mt-0.5">Manage students, attendance and assessments for this {section ? 'class section' : 'class'}.</p>
              </div>
            </section>

            {/* Stats */}
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat icon={Users} tone="bg-sky-100 text-brand" label="Total Students" value={stats ? String(stats.students) : '—'} />
              <li className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
                <span className="grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-500">
                  <UsersRound className="size-6" />
                </span>
                <span className="flex gap-6 leading-tight">
                  <span>
                    <span className="block text-sm font-semibold text-ink/80">Boys</span>
                    <span className="font-display text-2xl font-extrabold text-ink">{stats?.boys ?? '—'}</span>
                  </span>
                  <span className="border-l border-line pl-6">
                    <span className="block text-sm font-semibold text-ink/80">Girls</span>
                    <span className="font-display text-2xl font-extrabold text-ink">{stats?.girls ?? '—'}</span>
                  </span>
                </span>
              </li>
              {section ? (
                <li className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-600">
                    <UserRound className="size-6" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-sm font-semibold text-ink/80">Class Teacher</span>
                    {section.teacher ? (
                      <>
                        <span className="block truncate font-bold text-ink">{section.teacher.name}</span>
                        <span className="block truncate text-xs text-muted">{section.teacher.email}</span>
                      </>
                    ) : isAdmin ? (
                      <Link to={`/classes?class=${classId}`} className="text-sm font-bold text-brand hover:underline">
                        Assign a teacher
                      </Link>
                    ) : (
                      <span className="text-sm text-muted">Not assigned</span>
                    )}
                  </span>
                </li>
              ) : (
                <Stat icon={LayoutGrid} tone="bg-violet-100 text-violet-600" label="Sections" value={cls ? String(cls.sections.length) : '—'} />
              )}
              <Stat
                icon={CalendarCheck}
                tone="bg-emerald-100 text-emerald-600"
                label={section ? 'Section' : 'Without a section'}
                value={section ? section.name : cls ? String(cls.unassigned) : '—'}
              />
            </ul>

            {/* Tabs + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
                {(
                  [
                    ['students', 'Students', Users],
                    ['attendance', 'Attendance', CalendarCheck],
                    ['assessment', 'Assessment', Star],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'}`}
                  >
                    <Icon className="size-4" /> {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {cls?.status === 'Active' && (
                  <Link to={addStudentHref} className="btn-primary">
                    <Plus className="size-4" /> Add Student
                  </Link>
                )}
                <Link
                  to={`/attendance/take?class_id=${classId}${sectionId ? `&section_id=${sectionId}` : ''}`}
                  className="btn bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">
                  <CalendarCheck className="size-4" /> Take Attendance
                </Link>
                <Link to="/assessments" className="btn bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100">
                  <Star className="size-4" /> Add Assessment
                </Link>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                {error}
              </p>
            )}

            {tab === 'attendance' ? (
              <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <MonthNav month={month} onChange={setMonth} />
                  {cls && cls.sections.length > 0 && !sectionId ? (
                    <p className="text-sm text-muted">Attendance is taken per section — open a section to see its register.</p>
                  ) : (
                    <Link to={`/attendance/take?class_id=${classId}${sectionId ? `&section_id=${sectionId}` : ''}`} className="btn-primary py-2">
                      <CalendarCheck className="size-4" /> Take Today’s Attendance
                    </Link>
                  )}
                </div>
                {cls && (cls.sections.length === 0 || sectionId) ? (
                  <MonthlySummaryTable
                    classId={classId}
                    sectionId={sectionId ?? null}
                    month={month}
                    onPick={(sid) => navigate(`/attendance/history?class_id=${classId}${sectionId ? `&section_id=${sectionId}` : ''}&student_id=${sid}&month=${month}`)}
                  />
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {cls?.sections.map((s) => (
                      <li key={s.id}>
                        <Link to={`/classes/${classId}/sections/${s.id}`} className="btn-outline border-line text-ink">
                          Section {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : tab !== 'students' ? (
              <div className="grid place-items-center rounded-2xl bg-white p-10 text-center shadow-card ring-1 ring-line/60">
                <img src={beeDesk} alt="" className="w-28" />
                <p className="mt-3 text-lg font-bold text-ink">Assessments for {title} are coming soon</p>
                <p className="text-sm">We’re building this module next.</p>
              </div>
            ) : (
              <section className="rounded-2xl bg-white shadow-card ring-1 ring-line/60">
                <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
                  <div className="relative min-w-60 flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by student name, ID or parent name…"
                      aria-label="Search students"
                      className={`${selectCls} w-full pl-9`}
                    />
                  </div>
                  <select aria-label="Status" value={filters.status} onChange={(e) => update({ status: e.target.value })} className={selectCls}>
                    <option value="">All Status</option>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Draft</option>
                  </select>
                  {isAdmin && selected.size > 0 && (
                    <button onClick={() => setMoving(true)} className="btn-outline py-2">
                      <ArrowRightLeft className="size-4" /> Move {selected.size} Student{selected.size === 1 ? '' : 's'}
                    </button>
                  )}
                  <span className="ml-auto">
                    <ExportMenu filters={filters} disabled={!data?.total} onError={setError} />
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <StudentTable
                    rows={data?.items ?? []}
                    loading={loading}
                    firstLoad={loading && !data}
                    selected={selected}
                    onSelect={setSelected}
                    sort={filters.sort ?? 'name'}
                    order={filters.order ?? 'asc'}
                    onSort={(sort, order) => update({ sort, order }, false)}
                    hideClass={Boolean(sectionId)}
                    rowOffset={((filters.page ?? 1) - 1) * (filters.page_size ?? 10)}
                  />
                  {!loading && data?.items.length === 0 && (
                    <div className="py-12 text-center">
                      <img src={beeReading} alt="" className="mx-auto h-24" />
                      <p className="mt-3 text-lg font-bold text-ink">{filters.q || filters.status ? 'No students match your filters' : `No students in ${title} yet`}</p>
                      {!filters.q && !filters.status && cls?.status === 'Active' && (
                        <Link to={addStudentHref} className="btn-primary mt-4">
                          <Plus className="size-4" /> Add Student
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                {data && data.total > 0 && <Pagination data={data} onPage={(page) => update({ page }, false)} onSize={(page_size) => update({ page_size })} />}
              </section>
            )}
          </>
        )}
      </div>

      {moving && (
        <MoveDialog
          count={selected.size}
          fromClassId={classId}
          onClose={() => setMoving(false)}
          onMove={async (toClass, toSection) => {
            await classesApi.moveStudents([...selected], toClass, toSection)
            setReload((n) => n + 1)
          }}
        />
      )}
    </AppShell>
  )
}

function Stat({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: string; label: string; value: string }) {
  return (
    <li className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
      <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}>
        <Icon className="size-6" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-ink/80">{label}</span>
        <span className="font-display text-2xl font-extrabold text-ink">{value}</span>
      </span>
    </li>
  )
}

function MoveDialog({
  count,
  fromClassId,
  onClose,
  onMove,
}: {
  count: number
  fromClassId: string
  onClose: () => void
  onMove: (classId: string, sectionId: string | null) => Promise<void>
}) {
  const options = useSchoolOptions()
  const [classId, setClassId] = useState(fromClassId)
  const [sectionId, setSectionId] = useState('')
  const sections = options?.classes.find((c) => c.id === classId)?.sections ?? []
  return (
    <Dialog
      title={`Move ${count} Student${count === 1 ? '' : 's'}`}
      subtitle="Choose the class and section they should move to."
      submitLabel="Move Students"
      submitDisabled={!classId}
      onClose={onClose}
      onSubmit={() => onMove(classId, sectionId || null)}
    >
      <SelectField
        label="Class"
        value={classId}
        onChange={(e) => {
          setClassId(e.target.value)
          setSectionId('')
        }}
      >
        {options?.classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!sections.length}>
        <option value="">{sections.length ? 'No section' : '—'}</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </SelectField>
    </Dialog>
  )
}
