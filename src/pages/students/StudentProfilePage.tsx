import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  TrendingUp,
  Award,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Droplet,
  FileText,
  House,
  IndianRupee,
  Loader2,
  NotebookPen,
  Pencil,
  Phone,
  School,
  ShieldCheck,
  Star,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

import beeBook from '../../assets/bees/bee-book.webp'
import beeDesk from '../../assets/bees/bee-desk.webp'
import { AppShell } from '../../components/app/AppShell'
import {
  DetailedHistory,
  MonthCalendar,
  MonthNav,
  MonthSummaryCard,
  StudentMonthStats,
} from '../../components/attendance/AttendanceUi'
import { StudentDocsPanel } from '../../components/documents/StudentDocsPanel'
import { IssuedRegister } from '../../components/certificates/IssuedRegister'
import { useCanIssue } from '../../lib/certificates'
import { usePermission } from '../../lib/auth'
import { useStudentMonth } from '../../lib/useStudentMonth'
import { todayIso } from '../../lib/attendance'
import { Avatar, InfoRow, StatusBadge } from '../../components/students/StudentUi'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { ageLabel, formatDate, studentsApi, type Student } from '../../lib/students'
import { StudentAssessmentsTab } from '../../components/students/StudentAssessmentsTab'
import { StudentProgressTab } from '../../components/students/StudentProgressTab'
import { StudentHistory } from '../../components/progress/StudentHistory'

const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: 'Overview', icon: CalendarDays },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { key: 'assessment', label: 'Assessment', icon: UserRound },
  { key: 'certificates', label: 'Certificates', icon: Award },
  { key: 'progress', label: 'Progress', icon: TrendingUp },
]

