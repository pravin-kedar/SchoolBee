import { useEffect, useState } from 'react'
import { CircleCheck, Pencil, Plus, Sparkles } from 'lucide-react'

import { ZapShell } from '../../components/zap/ZapShell'
import { inputCls } from '../../components/zap/ZapLicenseCard'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { gb, limitText, rupees, zapLicenseApi, type Feature, type Plan, type PlanInput } from '../../lib/license'

type Row = Plan & { schools: number }

const blank: PlanInput = {
  name: '', description: '', is_trial: false, trial_days: null, price_monthly: 0, price_yearly: null, students: null, storage_mb: 10240,
  staff_logins: null, retention_days: 90, features: [], is_active: true, highlight: false, sort_order: 5,
}

const toInput = (p: Plan): PlanInput => ({
  name: p.name, description: p.description, is_trial: p.is_trial, trial_days: p.trial_days, price_monthly: p.price_monthly, price_yearly: p.price_yearly,
  students: p.students, storage_mb: p.storage_mb, staff_logins: p.staff_logins, retention_days: p.retention_days, features: p.features,
  is_active: p.is_active, highlight: p.highlight, sort_order: p.sort_order,
})

/** Website admin: the plans schools can buy, their limits and features. */
export function ZapPlansPage() {
  const [plans, setPlans] = useState<Row[] | null>(null)
  const [features, setFeatures] = useState<Record<string, Feature>>({})
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ key: string | null; input: PlanInput } | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    zapLicenseApi.plans().then(
      (r) => {
        setPlans(r.plans)
        setFeatures(r.features)
      },
      (err) => setError(errorMessage(err)),
    )
  }, [reload])

  return (
    <ZapShell
      title="Plans"
      subtitle="What schools can buy: prices, limits, the free trial, how long data is kept after expiry, and which features each plan includes."
      actions={
        <button onClick={() => setEditing({ key: null, input: blank })} className="btn-primary">
          <Plus className="size-4" /> New plan
        </button>
      }
    >
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Plans">
        {plans?.map((p) => (
          <li key={p.key} aria-label={p.name} className={`flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ${p.is_active ? 'ring-line/60' : 'opacity-70 ring-dashed ring-slate-300'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="flex flex-wrap items-center gap-2 text-lg font-extrabold">
                  {p.name}
                  {p.is_trial && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700 ring-1 ring-violet-200">Free trial</span>}
                  {p.highlight && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-brand ring-1 ring-sky-200">Most popular</span>}
                  {!p.is_active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Hidden</span>}
                </h3>
                <p className="text-sm text-muted">{p.description}</p>
              </div>
              <button
                onClick={() => setEditing({ key: p.key, input: toInput(p) })}
                className="grid size-9 shrink-0 place-items-center rounded-lg ring-1 ring-line hover:bg-slate-50"
                aria-label={`Edit ${p.name}`}
              >
                <Pencil className="size-4" />
              </button>
            </div>
            <p className="mt-3 text-2xl font-extrabold">
              {p.is_trial ? `${p.trial_days} days free` : `${rupees(p.price_monthly)} / month`}
              {p.price_yearly ? <span className="ml-2 text-sm font-semibold text-muted">or {rupees(p.price_yearly)} / year</span> : null}
            </p>
            <ul className="mt-3 flex-1 space-y-1.5 text-sm">
              <li>{limitText(p.students)} students · {gb(p.storage_mb)} · {p.staff_logins === 0 ? 'owner only' : `${limitText(p.staff_logins)} staff logins`}</li>
              <li className="text-muted">Data kept {p.retention_days} days after expiry</li>
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <CircleCheck className="size-4 text-violet-600" /> {features[f]?.name ?? f}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              {p.schools} school{p.schools === 1 ? ' has' : 's have'} used it · key <span className="font-mono">{p.key}</span>
            </p>
          </li>
        ))}
      </ul>
      {!plans && !error && <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />}
      {editing && (
        <PlanDialog
          planKey={editing.key}
          initial={editing.input}
          features={features}
          onClose={() => setEditing(null)}
          onSaved={() => setReload((n) => n + 1)}
        />
      )}
    </ZapShell>
  )
}

function PlanDialog({ planKey, initial, features, onClose, onSaved }: { planKey: string | null; initial: PlanInput; features: Record<string, Feature>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<PlanInput>(initial)
  const set = (patch: Partial<PlanInput>) => setF((x) => ({ ...x, ...patch }))
  const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v.replace(/\D/g, '')) || 0))
  const ok = f.name.trim().length >= 2 && f.storage_mb >= 100 && (f.is_trial ? Boolean(f.trial_days) : f.price_monthly > 0)
  return (
    <Dialog
      title={planKey ? `Edit ${initial.name}` : 'New plan'}
      subtitle={planKey ? 'Changes apply straight away to every school on this plan.' : 'Schools can buy it as soon as it is visible.'}
      submitLabel={planKey ? 'Save plan' : 'Create plan'}
      size="lg"
      submitDisabled={!ok}
      onClose={onClose}
      onSubmit={async () => {
        const body = { ...f, name: f.name.trim(), description: f.description?.trim() || null }
        if (planKey) await zapLicenseApi.updatePlan(planKey, body)
        else await zapLicenseApi.createPlan(body)
        onSaved()
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          Name
          <input value={f.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} aria-label="Plan name" className={inputCls} />
        </label>
        <label className="block text-sm font-bold">
          Short description
          <input value={f.description ?? ''} maxLength={300} onChange={(e) => set({ description: e.target.value })} aria-label="Description" className={inputCls} />
        </label>
      </div>
      {!planKey && (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={f.is_trial} onChange={(e) => set({ is_trial: e.target.checked, trial_days: e.target.checked ? 30 : null })} className="size-4" />
          <Sparkles className="size-4 text-violet-600" /> This is the free trial (offered once to each new school)
        </label>
      )}
      {f.is_trial ? (
        <label className="block text-sm font-bold">
          Trial length (days)
          <input inputMode="numeric" value={f.trial_days ?? ''} onChange={(e) => set({ trial_days: num(e.target.value) })} aria-label="Trial days" className={inputCls} />
        </label>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            Monthly price (₹)
            <input inputMode="numeric" value={f.price_monthly || ''} onChange={(e) => set({ price_monthly: num(e.target.value) ?? 0 })} aria-label="Monthly price" className={inputCls} />
          </label>
          <label className="block text-sm font-bold">
            Yearly price (₹) <span className="font-normal text-muted">(blank = monthly only)</span>
            <input inputMode="numeric" value={f.price_yearly ?? ''} onChange={(e) => set({ price_yearly: num(e.target.value) || null })} aria-label="Yearly price" className={inputCls} />
          </label>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-bold">
          Students <span className="font-normal text-muted">(blank = unlimited)</span>
          <input inputMode="numeric" value={f.students ?? ''} onChange={(e) => set({ students: num(e.target.value) || null })} aria-label="Students limit" className={inputCls} />
        </label>
        <label className="block text-sm font-bold">
          Storage (MB)
          <input inputMode="numeric" value={f.storage_mb || ''} onChange={(e) => set({ storage_mb: num(e.target.value) ?? 0 })} aria-label="Storage MB" className={inputCls} />
          <span className="text-xs font-normal text-muted">{gb(f.storage_mb || 0)}</span>
        </label>
        <label className="block text-sm font-bold">
          Staff logins <span className="font-normal text-muted">(blank = unlimited)</span>
          <input inputMode="numeric" value={f.staff_logins ?? ''} onChange={(e) => set({ staff_logins: num(e.target.value) })} aria-label="Staff logins limit" className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          Keep data after expiry (days)
          <input inputMode="numeric" value={f.retention_days || ''} onChange={(e) => set({ retention_days: num(e.target.value) ?? 0 })} aria-label="Retention days" className={inputCls} />
        </label>
        <label className="block text-sm font-bold">
          Order on the price list
          <input inputMode="numeric" value={f.sort_order} onChange={(e) => set({ sort_order: num(e.target.value) ?? 0 })} aria-label="Sort order" className={inputCls} />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-bold">Features in this plan</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {Object.entries(features).map(([key, feat]) => (
            <label key={key} className="flex items-start gap-2 rounded-xl p-2.5 text-sm ring-1 ring-line">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={f.features.includes(key)}
                onChange={(e) => set({ features: e.target.checked ? [...f.features, key] : f.features.filter((x) => x !== key) })}
                aria-label={feat.name}
              />
              <span>
                <span className="font-semibold">{feat.name}</span>
                {!feat.ready && <span className="ml-1 rounded bg-slate-100 px-1.5 text-xs text-muted">coming soon</span>}
                <span className="block text-xs text-muted">{feat.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={f.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="size-4" /> Visible (schools can choose it)
        </label>
        {!f.is_trial && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.highlight} onChange={(e) => set({ highlight: e.target.checked })} className="size-4" /> Mark as “Most popular”
          </label>
        )}
      </div>
    </Dialog>
  )
}
