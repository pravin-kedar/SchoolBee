import { useState } from 'react'
import { CircleCheck, Loader2, Sparkles } from 'lucide-react'

import { gb, limitText, rupees, yearlySaving, type Cycle, type Feature, type Plan } from '../../lib/license'

/** Free trial + paid plan cards with a monthly / yearly switch. */
export function PlanPicker({
  plans,
  catalog,
  trial,
  current,
  busy,
  onBuy,
  onTrial,
  buyLabel = (p) => `Choose ${p.name}`,
}: {
  plans: Plan[]
  catalog: Record<string, Feature>
  trial?: Plan | null
  current?: string | null
  busy: string | null
  onBuy: (plan: Plan, cycle: Cycle) => void
  onTrial?: () => void
  buyLabel?: (p: Plan) => string
}) {
  const [cycle, setCycle] = useState<Cycle>('yearly')
  const anyYearly = plans.some((p) => p.price_yearly)
  const cards = [...(trial ? [trial] : []), ...plans]
  return (
    <div>
      {anyYearly && (
        <div className="mb-5 flex justify-center">
          <div className="inline-flex rounded-full bg-white p-1 shadow-card ring-1 ring-line" role="group" aria-label="Billing">
            {(['monthly', 'yearly'] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cycle === c}
                onClick={() => setCycle(c)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${cycle === c ? 'bg-brand text-white' : 'text-muted hover:text-ink'}`}
              >
                {c === 'monthly' ? 'Monthly' : 'Yearly'}
                {c === 'yearly' && <span className={`ml-1.5 text-xs ${cycle === c ? 'text-white/80' : 'text-emerald-600'}`}>save more</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <ul className={`grid gap-4 ${cards.length >= 3 ? 'md:grid-cols-3' : cards.length === 2 ? 'md:grid-cols-2' : ''}`} aria-label="Plans">
        {cards.map((p) => {
          const yearly = cycle === 'yearly' && p.price_yearly
          const price = p.is_trial ? 0 : yearly ? p.price_yearly! : p.price_monthly
          const isCurrent = current === p.key
          return (
            <li
              key={p.key}
              aria-label={`${p.name} plan`}
              className={`relative flex flex-col rounded-2xl bg-white p-5 shadow-card ${p.highlight || isCurrent ? 'ring-2 ring-brand' : 'ring-1 ring-line/60'}`}
            >
              {(p.highlight || isCurrent) && (
                <span className="absolute -top-3 left-5 rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">{isCurrent ? 'Your plan' : 'Most popular'}</span>
              )}
              <h3 className="text-lg font-extrabold">{p.name}</h3>
              {p.description && <p className="text-sm text-muted">{p.description}</p>}
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-extrabold">
                  {p.is_trial ? 'Free' : <><span className="font-[system-ui]">₹</span>{price.toLocaleString('en-IN')}</>}
                </span>
                <span className="text-sm text-muted">{p.is_trial ? `for ${p.trial_days} days` : yearly ? '/ year' : '/ month'}</span>
              </p>
              {!p.is_trial && yearly && yearlySaving(p) > 0 && <p className="text-xs font-semibold text-emerald-700">You save {rupees(yearlySaving(p))} a year</p>}
              {!p.is_trial && !yearly && p.price_yearly && <p className="text-xs text-muted">or {rupees(p.price_yearly)} / year</p>}
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                <Perk>{limitText(p.students)} students</Perk>
                <Perk>{gb(p.storage_mb)} document storage</Perk>
                <Perk>{p.staff_logins === 0 ? 'Owner login only' : `${limitText(p.staff_logins)} staff logins`}</Perk>
                <Perk>Students, attendance, fees, staff, calendar, assessments, reports</Perk>
                {p.features.map((f) => (
                  <Perk key={f} extra>
                    {catalog[f]?.name ?? f}
                    {catalog[f] && !catalog[f].ready && <span className="ml-1 text-xs text-muted">(coming soon)</span>}
                  </Perk>
                ))}
              </ul>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => (p.is_trial ? onTrial?.() : onBuy(p, yearly ? 'yearly' : 'monthly'))}
                className={`mt-5 w-full justify-center disabled:opacity-60 ${p.is_trial || p.highlight ? 'btn-primary' : 'btn-outline'}`}
              >
                {busy === p.key ? <Loader2 className="size-4 animate-spin" /> : p.is_trial ? <Sparkles className="size-4" /> : null}
                {p.is_trial ? `Start ${p.trial_days}-day free trial` : buyLabel(p)}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Perk({ children, extra = false }: { children: React.ReactNode; extra?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <CircleCheck className={`mt-0.5 size-4 shrink-0 ${extra ? 'text-violet-600' : 'text-emerald-600'}`} />
      <span>{children}</span>
    </li>
  )
}
