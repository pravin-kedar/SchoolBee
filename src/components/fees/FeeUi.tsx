import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { selectCls } from '../students/StudentTable'
import { STATUS_TONE } from '../../lib/fees'
import type { AcademicYear } from '../../lib/setup'

export function StatusPill({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ring-1 ${STATUS_TONE[status] ?? STATUS_TONE.Upcoming}`}>{status}</span>
}

export function YearSelect({ years, value, onChange }: { years: AcademicYear[] | undefined; value: string; onChange: (id: string) => void }) {
  if (!years || years.length < 2) return null
  return (
    <select aria-label="Academic year" value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      {years.map((y) => (
        <option key={y.id} value={y.id}>
          {y.name}
          {y.is_active ? ' (current)' : ''}
        </option>
      ))}
    </select>
  )
}

export function MoneyCard({ label, value, hint, icon: Icon, tone, children }: { label: string; value: string; hint?: ReactNode; icon: LucideIcon; tone: string; children?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-3 shadow-card ring-1 ring-line/60 sm:p-4">
      <div className="flex flex-col items-start gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-11 ${tone}`}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-semibold text-ink/70 sm:text-sm">{label}</p>
          <p className="font-display text-xl font-extrabold break-words text-ink sm:text-2xl">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
      {children}
    </div>
  )
}