export function StudentProfilePage() {
  const { id = '' } = useParams()
  const token = useAccessToken()
  const navigate = useNavigate()
  const location = useLocation()
  const [student, setStudent] = useState<Student | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('overview')
  const canIssue = useCanIssue()
  const access = usePermission()
  const canEdit = access.can('students.manage')
  const [busy, setBusy] = useState<'photo' | 'status' | null>(null)
  const [flash, setFlash] = useState<string | null>(
    (location.state as { justSaved?: string } | null)?.justSaved === 'enrolled'
      ? 'Student enrolled successfully!'
      : (location.state as { justSaved?: string } | null)?.justSaved === 'updated'
        ? 'Changes saved.'
        : null,
  )
  const photoInput = useRef<HTMLInputElement>(null)
  const options = useSchoolOptions()

  useEffect(() => {
    if (!token) return
    let live = true
    studentsApi
      .get(id)
      .then((s) => live && setStudent(s))
      .catch((err) => live && setError(errorMessage(err)))
    return () => {
      live = false
    }
  }, [id, token])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 4000)
    return () => clearTimeout(t)
  }, [flash])

  if (!token) return <Navigate to="/login" replace />

  async function uploadPhoto(file: File) {
    if (file.size > 5 * 1024 * 1024) return setError('Photo must be under 5 MB')
    setBusy('photo')
    setError(null)
    try {
      setStudent(await studentsApi.uploadPhoto(id, file))
      setFlash('Photo updated.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function toggleStatus() {
    if (!student || student.status === 'Draft') return
    setBusy('status')
    setError(null)
    try {
      setStudent(await studentsApi.update(id, { status: student.status === 'Active' ? 'Inactive' : 'Active' }))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const edit = (step: number) => navigate(`/students/${id}/edit?step=${step}`)

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <nav className="flex items-center gap-1.5 text-sm font-semibold" aria-label="Breadcrumb">
          <Link to="/students" className="text-muted hover:text-brand">
            Students
          </Link>
          <ChevronRight className="size-4 text-muted" />
          <span className="text-ink">{student?.full_name ?? '…'}</span>
        </nav>

        {flash && (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <Check className="size-4" /> {flash}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}

        {!student ? (
          !error && <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            {/* Header */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-amber-50 p-5 ring-1 ring-line/60 sm:p-6">
              <div className="flex flex-wrap items-start gap-6">
                <div className="relative">
                  <Avatar name={student.full_name} url={student.photo_url} gender={student.gender} size="size-32 text-4xl rounded-2xl" />
                  <button
                    onClick={() => photoInput.current?.click()}
                    disabled={busy === 'photo'}
                    hidden={!canEdit}
                    className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full bg-ink/75 text-white ring-2 ring-white hover:bg-ink"
                    aria-label="Change photo"
                  >
                    {busy === 'photo' ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  </button>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void uploadPhoto(f)
                      e.target.value = ''
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-extrabold">{student.full_name}</h1>
                    <StatusBadge status={student.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    Student ID: <span className="text-ink">{student.student_code}</span>
                    <span className="mx-3 text-line">|</span>
                    Admission No: <span className="text-ink">{student.admission_no}</span>
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
                    <Chip icon={Users} tone="bg-sky-100 text-brand" label="Class" value={student.class_name ?? '—'} />
                    <Chip icon={School} tone="bg-amber-100 text-amber-600" label="Section" value={student.section_name ?? '—'} />
                    <Chip
                      icon={CalendarDays}
                      tone="bg-emerald-100 text-emerald-600"
                      label="Date of Birth"
                      value={student.date_of_birth ? `${formatDate(student.date_of_birth)} (${ageLabel(student.date_of_birth)})` : '—'}
                    />
                    <Chip icon={UserRound} tone="bg-violet-100 text-violet-600" label="Gender" value={student.gender ?? '—'} />
                    <Chip icon={Droplet} tone="bg-rose-100 text-rose-500" label="Blood Group" value={student.blood_group ?? '—'} />
                  </ul>
                </div>
                <div className="hidden items-center self-center 2xl:flex">
                  <p className="rounded-2xl bg-amber-50/95 px-4 py-3 text-sm leading-snug font-semibold text-ink shadow-card ring-1 ring-amber-100">
                    “Curious Mind,
                    <br />
                    Brighter Tomorrow”
                  </p>
                  <img src={beeBook} alt="" className="-ml-3 w-20 animate-float drop-shadow-lg" />
                </div>
              </div>
            </section>

            {student.status === 'Draft' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-5 py-3 ring-1 ring-amber-200">
                <p className="font-semibold text-amber-800">This enrollment is a draft — finish it to make the student active.</p>
                {canEdit && (
                  <Link to={`/students/${id}/edit`} className="btn-primary py-2">
                    Finish Enrollment
                  </Link>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex min-w-32 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                    tab === key ? 'bg-brand text-white shadow-[0_6px_16px_-8px_rgb(23_102_232/0.8)]' : 'text-ink/70 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            {tab === 'attendance' ? (
              <StudentAttendanceTab studentId={id} />
            ) : tab === 'progress' ? (
              <div className="space-y-5">
                <StudentProgressTab studentId={id} />
                <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-6">
                  <StudentHistory studentId={id} today={todayIso()} />
                </section>
              </div>
            ) : tab === 'assessment' ? (
              <StudentAssessmentsTab studentId={id} />
            ) : tab === 'certificates' ? (
              <section className="space-y-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">Certificates issued to {student.first_name}</h2>
                  {canIssue && (
                    <Link to={`/certificates/generate?student=${id}`} className="btn-primary py-2">
                      <Award className="size-4" /> Issue certificate
                    </Link>
                  )}
                </div>
                <IssuedRegister studentId={id} compact />
              </section>
            ) : tab === 'documents' ? (
              <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-6">
                <StudentDocsPanel studentId={id} />
              </section>
            ) : tab === 'overview' ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
                <Card icon={UserRound} tone="bg-sky-100 text-brand" title="Personal Information" onEdit={canEdit ? () => edit(0) : undefined}>
                  <InfoRow label="Full Name" value={student.full_name} />
                  <InfoRow label="Date of Birth" value={student.date_of_birth ? `${formatDate(student.date_of_birth)} (${ageLabel(student.date_of_birth)})` : null} />
                  <InfoRow label="Gender" value={student.gender} />
                  <InfoRow label="Blood Group" value={student.blood_group} />
                  <InfoRow label="Nationality" value={student.nationality} />
                  <InfoRow label="Religion" value={student.religion} />
                  {student.caste && <InfoRow label="Caste" value={student.caste} />}
                </Card>

                <Card icon={Users} tone="bg-rose-100 text-rose-500" title="Parent & Guardian Information" onEdit={canEdit ? () => edit(1) : undefined}>
                  <div className="divide-y divide-line">
                    <Person role="Father" name={student.father_name} phone={student.father_phone} email={student.father_email} />
                    <Person role="Mother" name={student.mother_name} phone={student.mother_phone} email={student.mother_email} />
                    {(student.guardian_name || student.guardian_phone) && (
                      <Person
                        role={`Guardian${student.guardian_relation ? ` (${student.guardian_relation})` : ''}`}
                        name={student.guardian_name}
                        phone={student.guardian_phone}
                        email={student.guardian_email}
                      />
                    )}
                  </div>
                </Card>

                <aside className="space-y-5 xl:row-span-3">
                  <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                    <h2 className="text-lg font-bold">Quick Actions</h2>
                    <div className="mt-3 space-y-2">
                      {canEdit && <QuickAction to={`/students/${id}/edit`} icon={Pencil} tone="bg-sky-50 text-brand ring-sky-100" label="Edit Student" />}
                      {access.can('documents.upload') && <QuickAction to={`/documents?student=${id}`} icon={Upload} tone="bg-violet-50 text-violet-600 ring-violet-100" label="Upload Document" />}
                      {access.can('attendance.take') && <QuickAction
                        to={student.class_id ? `/attendance/take?class_id=${student.class_id}${student.section_id ? `&section_id=${student.section_id}` : ''}` : '/attendance/take'}
                        icon={CalendarCheck} tone="bg-emerald-50 text-emerald-600 ring-emerald-100" label="Take Attendance" />}
                      {access.can('assessments.enter') && <QuickAction to="/assessments" icon={Star} tone="bg-amber-50 text-amber-600 ring-amber-100" label="Assessments" />}
                      {access.can('fees.view') && <QuickAction to={`/fees/students/${id}`} icon={IndianRupee} tone="bg-emerald-50 text-emerald-600 ring-emerald-100" label="Fees & Payments" />}
                      {canIssue && <QuickAction to={`/certificates/generate?student=${id}`} icon={Award} tone="bg-rose-50 text-rose-500 ring-rose-100" label="Generate Certificate" />}
                      {canEdit && student.status !== 'Draft' && (
                        <button
                          onClick={() => void toggleStatus()}
                          disabled={busy === 'status'}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-ink/80 ring-1 ring-line hover:bg-slate-50"
                        >
                          {busy === 'status' ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                          Mark as {student.status === 'Active' ? 'Inactive' : 'Active'}
                        </button>
                      )}
                    </div>
                  </section>
                  <section className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-brand">
                      <Users className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1 leading-snug">
                      <p className="font-bold text-ink">Class & Section</p>
                      <p className="font-semibold text-brand">
                        {student.class_name ?? 'No class'}
                        {student.section_name ? ` - Section ${student.section_name}` : ''}
                      </p>
                      <p className="text-xs text-muted">Academic Year {student.academic_year_name ?? '—'}</p>
                    </div>
                    {student.class_id && (
                      <Link
                        to={`/students?class_id=${student.class_id}${student.section_id ? `&section_id=${student.section_id}` : ''}`}
                        className="grid size-9 place-items-center rounded-xl ring-1 ring-line hover:bg-slate-50"
                        aria-label="Classmates"
                        title="See classmates"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    )}
                  </section>
                  <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                    <h2 className="text-lg font-bold">Recent Activity</h2>
                    <ul className="mt-3 space-y-3 text-sm">
                      {student.updated_at.slice(0, 16) !== student.created_at.slice(0, 16) && (
                        <li className="flex justify-between gap-3">
                          <span className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-violet-500" /> Profile updated
                          </span>
                          <span className="text-muted">{formatDate(student.updated_at)}</span>
                        </li>
                      )}
                      <li className="flex justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-brand" /> {student.status === 'Draft' ? 'Draft created' : 'Enrolled'}
                        </span>
                        <span className="text-muted">{formatDate(student.created_at)}</span>
                      </li>
                    </ul>
                  </section>
                </aside>

                <Card icon={House} tone="bg-emerald-100 text-emerald-600" title="Address Information" onEdit={canEdit ? () => edit(2) : undefined}>
                  <InfoRow label="Address" value={student.address} />
                  <InfoRow label="City" value={student.city} />
                  <InfoRow label="State" value={student.state} />
                  <InfoRow label="PIN Code" value={student.pincode} />
                </Card>

                <Card icon={Star} tone="bg-amber-100 text-amber-500" title="Academic Information" onEdit={canEdit ? () => edit(3) : undefined}>
                  <InfoRow label="Academic Year" value={student.academic_year_name} />
                  <InfoRow label="Class" value={student.class_name} />
                  <InfoRow label="Section" value={student.section_name} />
                  <InfoRow label="Admission Date" value={student.admission_date ? formatDate(student.admission_date) : null} />
                  <InfoRow label="Admission No." value={student.admission_no} />
                  <InfoRow label="Status" value={<StatusBadge status={student.status} />} />
                </Card>

                <Card icon={Phone} tone="bg-violet-100 text-violet-600" title="Emergency Contact" onEdit={canEdit ? () => edit(2) : undefined}>
                  <InfoRow label="Contact Name" value={student.emergency_name} />
                  <InfoRow label="Relationship" value={student.emergency_relation} />
                  <InfoRow label="Mobile Number" value={student.emergency_phone} />
                </Card>

                <Card icon={NotebookPen} tone="bg-sky-100 text-brand" title="Additional Notes" onEdit={canEdit ? () => edit(2) : undefined}>
                  <InfoRow label="Allergies" value={student.allergies ?? 'No known allergies'} />
                  <InfoRow label="Medical Conditions" value={student.medical_conditions} />
                  <InfoRow label="Special Notes" value={student.notes} />
                </Card>
              </div>
            ) : (
              <div className="grid place-items-center rounded-2xl bg-white p-10 text-center shadow-card ring-1 ring-line/60">
                <img src={beeDesk} alt="" className="w-28" />
                <p className="mt-3 text-lg font-bold text-ink">{TABS.find((t) => t.key === tab)?.label} is coming soon</p>
                <p className="text-sm">This will show {student.first_name}’s {TABS.find((t) => t.key === tab)?.label.toLowerCase()} once the module is ready.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

function Chip({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: string; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
        <Icon className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-xs text-muted">{label}</span>
        <span className="font-bold text-ink">{value}</span>
      </span>
    </li>
  )
}

function Card({ icon: Icon, tone, title, onEdit, children }: { icon: LucideIcon; tone: string; title: string; onEdit?: () => void; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-bold">
          <span className={`grid size-9 place-items-center rounded-xl ${tone}`}>
            <Icon className="size-5" />
          </span>
          {title}
        </h2>
        {onEdit && (
          <button onClick={onEdit} className="btn-outline py-1.5 text-sm">
            <Pencil className="size-3.5" /> Edit
          </button>
        )}
      </div>
      <dl>{children}</dl>
    </section>
  )
}

function Person({ role, name, phone, email }: { role: string; name: string | null; phone: string | null; email: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Avatar name={name ?? role} size="size-10" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-xs text-muted">{role}</p>
        <p className="font-bold text-ink">{name ?? '—'}</p>
      </div>
      <div className="min-w-0 text-right text-sm leading-relaxed">
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center justify-end gap-1.5 font-semibold text-ink hover:text-brand">
            <Phone className="size-3.5 text-muted" /> {phone}
          </a>
        )}
        {email && <p className="truncate text-muted">{email}</p>}
      </div>
    </div>
  )
}

function QuickAction({ to, icon: Icon, tone, label }: { to: string; icon: LucideIcon; tone: string; label: string }) {
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ring-1 transition hover:-translate-y-0.5 ${tone}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-white/80">
        <Icon className="size-4" />
      </span>
      <span className="text-ink">{label}</span>
    </Link>
  )
}


function StudentAttendanceTab({ studentId }: { studentId: string }) {
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const { data, error } = useStudentMonth(studentId, month)
  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>
  if (!data) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
  return (
    <div className="space-y-5">
      <StudentMonthStats data={data} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <MonthNav month={month} onChange={setMonth} />
            <Link to={`/attendance/history?student_id=${studentId}&month=${month}`} className="text-sm font-bold text-brand hover:underline">
              Open in Attendance History
            </Link>
          </div>
          <MonthCalendar data={data} />
        </section>
        <div className="space-y-5">
          <MonthSummaryCard data={data} />
          <DetailedHistory data={data} />
        </div>
      </div>
    </div>
  )
}
