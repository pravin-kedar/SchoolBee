import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Heart, Home, Lightbulb, Loader2, RefreshCw, Sparkles, Sprout, Star } from 'lucide-react'

import { errorMessage } from '../../lib/api'
import { OWNER_LABEL, type AiAnalysis, type AiOwner, type AiResult } from '../../lib/ai'
import { shortDate } from '../../lib/license'

const PRIORITY_TONE = {
  high: 'bg-rose-50 text-rose-700 ring-rose-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-slate-50 text-slate-600 ring-slate-200',
}
const OWNER_TONE: Record<AiOwner, string> = { parent: 'text-emerald-700', class_teacher: 'text-brand', school_owner: 'text-violet-700' }

/**
 * The AI reading of a report. Loads when it's shown (that's what makes the
 * analysis the first time - nothing is made in advance) and is cached by the
 * backend after that. `audience="school"` adds the action plan for the
 * school, the feedback check and the attention level.
 */
export function AiInsights({
  load,
  firstName,
  audience,
  canRegenerate = false,
}: {
  load: (regenerate: boolean) => Promise<AiResult>
  firstName: string
  audience: 'school' | 'parent'
  canRegenerate?: boolean
}) {
  const [res, setRes] = useState<AiResult | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (regenerate: boolean) => {
      setBusy(true)
      setError(null)
      try {
        setRes(await load(regenerate))
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setBusy(false)
      }
    },
    [load],
  )
  useEffect(() => {
    let live = true
    load(false).then(
      (r) => live && (setRes(r), setBusy(false)),
      (err) => live && (setError(errorMessage(err)), setBusy(false)),
    )
    return () => {
      live = false
    }
  }, [load])

  const a = res?.status === 'ready' ? res.analysis : null
  // parents only see a card when there's something to show
  if (audience === 'parent' && !busy && !a && res?.status !== 'error' && !error) return null
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-amber-200" aria-label="AI insights">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-amber-50 via-white to-sky-50 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Sparkles className="size-4 text-amber-600" /> {audience === 'parent' ? `About ${firstName} this period` : 'AI insights'}
        </h2>
        <span className="flex items-center gap-2 text-xs text-muted">
          {a && res?.generated_at && audience === 'school' && <span>Made {shortDate(res.generated_at.slice(0, 10))}</span>}
          {canRegenerate && a && (
            <button
              onClick={() => run(true)}
              disabled={busy}
              className="btn-outline bg-white px-2.5 py-1 text-xs"
              title="Read the report again with the latest data and remarks"
            >
              <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} /> Update
            </button>
          )}
        </span>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {busy && !a ? (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <Loader2 className="size-4 animate-spin text-amber-600" /> Reading {firstName}&rsquo;s report — this takes a few seconds…
          </p>
        ) : error || res?.status === 'error' ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <AlertTriangle className="size-4 text-amber-600" /> {error ?? res?.message}
            <button onClick={() => run(false)} className="btn-outline px-2.5 py-1 text-xs">
              Try again
            </button>
          </p>
        ) : !a ? (
          <p className="text-sm text-muted">{res?.message}</p>
        ) : (
          <Body a={a} audience={audience} stale={Boolean(res?.stale)} canRegenerate={canRegenerate} />
        )}
      </div>
    </section>
  )
}

function Body({ a, audience, stale, canRegenerate }: { a: AiAnalysis; audience: 'school' | 'parent'; stale: boolean; canRegenerate: boolean }) {
  const owners: AiOwner[] = audience === 'school' ? ['parent', 'class_teacher', 'school_owner'] : ['parent', 'class_teacher']
  const grouped = owners.map((o) => [o, a.action_items.filter((x) => x.owner === o)] as const).filter(([, xs]) => xs.length)
  return (
    <>
      {stale && canRegenerate && (
        <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
          The remarks or data changed since these insights were made. Tap <b>Update</b> to refresh them before publishing.
        </p>
      )}
      {audience === 'school' && a.attention_level && a.attention_level !== 'none' && (
        <p
          className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${a.attention_level === 'discuss' ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200'}`}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <b>{a.attention_level === 'discuss' ? 'Talk with the family' : 'Keep an eye on'}:</b> {a.attention_reason}
          </span>
        </p>
      )}
      <p className="text-[15px] leading-relaxed">{a.summary}</p>

      {(a.strengths.length > 0 || a.growth_areas.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {a.strengths.length > 0 && (
            <div className="rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-800">
                <Star className="size-4" /> Shining at
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {a.strengths.map((x, i) => (
                  <li key={i}>
                    <b>{x.title}</b>
                    {x.detail && <span className="text-muted"> — {x.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.growth_areas.length > 0 && (
            <div className="rounded-xl bg-sky-50/60 p-3 ring-1 ring-sky-100">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-sky-800">
                <Sprout className="size-4" /> Growing next
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {a.growth_areas.map((x, i) => (
                  <li key={i}>
                    <b>{x.title}</b>
                    {x.detail && <span className="text-muted"> — {x.detail}</span>}
                    {x.age_note && <span className="block text-xs text-slate-500 italic">{x.age_note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {grouped.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Lightbulb className="size-4 text-amber-600" /> {audience === 'school' ? 'Action plan' : 'Our plan together'}
          </h3>
          <div className={`mt-2 grid gap-3 ${audience === 'school' ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
            {grouped.map(([owner, xs]) => (
              <div key={owner} className="rounded-xl p-3 ring-1 ring-line" aria-label={`Actions for ${OWNER_LABEL[owner]}`}>
                <p className={`text-xs font-bold tracking-wide uppercase ${OWNER_TONE[owner]}`}>
                  {audience === 'parent' ? (owner === 'parent' ? 'At home (you)' : 'In class (teacher)') : OWNER_LABEL[owner]}
                </p>
                <ul className="mt-1.5 space-y-2 text-sm">
                  {xs.map((x, i) => (
                    <li key={i}>
                      <span className="font-semibold">{x.action}</span>
                      {audience === 'school' && (
                        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ring-1 ${PRIORITY_TONE[x.priority]}`}>
                          {x.priority}
                        </span>
                      )}
                      {x.why && <span className="block text-xs text-muted">{x.why}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {a.home_activities.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Home className="size-4 text-emerald-600" /> Ideas to try at home
          </h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
            {a.home_activities.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {audience === 'school' && a.feedback_review && a.feedback_review.length > 0 && (
        <div className="rounded-xl bg-violet-50/70 p-3 ring-1 ring-violet-200" aria-label="Feedback check">
          <h3 className="text-sm font-bold text-violet-900">Check the feedback (school only)</h3>
          <ul className="mt-1.5 space-y-1.5 text-sm">
            {a.feedback_review.map((x, i) => (
              <li key={i}>
                {x.issue}
                {x.suggestion && <span className="block text-xs text-violet-800">→ {x.suggestion}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {a.parent_message && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <Heart className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            {audience === 'school' && <b>Message to parents: </b>}
            {a.parent_message}
          </span>
        </p>
      )}
      {a.data_note && <p className="text-xs text-muted italic">{a.data_note}</p>}
      <p className="border-t border-line pt-2 text-[11px] text-muted">
        {audience === 'school'
          ? 'Made with AI from the ratings, notes and remarks — check it before publishing. Parents see the summary, strengths, growing next, their own and the class teacher’s actions, home ideas and the message; never the feedback check, attention note or school-owner actions.'
          : 'Prepared with AI from the class teacher’s observations.'}
      </p>
    </>
  )
}
