import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Award,
  Bell,
  CalendarCheck,
  CalendarDays,
  Megaphone,
  ChartColumn,
  ChevronDown,
  Crown,
  CircleCheck,
  FileText,
  Contact,
  House,
  IndianRupee,
  Info,
  LogOut,
  Menu,
  School,
  Search,
  Settings,
  Star,
  TrendingUp,
  TriangleAlert,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

import beeBook from '../../assets/bees/bee-book.webp'
import { Logo } from '../Logo'
import { SchoolLogo } from './SchoolLogo'
import { Avatar } from '../students/StudentUi'
import { logout, useMe, usePermission } from '../../lib/auth'
import type { DashboardNotice } from '../../lib/dashboard'
import { notificationsApi, type AppNotification } from '../../lib/calendar'
import { markReminded, reminderDue, useLicenseStatus } from '../../lib/license'
import { LicenseBanner, ReminderPopup } from '../license/LicenseNotices'

// `perm`: shown only with that permission; `owner`: school owner only.
const NAV: { to: string; label: string; icon: LucideIcon; perm?: string; owner?: boolean }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: House },
  { to: '/students', label: 'Students', icon: Users, perm: 'students.view' },
  { to: '/classes', label: 'Classes', icon: School, perm: 'students.view' },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, perm: 'attendance.take' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/documents', label: 'Documents', icon: FileText, perm: 'students.view' },
  { to: '/progress', label: 'Progress', icon: TrendingUp, perm: 'progress.rate' },
  { to: '/assessments', label: 'Assessments', icon: Star, perm: 'assessments.enter' },
  { to: '/certificates', label: 'Certificates', icon: Award, perm: 'certificates.issue' },
  { to: '/fees', label: 'Fees', icon: IndianRupee, perm: 'fees.view' },
  { to: '/staff', label: 'Staff', icon: Contact, owner: true },
  { to: '/reports', label: 'Reports', icon: ChartColumn },
]
const NAV_BOTTOM = [
  { to: '/plan', label: 'Plan & Licence', icon: Crown, owner: true },
  { to: '/settings', label: 'Settings', icon: Settings, perm: 'settings.manage' },
  { to: '/profile', label: 'My Profile', icon: UserRound },
]

const NOTICE_STYLE: Record<DashboardNotice['level'], { icon: LucideIcon; tone: string }> = {
  warning: { icon: TriangleAlert, tone: 'bg-amber-100 text-amber-600' },
  info: { icon: Info, tone: 'bg-sky-100 text-brand' },
  success: { icon: CircleCheck, tone: 'bg-emerald-100 text-emerald-600' },
}

type ShellProps = {
  children: ReactNode
  /** Shown under the school name when the page knows it. */
  academicYear?: string | null
  /** Feeds the bell; pages without them hide the badge. */
  notices?: DashboardNotice[]
}

/** Frame for every logged-in page: sidebar, top bar, scrolling content. */
export function AppShell({ children, academicYear, notices }: ShellProps) {
  const { me } = useMe()
  const [drawer, setDrawer] = useState(false)
  const school = me?.schools.find((s) => s.id === me.active_school_id) ?? me?.schools[0]
  const access = usePermission()
  const allowed = (n: { perm?: string; owner?: boolean }) => (n.owner ? access.isOwner : !n.perm || access.can(n.perm))
  const feed = useNotifications(me?.active_school_id ? `${me.id}:${me.active_school_id}` : null)
  const licenseKey = me?.active_school_id ? `${me.id}:${me.active_school_id}` : null
  const { status: license } = useLicenseStatus(licenseKey)
  const navigate = useNavigate()
  const [reminded, setReminded] = useState(false)
  const remind = Boolean(license && licenseKey && !reminded && reminderDue(license, access.isOwner, licenseKey))

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f6f9ff]">
      <Sidebar className="hidden lg:flex" allowed={allowed} />
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
          <button className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <Sidebar className="relative flex h-full shadow-float" allowed={allowed} onNavigate={() => setDrawer(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-20 flex shrink-0 items-center gap-3 border-b border-line/60 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
          <button
            onClick={() => setDrawer(true)}
            className="grid size-10 place-items-center rounded-xl bg-white text-ink ring-1 ring-line lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-line">
            <SchoolLogo url={school?.logo_url} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-bold text-ink">{school?.name ?? '…'}</span>
              {academicYear && <span className="block truncate text-xs text-muted">Academic Year {academicYear}</span>}
            </span>
          </div>

          <SearchBox />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <NoticeBell notices={notices} feed={feed} />
            <ProfileMenu name={me?.full_name ?? ''} role={school?.role ?? ''} photo={me?.photo_url} />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {license && <LicenseBanner status={license} owner={access.isOwner} />}
          {children}
        </main>
      </div>
      {remind && license && licenseKey ? (
        <ReminderPopup
          status={license}
          owner={access.isOwner}
          onClose={(toPlan) => {
            markReminded(license, access.isOwner, licenseKey)
            setReminded(true)
            if (toPlan) navigate('/plan')
          }}
        />
      ) : (
        <WhatsNew feed={feed} />
      )}
    </div>
  )
}

