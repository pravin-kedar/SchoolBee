import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, CircleAlert, Download, Loader2, Plus, Rocket, Save, Search, Trash2, Undo2, X } from 'lucide-react'

import { ZapShell } from '../../components/zap/ZapShell'
import { PagePreview } from '../../components/ui/PagePreview'
import { Dialog } from '../../components/ui/Dialog'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { zap, type ZapSchoolRow } from '../../lib/zap'
import {
  AUDIENCE_LABEL,
  BLANK_TEMPLATE,
  CATEGORY_LABEL,
  type Audience,
  FIELD_TYPE_LABEL,
  slugKey,
  templatesApi,
  type FieldType,
  type Preview,
  type Template,
  type TemplateCategory,
  type TemplateField,
  type TemplateInput,
  type TemplateMeta,
} from '../../lib/zapTemplates'

type Tab = 'design' | 'settings' | 'fields'

const NEW_TEMPLATE: TemplateInput = {
  name: 'New Certificate',
  category: 'Other',
  serial_prefix: 'DOC',
  description: null,
  paper: 'A4',
  orientation: 'portrait',
  content: BLANK_TEMPLATE,
  fields: [],
  status: 'Draft',
  school_id: null,
  audience: 'student',
}

const NEW_LETTER: TemplateInput = {
  ...NEW_TEMPLATE,
  name: 'New Letter',
  serial_prefix: 'LTR',
  audience: 'staff',
  content: `<style>
  .page { position: absolute; inset: 20mm; font-size: 12pt; line-height: 1.7; }
  h1 { margin: 0; font-size: 18pt; }
</style>
<div class="page">
  <h1>{{ school.name }}</h1>
  <div>{{ school.address }}</div>
  <p style="text-align: right">Ref: {{ letter.serial_no }}<br>Date: {{ letter.issue_date }}</p>
  <p>Dear {{ staff.full_name }},</p>
  <p>...</p>
</div>
`,
}

const toInput = (t: Template): TemplateInput => ({
  audience: t.audience ?? 'student',
  name: t.name,
  category: t.category,
  serial_prefix: t.serial_prefix,
  description: t.description,
  paper: t.paper,
  orientation: t.orientation,
  content: t.content,
  fields: t.fields.map((f) => ({ ...f, options: f.options ?? [] })),
  status: t.status,
  school_id: t.school_id,
})

const inputCls = `${selectCls} w-full`

