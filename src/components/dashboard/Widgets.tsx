import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  CalendarCheck,
  CalendarDays,
  FileText,
  Layers,
  School,
  Star,
  Sun,
  Upload,
  UserPlus,
  UserRoundX,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

import schoolBand from '../../assets/school-band.webp'
import beeBook from '../../assets/bees/bee-book.webp'
import beeReading from '../../assets/bees/bee-reading.webp'
import beeSearch from '../../assets/bees/bee-search.webp'
import { NoticeRow } from '../app/AppShell'
import type { Dashboard } from '../../lib/dashboard'

// ------------------------------------------------------------------ shared

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: { label: string; to: string }
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-lg font-bold">{title}</h2>
        {action && (
          <Link to={action.to} className="mt-0.5 shrink-0 text-sm font-bold whitespace-nowrap text-brand hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function Empty({ image, title, text, cta }: { image: string; title: string; text: string; cta?: { label: string; to: string } }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-center">
      <img src={image} alt="" className="mb-1 h-16 w-auto opacity-90" />
      <p className="font-bold text-ink">{title}</p>
      <p className="max-w-xs text-sm text-muted">{text}</p>
      {cta && (
        <Link to={cta.to} className="btn-outline mt-2 py-1.5 text-sm">
          {cta.label}
        </Link>
      )}
    </div>
  )
}

const pct = (part: number, total: number) => (total ? Math.round((part * 100) / total) : 0)

// ---------------------------------------------------------------- greeting

function greeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function GreetingBanner({ data }: { data: Dashboard }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-100 via-sky-50 to-amber-50 ring-1 ring-sky-100">
      <img
        src={schoolBand}
        alt=""
        className="pointer-events-none absolute top-0 left-[52%] hidden h-full -translate-x-1/2 opacity-95 [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_75%)] 2xl:block"
      />
      <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-7">
        <div className="flex items-center gap-4">
          <Sun className="hidden size-12 shrink-0 fill-honey text-amber-400 sm:block" />
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              {greeting()}, {data.user_name.split(' ')[0]}!
            </h1>
            <p className="mt-0.5">Here’s what’s happening at {data.school.name} today.</p>
          </div>
        </div>
        <div className="hidden items-center xl:flex">
          <img src={beeBook} alt="" className="z-10 -mr-3 w-20 animate-float drop-shadow-lg" />
          <p className="rounded-2xl bg-amber-50/95 px-4 py-2.5 text-sm leading-snug text-ink shadow-card ring-1 ring-amber-100">
            Today is a great day
            <br />
            to make a difference!
            <br />
            <span className="font-semibold">Keep up the amazing work!</span>
          </p>
        </div>
      </div>
    </section>
  )
}

// ------------------------------------------------------------------- stats

type Stat = { icon: LucideIcon; tone: string; label: string; value: string; badge?: { text: string; tone: string }; sub: string }

