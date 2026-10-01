import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, CircleCheck, CircleDashed, Info, Pencil, Plus } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { YearSelect } from '../../components/fees/FeeUi'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { feesApi, inr, shortDate, type FeeClassRow } from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'

export function FeeStructurePage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<{ academic_year_id: string; academic_year: string; classes: FeeClassRow[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const yearId = params.get('year') ?? ''

  useEffect(() => {
    let live = true
    feesApi.structures(yearId || undefined).then(
      (d) => live && (setData(d), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [yearId])

  if (!token) return <Navigate to="/login" replace />
  const setUp = data?.classes.filter((c) => c.total !== null).length ?? 0
  const q = data ? `?year=${data.academic_year_id}` : ''

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to="/fees" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
              <ArrowLeft className="size-4" /> Fee Management
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Fee Structure</h1>
            <p className="mt-0.5">Set what each class pays in {data?.academic_year ?? 'the academic year'} and in how many installments.</p>
          </div>
          <YearSelect years={options?.years} value={data?.academic_year_id ?? ''} onChange={(id) => setParams({ year: id }, { replace: true })} />
        </div>

        <p className="flex gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-ink/80 ring-1 ring-sky-100">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" />
          Each class has its own fee items (Admission, Tuition, Transport…) and installment plan. Concessions for individual students are set on
          their fee page.
        </p>

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

        {data && (
          <p className="text-sm font-semibold text-muted">
            {setUp} of {data.classes.length} classes set up
          </p>
        )}

        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {!data &&
            !error &&
            Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="h-44 animate-pulse rounded-2xl bg-slate-200/60" />
            ))}
          {data?.classes.map((c) => (
            <li key={c.class_id} aria-label={c.class_name} className="flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold">{c.class_name}</p>
                  <p className="text-xs text-muted">
                    {c.students} active student{c.students === 1 ? '' : 's'}
                  </p>
                </div>
                {c.total !== null ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <CircleCheck className="size-3.5" /> Set up
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    <CircleDashed className="size-3.5" /> Not set
                  </span>
                )}
              </div>
              {c.total !== null ? (
                <div className="mt-4 flex-1 space-y-1 text-sm">
                  <p>
                    <span className="font-display text-2xl font-extrabold text-ink">{inr(c.total)}</span> <span className="text-muted">/ year</span>
                  </p>
                  {c.optional_total > 0 && <p className="text-muted">+ {inr(c.optional_total)} optional items</p>}
                  <p className="flex items-center gap-1.5 text-muted">
                    <CalendarClock className="size-4" />
                    {c.installments ? `${c.installments} installment${c.installments === 1 ? '' : 's'} · first due ${shortDate(c.first_due)}` : 'One-time payment'}
                  </p>
                </div>
              ) : (
                <p className="mt-4 flex-1 text-sm text-muted">No fee set for {c.class_name} yet — students in it show as “No structure”.</p>
              )}
              <Link to={`/fees/structure/${c.class_id}${q}`} className={`mt-4 justify-center ${c.total !== null ? 'btn-outline' : 'btn-primary'}`}>
                {c.total !== null ? (
                  <>
                    <Pencil className="size-4" /> Edit fee
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Set up fee
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
        {data && data.classes.length === 0 && (
          <p className="rounded-2xl bg-white p-8 text-center text-muted ring-1 ring-line/60">
            Add classes first in <Link to="/classes" className="font-bold text-brand">Classes</Link>.
          </p>
        )}
      </div>
    </AppShell>
  )
}
