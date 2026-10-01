import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  Archive,
  ArchiveRestore,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'

import schoolBand from '../../assets/school-band.webp'
import beeBook from '../../assets/bees/bee-book.webp'
import beeWave from '../../assets/bees/bee-wave.webp'
import beeStar from '../../assets/bees/bee-star.webp'
import beeGraduate from '../../assets/bees/bee-graduate.webp'
import beeReading from '../../assets/bees/bee-reading.webp'
import beeHeart from '../../assets/bees/bee-heart.webp'
import { AppShell } from '../../components/app/AppShell'
import { Avatar } from '../../components/students/StudentUi'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { usePermission } from '../../lib/auth'
import { useAccessToken } from '../../lib/auth-store'
import { CLASS_TONES, classesApi, type ClassDetail, type ClassesOverview, type SectionSummary, type TeacherOption } from '../../lib/classes'
import { useSchoolOptions } from '../../lib/schoolOptions'

const BEES = [beeHeart, beeBook, beeWave, beeStar, beeGraduate, beeReading]

type Modal =
  | { kind: 'class'; cls?: ClassDetail }
  | { kind: 'section'; cls: ClassDetail; section?: SectionSummary }
  | { kind: 'teacher'; cls: ClassDetail; section: SectionSummary }
  | { kind: 'archive'; cls: ClassDetail }
  | { kind: 'remove-section'; cls: ClassDetail; section: SectionSummary }
  | null