export function StatCards({ data }: { data: Dashboard }) {
  const s = data.stats
  const taken = s.attendance_taken
  const marked = s.present_today + s.absent_today + s.late_today
  const stats: Stat[] = [
    {
      icon: Users,
      tone: 'bg-sky-100 text-brand',
      label: 'Total Students',
      value: String(s.total_students),
      sub: `Across ${data.overview.classes} Class${data.overview.classes === 1 ? '' : 'es'}`,
    },
    {
      icon: CalendarCheck,
      tone: 'bg-emerald-100 text-emerald-600',
      label: 'Present Today',
      value: taken ? String(s.present_today + s.late_today) : '—',
      badge: taken ? { text: `${pct(s.present_today + s.late_today, marked)}%`, tone: 'bg-emerald-100 text-emerald-700' } : undefined,
      sub: taken ? `Of ${marked} marked${s.late_today ? ` · ${s.late_today} late` : ''}` : 'Attendance not taken',
    },
    {
      icon: UserRoundX,
      tone: 'bg-rose-100 text-rose-500',
      label: 'Absent Today',
      value: taken ? String(s.absent_today) : '—',
      badge: taken ? { text: `${pct(s.absent_today, marked)}%`, tone: 'bg-rose-100 text-rose-600' } : undefined,
      sub: taken ? `Of ${marked} marked` : 'Attendance not taken',
    },
    {
      icon: FileText,
      tone: 'bg-violet-100 text-violet-600',
      label: 'Pending Documents',
      value: String(s.pending_documents),
      sub: s.pending_documents ? 'Need attention' : 'All caught up',
    },
    {
      icon: Star,
      tone: 'bg-amber-100 text-amber-500',
      label: 'Pending Assessments',
      value: String(s.pending_assessments),
      sub: s.pending_assessments ? 'Classes to finish' : 'All caught up',
    },
  ]
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
      {stats.map(({ icon: Icon, tone, label, value, badge, sub }) => (
        <li key={label} className="flex min-w-0 flex-col items-start gap-2 rounded-2xl bg-white p-3 shadow-card ring-1 ring-line/60 min-[480px]:flex-row min-[480px]:items-center min-[480px]:gap-3 sm:p-4 xl:flex-col xl:items-start 2xl:flex-row 2xl:items-center">
          <span className={`grid size-10 shrink-0 place-items-center rounded-2xl sm:size-12 ${tone}`}>
            <Icon className="size-6" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-xs font-semibold text-ink/80 sm:text-sm">{label}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2">
              <span className="font-display text-xl font-extrabold text-ink sm:text-2xl">{value}</span>
              {badge && <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${badge.tone}`}>{badge.text}</span>}
            </span>
            <span className="block text-xs text-muted">{sub}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ----------------------------------------------------------- quick actions

const ACTIONS: { label: string; to: string; icon: LucideIcon; tone: string }[] = [
  { label: 'Add Student', to: '/students', icon: UserPlus, tone: 'bg-sky-50 text-brand ring-sky-100' },
  { label: 'Take Attendance', to: '/attendance/take', icon: CalendarCheck, tone: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
  { label: 'Add Assessment', to: '/assessments', icon: Star, tone: 'bg-amber-50 text-amber-500 ring-amber-100' },
  { label: 'Upload Document', to: '/documents', icon: Upload, tone: 'bg-violet-50 text-violet-600 ring-violet-100' },
  { label: 'Generate Certificate', to: '/certificates', icon: Award, tone: 'bg-rose-50 text-rose-500 ring-rose-100' },
]

export function QuickActions({ className = '' }: { className?: string }) {
  return (
    <Card title="Quick Actions" className={className}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {ACTIONS.map(({ label, to, icon: Icon, tone }) => (
          <li key={label}>
            <Link
              to={to}
              className={`flex h-full flex-col items-center justify-center gap-2 rounded-2xl px-2 py-4 text-center ring-1 transition hover:-translate-y-0.5 hover:shadow-card ${tone}`}
            >
              <Icon className="size-7" />
              <span className="text-sm leading-tight font-bold text-ink">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// -------------------------------------------------------------- attendance

export function AttendanceCard({ data }: { data: Dashboard }) {
  const s = data.stats
  if (!s.attendance_taken) {
    return (
      <Card title="Today’s Attendance" action={{ label: 'View Details', to: '/attendance' }}>
        <Empty
          image={beeSearch}
          title="Not taken yet"
          text={s.total_students ? 'Mark today’s attendance for your classes.' : 'Add students first, then take attendance daily.'}
          cta={{ label: s.total_students ? 'Take Attendance' : 'Add Students', to: s.total_students ? '/attendance/take' : '/students' }}
        />
      </Card>
    )
  }
  // Of the children marked so far (Late still attended) - not of every
  // student, or a half-taken day would look like mass absence.
  const marked = s.present_today + s.absent_today + s.late_today
  const notMarked = Math.max(0, s.total_students - marked)
  const present = pct(s.present_today + s.late_today, marked)
  const r = 42
  const c = 2 * Math.PI * r
  const rows = [
    { label: 'Present', value: s.present_today, dot: 'bg-emerald-500' },
    { label: 'Absent', value: s.absent_today, dot: 'bg-rose-500' },
    { label: 'Late', value: s.late_today, dot: 'bg-amber-400' },
  ]
  return (
    <Card title="Today’s Attendance" action={{ label: 'View Details', to: '/attendance' }}>
      <div className="flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${present}% present`}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="#eef1f7" strokeWidth="11" />
            <circle cx="50" cy="50" r={r} fill="none" stroke="#22b35e" strokeWidth="11" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - present / 100)} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center leading-tight">
            <span>
              <span className="block font-display text-2xl font-extrabold text-ink">{present}%</span>
              <span className="text-xs text-muted">of {marked} marked</span>
            </span>
          </span>
        </div>
        <ul className="flex-1 space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${row.dot}`} /> {row.label}
              </span>
              <span className="font-bold text-ink">{row.value}</span>
            </li>
          ))}
          {notMarked > 0 && (
            <li className="flex items-center justify-between text-muted">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-slate-300" /> Not marked yet
              </span>
              <span className="font-bold">{notMarked}</span>
            </li>
          )}
          <li className="flex justify-between border-t border-line pt-2">
            Total Students <span className="font-bold text-ink">{s.total_students}</span>
          </li>
        </ul>
      </div>
    </Card>
  )
}

// ------------------------------------------------------- students by class

const BAR_TONES = ['bg-sky-400', 'bg-rose-400', 'bg-amber-400', 'bg-violet-400', 'bg-emerald-400', 'bg-orange-400']

