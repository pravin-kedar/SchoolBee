import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Loader2, Lock, RefreshCw, Save, Send, Trash2, Undo2 } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { AiInsights } from '../../components/progress/AiInsights'
import { ProgressSummary } from '../../components/students/StudentProgressTab'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { shortDate } from '../../lib/license'
import { REPORT_STATUS_TONE, progressApi, type ReportDetail } from '../../lib/progress'

/** One child's performance report: review, remarks, publish (locks the period), PDF. */
export function ReportPage() {
  const token = useAccessToken()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [r, setR] = useState<ReportDetail | null>(null)
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'publish' | 'delete' | 'withdraw' | null>(null)
  const [reason, setReason] = useState('')

  const load = (d: ReportDetail) => {
    setR(d)
    setRemarks(d.remarks ?? '')
  }
  useEffect(() => {
    if (!token) return
    progressApi.report(id).then(load, (err) => setError(errorMessage(err)))
  }, [token, id])

  const loadAi = useCallback((regenerate: boolean) => progressApi.reportAi(id, regenerate), [id])

  if (!token) return <Navigate to="/login" replace />

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  const back = r?.snapshot ? `/progress?tab=reports` : '/progress?tab=reports'
  const dirty = Boolean(r) && remarks.trim() !== (r?.remarks ?? '')
  return (
    <AppShell>
      <div className="space-y-5 p-4 sm:p-6">
        <Link to={back} className="inline-flex items-center gap-1 text-sm font-bold text-brand">
          <ArrowLeft className="size-4" /> Reports
        </Link>
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        )}
        {!r ? (
          !error && <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-white via-sky-50 to-amber-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
              <div>
                <p className="text-sm font-semibold text-muted">Performance report</p>
                <h1 className="text-2xl font-extrabold sm:text-3xl">{r.student_name}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <b>{r.title}</b>
                  <span className="text-muted">
                    {shortDate(r.date_from)} – {shortDate(r.date_to)}
                    {r.snapshot.student.class && ` · ${r.snapshot.student.class}${r.snapshot.student.section ? ` – ${r.snapshot.student.section}` : ''}`}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ring-1 ${REPORT_STATUS_TONE[r.status]}`}>{r.status}</span>
                </p>
              </div>
              <span className="flex flex-wrap gap-2">
                <button onClick={() => run('pdf', () => progressApi.reportPdf(r.id))} className="btn-outline bg-white py-2 text-sm">
                  {busy === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF
                </button>
                {r.can_edit && (
                  <>
                    <button
                      onClick={() => run('refresh', async () => load(await progressApi.refreshReport(r.id)))}
                      className="btn-outline bg-white py-2 text-sm"
                      title="Re-read the latest ratings, notes and attendance"
                    >
                      {busy === 'refresh' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Refresh data
                    </button>
                    <button onClick={() => setDialog('delete')} className="btn-outline bg-white py-2 text-sm text-rose-600" aria-label="Delete draft">
                      <Trash2 className="size-4" />
                    </button>
                    <button onClick={() => setDialog('publish')} className="btn-primary py-2 text-sm" disabled={dirty}>
                      <Send className="size-4" /> Publish
                    </button>
                  </>
                )}
                {r.can_withdraw && (
                  <button onClick={() => setDialog('withdraw')} className="btn-outline bg-white py-2 text-sm text-amber-700">
                    <Undo2 className="size-4" /> Withdraw
                  </button>
                )}
              </span>
            </section>

            {r.status === 'published' && (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <Lock className="size-4" /> Published {r.published_at ? shortDate(r.published_at.slice(0, 10)) : ''} by {r.published_by ?? '—'}. This
                child&rsquo;s ratings, notes and activity feedback from {shortDate(r.date_from)} to {shortDate(r.date_to)} are locked.
              </p>
            )}
            {r.status === 'withdrawn' && (
              <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                Withdrawn {r.withdrawn_at ? shortDate(r.withdrawn_at.slice(0, 10)) : ''} by {r.withdrawn_by ?? '—'}: {r.withdraw_reason}. The period is open for
                changes again.
              </p>
            )}

            <AiInsights
              key={`${r.status}-${r.updated_at}`}
              load={loadAi}
              firstName={r.student_name.split(' ')[0]}
              audience="school"
              canRegenerate={r.can_edit}
            />

            <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5">
              <h2 className="font-bold">Teacher&rsquo;s remarks</h2>
              {r.can_edit ? (
                <>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    maxLength={4000}
                    rows={4}
                    placeholder="A few words for the parents — what went well, and what to practise at home (optional)."
                    aria-label="Teacher's remarks"
                    className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                  {dirty && (
                    <button
                      onClick={() => run('remarks', async () => load(await progressApi.saveRemarks(r.id, remarks.trim() || null)))}
                      className="btn-primary mt-2 py-2 text-sm"
                    >
                      {busy === 'remarks' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save remarks
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm whitespace-pre-wrap">{r.remarks || <span className="text-muted">No remarks.</span>}</p>
              )}
            </section>

            <ProgressSummary p={r.snapshot.summary} />
          </>
        )}
      </div>
      {dialog === 'publish' && r && (
        <Dialog
          title="Publish this report?"
          subtitle={`It becomes final. ${r.student_name}'s ratings, notes and activity feedback from ${shortDate(r.date_from)} to ${shortDate(r.date_to)} can no longer be changed.`}
          submitLabel="Publish report"
          onClose={() => setDialog(null)}
          onSubmit={async () => load(await progressApi.publishReport(r.id))}
        />
      )}
      {dialog === 'delete' && r && (
        <Dialog
          title="Delete this draft?"
          subtitle="Only the draft report is removed - the ratings and notes stay."
          submitLabel="Delete draft"
          danger
          onClose={() => setDialog(null)}
          onSubmit={async () => {
            await progressApi.deleteReport(r.id)
            navigate('/progress?tab=reports', { replace: true })
          }}
        />
      )}
      {dialog === 'withdraw' && r && (
        <Dialog
          title="Withdraw this published report?"
          subtitle="The period unlocks so the records can be corrected. The withdrawal and its reason are kept."
          submitLabel="Withdraw report"
          danger
          submitDisabled={reason.trim().length < 2}
          onClose={() => setDialog(null)}
          onSubmit={async () => load(await progressApi.withdrawReport(r.id, reason.trim()))}
        >
          <input
            autoFocus
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason, e.g. Wrong ratings entered"
            aria-label="Withdraw reason"
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </Dialog>
      )}
    </AppShell>
  )
}