export function ZapTemplateEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meta, setMeta] = useState<TemplateMeta | null>(null)
  const [params] = useSearchParams()
  const [form, setForm] = useState<TemplateInput | null>(id ? null : params.get('audience') === 'staff' ? NEW_LETTER : NEW_TEMPLATE)
  const [savedStatus, setSavedStatus] = useState<'Draft' | 'Published' | null>(null)
  const [schoolName, setSchoolName] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('design')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [prefixTouched, setPrefixTouched] = useState(Boolean(id))
  const editor = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    templatesApi.meta().then(setMeta, (err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    if (!id) return
    templatesApi.get(id).then(
      (t) => {
        setForm(toInput(t))
        setSavedStatus(t.status)
        setSchoolName(t.school_name)
        setDirty(false)
      },
      (err) => setError(errorMessage(err)),
    )
  }, [id])

  // Live preview, debounced, whenever anything that affects the page changes.
  const design = form && {
    name: form.name,
    serial_prefix: form.serial_prefix,
    paper: form.paper,
    orientation: form.orientation,
    content: form.content,
    fields: form.fields,
    school_id: form.school_id,
    audience: form.audience,
  }
  const designKey = JSON.stringify(design)
  useEffect(() => {
    if (!design) return
    let live = true
    setPreviewing(true)
    const t = setTimeout(() => {
      templatesApi
        .preview(design)
        .then((p) => live && setPreview((prev) => ({ html: p.html ?? prev?.html ?? null, problems: p.problems })))
        .catch((err) => live && setPreview((prev) => ({ html: prev?.html ?? null, problems: [errorMessage(err)] })))
        .finally(() => live && setPreviewing(false))
    }, 450)
    return () => {
      live = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designKey])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!form) {
    return (
      <ZapShell title="Template" wide>
        {error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p> : <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />}
      </ZapShell>
    )
  }

  const set = (patch: Partial<TemplateInput>) => {
    setForm((f) => (f ? { ...f, ...patch } : f))
    setDirty(true)
    setNotice(null)
  }

  function insert(text: string) {
    const el = editor.current
    const content = form!.content
    const [s, e] = el ? [el.selectionStart, el.selectionEnd] : [content.length, content.length]
    set({ content: content.slice(0, s) + text + content.slice(e) })
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.selectionStart = el.selectionEnd = s + text.length
    })
  }

  function onEditorKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      insert('  ')
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      void save(form!.status)
    }
  }

  async function save(status: 'Draft' | 'Published') {
    setBusy(status)
    setError(null)
    try {
      const body = { ...form!, status }
      const t = id ? await templatesApi.update(id, body) : await templatesApi.create(body)
      setForm(toInput(t))
      setSavedStatus(t.status)
      setSchoolName(t.school_name)
      setDirty(false)
      setNotice(status === 'Published' ? (t.school_id ? `Published for ${t.school_name}` : 'Published — every school can use it now') : 'Saved as draft')
      if (!id) navigate(`/zap/templates/${t.id}`, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function downloadPdf() {
    setBusy('pdf')
    setError(null)
    try {
      const blob = await templatesApi.previewPdf(design!)
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `${slugKey(form!.name)}-sample.pdf` })
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (err) {
      setError(errorMessage(err, 'Could not create the PDF'))
    } finally {
      setBusy(null)
    }
  }

  const problems = preview?.problems ?? []
  const published = savedStatus === 'Published'

  return (
    <ZapShell
      wide
      title={form.name || 'Untitled template'}
      subtitle={id ? `${AUDIENCE_LABEL[form.audience]} · ${CATEGORY_LABEL[form.category]} · ${form.school_id ? `custom for ${schoolName ?? 'one school'}` : 'all schools'}` : 'New template'}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {savedStatus && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${published ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-muted ring-line'}`}>
              {savedStatus}
              {dirty ? ' · unsaved changes' : ''}
            </span>
          )}
          <button onClick={() => void downloadPdf()} disabled={busy !== null} className="btn-outline">
            {busy === 'pdf' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Sample PDF
          </button>
          {published ? (
            <>
              <button onClick={() => void save('Draft')} disabled={busy !== null} className="btn-outline">
                <Undo2 className="size-4" /> Unpublish
              </button>
              <button onClick={() => void save('Published')} disabled={busy !== null || !dirty} className="btn-primary disabled:opacity-60">
                {busy === 'Published' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes
              </button>
            </>
          ) : (
            <>
              <button onClick={() => void save('Draft')} disabled={busy !== null} className="btn-outline">
                {busy === 'Draft' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save draft
              </button>
              <button onClick={() => void save('Published')} disabled={busy !== null} className="btn-primary">
                {busy === 'Published' ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Publish
              </button>
            </>
          )}
        </div>
      }
    >
      <Link to="/zap/templates" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
        <ArrowLeft className="size-4" /> All templates
      </Link>
      {error && (
        <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </p>
      )}
      {notice && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">{notice}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,40%)]">
        <section className="min-w-0 rounded-2xl bg-white shadow-card ring-1 ring-line/60">
          <div className="flex gap-1 border-b border-line p-2" role="tablist">
            {(
              [
                ['design', 'Design (HTML)'],
                ['settings', 'Settings'],
                ['fields', `Fields (${form.fields.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === key ? 'bg-ink text-white' : 'text-ink/70 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === 'design' && (
              <div className="space-y-3">
                <Placeholders meta={meta} audience={form.audience} fields={form.fields} onInsert={insert} />
                <textarea
                  ref={editor}
                  value={form.content}
                  onChange={(e) => set({ content: e.target.value })}
                  onKeyDown={onEditorKey}
                  spellCheck={false}
                  aria-label="Template HTML"
                  className="h-[62vh] w-full resize-y rounded-xl border border-line bg-slate-950 p-4 font-mono text-[12.5px] leading-5 text-slate-100 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
                <p className="text-xs text-muted">
                  Write the page in HTML + CSS (use mm for sizes). Placeholders like <code>{form.audience === 'staff' ? '{{ staff.full_name }}' : '{{ student.full_name }}'}</code> are filled in when a school issues it;{' '}
                  <code>{'{% if school.logo %}…{% endif %}'}</code> hides a part when there's no value. Tab indents, Ctrl+S saves.
                </p>
              </div>
            )}

            {tab === 'settings' && (
              <SettingsTab
                form={form}
                meta={meta}
                schoolName={schoolName}
                onSchool={(s) => {
                  setSchoolName(s?.name ?? null)
                  set({ school_id: s?.id ?? null })
                }}
                onChange={(patch) => {
                  if (patch.category && !prefixTouched && meta) patch = { ...patch, serial_prefix: meta.categories[patch.category] }
                  if (patch.serial_prefix !== undefined) setPrefixTouched(true)
                  set(patch)
                }}
                onDelete={id ? () => setDeleting(true) : undefined}
              />
            )}

            {tab === 'fields' && <FieldsTab fields={form.fields} onChange={(fields) => set({ fields })} onInsert={(key) => (setTab('design'), insert(`{{ fields.${key} }}`))} />}
          </div>
        </section>

        <aside className="space-y-3 xl:sticky xl:top-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Live preview</h2>
            <span className="flex items-center gap-2 text-xs text-muted">
              {previewing && <Loader2 className="size-3.5 animate-spin" />}
              {form.paper} · {form.orientation}
            </span>
          </div>
          <div className="rounded-2xl bg-slate-200/70 p-4">
            <PagePreview html={preview?.html ?? null} paper={form.paper} orientation={form.orientation} title="Live preview" />
          </div>
          {problems.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" role="status" aria-label="Design problems">
              <p className="mb-1 flex items-center gap-1.5 font-bold">
                <CircleAlert className="size-4" /> {problems.length} problem{problems.length === 1 ? '' : 's'} — fix before publishing
              </p>
              <ul className="list-disc space-y-0.5 pl-5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted">
            {form.audience === 'staff' ? 'Sample staff and letter data' : 'Sample student and certificate data'}{form.school_id ? `, with ${schoolName ?? 'the selected school'}'s real details` : ' and a sample school'}. The PDF uses the same renderer schools will.
          </p>
        </aside>
      </div>

      {deleting && id && (
        <Dialog
          title={`Delete “${form.name}”?`}
          subtitle={published ? 'Schools will no longer be able to issue it. Certificates already issued stay in their registers.' : 'This draft will be removed.'}
          submitLabel="Delete"
          danger
          onClose={() => setDeleting(false)}
          onSubmit={async () => {
            await templatesApi.remove(id)
            setDirty(false)
            navigate('/zap/templates', { replace: true })
          }}
        />
      )}
    </ZapShell>
  )
}

function Placeholders({ meta, audience, fields, onInsert }: { meta: TemplateMeta | null; audience: Audience; fields: TemplateField[]; onInsert: (text: string) => void }) {
  const [q, setQ] = useState('')
  if (!meta) return <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
  const groups: [string, { key: string; label: string; sample?: string }[]][] = [
    ...Object.entries(audience === 'staff' ? meta.staff_placeholders : meta.placeholders),
    ['fields', fields.map((f) => ({ key: f.key, label: f.label }))],
  ]
  const term = q.trim().toLowerCase()
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-line">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold">Placeholders — click to insert</p>
        <div className="relative w-48">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" aria-label="Filter placeholders" className="w-full rounded-lg border border-line bg-white py-1 pr-2 pl-7 text-xs outline-none focus:border-brand" />
        </div>
      </div>
      <div className="max-h-40 space-y-2 overflow-auto">
        {groups.map(([group, items]) => {
          const shown = items.filter((i) => !term || i.key.includes(term) || i.label.toLowerCase().includes(term))
          if (!shown.length && group !== 'fields') return null
          return (
            <div key={group} className="flex flex-wrap items-center gap-1.5">
              <span className="w-20 shrink-0 text-[11px] font-bold tracking-wide text-muted uppercase">{group}</span>
              {shown.map((i) => (
                <button
                  key={i.key}
                  type="button"
                  onClick={() => onInsert(`{{ ${group}.${i.key} }}`)}
                  title={`${i.label}${i.sample ? ` — e.g. ${i.sample}` : ''}`}
                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] ring-1 hover:bg-white ${group === 'fields' ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-white text-ink ring-line'}`}
                >
                  {i.key}
                </button>
              ))}
              {group === 'fields' && !items.length && <span className="text-xs text-muted">Add fields in the Fields tab</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Label({ text, hint, children }: { text: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-ink">
      {text}
      <div className="mt-1 font-normal">{children}</div>
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </label>
  )
}

function SettingsTab({
  form,
  meta,
  schoolName,
  onChange,
  onSchool,
  onDelete,
}: {
  form: TemplateInput
  meta: TemplateMeta | null
  schoolName: string | null
  onChange: (patch: Partial<TemplateInput>) => void
  onSchool: (s: { id: string; name: string } | null) => void
  onDelete?: () => void
}) {
  const [picking, setPicking] = useState(false)
  const allowed = meta?.audience_categories[form.audience] ?? (Object.keys(CATEGORY_LABEL) as TemplateCategory[])
  return (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label text="Template name">
          <input value={form.name} maxLength={120} onChange={(e) => onChange({ name: e.target.value })} className={inputCls} aria-label="Template name" />
        </Label>
      </div>
      <div className="sm:col-span-2">
        <Label text="Issued to" hint="Student certificates appear under Certificates; staff letters on each staff member’s Letters tab.">
          <div className="flex gap-2" role="group" aria-label="Issued to">
            {(['student', 'staff'] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={form.audience === a}
                onClick={() => {
                  if (form.audience === a) return
                  const cats = meta?.audience_categories[a] ?? []
                  onChange({ audience: a, ...(cats.includes(form.category) ? {} : { category: 'Other' as TemplateCategory }) })
                }}
                className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 ${form.audience === a ? 'bg-sky-50 text-brand ring-brand' : 'ring-line hover:bg-slate-50'}`}
              >
                {AUDIENCE_LABEL[a]}
              </button>
            ))}
          </div>
        </Label>
      </div>
      <Label text="Document type">
        <select value={form.category} onChange={(e) => onChange({ category: e.target.value as TemplateCategory })} className={inputCls} aria-label="Document type">
          {allowed.map((k) => (
            <option key={k} value={k}>
              {CATEGORY_LABEL[k]}
            </option>
          ))}
        </select>
      </Label>
      <Label text="Serial number prefix" hint={`Numbers look like ${form.serial_prefix || 'DOC'}/2026-27/0001 — per school, per year.`}>
        <input
          value={form.serial_prefix}
          maxLength={10}
          onChange={(e) => onChange({ serial_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
          className={inputCls}
          aria-label="Serial number prefix"
          placeholder={meta?.categories[form.category]}
        />
      </Label>
      <div className="sm:col-span-2">
        <Label text="Description" hint="Shown to schools when they pick a template.">
          <textarea rows={2} maxLength={300} value={form.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} className={`${inputCls} resize-none`} aria-label="Description" />
        </Label>
      </div>
      <Label text="Paper">
        <select value={form.paper} onChange={(e) => onChange({ paper: e.target.value as TemplateInput['paper'] })} className={inputCls} aria-label="Paper">
          <option value="A4">A4 (210 × 297 mm)</option>
          <option value="Letter">Letter (8.5 × 11 in)</option>
        </select>
      </Label>
      <Label text="Orientation">
        <div className="flex gap-2">
          {(['portrait', 'landscape'] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={form.orientation === o}
              onClick={() => onChange({ orientation: o })}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold capitalize ring-1 ${form.orientation === o ? 'bg-sky-50 text-brand ring-brand' : 'ring-line hover:bg-slate-50'}`}
            >
              {o}
            </button>
          ))}
        </div>
      </Label>

      <div className="sm:col-span-2">
        <p className="text-sm font-bold">Available to</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!form.school_id}
            onClick={() => (onSchool(null), setPicking(false))}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ${!form.school_id ? 'bg-sky-50 text-brand ring-brand' : 'ring-line hover:bg-slate-50'}`}
          >
            All schools
          </button>
          <button
            type="button"
            aria-pressed={Boolean(form.school_id)}
            onClick={() => setPicking(true)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ${form.school_id ? 'bg-violet-50 text-violet-700 ring-violet-400' : 'ring-line hover:bg-slate-50'}`}
          >
            {form.school_id ? `Only ${schoolName ?? 'one school'}` : 'One school only (custom)'}
          </button>
        </div>
        {picking && (
          <SchoolPicker
            onPick={(s) => {
              onSchool(s)
              setPicking(false)
            }}
            onCancel={() => setPicking(false)}
          />
        )}
      </div>

      {onDelete && (
        <div className="border-t border-line pt-4 sm:col-span-2">
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
            <Trash2 className="size-4" /> Delete template
          </button>
        </div>
      )}
    </div>
  )
}

function SchoolPicker({ onPick, onCancel }: { onPick: (s: ZapSchoolRow) => void; onCancel: () => void }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<ZapSchoolRow[]>([])
  useEffect(() => {
    let live = true
    const t = setTimeout(() => {
      zap.schools({ q: q.trim(), page_size: 6 }).then((d) => live && setItems(d.items), () => undefined)
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [q])
  return (
    <div className="mt-3 rounded-xl p-3 ring-1 ring-line">
      <div className="flex gap-2">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search school, owner or email…" aria-label="Search school" className={inputCls} />
        <button type="button" onClick={onCancel} className="btn-outline border-line text-ink">
          Cancel
        </button>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {items.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onPick(s)} className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left hover:bg-slate-50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{s.name}</span>
                <span className="block truncate text-xs text-muted">{s.owner_email}</span>
              </span>
              <span className="text-xs text-muted">{s.students} students</span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="px-2 py-2 text-sm text-muted">No schools found</li>}
      </ul>
    </div>
  )
}

function FieldsTab({ fields, onChange, onInsert }: { fields: TemplateField[]; onChange: (f: TemplateField[]) => void; onInsert: (key: string) => void }) {
  const update = (i: number, patch: Partial<TemplateField>) => onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const move = (i: number, by: number) => {
    const next = [...fields]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    onChange(next)
  }
  const add = () => {
    let n = fields.length + 1
    while (fields.some((f) => f.key === `field_${n}`)) n += 1
    onChange([...fields, { key: `field_${n}`, label: `Field ${n}`, type: 'text', required: false, options: [] }])
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Extra details the school types in when issuing this document (e.g. “Purpose”, “Reason for leaving”). Use them in the design as{' '}
        <code className="text-violet-700">{'{{ fields.key }}'}</code>.
      </p>
      {fields.map((f, i) => (
        <div key={i} className="grid gap-3 rounded-xl p-3 ring-1 ring-line sm:grid-cols-[1fr_1fr_10rem_auto]" aria-label={`Field ${f.label}`}>
          <input
            value={f.label}
            maxLength={60}
            onChange={(e) => {
              const label = e.target.value
              // Keep the key following the label until it's edited by hand.
              update(i, f.key === slugKey(f.label) ? { label, key: slugKey(label) } : { label })
            }}
            placeholder="Label"
            aria-label="Field label"
            className={inputCls}
          />
          <input
            value={f.key}
            maxLength={40}
            onChange={(e) => update(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
            placeholder="key"
            aria-label="Field key"
            className={`${inputCls} font-mono`}
          />
          <select value={f.type} onChange={(e) => update(i, { type: e.target.value as FieldType })} aria-label="Field type" className={inputCls}>
            {Object.entries(FIELD_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg ring-1 ring-line disabled:opacity-30" aria-label="Move up">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === fields.length - 1} className="grid size-8 place-items-center rounded-lg ring-1 ring-line disabled:opacity-30" aria-label="Move down">
              <ArrowDown className="size-4" />
            </button>
            <button type="button" onClick={() => onChange(fields.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-lg text-rose-500 ring-1 ring-rose-200" aria-label={`Remove ${f.label}`}>
              <Trash2 className="size-4" />
            </button>
          </div>
          {f.type === 'select' ? (
            <input
              defaultValue={f.options.join(', ')}
              onBlur={(e) => update(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
              placeholder="Options, comma separated (e.g. Excellent, Very Good, Good)"
              aria-label="Field options"
              className={`${inputCls} sm:col-span-2`}
            />
          ) : (
            <input
              value={f.placeholder ?? ''}
              maxLength={100}
              onChange={(e) => update(i, { placeholder: e.target.value || null })}
              placeholder="Hint / example (optional)"
              aria-label="Field hint"
              className={`${inputCls} sm:col-span-2`}
            />
          )}
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} className="size-4 accent-brand" /> Required
          </label>
          <button type="button" onClick={() => onInsert(f.key)} className="text-left text-xs font-bold text-violet-700 hover:underline">
            Insert {`{{ fields.${f.key} }}`}
          </button>
        </div>
      ))}
      <button type="button" onClick={add} disabled={fields.length >= 12} className="btn-outline">
        <Plus className="size-4" /> Add field
      </button>
    </div>
  )
}