export function StudentsByClass({ data }: { data: Dashboard }) {
  if (!data.classes.length) {
    return (
      <Card title="Students by Class">
        <Empty image={beeReading} title="No classes yet" text="Add your classes on the Classes page." cta={{ label: 'Add Classes', to: '/classes' }} />
      </Card>
    )
  }
  const max = Math.max(1, ...data.classes.map((c) => c.students))
  const none = data.stats.total_students === 0
  return (
    <Card title="Students by Class" action={{ label: 'View Details', to: '/classes' }}>
      <div className="flex flex-1 items-end justify-around gap-3 pt-2" role="list">
        {data.classes.map((c, i) => (
          <div key={c.id} role="listitem" className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-sm font-bold text-ink">{c.students}</span>
            <div className="flex h-24 w-full max-w-12 items-end">
              <div
                className={`w-full rounded-t-xl ${none ? 'bg-slate-200' : BAR_TONES[i % BAR_TONES.length]}`}
                style={{ height: `${none ? 12 : Math.max(8, (c.students / max) * 100)}%` }}
              />
            </div>
            <span className="w-full truncate text-center text-xs font-semibold text-ink/80">{c.name}</span>
          </div>
        ))}
      </div>
      {none && <p className="mt-3 text-center text-xs text-muted">No students enrolled yet</p>}
    </Card>
  )
}

// ---------------------------------------------------------------- overview

export function OverviewCard({ data }: { data: Dashboard }) {
  const rows: { icon: LucideIcon; tone: string; label: string; value: string }[] = [
    { icon: CalendarDays, tone: 'bg-sky-100 text-brand', label: 'Academic Year', value: data.school.academic_year ?? 'Not set' },
    { icon: School, tone: 'bg-amber-100 text-amber-600', label: 'Classes', value: String(data.overview.classes) },
    { icon: Layers, tone: 'bg-violet-100 text-violet-600', label: 'Sections', value: String(data.overview.sections) },
    { icon: UsersRound, tone: 'bg-emerald-100 text-emerald-600', label: 'Staff', value: String(data.overview.staff) },
  ]
  return (
    <Card title="School Overview" action={{ label: 'Settings', to: '/settings' }}>
      <ul className="space-y-2.5">
        {rows.map(({ icon: Icon, tone, label, value }) => (
          <li key={label} className="flex items-center gap-3">
            <span className={`grid size-9 place-items-center rounded-full ${tone}`}>
              <Icon className="size-4" />
            </span>
            <span className="flex-1 text-sm font-semibold text-ink/80">{label}</span>
            <span className="font-bold text-ink">{value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs font-semibold">
          <span className="text-muted">School setup</span>
          <span className={data.school.setup_completed ? 'text-emerald-600' : 'text-amber-600'}>{data.school.setup_percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${data.school.setup_completed ? 'bg-leaf' : 'bg-amber-400'}`}
            style={{ width: `${data.school.setup_percent}%` }}
          />
        </div>
      </div>
    </Card>
  )
}

export function NoticesCard({ data }: { data: Dashboard }) {
  return (
    <Card title="Important Notifications">
      <div className="-mx-2 space-y-0.5">
        {data.notices.map((n) => (
          <NoticeRow key={n.key} notice={n} />
        ))}
      </div>
    </Card>
  )
}

// ------------------------------------------------------------ recent lists

const STATUS_TONE = {
  Pending: 'bg-rose-50 text-rose-600',
  Verified: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-slate-100 text-muted',
} as const

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export function RecentStudents({ data }: { data: Dashboard }) {
  return (
    <Card title="Recent Students" action={{ label: 'View All', to: '/students' }}>
      {data.recent_students.length === 0 ? (
        <Empty image={beeReading} title="No students yet" text="Newly enrolled students will show up here." cta={{ label: 'Add Student', to: '/students' }} />
      ) : (
        <ul className="divide-y divide-line">
          {data.recent_students.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <span className="leading-tight">
                <span className="block font-semibold text-ink">{s.name}</span>
                <span className="text-xs text-muted">
                  {s.class_name}
                  {s.section ? ` - ${s.section}` : ''}
                </span>
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Enrolled {when(s.enrolled_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function RecentDocuments({ data }: { data: Dashboard }) {
  return (
    <Card title="Recent Documents" action={{ label: 'View All', to: '/documents' }}>
      {data.recent_documents.length === 0 ? (
        <Empty image={beeSearch} title="No documents yet" text="Birth certificates, Aadhaar and photos you upload will appear here." cta={{ label: 'Upload Document', to: '/documents' }} />
      ) : (
        <ul className="divide-y divide-line">
          {data.recent_documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2">
              <span className="leading-tight">
                <span className="block font-semibold text-ink">
                  {d.student_name} - {d.title}
                </span>
                <span className="text-xs text-muted">Uploaded {when(d.uploaded_at)}</span>
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[d.status]}`}>{d.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function DashboardSkeleton() {
  const block = 'animate-pulse rounded-2xl bg-slate-200/60'
  return (
    <div className="space-y-5 p-4 sm:p-6" aria-busy>
      <div className={`${block} h-24`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`${block} h-20`} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className={`${block} h-72 xl:col-span-2`} />
        <div className={`${block} h-72`} />
      </div>
    </div>
  )
}
