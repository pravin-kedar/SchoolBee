import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Copy, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react'

import { ZapShell } from '../../components/zap/ZapShell'
import { PagePreview } from '../../components/ui/PagePreview'
import { Dialog } from '../../components/ui/Dialog'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { timeAgo } from '../../lib/zap'
import { AUDIENCE_LABEL, CATEGORY_LABEL, templatesApi, type TemplateCategory, type TemplateList, type TemplateRow } from '../../lib/zapTemplates'

export function ZapTemplatesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<TemplateList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<TemplateRow | null>(null)
  const [reload, setReload] = useState(0)

  const filters = useMemo(
    () => ({
      q: params.get('q') ?? '',
      category: params.get('category') ?? '',
      status: params.get('status') ?? '',
      scope: params.get('scope') ?? '',
      audience: params.get('audience') ?? '',
    }),
    [params],
  )
  const update = (patch: Record<string, string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: true },
    )

  const [search, setSearch] = useState(filters.q)
  useEffect(() => {
    if (search.trim() === filters.q) return // nothing changed (also the run on mount)
    const t = setTimeout(() => update({ q: search.trim() }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    let live = true
    templatesApi.list(filters).then(
      (d) => live && (setData(d), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [filters, reload])

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const filtered = Boolean(filters.q || filters.category || filters.status || filters.scope || filters.audience)

  return (
    <ZapShell
      title="Doc Templates"
      subtitle="Designs schools use to issue student certificates (Bonafide, Leaving, Character…) and staff letters (Appointment, Experience)."
      actions={
        <div className="flex flex-wrap gap-2">
          {data && data.starters_missing > 0 && (
            <button disabled={busy} onClick={() => void act(async () => setData(await templatesApi.loadStarters()))} className="btn-outline">
              <Sparkles className="size-4" /> Load {data.starters_missing} starter template{data.starters_missing === 1 ? '' : 's'}
            </button>
          )}
          <Link to="/zap/templates/new?audience=staff" className="btn-outline">
            <Plus className="size-4" /> New staff letter
          </Link>
          <Link to="/zap/templates/new" className="btn-primary">
            <Plus className="size-4" /> New certificate
          </Link>
        </div>
      }
    >
      <section className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <div className="relative min-w-60 flex-[2]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search template or school…" aria-label="Search templates" className={`${selectCls} w-full pl-9`} />
        </div>
        <select aria-label="Issued to" value={filters.audience} onChange={(e) => update({ audience: e.target.value })} className={`${selectCls} flex-1`}>
          <option value="">Certificates & letters</option>
          <option value="student">{AUDIENCE_LABEL.student}</option>
          <option value="staff">{AUDIENCE_LABEL.staff}</option>
        </select>
        <select aria-label="Category" value={filters.category} onChange={(e) => update({ category: e.target.value })} className={`${selectCls} flex-1`}>
          <option value="">All types</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={filters.status} onChange={(e) => update({ status: e.target.value })} className={`${selectCls} flex-1`}>
          <option value="">Published & drafts</option>
          <option value="Published">Published</option>
          <option value="Draft">Drafts</option>
        </select>
        <select aria-label="Available to" value={filters.scope} onChange={(e) => update({ scope: e.target.value })} className={`${selectCls} flex-1`}>
          <option value="">All templates</option>
          <option value="all_schools">For all schools</option>
          <option value="custom">Custom (one school)</option>
        </select>
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {!data ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-card ring-1 ring-line/60">
          <p className="text-lg font-bold">{filtered ? 'No templates match' : 'No templates yet'}</p>
          {!filtered && <p className="mt-1 text-muted">Load the ready-made starters or design your own.</p>}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {data.items.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              onOpen={() => navigate(`/zap/templates/${t.id}`)}
              onDuplicate={() => void act(async () => navigate(`/zap/templates/${(await templatesApi.duplicate(t.id)).id}`))}
              onDelete={() => setDeleting(t)}
            />
          ))}
        </ul>
      )}

      {deleting && (
        <Dialog
          title={`Delete “${deleting.name}”?`}
          subtitle={deleting.status === 'Published' ? 'Schools will no longer be able to issue it. Certificates already issued stay in their registers.' : 'This draft will be removed.'}
          submitLabel="Delete"
          danger
          onClose={() => setDeleting(null)}
          onSubmit={async () => {
            await templatesApi.remove(deleting.id)
            setReload((n) => n + 1)
          }}
        />
      )}
    </ZapShell>
  )
}

function TemplateCard({ t, onOpen, onDuplicate, onDelete }: { t: TemplateRow; onOpen: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    templatesApi.savedPreview(t.id).then((p) => live && setHtml(p.html), () => undefined)
    return () => {
      live = false
    }
  }, [t.id, t.updated_at])

  return (
    <li className="flex flex-col rounded-2xl bg-white p-3 shadow-card ring-1 ring-line/60" aria-label={t.name}>
      {/* Same-shaped box for every card, so portrait and landscape line up */}
      <button onClick={onOpen} className="flex aspect-[210/297] items-center rounded-xl bg-slate-100 p-3 hover:bg-slate-200/70" aria-label={`Edit ${t.name}`}>
        <PagePreview html={html} paper={t.paper} orientation={t.orientation} title={`${t.name} preview`} className="w-full" />
      </button>
      <div className="mt-3 flex-1 px-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold leading-tight text-ink">{t.name}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${t.status === 'Published' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-muted ring-line'}`}
          >
            {t.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {t.audience === 'staff' ? 'Staff letter · ' : ''}
          {CATEGORY_LABEL[t.category as TemplateCategory] ?? t.category} · {t.serial_prefix}/… · {t.fields_count} field{t.fields_count === 1 ? '' : 's'}
        </p>
        <p className={`mt-1.5 text-xs font-semibold ${t.school_id ? 'text-violet-600' : 'text-brand'}`}>{t.school_id ? `Custom · ${t.school_name}` : 'All schools'}</p>
        <p className="mt-0.5 text-[11px] text-muted">Updated {timeAgo(t.updated_at)}</p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
        <button onClick={onOpen} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-brand hover:bg-sky-50">
          <Pencil className="size-4" /> Edit
        </button>
        <div className="flex gap-1">
          <button onClick={onDuplicate} className="grid size-8 place-items-center rounded-lg text-ink/70 hover:bg-slate-100" aria-label={`Duplicate ${t.name}`} title="Duplicate">
            <Copy className="size-4" />
          </button>
          <button onClick={onDelete} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Delete ${t.name}`} title="Delete">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </li>
  )
}
