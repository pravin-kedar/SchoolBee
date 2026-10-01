import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Plus, Users } from 'lucide-react'

import { errorMessage } from '../../lib/api'
import { CHARGE_TONE, chargesApi, inr, shortDate, todayIso, type ChargeRow } from '../../lib/fees'

/** Fee Management → Additional charges: one-off fees (Annual Day, exams, trips...). */
export function ChargesTab({ yearId, canManage }: { yearId: string; canManage: boolean }) {
  const [data, setData] = useState<{ academic_year: string; items: ChargeRow[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    chargesApi.list(yearId || undefined).then(
      (d) => live && (setData(d), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [yearId])

  const today = todayIso()
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <p className="text-sm text-ink/80">
          One-off fees outside the yearly fee — Annual Day, exams, trips, material. Raise them for whole classes or picked students; they count in
          each student's dues.
        </p>
        <Link to={`/fees/charges/new${yearId ? `?year=${yearId}` : ''}`} className="btn-primary" hidden={!canManage}>
          <Plus className="size-4" /> New charge
        </Link>
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {!data ? (
        !error && <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl bg-white py-14 text-center shadow-card ring-1 ring-line/60">
          <p className="text-lg font-bold">No additional charges in {data.academic_year}</p>
          <p className="text-sm text-muted">Create one for an event, exam or trip.</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((c) => {
            const pct = c.expected ? Math.round((c.collected / c.expected) * 100) : 100
            const late = c.pending > 0 && c.due_date < today
            return (
              <li key={c.id} aria-label={c.name}>
                <Link to={`/fees/charges/${c.id}`} className="block h-full rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60 transition hover:ring-brand/50">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg leading-tight font-extrabold">{c.name}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${CHARGE_TONE[c.category] ?? CHARGE_TONE.Other}`}>{c.category}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <Users className="size-4" /> {c.target_label} · {inr(c.amount)} each
                  </p>
                  <p className={`mt-0.5 flex items-center gap-1.5 text-sm ${late ? 'font-semibold text-rose-600' : 'text-muted'}`}>
                    <CalendarClock className="size-4" /> Due {shortDate(c.due_date)}
                    {late ? ' · overdue' : ''}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span>
                      <b>{inr(c.collected)}</b> <span className="text-muted">of {inr(c.expected)}</span>
                    </span>
                    <span className="text-muted">
                      {c.paid_students}/{c.students} paid{c.waived ? ` · ${c.waived} waived` : ''}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
