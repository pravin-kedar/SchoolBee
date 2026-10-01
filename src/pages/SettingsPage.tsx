import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  Award,
  CalendarDays,
  Check,
  CloudUpload,
  FileText,
  Globe,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plus,
  Save,
  School,
  Settings,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'

import schoolBand from '../assets/school-band.webp'
import { AppShell } from '../components/app/AppShell'
import { Field, FormError } from '../components/auth/Field'
import { TextAreaField } from '../components/students/StudentUi'
import { Dialog } from '../components/ui/Dialog'
import { errorMessage } from '../lib/api'
import { PHONE_PATTERN, usePermission } from '../lib/auth'
import { useAccessToken } from '../lib/auth-store'
import { currentAcademicYear } from '../lib/setup'
import { WEEKDAYS, settingsApi, type AssetKind, type SchoolSettings } from '../lib/settings'
import { formatDate } from '../lib/students'

type Tab = 'school' | 'certificate' | 'documents' | 'academic' | 'system'
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'school', label: 'School Information', icon: School },
  { key: 'certificate', label: 'Certificate Settings', icon: Award },
  { key: 'documents', label: 'Document Settings', icon: FileText },
  { key: 'academic', label: 'Academic Settings', icon: CalendarDays },
  { key: 'system', label: 'System Settings', icon: Settings },
]

type Props = { s: SchoolSettings; onChange: (s: SchoolSettings) => void }

