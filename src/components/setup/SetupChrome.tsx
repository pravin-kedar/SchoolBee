import { useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  LayoutGrid,
  Lightbulb,
  LogOut,
  School,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

import schoolBand from '../../assets/school-band.webp'
import beeFlying from '../../assets/bees/bee-flying.webp'
import { Logo } from '../Logo'
import { SUPPORT_EMAIL } from '../../config'
import type { SetupState, StepKey } from '../../lib/setup'

const STEP_ICONS: Record<StepKey, LucideIcon> = {
  school: School,
  academic_year: CalendarDays,
  classes: Users,
  sections: LayoutGrid,
  users: UserRound,
}

type StepsProps = { state: SetupState; current: StepKey; onSelect: (key: StepKey) => void }

/** Left rail: logo, numbered step list, bee illustration. Desktop only. */
export function SetupSidebar({ state, current, onSelect }: StepsProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-white lg:flex">
      <div className="px-6 pt-6">
        <Logo />
      </div>
      <div className="mx-4 mt-5 flex items-center gap-3 rounded-2xl bg-sky-50 p-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand text-white">
          <ClipboardList className="size-5" />
        </span>
        <span className="leading-tight">
          <span className="block font-bold text-ink">School Setup</span>
          <span className="text-xs text-muted">Complete these steps</span>
        </span>
      </div>

      <ol className="mt-4 space-y-1 px-4">
        {state.steps.map((s, i) => {
          const active = s.key === current
          return (
            <li key={s.key}>
              <button
                onClick={() => onSelect(s.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold transition ${
                  active ? 'bg-sky-50 text-brand' : 'text-ink/80 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`grid size-8 place-items-center rounded-full text-sm font-extrabold ${
                    active ? 'bg-brand text-white' : s.done ? 'bg-leaf text-white' : 'bg-slate-100 text-muted'
                  }`}
                >
                  {s.done && !active ? <Check className="size-4" /> : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          )
        })}
      </ol>

      <div className="relative mt-auto h-48 min-h-0 shrink overflow-hidden bg-gradient-to-b from-white via-sky-50 to-emerald-100">
        <img src={beeFlying} alt="" className="absolute top-2 left-6 w-24 animate-float drop-shadow-lg" />
        <p className="absolute right-5 bottom-14 -rotate-6 text-right font-hand text-2xl leading-tight font-bold text-ink">
          Let’s set up
          <br />
          your school!
        </p>
        <div className="absolute inset-x-0 bottom-0 h-12 rounded-t-[50%] bg-gradient-to-b from-emerald-300 to-emerald-500" />
      </div>
    </aside>
  )
}

/** Illustrated band across the top with the user menu. */
export function SetupTopbar({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <header className="relative z-20 shrink-0">
      {/* Background in its own clipped layer so the user menu can overflow the band. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-[#f6f9ff]">
        <img
          src={schoolBand}
          alt=""
          className="absolute top-0 left-[58%] hidden h-[135%] w-auto -translate-x-1/2 [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] md:block"
        />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-[#f6f9ff]" />
      </div>
      <div className="relative flex items-center justify-between gap-4 px-4 py-4 sm:px-8 xl:h-24 xl:py-0">
        <div>
          <div className="mb-2 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">School Setup</h1>
          <p className="text-sm sm:text-base">Complete the following steps to configure your preschool.</p>
        </div>
        <div className="relative shrink-0 self-start xl:self-center">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-3 rounded-2xl bg-white/95 py-2 pr-3 pl-2 shadow-card"
            aria-expanded={open}
          >
            <span className="grid size-10 place-items-center rounded-full bg-amber-100 font-bold text-amber-700">
              {initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block font-bold text-ink">{name}</span>
              <span className="text-xs text-muted">School Owner</span>
            </span>
            <ChevronDown className="size-4 text-muted" />
          </button>
          {open && (
            <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl bg-white p-1.5 shadow-float ring-1 ring-line">
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
              >
                <LogOut className="size-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

/** Horizontal icon stepper above the form. */
export function Stepper({ state, current, onSelect }: StepsProps) {
  const index = state.steps.findIndex((s) => s.key === current)
  return (
    <ol className="flex shrink-0 overflow-x-auto rounded-2xl bg-white px-4 py-3 shadow-card">
      {state.steps.map((s, i) => {
        const Icon = STEP_ICONS[s.key]
        const active = i === index
        return (
          <li key={s.key} className="flex min-w-24 flex-1 items-start">
            <button onClick={() => onSelect(s.key)} className="flex w-full flex-col items-center gap-1.5 text-center">
              <span
                className={`grid size-10 place-items-center rounded-full transition ${
                  active
                    ? 'bg-brand text-white shadow-[0_6px_16px_-6px_rgb(23_102_232/0.8)]'
                    : s.done
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-muted'
                }`}
              >
                {s.done && !active ? <Check className="size-5" /> : <Icon className="size-5" />}
              </span>
              <span className={`text-xs leading-tight sm:text-sm ${active ? 'font-bold text-ink' : 'text-muted'}`}>{s.label}</span>
            </button>
            {i < state.steps.length - 1 && (
              <span className={`mt-5 hidden h-0.5 w-full min-w-6 sm:block ${i < index ? 'bg-brand' : 'bg-line'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function ProgressCard({ state }: { state: SetupState }) {
  const done = state.steps.filter((s) => s.done).length
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold">Setup Progress</h2>
      <p className="mt-1 text-sm font-semibold text-emerald-700">Your school is {state.percent}% ready</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#eef1f7" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#22b35e"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - state.percent / 100)}
              className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center leading-tight">
            <span>
              <span className="block font-display text-2xl font-extrabold text-ink">{state.percent}%</span>
              <span className="text-xs text-muted">Completed</span>
            </span>
          </span>
        </div>
        <div>
          <p className="text-sm">
            <strong className="text-ink">{done}</strong> of {state.steps.length} steps completed
          </p>
          <ul className="mt-2 space-y-1">
            {state.steps.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-sm">
                <span
                  className={`grid size-5 place-items-center rounded-full ${
                    s.done ? 'bg-leaf text-white' : 'ring-2 ring-line'
                  }`}
                >
                  {s.done && <Check className="size-3" strokeWidth={3} />}
                </span>
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function TipCards() {
  return (
    <>
      <section className="flex gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
        <Lightbulb className="size-7 shrink-0 fill-honey text-amber-500" />
        <div>
          <h2 className="font-bold">Tip</h2>
          <p className="mt-1 text-sm">You can update these settings later from the Settings page.</p>
        </div>
      </section>
      <section className="flex gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-lg font-extrabold text-white">?</span>
        <div>
          <h2 className="font-bold">Need Help?</h2>
          <p className="mt-1 text-sm">If you need any assistance, feel free to reach out to our support team.</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-outline mt-2 py-1.5">
            Contact Support <ExternalLink className="size-4" />
          </a>
        </div>
      </section>
    </>
  )
}