// ------------------------------------------------------- notifications

type Feed = { unread: number; items: AppNotification[]; markSeen: () => void; popup: boolean; closePopup: () => void }

// One fetch per 30 s across page changes (every page renders the shell),
// per user + school so a different login never sees someone else's feed.
let feedCache: { key: string; at: number; unread: number; items: AppNotification[] } | null = null

/** School notifications (new / changed / cancelled events...). */
function useNotifications(key: string | null): Feed {
  const [cached, setState] = useState(feedCache)
  const [popup, setPopup] = useState(false)
  const state = cached && cached.key === key ? cached : null
  useEffect(() => {
    if (!key || (feedCache?.key === key && Date.now() - feedCache.at < 30_000)) return
    let live = true
    notificationsApi.list().then(
      (d) => {
        feedCache = { key, at: Date.now(), ...d }
        if (!live) return
        setState(feedCache)
        if (d.unread > 0 && claimPopup(key)) setPopup(true)
      },
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [key])
  const markSeen = useCallback(() => {
    if (!feedCache?.unread) return
    feedCache = { ...feedCache, unread: 0 } // items keep their highlight until the next fetch
    setState(feedCache)
    void notificationsApi.seen().catch(() => undefined)
  }, [])
  return { unread: state?.unread ?? 0, items: state?.items ?? [], markSeen, popup, closePopup: useCallback(() => setPopup(false), []) }
}

/** The "what's new" pop-up shows once per browser session per login. */
function claimPopup(key: string): boolean {
  try {
    const k = `sb_whats_new_${key}`
    if (sessionStorage.getItem(k)) return false
    sessionStorage.setItem(k, '1')
  } catch {
    /* storage blocked: show it anyway */
  }
  return true
}

/** Once per browser session after login: what's new since they last looked. */
function WhatsNew({ feed }: { feed: Feed }) {
  const navigate = useNavigate()
  if (!feed.popup) return null
  const fresh = feed.items.filter((n) => n.unread).slice(0, 5)
  const close = (to?: string | null) => {
    feed.closePopup()
    feed.markSeen()
    if (to) navigate(to)
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal aria-label="What's new">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-float">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-600">
            <Megaphone className="size-5" />
          </span>
          What’s new at school
        </h2>
        <ul className="mt-4 space-y-2">
          {fresh.map((n) => (
            <li key={n.id}>
              <button onClick={() => close(n.link)} className="w-full rounded-xl p-3 text-left ring-1 ring-line hover:bg-slate-50">
                <span className="block text-sm font-bold">{n.title}</span>
                {n.body && <span className="block text-xs text-muted">{n.body}</span>}
              </button>
            </li>
          ))}
        </ul>
        {feed.unread > fresh.length && <p className="mt-2 text-xs text-muted">+{feed.unread - fresh.length} more in the bell</p>}
        <div className="mt-5 flex justify-end gap-2">
          {fresh.some((n) => n.link?.startsWith('/calendar')) && (
            <button onClick={() => close('/calendar')} className="btn-outline">
              <CalendarDays className="size-4" /> Open calendar
            </button>
          )}
          <button onClick={() => close()} className="btn-primary">
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return d < 7 ? `${d} day${d === 1 ? '' : 's'} ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function Sidebar({
  className = '',
  allowed,
  onNavigate,
}: {
  className?: string
  allowed: (n: { perm?: string; owner?: boolean }) => boolean
  onNavigate?: () => void
}) {
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition ${
      isActive ? 'bg-sky-100/70 text-brand' : 'text-ink/80 hover:bg-slate-50 hover:text-ink'
    }`
  return (
    <aside className={`w-64 shrink-0 flex-col border-r border-line bg-white ${className}`}>
      <div className="px-6 pt-5 pb-4">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Main">
        {NAV.filter(allowed).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={link} onClick={onNavigate}>
            <Icon className="size-5" /> {label}
          </NavLink>
        ))}
        <div className="my-3 border-t border-line" />
        {NAV_BOTTOM.filter(allowed).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={link} onClick={onNavigate}>
            <Icon className="size-5" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="relative h-40 shrink-0 overflow-hidden bg-gradient-to-b from-white via-sky-50 to-emerald-100">
        <img src={beeBook} alt="" className="absolute top-1 left-5 w-20 animate-float drop-shadow-lg" />
        <p className="absolute right-4 bottom-10 -rotate-6 text-right font-hand text-xl leading-tight font-bold text-ink">
          Small Steps
          <br />
          Brighter Futures
        </p>
        <div className="absolute inset-x-0 bottom-0 h-9 rounded-t-[50%] bg-gradient-to-b from-emerald-300 to-emerald-500" />
      </div>
    </aside>
  )
}

function SearchBox() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        navigate(`/students?q=${encodeURIComponent(q.trim())}`)
      }}
      className="relative ml-2 hidden max-w-sm flex-1 lg:block"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search students, documents, etc…"
        aria-label="Search"
        className="w-full rounded-xl bg-slate-100/80 py-2.5 pr-3 pl-9 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-brand/40"
      />
    </form>
  )
}

