import { useState, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  FileStack,
  History,
  BadgeIndianRupee,
  Crown,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react'

import beeBook from '../../assets/bees/bee-book.webp'
import { clearZapToken, useZapToken } from '../../lib/zap'

const NAV: { to: string; label: string; icon: LucideIcon; soon?: boolean; end?: boolean }[] = [
  { to: '/zap', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/zap/schools', label: 'Schools', icon: School },
  { to: '/zap/logins', label: 'Login History', icon: History },
  { to: '/zap/licenses', label: 'Licences', icon: Crown },
  { to: '/zap/plans', label: 'Plans', icon: Layers },
  { to: '/zap/payments', label: 'Payments', icon: BadgeIndianRupee },
  { to: '/zap/templates', label: 'Doc Templates', icon: FileStack },
]

/** Route guard for /zap/*: no admin session -> /login (before any page fetches). */
export function ZapGate() {
  return useZapToken() ? <Outlet /> : <Navigate to="/login" replace />
}

/** Layout for the website admin area. */
export function ZapShell({
  title,
  subtitle,
  actions,
  wide = false,
  children,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  /** Use the full width (editors) instead of the reading width. */
  wide?: boolean
  children: ReactNode
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const nav = (
    <nav aria-label="Admin" className="space-y-1">
      {NAV.map(({ to, label, icon: Icon, soon, end }) =>
        soon ? (
          <span key={to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/40">
            <Icon className="size-5" /> {label}
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase">Next</span>
          </span>
        ) : (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-honey text-ink' : 'text-white/80 hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon className="size-5" /> {label}
          </NavLink>
        ),
      )}
    </nav>
  )

  const brand = (
    <div className="flex items-center gap-2">
      <img src={beeBook} alt="" className="h-9" />
      <div className="leading-none">
        <p className="font-display text-xl font-extrabold text-white">
          School<span className="text-honey">Bee</span>
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-bold tracking-wider text-honey uppercase">
          <ShieldCheck className="size-3" /> Website Admin
        </p>
      </div>
    </div>
  )

  const signOut = (
    <button
      onClick={() => {
        clearZapToken()
        navigate('/login', { replace: true })
      }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
    >
      <LogOut className="size-5" /> Log out
    </button>
  )

  return (
    <div className="min-h-dvh bg-slate-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink p-4 lg:flex">
        {brand}
        <div className="mt-8 flex-1">{nav}</div>
        {signOut}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        {brand}
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-white" aria-label="Open menu">
          <Menu className="size-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-72 flex-col bg-ink p-4">
            <div className="flex items-center justify-between">
              {brand}
              <button onClick={() => setOpen(false)} className="p-1 text-white" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-8 flex-1">{nav}</div>
            {signOut}
          </div>
        </div>
      )}

      <main className={`mx-auto space-y-5 p-4 sm:p-6 ${wide ? 'max-w-[1800px]' : 'max-w-7xl'}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-0.5 text-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  )
}

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint, icon: Icon, tone }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
        <Icon className="size-6" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
        <p className="text-sm font-bold text-ink/80">{label}</p>
        {hint && <p className="truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  )
}

export function SchoolStatus({ blocked, setupDone }: { blocked: boolean; setupDone?: boolean }) {
  if (blocked) return <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600 ring-1 ring-rose-200">Blocked</span>
  if (setupDone === false)
    return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">Setup pending</span>
  return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Active</span>
}
