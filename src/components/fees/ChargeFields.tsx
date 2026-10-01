import { selectCls } from '../students/StudentTable'
import { CHARGE_TYPES, type ChargeDraft, type ChargeType } from '../../lib/fees'

const inputCls = `${selectCls} mt-1 w-full font-normal`

/** Name, type, amount, due date and description of a charge. */
export function ChargeFields({ draft, onChange, presets }: { draft: ChargeDraft; onChange: (d: ChargeDraft) => void; presets: [string, ChargeType][] }) {
  const set = (patch: Partial<ChargeDraft>) => onChange({ ...draft, ...patch })
  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold text-ink">
        Name
        <input value={draft.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Annual Day 2026 – participation" aria-label="Charge name" className={inputCls} />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map(([name, category]) => (
          <button key={name} type="button" onClick={() => set({ name, category })} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink hover:bg-slate-200">
            {name}
          </button>
        ))}
      </div>
      <div>
        <p className="text-sm font-bold text-ink">Type</p>
        <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Charge type">
          {CHARGE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={draft.category === t}
              onClick={() => set({ category: t })}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ${draft.category === t ? 'bg-sky-50 text-brand ring-brand' : 'ring-line hover:bg-slate-50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold text-ink">
          Amount per student
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-muted">₹</span>
            <input inputMode="numeric" value={draft.amount} onChange={(e) => set({ amount: e.target.value.replace(/[^\d]/g, '') })} aria-label="Amount per student" className={`${inputCls} pl-7`} />
          </div>
        </label>
        <label className="block text-sm font-bold text-ink">
          Due date
          <input type="date" value={draft.due_date} onChange={(e) => set({ due_date: e.target.value })} aria-label="Charge due date" className={inputCls} />
        </label>
      </div>
      <label className="block text-sm font-bold text-ink">
        Description <span className="font-normal text-muted">(optional, shown on the invoice)</span>
        <input value={draft.description} maxLength={300} onChange={(e) => set({ description: e.target.value })} placeholder="e.g. Costume, rehearsals and stage props" aria-label="Charge description" className={inputCls} />
      </label>
    </div>
  )
}