export function SettingsPage() {
  const token = useAccessToken()
  const [params, setParams] = useSearchParams()
  const [settings, setSettings] = useState<SchoolSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const tab = (TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'school') as Tab

  useEffect(() => {
    if (!token) return
    settingsApi.get().then(setSettings, (err) => setError(errorMessage(err)))
  }, [token])

  if (!token) return <Navigate to="/login" replace />
  const active = settings?.academic_years.find((y) => y.is_active)

  return (
    <AppShell academicYear={active?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-amber-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <img
            src={schoolBand}
            alt=""
            className="pointer-events-none absolute top-0 right-10 hidden h-full [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] 2xl:block"
          />
          <div className="relative">
            <h1 className="text-2xl font-extrabold sm:text-3xl">School Settings</h1>
            <p className="mt-0.5">Manage your school information, certificate settings and document requirements.</p>
          </div>
        </section>

        <div className="flex overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setParams(key === 'school' ? {} : { tab: key }, { replace: true })}
              className={`flex min-w-44 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold whitespace-nowrap transition ${
                tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        <FormError message={error} />
        {settings && !settings.can_edit && (
          <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink/80 ring-1 ring-line">
            <Lock className="size-4" /> View only — only the school owner or an admin can change settings.
          </p>
        )}

        {!settings ? (
          !error && <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            {tab === 'school' && <SchoolTab s={settings} onChange={setSettings} />}
            {tab === 'certificate' && <CertificateTab s={settings} onChange={setSettings} />}
            {tab === 'documents' && <DocumentsTab s={settings} onChange={setSettings} />}
            {tab === 'academic' && <AcademicTab s={settings} onChange={setSettings} />}
            {tab === 'system' && <SystemTab s={settings} onChange={setSettings} />}
          </>
        )}
      </div>
    </AppShell>
  )
}

// ---------------------------------------------------------------- shared

function Card({ icon: Icon, title, subtitle, action, children }: { icon: LucideIcon; title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-brand">
            <Icon className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-sm">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Save button + "Saved." / error line, for forms that save as a whole. */
function useSave() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await fn()
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, saved, run, clearSaved: () => setSaved(false) }
}

function SaveBar({ busy, saved, disabled, label = 'Save Settings' }: { busy: boolean; saved: boolean; disabled?: boolean; label?: string }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      {saved && (
        <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
          <Check className="size-4" /> Saved
        </span>
      )}
      <button type="submit" disabled={busy || disabled} className="btn-primary px-6 disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {label}
      </button>
    </div>
  )
}

/** Image upload with preview, drag & drop, change and remove. */
function ImageSlot({
  kind,
  label,
  hint,
  url,
  canEdit,
  onChange,
  tall = false,
}: {
  kind: AssetKind
  label: string
  hint: string
  url: string | null
  canEdit: boolean
  onChange: (s: SchoolSettings) => void
  tall?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'up' | 'rm' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  async function upload(file: File | undefined) {
    if (!file) return
    if (!/^image\/(png|jpeg)$/.test(file.type)) return setError('Use a PNG or JPG image')
    if (file.size > 2 * 1024 * 1024) return setError('Image must be under 2 MB')
    setBusy('up')
    setError(null)
    try {
      onChange(await settingsApi.uploadAsset(kind, file))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  async function remove() {
    setBusy('rm')
    setError(null)
    try {
      onChange(await settingsApi.removeAsset(kind))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  const showImage = url && url !== failed
  return (
    <div>
      <p className="mb-1 text-sm font-bold text-ink">{label}</p>
      <div
        onDragOver={(e) => canEdit && (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          if (!canEdit) return
          e.preventDefault()
          setDrag(false)
          void upload(e.dataTransfer.files[0])
        }}
        className={`flex items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-3 transition ${tall ? 'h-44' : 'h-32'} ${
          drag ? 'border-brand bg-sky-50' : 'border-line bg-slate-50/60'
        }`}
      >
        {busy === 'up' ? (
          <Loader2 className="size-6 animate-spin text-brand" />
        ) : showImage ? (
          <img src={url} alt={label} className="max-h-full max-w-full object-contain" onError={() => setFailed(url)} />
        ) : (
          <button type="button" disabled={!canEdit} onClick={() => input.current?.click()} className="flex flex-col items-center gap-1 text-center disabled:cursor-default">
            <CloudUpload className="size-8 text-sky-400" />
            <span className="text-sm font-semibold text-ink/80">{canEdit ? 'Drag & drop or click to browse' : 'Not uploaded'}</span>
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">{hint}</p>
      {canEdit && showImage && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => input.current?.click()} className="btn-outline py-1.5 text-sm">
            <Pencil className="size-3.5" /> Change
          </button>
          <button type="button" onClick={() => void remove()} disabled={busy === 'rm'} className="btn bg-rose-50 py-1.5 text-sm text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100">
            {busy === 'rm' ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Remove
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        aria-label={`Upload ${label}`}
        onChange={(e) => {
          void upload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------- school

function SchoolTab({ s, onChange }: Props) {
  const init = {
    name: s.school.name,
    registration_number: s.school.registration_number ?? '',
    address: s.school.address ?? '',
    phone: s.school.phone ?? '',
    email: s.school.email ?? '',
    website: s.school.website ?? '',
    principal_name: s.school.principal_name ?? '',
    about: s.school.about ?? '',
  }
  const [form, setForm] = useState(init)
  const save = useSave()
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    save.clearSaved()
  }
  const ro = !s.can_edit

  function submit(e: FormEvent) {
    e.preventDefault()
    void save.run(async () =>
      onChange(
        await settingsApi.saveSchool({
          ...form,
          registration_number: form.registration_number.trim() || null,
          website: form.website.trim() || null,
          about: form.about.trim() || null,
        }),
      ),
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card icon={School} title="School Information" subtitle="Basic information about your school.">
        <form onSubmit={submit} className="space-y-4">
          <FormError message={save.error} />
          <fieldset disabled={ro} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="School Name *" icon={School} value={form.name} onChange={set('name')} minLength={2} required />
              <Field label="School Registration Number" icon={FileText} value={form.registration_number} onChange={set('registration_number')} />
            </div>
            <TextAreaField label="Address *" value={form.address} onChange={set('address')} required minLength={5} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone *" icon={Phone} type="tel" pattern={PHONE_PATTERN} value={form.phone} onChange={set('phone')} required />
              <Field label="Email *" icon={Mail} type="email" value={form.email} onChange={set('email')} required />
              <Field label="Website" icon={Globe} value={form.website} onChange={set('website')} placeholder="www.yourschool.in" />
              <Field label="Principal / Director Name *" icon={UserRound} value={form.principal_name} onChange={set('principal_name')} minLength={2} required />
            </div>
            <TextAreaField label="About School" value={form.about} onChange={set('about')} maxLength={1000} placeholder="A line or two about your school." />
          </fieldset>
          {!ro && <SaveBar busy={save.busy} saved={save.saved} />}
        </form>
      </Card>
      <Card icon={School} title="School Logo" subtitle="Shown in the app, on certificates, ID cards and reports.">
        <ImageSlot kind="logo" label="Current Logo" hint="PNG or JPG • Recommended 300 × 300 px • Max 2 MB" url={s.school.logo_url} canEdit={s.can_edit} onChange={onChange} tall />
      </Card>
    </div>
  )
}

// ----------------------------------------------------------- certificate

function CertificateTab({ s, onChange }: Props) {
  const init = {
    principal_name: s.certificate.principal_name ?? '',
    principal_designation: s.certificate.principal_designation ?? '',
    footer_text: s.certificate.footer_text ?? '',
  }
  const [form, setForm] = useState(init)
  const save = useSave()
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    save.clearSaved()
  }
  const suggestedFooter = [s.school.name, s.school.address, s.school.website, s.school.phone].filter(Boolean).join('  |  ')

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card icon={Award} title="Certificate Settings" subtitle="Signature, stamp and default text for certificates.">
        <div className="grid gap-5 sm:grid-cols-2">
          <ImageSlot kind="signature" label="Principal Signature" hint="PNG with a transparent background works best" url={s.certificate.signature_url} canEdit={s.can_edit} onChange={onChange} />
          <ImageSlot kind="stamp" label="School Stamp" hint="PNG with a transparent background works best" url={s.certificate.stamp_url} canEdit={s.can_edit} onChange={onChange} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void save.run(async () =>
              onChange(
                await settingsApi.saveCertificate({
                  principal_name: form.principal_name.trim(),
                  principal_designation: form.principal_designation.trim() || null,
                  footer_text: form.footer_text.trim() || null,
                }),
              ),
            )
          }}
          className="mt-5 space-y-4"
        >
          <FormError message={save.error} />
          <fieldset disabled={!s.can_edit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Principal Name (for certificates) *" icon={UserRound} value={form.principal_name} onChange={set('principal_name')} minLength={2} required />
              <Field label="Principal Designation" icon={Award} value={form.principal_designation} onChange={set('principal_designation')} placeholder="Principal" />
            </div>
            <TextAreaField label="Certificate Footer Text" value={form.footer_text} onChange={set('footer_text')} placeholder={suggestedFooter} />
            {!form.footer_text && s.can_edit && suggestedFooter && (
              <button type="button" onClick={() => set('footer_text')({ target: { value: suggestedFooter } })} className="text-sm font-bold text-brand hover:underline">
                Use school details as footer
              </button>
            )}
          </fieldset>
          {s.can_edit && <SaveBar busy={save.busy} saved={save.saved} />}
        </form>
      </Card>

      {/* Live preview of the certificate's sign-off area */}
      <Card icon={FileText} title="Preview" subtitle="How the bottom of a certificate will look.">
        <div className="rounded-xl border-4 border-double border-amber-300 bg-amber-50/40 p-5">
          <div className="flex items-end justify-between gap-4">
            <div className="grid size-24 place-items-center">
              {s.certificate.stamp_url ? <img src={s.certificate.stamp_url} alt="" className="max-h-24 object-contain opacity-90" /> : <span className="text-xs text-muted">Stamp</span>}
            </div>
            <div className="text-center">
              <div className="grid h-14 place-items-center">
                {s.certificate.signature_url ? <img src={s.certificate.signature_url} alt="" className="max-h-14 object-contain" /> : <span className="text-xs text-muted">Signature</span>}
              </div>
              <div className="mt-1 border-t border-ink/40 pt-1">
                <p className="font-bold text-ink">{form.principal_name || 'Principal name'}</p>
                <p className="text-xs text-muted">{form.principal_designation || 'Principal'}</p>
              </div>
            </div>
          </div>
          <p className="mt-4 border-t border-amber-200 pt-2 text-center text-[11px] text-ink/70">{form.footer_text || suggestedFooter}</p>
        </div>
      </Card>
    </div>
  )
}

// ------------------------------------------------------------- documents

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition disabled:opacity-60 ${checked ? 'bg-brand' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

function DocumentsTab({ s, onChange }: Props) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function patch(id: string, body: { required?: boolean; active?: boolean }) {
    setBusyId(id)
    setError(null)
    try {
      onChange(await settingsApi.updateDocumentType(id, body))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card
      icon={FileText}
      title="Document Settings"
      subtitle="Documents collected at admission. Required ones are flagged as missing on student profiles."
      action={
        s.can_edit && (
          <button onClick={() => setAdding(true)} className="btn-primary py-2">
            <Plus className="size-4" /> Add Document Type
          </button>
        )
      }
    >
      <FormError message={error} />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-xs font-bold text-ink/80">
              <th className="w-10 px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Document Name</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Required</th>
              <th className="px-3 py-2.5">Active</th>
              {s.can_edit && <th className="px-3 py-2.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {s.document_types.map((t, i) => (
              <tr key={t.id} className={t.active ? '' : 'opacity-60'}>
                <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                <td className="px-3 py-2.5 font-semibold text-ink">{t.name}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${t.required ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-brand'}`}>
                    {t.required ? 'Required' : 'Optional'}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Switch checked={t.required} disabled={!s.can_edit || busyId === t.id} onChange={(v) => void patch(t.id, { required: v })} label={`${t.name} required`} />
                </td>
                <td className="px-3 py-2.5">
                  <Switch checked={t.active} disabled={!s.can_edit || busyId === t.id} onChange={(v) => void patch(t.id, { active: v })} label={`${t.name} active`} />
                </td>
                {s.can_edit && (
                  <td className="px-3 py-2.5">
                    <span className="flex justify-end gap-2">
                      <button onClick={() => setEditing({ id: t.id, name: t.name })} className="grid size-8 place-items-center rounded-lg text-brand ring-1 ring-line hover:bg-sky-50" aria-label={`Rename ${t.name}`}>
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => setDeleting({ id: t.id, name: t.name })} className="grid size-8 place-items-center rounded-lg text-rose-500 ring-1 ring-line hover:bg-rose-50" aria-label={`Delete ${t.name}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <DocTypeDialog title="Add Document Type" initial="" withRequired onClose={() => setAdding(false)} onSave={async (name, req) => onChange(await settingsApi.addDocumentType(name, req))} />}
      {editing && (
        <DocTypeDialog title={`Rename ${editing.name}`} initial={editing.name} onClose={() => setEditing(null)} onSave={async (name) => onChange(await settingsApi.updateDocumentType(editing.id, { name }))} />
      )}
      {deleting && (
        <Dialog
          title={`Delete ${deleting.name}?`}
          subtitle="It will no longer be requested at admission. To keep it for later, make it inactive instead."
          submitLabel="Delete"
          danger
          onClose={() => setDeleting(null)}
          onSubmit={async () => onChange(await settingsApi.deleteDocumentType(deleting.id))}
        />
      )}
    </Card>
  )
}

function DocTypeDialog({
  title,
  initial,
  withRequired = false,
  onClose,
  onSave,
}: {
  title: string
  initial: string
  withRequired?: boolean
  onClose: () => void
  onSave: (name: string, required: boolean) => Promise<void>
}) {
  const [name, setName] = useState(initial)
  const [required, setRequired] = useState(false)
  return (
    <Dialog title={title} submitLabel="Save" onClose={onClose} onSubmit={() => onSave(name.trim(), required)} submitDisabled={!name.trim()}>
      <label className="block text-sm font-bold text-ink">
        Document Name
        <input
          autoFocus
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Transfer Certificate"
          className="mt-1 w-full rounded-xl border border-line px-3.5 py-2.5 font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </label>
      {withRequired && (
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="size-4 accent-brand" /> Required at admission
        </label>
      )}
    </Dialog>
  )
}

// -------------------------------------------------------------- academic

function AcademicTab({ s, onChange }: Props) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<SchoolSettings['academic_years'][number] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function activate(id: string) {
    setBusyId(id)
    setError(null)
    try {
      onChange(await settingsApi.updateYear(id, { is_active: true }))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card
        icon={CalendarDays}
        title="Academic Years"
        subtitle="The active year is used for new enrollments, class counts and attendance."
        action={
          s.can_edit && (
            <button onClick={() => setAdding(true)} className="btn-primary py-2">
              <Plus className="size-4" /> Add Academic Year
            </button>
          )
        }
      >
        <FormError message={error} />
        <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
          {s.academic_years.map((y) => (
            <li key={y.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="leading-tight">
                <span className="flex items-center gap-2 font-bold text-ink">
                  {y.name}
                  {y.is_active && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">Active</span>}
                </span>
                <span className="text-sm text-muted">
                  {formatDate(y.start_date)} – {formatDate(y.end_date)}
                </span>
              </span>
              {s.can_edit && (
                <span className="flex gap-2">
                  {!y.is_active && (
                    <button onClick={() => void activate(y.id)} disabled={busyId === y.id} className="btn-outline py-1.5 text-sm">
                      {busyId === y.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Set Active
                    </button>
                  )}
                  <button onClick={() => setEditing(y)} className="btn-outline border-line py-1.5 text-sm text-ink">
                    <Pencil className="size-4" /> Dates
                  </button>
                </span>
              )}
            </li>
          ))}
          {s.academic_years.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No academic years yet.</li>}
        </ul>
      </Card>
      <Card icon={School} title="Classes & Sections" subtitle="Classes, sections and class teachers live on the Classes page.">
        <p className="text-sm">Add or rename classes, create sections, assign class teachers and move students between classes.</p>
        <Link to="/classes" className="btn-outline mt-4">
          Open Classes
        </Link>
      </Card>

      {adding && <YearDialog s={s} onClose={() => setAdding(false)} onChange={onChange} />}
      {editing && <YearDialog s={s} year={editing} onClose={() => setEditing(null)} onChange={onChange} />}
    </div>
  )
}

function YearDialog({ s, year, onClose, onChange }: { s: SchoolSettings; year?: SchoolSettings['academic_years'][number]; onClose: () => void; onChange: (s: SchoolSettings) => void }) {
  // Suggest the year after the latest one.
  const latest = s.academic_years[0]
  const next = latest
    ? (() => {
        const y = Number(latest.name.slice(0, 4)) + 1
        return { name: `${y}-${String((y + 1) % 100).padStart(2, '0')}`, start_date: `${y}-${latest.start_date.slice(5)}`, end_date: `${y + 1}-${latest.end_date.slice(5)}` }
      })()
    : currentAcademicYear()
  const [form, setForm] = useState(year ? { name: year.name, start_date: year.start_date, end_date: year.end_date } : next)
  const [makeActive, setMakeActive] = useState(false)
  const input = 'mt-1 w-full rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:border-brand'
  return (
    <Dialog
      title={year ? `Edit ${year.name}` : 'Add Academic Year'}
      submitLabel="Save"
      onClose={onClose}
      onSubmit={async () =>
        onChange(
          year
            ? await settingsApi.updateYear(year.id, { start_date: form.start_date, end_date: form.end_date })
            : await settingsApi.addYear({ ...form, make_active: makeActive }),
        )
      }
    >
      {!year && (
        <label className="block text-sm font-bold text-ink">
          Academic Year
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} pattern="\d{4}-\d{2}" placeholder="2027-28" className={input} />
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-ink">
          Start Date
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={input} />
        </label>
        <label className="block text-sm font-bold text-ink">
          End Date
          <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={input} />
        </label>
      </div>
      {!year && (
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} className="size-4 accent-brand" /> Make it the active year now
        </label>
      )}
    </Dialog>
  )
}

// ---------------------------------------------------------------- system

function SystemTab({ s, onChange }: Props) {
  const [off, setOff] = useState<number[]>(s.system.weekly_off)
  const [allowLate, setAllowLate] = useState(s.system.allow_late)
  const [lockDays, setLockDays] = useState(String(s.system.attendance_lock_days))
  const { isOwner } = usePermission()
  const lockOk = /^\d{1,3}$/.test(lockDays) && Number(lockDays) <= 365
  const save = useSave()
  const toggle = (d: number) => {
    setOff((o) => (o.includes(d) ? o.filter((x) => x !== d) : [...o, d].sort()))
    save.clearSaved()
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card icon={Settings} title="Attendance Settings" subtitle="How attendance works across the school.">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!lockOk) return
            void save.run(async () =>
              onChange(await settingsApi.saveSystem({ weekly_off: off, allow_late: allowLate, ...(isOwner ? { attendance_lock_days: Number(lockDays) } : {}) })),
            )
          }}
          className="space-y-5"
        >
          <FormError message={save.error} />
          <div>
            <p className="font-bold text-ink">Weekly off days</p>
            <p className="text-sm">Shaded on attendance calendars; the register warns if you open an off day.</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Weekly off days">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={off.includes(i)}
                  disabled={!s.can_edit}
                  onClick={() => toggle(i)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold ring-1 transition ${off.includes(i) ? 'bg-rose-50 text-rose-600 ring-rose-200' : 'bg-white text-ink ring-line hover:bg-slate-50'}`}
                >
                  {d.slice(0, 3)} {off.includes(i) && <X className="inline size-3.5" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl p-4 ring-1 ring-line">
            <span>
              <span className="block font-bold text-ink">Allow “Late” marking</span>
              <span className="text-sm text-muted">Turn off to only use Present / Absent. Late still counts as attended.</span>
            </span>
            <Switch checked={allowLate} disabled={!s.can_edit} onChange={(v) => (setAllowLate(v), save.clearSaved())} label="Allow Late marking" />
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl p-4 ring-1 ring-line">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-bold text-ink">
                <Lock className="size-4 text-muted" /> Lock attendance after
              </span>
              <span className="text-sm text-muted">
                Older registers can only be changed by the school owner; every change is kept in the register’s history. 0 = never lock.
                {!isOwner && ' Only the owner can change this.'}
              </span>
            </span>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                inputMode="numeric"
                value={lockDays}
                disabled={!s.can_edit || !isOwner}
                onChange={(e) => (setLockDays(e.target.value.replace(/\D/g, '').slice(0, 3)), save.clearSaved())}
                aria-label="Lock attendance after days"
                className="w-20 rounded-xl border border-line bg-white px-3 py-2 text-right outline-none focus:border-brand disabled:bg-slate-50"
              />
              days
            </label>
            {!lockOk && <p className="w-full text-sm font-semibold text-rose-600">Enter 0–365 days.</p>}
          </div>
          {s.can_edit && <SaveBar busy={save.busy} saved={save.saved} disabled={!lockOk} />}
        </form>
      </Card>
      <Card icon={School} title="School Setup" subtitle="The guided onboarding you went through first.">
        <p className="text-sm">Open the setup wizard to review the basics step by step, or add teachers in Basic User Setup.</p>
        <Link to="/setup" className="btn-outline mt-4">
          Open Setup Wizard
        </Link>
      </Card>
    </div>
  )
}