/** Closes a popover on outside click / Escape. */
function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, ref }
}

function NoticeBell({ notices, feed }: { notices?: DashboardNotice[]; feed: Feed }) {
  const { open, setOpen, ref } = usePopover()
  const actionable = (notices ?? []).filter((n) => n.level !== 'success')
  const count = feed.unread + actionable.length
  const updates = feed.items.slice(0, 8)
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o)
          if (!open) feed.markSeen()
        }}
        className="relative grid size-10 place-items-center rounded-xl bg-white text-amber-500 ring-1 ring-line"
        aria-label={`Notifications${count ? ` (${count})` : ''}`}
        aria-expanded={open}
      >
        <Bell className="size-5" fill="currentColor" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-rose-500 text-[11px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-2xl bg-white p-2 shadow-float ring-1 ring-line sm:w-96">
          <p className="px-2 py-1.5 text-sm font-bold text-ink">Notifications</p>
          {actionable.map((n) => (
            <NoticeRow key={n.key} notice={n} onClick={() => setOpen(false)} compact />
          ))}
          {updates.length > 0 && <p className="mt-1 px-2 pt-1.5 text-xs font-bold tracking-wide text-muted uppercase">School updates</p>}
          {updates.map((n) => {
            const body = (
              <>
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${n.unread ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-muted'}`}>
                  <Megaphone className="size-4" />
                </span>
                <span className="min-w-0 leading-snug">
                  <span className="block text-sm font-bold text-ink">{n.title}</span>
                  {n.body && <span className="block text-xs text-muted">{n.body}</span>}
                  <span className="text-[11px] text-muted">
                    {ago(n.created_at)}
                    {n.created_by ? ` · ${n.created_by}` : ''}
                  </span>
                </span>
                {n.unread && <span className="ml-auto size-2 shrink-0 rounded-full bg-rose-500" aria-label="new" />}
              </>
            )
            const cls = `flex items-start gap-3 rounded-xl p-2 text-left ${n.unread ? 'bg-amber-50/60' : ''}`
            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => setOpen(false)} className={`${cls} hover:bg-slate-50`}>
                {body}
              </Link>
            ) : (
              <div key={n.id} className={cls}>
                {body}
              </div>
            )
          })}
          {actionable.length === 0 && updates.length === 0 && <p className="px-2 pb-2 text-sm text-muted">You’re all caught up.</p>}
        </div>
      )}
    </div>
  )
}

export function NoticeRow({
  notice,
  onClick,
  compact = false,
}: {
  notice: DashboardNotice
  onClick?: () => void
  compact?: boolean
}) {
  const { icon: Icon, tone } = NOTICE_STYLE[notice.level]
  const body = (
    <>
      <span className={`grid shrink-0 place-items-center rounded-full ${tone} ${compact ? 'size-8' : 'size-10'}`}>
        <Icon className={compact ? 'size-4' : 'size-5'} />
      </span>
      <span className="min-w-0 leading-snug">
        <span className="block text-sm font-bold text-ink">{notice.title}</span>
        <span className="text-xs text-muted">{notice.detail}</span>
      </span>
    </>
  )
  const cls = 'flex items-center gap-3 rounded-xl p-2 text-left'
  return notice.action_path ? (
    <Link to={notice.action_path} onClick={onClick} className={`${cls} hover:bg-slate-50`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function ProfileMenu({ name, role, photo }: { name: string; role: string; photo: string | null | undefined }) {
  const navigate = useNavigate()
  const { open, setOpen, ref } = usePopover()
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-2xl bg-white py-1.5 pr-2.5 pl-1.5 ring-1 ring-line"
        aria-expanded={open}
      >
        <Avatar name={name || '?'} url={photo} size="size-9" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-bold text-ink">{name}</span>
          <span className="text-xs text-muted">{role === 'Owner' ? 'School Owner' : role}</span>
        </span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl bg-white p-1.5 shadow-float ring-1 ring-line">
          <Link to="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50">
            <UserRound className="size-4" /> My Profile
          </Link>
          <Link to="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50">
            <Settings className="size-4" /> School Settings
          </Link>
          <button
            onClick={() => {
              void logout()
              navigate('/login', { replace: true })
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      )}
    </div>
  )
}