export function ClassesPage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [overview, setOverview] = useState<ClassesOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const year = params.get('year') ?? options?.activeYear?.id ?? null
  const access = usePermission()
  const isAdmin = access.can('classes.manage')

  useEffect(() => {
    if (!token || !options) return
    let live = true
    classesApi
      .overview(year)
      .then((o) => live && (setOverview(o), setError(null)))
      .catch((err) => live && setError(errorMessage(err)))
    return () => {
      live = false
    }
  }, [token, options, year])

  const active = useMemo(() => overview?.classes.filter((c) => c.status === 'Active') ?? [], [overview])
  const selected = active.find((c) => c.id === params.get('class')) ?? active[0]
  const toneOf = (cls: ClassDetail) => CLASS_TONES[Math.max(0, active.findIndex((c) => c.id === cls.id)) % CLASS_TONES.length]
  const beeOf = (cls: ClassDetail) => BEES[Math.max(0, active.findIndex((c) => c.id === cls.id)) % BEES.length]

  if (!token) return <Navigate to="/login" replace />

  const setParam = (k: string, v: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        n.set(k, v)
        return n
      },
      { replace: true },
    )

  const listed = (overview?.classes ?? []).filter(
    (c) => (showArchived || c.status === 'Active') && c.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <AppShell academicYear={options?.years.find((y) => y.id === year)?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        {/* Header */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-amber-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <img
            src={schoolBand}
            alt=""
            className="pointer-events-none absolute top-0 left-[58%] hidden h-full -translate-x-1/2 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] 2xl:block"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">Classes & Sections</h1>
              <p className="mt-0.5">Manage your classes and sections. Assign teachers and view student details.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="rounded-xl bg-white px-3 py-1.5 ring-1 ring-line">
                <span className="block text-xs font-semibold text-brand">Academic Year</span>
                <select
                  value={year ?? ''}
                  onChange={(e) => setParam('year', e.target.value)}
                  className="bg-transparent font-bold text-ink outline-none"
                  aria-label="Academic year"
                >
                  {options?.years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </label>
              {isAdmin && (
                <button onClick={() => setModal({ kind: 'class' })} className="btn-primary px-5 py-3">
                  <Plus className="size-5" /> Add Class
                </button>
              )}
            </div>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        {!overview ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-card ring-1 ring-line/60">
            <img src={beeReading} alt="" className="mx-auto h-24" />
            <p className="mt-3 text-lg font-bold text-ink">No classes yet</p>
            <p className="text-sm">Create your first class, like Play Group or Nursery.</p>
            {isAdmin && (
              <button onClick={() => setModal({ kind: 'class' })} className="btn-primary mt-4">
                <Plus className="size-4" /> Add Class
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Class cards */}
            <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {active.map((c) => {
                const on = c.id === selected?.id
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setParam('class', c.id)}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left ring-1 transition hover:-translate-y-0.5 ${toneOf(c).card} ${
                        on ? 'shadow-card ring-2 ring-brand' : ''
                      }`}
                    >
                      <span className={`grid size-16 shrink-0 place-items-center rounded-full ${toneOf(c).icon}`}>
                        <img src={beeOf(c)} alt="" className="size-12 object-contain" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-lg font-extrabold text-ink">{c.name}</span>
                        <span className="mt-1 flex gap-5">
                          <span className="leading-tight">
                            <span className="block font-display text-2xl font-extrabold text-ink">{c.students}</span>
                            <span className="text-xs text-muted">Students</span>
                          </span>
                          <span className="border-l border-ink/10 pl-5 leading-tight">
                            <span className="block font-display text-2xl font-extrabold text-ink">{c.sections.length}</span>
                            <span className="text-xs text-muted">Sections</span>
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Selected class */}
            {selected && (
              <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className={`grid size-16 place-items-center rounded-full ${toneOf(selected).icon}`}>
                      <img src={beeOf(selected)} alt="" className="size-12 object-contain" />
                    </span>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-extrabold">{selected.name}</h2>
                        {isAdmin && (
                          <button onClick={() => setModal({ kind: 'class', cls: selected })} className="btn-outline py-1 text-sm">
                            <Pencil className="size-3.5" /> Edit Class
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-sm">
                        Total Students: <strong className="text-ink">{selected.students}</strong>
                        <span className="mx-3 text-line">|</span>
                        Total Sections: <strong className="text-ink">{selected.sections.length}</strong>
                        {selected.unassigned > 0 && (
                          <>
                            <span className="mx-3 text-line">|</span>
                            <Link to={`/classes/${selected.id}`} className="font-semibold text-amber-700 hover:underline">
                              {selected.unassigned} without a section
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/classes/${selected.id}`} className="btn-outline border-line text-ink">
                      <Users className="size-4" /> All Students
                    </Link>
                    {isAdmin && (
                      <>
                        <button onClick={() => setModal({ kind: 'archive', cls: selected })} className="btn bg-rose-50 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100">
                          <Archive className="size-4" /> Archive Class
                        </button>
                        <button onClick={() => setModal({ kind: 'section', cls: selected })} className="btn-primary">
                          <Plus className="size-4" /> Add Section
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 text-xs font-bold text-ink/80">
                        <th className="px-4 py-3">Section</th>
                        <th className="px-3 py-3">Students</th>
                        <th className="px-3 py-3">Class Teacher</th>
                        <th className="px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {selected.sections.map((s, i) => (
                        <tr key={s.id}>
                          <td className="px-4 py-3">
                            <span className={`grid size-11 place-items-center rounded-xl text-lg font-extrabold ${CLASS_TONES[(i + 2) % CLASS_TONES.length].chip}`}>
                              {s.name}
                            </span>
                          </td>
                          <td className="px-3 py-3 leading-tight">
                            <span className="block font-bold text-ink">{s.students}</span>
                            <span className="text-xs text-muted">
                              {s.boys} boys · {s.girls} girls
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {s.teacher ? (
                              <span className="flex items-center gap-3">
                                <Avatar name={s.teacher.name} />
                                <span className="leading-tight">
                                  <span className="block font-bold text-ink">{s.teacher.name}</span>
                                  <span className="text-xs text-muted">{s.teacher.email}</span>
                                </span>
                              </span>
                            ) : (
                              <span className="text-sm text-muted italic">Not assigned</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="flex justify-end gap-2">
                              <Link to={`/classes/${selected.id}/sections/${s.id}`} className="btn-outline border-line py-1.5 text-sm text-ink">
                                <Users className="size-4" /> View Students
                              </Link>
                              {access.isOwner && (
                                <button onClick={() => setModal({ kind: 'teacher', cls: selected, section: s })} className="btn-outline border-line py-1.5 text-sm text-ink">
                                  <UserRound className="size-4" /> {s.teacher ? 'Change Teacher' : 'Assign Teacher'}
                                </button>
                              )}
                              {isAdmin && (
                                <>
                                  <button onClick={() => setModal({ kind: 'section', cls: selected, section: s })} className="btn-outline border-line py-1.5 text-sm text-ink" aria-label={`Rename section ${s.name}`}>
                                    <Pencil className="size-4" /> Edit
                                  </button>
                                  <button
                                    onClick={() => setModal({ kind: 'remove-section', cls: selected, section: s })}
                                    className="grid size-9 place-items-center rounded-xl text-muted ring-1 ring-line hover:bg-rose-50 hover:text-rose-600"
                                    aria-label={`Remove section ${s.name}`}
                                    title="Remove section"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selected.sections.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted">No sections yet{isAdmin ? ' — add one to assign a class teacher.' : '.'}</p>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* All classes */}
        {overview && overview.classes.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">All Classes</h2>
              <div className="flex flex-wrap items-center gap-3">
                {overview.classes.some((c) => c.status === 'Archived') && (
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink/80">
                    <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-4 accent-brand" />
                    Show archived
                  </label>
                )}
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search classes…"
                    aria-label="Search classes"
                    className="rounded-xl border border-line py-2 pr-3 pl-9 text-sm outline-none focus:border-brand"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-xs font-bold text-ink/80">
                    <th className="px-4 py-3">Class Name</th>
                    <th className="px-3 py-3">Students</th>
                    <th className="px-3 py-3">Sections</th>
                    <th className="px-3 py-3">Class Teachers</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {listed.map((c) => {
                    const teachers = [...new Set(c.sections.flatMap((s) => (s.teacher ? [s.teacher.name] : [])))]
                    return (
                      <tr key={c.id} className={c.status === 'Archived' ? 'opacity-70' : ''}>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block min-w-28 rounded-lg px-3 py-1.5 font-bold ${c.status === 'Active' ? toneOf(c).chip : 'bg-slate-100 text-muted'}`}>{c.name}</span>
                        </td>
                        <td className="px-3 py-2.5">{c.students}</td>
                        <td className="px-3 py-2.5">{c.sections.length}</td>
                        <td className="px-3 py-2.5">
                          {teachers.length ? (
                            <span className="flex items-center gap-2">
                              <Avatar name={teachers[0]} size="size-8" />
                              {teachers[0]}
                              {teachers.length > 1 && <span className="text-xs text-muted">+{teachers.length - 1}</span>}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${
                              c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-muted ring-line'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex justify-end gap-2">
                            {c.status === 'Active' ? (
                              <>
                                <button
                                  onClick={() => {
                                    setParam('class', c.id)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                  }}
                                  className="btn-outline border-line py-1.5 text-sm text-ink"
                                >
                                  <Eye className="size-4" /> View
                                </button>
                                {isAdmin && (
                                  <button onClick={() => setModal({ kind: 'class', cls: c })} className="btn-outline border-line py-1.5 text-sm text-ink">
                                    <Pencil className="size-4" /> Edit
                                  </button>
                                )}
                              </>
                            ) : (
                              isAdmin && (
                                <RestoreButton
                                  onRestore={async () => {
                                    try {
                                      setOverview(await classesApi.updateClass(c.id, { status: 'Active' }, year))
                                    } catch (err) {
                                      setError(errorMessage(err))
                                    }
                                  }}
                                />
                              )
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {listed.length === 0 && <p className="py-6 text-center text-sm text-muted">No classes match “{search}”.</p>}
            </div>
          </section>
        )}
      </div>

      {modal?.kind === 'class' && (
        <NameDialog
          title={modal.cls ? `Edit ${modal.cls.name}` : 'Add Class'}
          subtitle={modal.cls ? 'Rename this class.' : 'e.g. Play Group, Nursery, LKG, UKG, Day Care'}
          label="Class Name"
          initial={modal.cls?.name ?? ''}
          maxLength={50}
          submitLabel={modal.cls ? 'Save' : 'Add Class'}
          onClose={() => setModal(null)}
          onSubmit={async (name) => {
            const o = modal.cls ? await classesApi.updateClass(modal.cls.id, { name }, year) : await classesApi.createClass(name, year)
            setOverview(o)
            if (!modal.cls) {
              const created = o.classes.find((c) => c.name.toLowerCase() === name.toLowerCase())
              if (created) setParam('class', created.id)
            }
          }}
        />
      )}
      {modal?.kind === 'section' && (
        <NameDialog
          title={modal.section ? `Rename Section ${modal.section.name}` : `Add Section to ${modal.cls.name}`}
          subtitle="Sections are usually letters: A, B, C…"
          label="Section Name"
          initial={modal.section?.name ?? nextSectionName(modal.cls)}
          maxLength={20}
          submitLabel={modal.section ? 'Save' : 'Add Section'}
          onClose={() => setModal(null)}
          onSubmit={async (name) =>
            setOverview(
              modal.section
                ? await classesApi.updateSection(modal.cls.id, modal.section.id, { name }, year)
                : await classesApi.createSection(modal.cls.id, name, year),
            )
          }
        />
      )}
      {modal?.kind === 'teacher' && (
        <AssignTeacherDialog
          cls={modal.cls}
          section={modal.section}
          onClose={() => setModal(null)}
          onSave={async (memberId) => setOverview(await classesApi.updateSection(modal.cls.id, modal.section.id, { teacher_member_id: memberId }, year))}
        />
      )}
      {modal?.kind === 'archive' && (
        <Dialog
          title={`Archive ${modal.cls.name}?`}
          subtitle="Archived classes are hidden from setup, the dashboard and enrollment. You can restore it any time."
          submitLabel="Archive Class"
          danger
          onClose={() => setModal(null)}
          onSubmit={async () => {
            setOverview(await classesApi.updateClass(modal.cls.id, { status: 'Archived' }, year))
            setParams((p) => {
              const n = new URLSearchParams(p)
              n.delete('class')
              return n
            })
          }}
        >
          {modal.cls.students > 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
              {modal.cls.name} has {modal.cls.students} active students. Move them to another class first (open the class, select students, then <strong>Move</strong>).
            </p>
          )}
        </Dialog>
      )}
      {modal?.kind === 'remove-section' && (
        <Dialog
          title={`Remove Section ${modal.section.name}?`}
          subtitle={`From ${modal.cls.name}. Only a section with no students can be removed.`}
          submitLabel="Remove Section"
          danger
          onClose={() => setModal(null)}
          onSubmit={async () => setOverview(await classesApi.deleteSection(modal.cls.id, modal.section.id, year))}
        />
      )}
    </AppShell>
  )
}

function nextSectionName(cls: ClassDetail): string {
  const used = new Set(cls.sections.map((s) => s.name))
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !used.has(l)) ?? ''
}

function RestoreButton({ onRestore }: { onRestore: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await onRestore()
        setBusy(false)
      }}
      className="btn-outline border-line py-1.5 text-sm text-ink"
    >
      <ArchiveRestore className="size-4" /> Restore
    </button>
  )
}

function NameDialog({
  title,
  subtitle,
  label,
  initial,
  maxLength,
  submitLabel,
  onClose,
  onSubmit,
}: {
  title: string
  subtitle: string
  label: string
  initial: string
  maxLength: number
  submitLabel: string
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(initial)
  return (
    <Dialog title={title} subtitle={subtitle} submitLabel={submitLabel} onClose={onClose} onSubmit={() => onSubmit(name.trim())} submitDisabled={!name.trim()}>
      <label className="block text-sm font-bold text-ink">
        {label}
        <input
          autoFocus
          value={name}
          maxLength={maxLength}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </label>
    </Dialog>
  )
}

function AssignTeacherDialog({
  cls,
  section,
  onClose,
  onSave,
}: {
  cls: ClassDetail
  section: SectionSummary
  onClose: () => void
  onSave: (memberId: string | null) => Promise<void>
}) {
  const [teachers, setTeachers] = useState<TeacherOption[] | null>(null)
  const [choice, setChoice] = useState<string>(section.teacher?.member_id ?? '')
  useEffect(() => {
    classesApi.teachers().then(setTeachers, () => setTeachers([]))
  }, [])
  const mine = `${cls.name} - ${section.name}`
  return (
    <Dialog
      title={`Class Teacher · ${mine}`}
      subtitle="Pick who looks after this section."
      submitLabel="Save"
      onClose={onClose}
      onSubmit={() => onSave(choice || null)}
    >
      {!teachers ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto" role="radiogroup">
          {teachers.map((t) => {
            const others = t.sections.filter((s) => s !== mine)
            return (
              <label
                key={t.member_id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 transition ${choice === t.member_id ? 'bg-sky-50 ring-brand' : 'ring-line hover:bg-slate-50'}`}
              >
                <input type="radio" name="teacher" value={t.member_id} checked={choice === t.member_id} onChange={() => setChoice(t.member_id)} className="accent-brand" />
                <Avatar name={t.name} size="size-9" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block font-bold text-ink">{t.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {t.role === 'Owner' ? 'School Owner' : t.role}
                    {t.email ? ` · ${t.email}` : ''}
                  </span>
                  {others.length > 0 && <span className="text-xs text-amber-700">Also teaches {others.join(', ')}</span>}
                </span>
              </label>
            )
          })}
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 ${choice === '' ? 'bg-sky-50 ring-brand' : 'ring-line hover:bg-slate-50'}`}>
            <input type="radio" name="teacher" checked={choice === ''} onChange={() => setChoice('')} className="accent-brand" />
            <span className="font-semibold text-muted">No class teacher</span>
          </label>
        </div>
      )}
      <p className="text-xs text-muted">
        Don’t see someone? Add teachers in{' '}
        <Link to="/setup" className="font-bold text-brand">
          Settings → Basic User Setup
        </Link>
        .
      </p>
    </Dialog>
  )
}

