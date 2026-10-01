import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Star } from 'lucide-react'

import { Badge } from '../../pages/assessments/AssessmentsPage'
import { errorMessage } from '../../lib/api'
import { assessmentsApi } from '../../lib/assessments'
import { usePermission } from '../../lib/auth'

type History = Awaited<ReturnType<typeof assessmentsApi.history>>

/** Student profile: every assessment this child has results in. */
export function StudentAssessmentsTab({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<History | null>(null)
  const [error, setError] = useState<string | null>(null)
  const access = usePermission()
  useEffect(() => {
    assessmentsApi.history(studentId).then(setRows, (err) => setError(errorMessage(err)))
  }, [studentId])

  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>
  if (!rows) return <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />
  if (!rows.length)
    return (
      <section className="rounded-2xl bg-white p-10 text-center shadow-card ring-1 ring-line/60">
        <Star className="mx-auto size-10 text-amber-400" />
        <p className="mt-2 font-bold">No assessment results yet</p>
        <p className="text-sm text-muted">Results appear here once teachers enter them.</p>
      </section>
    )
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {rows.map((r) => (
        <section key={r.assessment_id} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label={r.assessment_name}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold">{r.assessment_name}</h3>
              <p className="text-xs text-muted">
                {r.academic_year} · {r.summary}
              </p>
            </div>
            <Badge status={r.status} />
          </div>
          <dl className="divide-y divide-line text-sm">
            {r.results.map((x) => (
              <div key={x.area} className="flex justify-between gap-3 py-1.5">
                <dt className="text-muted">{x.area}</dt>
                <dd className="text-right font-semibold">{x.result || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {r.reports[0]?.url && (
              <a href={r.reports[0].url} className="btn-outline py-1.5 text-sm">
                <Download className="size-4" /> Latest report
              </a>
            )}
            {access.can('assessments.enter') && (
              <Link to={`/assessments/${r.assessment_id}/students/${studentId}`} className="text-sm font-bold text-brand">
                Open results
              </Link>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
