import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePlus2, MessageSquareText, Send } from 'lucide-react'

import { StarDisplay } from '../../components/progress/Stars'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { shortDate } from '../../lib/license'
import {
  REPORT_STATUS_TONE,
  groupLabel,
  progressApi,
  type PeriodKind,
  type ProgressGroup,
  type ProgressMeta,
  type ReportRow,
  type ReportStatus,
} from '../../lib/progress'

const selectCls = 'rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-brand'
const FILTERS: [string, string][] = [
  ['', 'All'],
  ['draft', 'Drafts'],
  ['published', 'Published'],
  ['withdrawn', 'Withdrawn'],
]

/** Performance reports of a class: generate drafts for a period, review, publish. */
export function ReportsTab({ meta, group }: { meta: ProgressMeta; group: ProgressGroup }) {
  const [filter, setFilter] = useState('')
  const [rows, setRows] = useState<ReportRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<'generate' | 'publish' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let live = true
    progressApi.reports({ class_id: group.class_id, section_id: group.section_id ?? undefined, status: filter || undefined }).then(
      (r) => live && (setRows(r), setSelected(new Set())),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [group.class_id, group.section_id, filter, reload])

  const drafts = rows?.filter((r) => r.status === 'draft') ?? []
  const allDrafts = drafts.length > 0 && drafts.every((r) => selected.has(r.id))
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Report status">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${filter === k ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="flex flex-wrap gap-2">
          {selected.size > 0 && (
            <button onClick={() => setDialog('publish')} className="btn-outline">
              <Send className="size-4" /> Publish {selected.size} selected
            </button>
          )}
          <button onClick={() => setDialog('generate')} className="btn-primary">
            <FilePlus2 className="size-4" /> Generate reports
          </button>
        </span>
      </div>
      {notice && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">{notice}</p>}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all drafts"
                    disabled={!drafts.length}
                    checked={allDrafts}
                    onChange={() => setSelected(allDrafts ? new Set() : new Set(drafts.map((r) => r.id)))}
                    className="size-4 accent-brand"
                  />
                </th>
                <th className="px-3 py-3">Child</th>
                <th className="px-3 py-3">Period</th>
                <th className="px-3 py-3">Overall</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows?.map((r) => (
                <tr key={r.id} aria-label={`${r.student_name} ${r.title}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {r.status === 'draft' && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.student_name}`}
                        checked={selected.has(r.id)}
                        onChange={() =>
                          setSelected((cur) => {
                            const n = new Set(cur)
                            if (n.has(r.id)) n.delete(r.id)
                            else n.add(r.id)
                            return n
                          })
                        }
                        className="size-4 accent-brand"
                      />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Link to={`/progress/reports/${r.id}`} className="font-bold hover:text-brand">
                      {r.student_name}
                    </Link>
                    {r.has_remarks && <MessageSquareText className="ml-1.5 inline size-3.5 text-muted" aria-label="Has remarks" />}
                  </td>
                  <td className="px-3 py-3">
                    {r.title}
                    <span className="block text-xs text-muted">
                      {shortDate(r.date_from)} – {shortDate(r.date_to)}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {r.overall != null ? (
                      <>
                        <StarDisplay value={r.overall} size="size-3.5" /> <b className="ml-1">{r.overall}</b>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ring-1 ${REPORT_STATUS_TONE[r.status as ReportStatus]}`}>
                      {r.status}
                    </span>
                    {r.published_at && <span className="block pt-1 text-xs text-muted">{shortDate(r.published_at.slice(0, 10))}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows && !error && <div className="m-4 h-32 animate-pulse rounded-xl bg-slate-100" />}
        {rows && rows.length === 0 && (
          <p className="py-10 text-center text-muted">No reports yet. Generate this week&rsquo;s or this month&rsquo;s reports for {groupLabel(group)}.</p>
        )}
      </section>

      {dialog === 'generate' && (
        <GenerateDialog
          meta={meta}
          group={group}
          onClose={() => setDialog(null)}
          onDone={(n, skipped, title) => {
            setNotice(
              `${n} draft report${n === 1 ? '' : 's'} ready for ${title}.${skipped.length ? ` Skipped (already published): ${skipped.join(', ')}.` : ''} Review, then publish.`,
            )
            setFilter('')
            setReload((x) => x + 1)
          }}
        />
      )}
      {dialog === 'publish' && (
        <Dialog
          title={`Publish ${selected.size} report${selected.size === 1 ? '' : 's'}?`}
          subtitle="Published reports are final. The ratings, notes and activity feedback they cover can no longer be changed."
          submitLabel="Publish"
          onClose={() => setDialog(null)}
          onSubmit={async () => {
            const r = await progressApi.publishReports([...selected])
            setNotice(`${r.published} report${r.published === 1 ? '' : 's'} published.`)
            setReload((x) => x + 1)
          }}
        />
      )}
    </section>
  )
}

function GenerateDialog({
  meta,
  group,
  onClose,
  onDone,
}: {
  meta: ProgressMeta
  group: ProgressGroup
  onClose: () => void
  onDone: (n: number, skipped: string[], title: string) => void
}) {
  const [kind, setKind] = useState<PeriodKind>('month')
  const [day, setDay] = useState(meta.today)
  const [month, setMonth] = useState(meta.today.slice(0, 7))
  const [from, setFrom] = useState(`${meta.today.slice(0, 7)}-01`)
  const [to, setTo] = useState(meta.today)
  return (
    <Dialog
      title={`Generate reports · ${groupLabel(group)}`}
      subtitle="A draft report for every child in the class, from the period's ratings, notes, activities and attendance. Add remarks, then publish."
      submitLabel="Generate drafts"
      submitDisabled={kind === 'custom' ? !from || !to || to < from : kind === 'month' ? !month : !day}
      onClose={onClose}
      onSubmit={async () => {
        const body = kind === 'custom' ? { date_from: from, date_to: to } : kind === 'month' ? { date: `${month}-01` } : { date: day }
        const r = await progressApi.generateReports({ class_id: group.class_id, section_id: group.section_id, period_kind: kind, ...body })
        onDone(r.reports.length, r.skipped, r.title)
      }}
    >
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Report period">
        {(
          [
            ['week', 'A week'],
            ['month', 'A month'],
            ['custom', 'Custom dates'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-xl px-3 py-2 text-sm font-bold ring-1 ${kind === k ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {kind === 'week' && (
        <label className="block text-sm font-bold">
          Any day in the week
          <input type="date" value={day} max={meta.today} onChange={(e) => setDay(e.target.value)} aria-label="Week" className={`${selectCls} mt-1 w-full`} />
        </label>
      )}
      {kind === 'month' && (
        <label className="block text-sm font-bold">
          Month
          <input
            type="month"
            value={month}
            max={meta.today.slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Month"
            className={`${selectCls} mt-1 w-full`}
          />
        </label>
      )}
      {kind === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-bold">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" className={`${selectCls} mt-1 w-full`} />
          </label>
          <label className="block text-sm font-bold">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" className={`${selectCls} mt-1 w-full`} />
          </label>
        </div>
      )}
      <p className="text-xs text-muted">Children who already have a published report for this exact period are skipped; existing drafts are refreshed.</p>
    </Dialog>
  )
}
