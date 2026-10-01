import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileText,
  Hash,
  ImagePlus,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  School,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import { Field, FormError } from '../auth/Field'
import { SchoolLogo } from '../app/SchoolLogo'
import { errorMessage } from '../../lib/api'
import { PHONE_PATTERN } from '../../lib/auth'
import { currentAcademicYear, setupApi, type SetupState } from '../../lib/setup'

type StepProps = {
  state: SetupState
  /** Step submitted - store the new state and move to the next step. */
  onSaved: (next: SetupState) => void
  /** Data changed within the step (logo, staff) - store it, stay here. */
  onUpdate: (next: SetupState) => void
  onBack?: () => void
}

/** Card + footer (Back / Save & Continue) shared by every step. Runs `save`
 *  with busy/error handling and hands the new state up. */
function StepCard({
  title,
  subtitle,
  children,
  onBack,
  submitLabel = 'Save & Continue',
  save,
  onSaved,
}: {
  title: string
  subtitle: string
  children: ReactNode
  onBack?: () => void
  submitLabel?: string
  save: () => Promise<SetupState>
  onSaved: (next: SetupState) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSaved(await save())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-h-full flex-col rounded-2xl bg-white shadow-card">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5 sm:px-6">
        <h2 className="text-xl font-extrabold">{title}</h2>
        <p className="text-sm">{subtitle}</p>
        <div className="mt-4 space-y-4">
          <FormError message={error} />
          {children}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3 sm:px-6">
        {onBack ? (
          <button type="button" onClick={onBack} className="btn-outline border-line text-ink">
            <ArrowLeft className="size-4" /> Back
          </button>
        ) : (
          <span />
        )}
        <button type="submit" disabled={busy} className="btn-primary px-6 py-2.5 text-base disabled:opacity-70">
          {busy ? <Loader2 className="size-5 animate-spin" /> : null}
          {submitLabel} {!busy && <ArrowRight className="size-5" />}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------- 1. School

export function SchoolInfoStep({ state, onSaved, onUpdate }: StepProps) {
  const s = state.school
  const [form, setForm] = useState({
    name: s.name,
    address: s.address ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    principal_name: s.principal_name ?? '',
    registration_number: s.registration_number ?? '',
  })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <StepCard
      title="School Information"
      subtitle="Tell us about your school. This information will be used in certificates and reports."
      onSaved={onSaved}
      save={() => setupApi.saveSchool({ ...form, registration_number: form.registration_number.trim() || null })}
    >
      <div className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
        <div className="space-y-4">
          <LogoUpload state={state} onUpdate={onUpdate} />
          <Field
            label="Registration No. (Optional)"
            icon={FileText}
            value={form.registration_number}
            onChange={set('registration_number')}
          />
        </div>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Field label="School Name *" icon={School} value={form.name} onChange={set('name')} minLength={2} required />
          <Field
            label="Principal / Director Name *"
            icon={UserRound}
            placeholder="e.g. Mrs. Neha Kulkarni"
            value={form.principal_name}
            onChange={set('principal_name')}
            minLength={2}
            required
          />
          <Field label="Phone Number *" icon={Phone} type="tel" pattern={PHONE_PATTERN} value={form.phone} onChange={set('phone')} required />
          <Field label="Email Address *" icon={Mail} type="email" value={form.email} onChange={set('email')} required />
          <div className="sm:col-span-2">
            <label htmlFor="sb-address" className="mb-1 block text-sm font-bold text-ink">
              Address *
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-3 left-3.5 size-5 text-muted" />
              <textarea
                id="sb-address"
                rows={2}
                required
                minLength={5}
                value={form.address}
                onChange={set('address')}
                placeholder="Street, area, city, state - PIN"
                className="w-full resize-none rounded-xl border border-line py-2.5 pr-4 pl-11 text-ink outline-none placeholder:text-muted/80 focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
          </div>
        </div>
      </div>
    </StepCard>
  )
}

function LogoUpload({ state, onUpdate }: Pick<StepProps, 'state' | 'onUpdate'>) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return setError('Logo must be under 2 MB')
    setBusy(true)
    setError(null)
    try {
      onUpdate(await setupApi.uploadLogo(file))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-bold text-ink">School Logo</p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-36 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line bg-slate-50/60 p-4 transition hover:border-brand/50 hover:bg-sky-50/50"
      >
        {state.school.logo_url && !busy ? (
          <SchoolLogo url={state.school.logo_url} className="h-16 w-24" />
        ) : (
          <span className="grid size-11 place-items-center rounded-full bg-slate-200/70 text-muted">
            {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          </span>
        )}
        <span className="text-sm font-bold text-ink">{state.school.logo_url ? 'Change Logo' : 'Upload School Logo'}</span>
        <span className="text-xs text-muted">JPG / PNG • Max 2 MB</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------- 2. Academic year

export function AcademicYearStep({ state, onSaved, onBack }: StepProps) {
  const active = state.academic_years.find((y) => y.is_active)
  const initial = active ?? currentAcademicYear()
  const [form, setForm] = useState({ name: initial.name, start_date: initial.start_date, end_date: initial.end_date })

  return (
    <StepCard
      title="Academic Year"
      subtitle="Set the academic year you're running now. It becomes your school's active year."
      onBack={onBack}
      onSaved={onSaved}
      save={() => setupApi.saveAcademicYear(form.name, form.start_date, form.end_date)}
    >
      <Field
        label="Academic Year *"
        icon={CalendarDays}
        placeholder="2026-27"
        pattern="\d{4}-\d{2}"
        title="Format: 2026-27"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        required
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Start Date *"
          icon={CalendarDays}
          type="date"
          value={form.start_date}
          onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
          required
        />
        <Field
          label="End Date *"
          icon={CalendarDays}
          type="date"
          value={form.end_date}
          onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
          required
        />
      </div>
      {active && (
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold">Active</span>
          {active.name} is your active academic year
        </p>
      )}
    </StepCard>
  )
}

// ---------------------------------------------------------------- 3. Classes

const PRESET_CLASSES = ['Play Group', 'Nursery', 'LKG', 'UKG']

export function ClassesStep({ state, onSaved, onBack }: StepProps) {
  const [names, setNames] = useState<string[]>(
    state.classes.length ? state.classes.map((c) => c.name) : PRESET_CLASSES,
  )
  const [draft, setDraft] = useState('')
  const has = (n: string) => names.some((x) => x.toLowerCase() === n.toLowerCase())

  function toggle(n: string) {
    setNames((list) => (has(n) ? list.filter((x) => x.toLowerCase() !== n.toLowerCase()) : [...list, n]))
  }
  function addDraft() {
    const n = draft.trim()
    if (n && !has(n)) setNames((list) => [...list, n])
    setDraft('')
  }

  return (
    <StepCard
      title="Classes"
      subtitle="Pick the classes your school runs. You can add your own too."
      onBack={onBack}
      onSaved={onSaved}
      save={() => {
        if (!names.length) return Promise.reject(new Error('Add at least one class'))
        return setupApi.saveClasses(names)
      }}
    >
      <div className="flex flex-wrap gap-2">
        {[...PRESET_CLASSES, ...names.filter((n) => !PRESET_CLASSES.some((p) => p.toLowerCase() === n.toLowerCase()))].map(
          (n) => (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              aria-pressed={has(n)}
              className={`rounded-full px-4 py-2 text-sm font-bold ring-1 transition ${
                has(n) ? 'bg-brand text-white ring-brand' : 'bg-white text-ink ring-line hover:ring-brand/50'
              }`}
            >
              {n}
            </button>
          ),
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addDraft()
            }
          }}
          placeholder="Add another class, e.g. Day Care"
          maxLength={50}
          className="flex-1 rounded-xl border border-line px-4 py-2.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
        <button type="button" onClick={addDraft} className="btn-outline">
          <Plus className="size-4" /> Add
        </button>
      </div>

      {names.length > 0 && (
        <ol className="divide-y divide-line rounded-xl ring-1 ring-line">
          {names.map((n, i) => (
            <li key={n} className="flex items-center justify-between px-4 py-2">
              <span className="font-semibold text-ink">
                <span className="mr-3 text-muted">{i + 1}.</span>
                {n}
              </span>
              <button type="button" onClick={() => toggle(n)} className="text-muted hover:text-rose-600" aria-label={`Remove ${n}`}>
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </StepCard>
  )
}

// --------------------------------------------------------------- 4. Sections

const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E']

export function SectionsStep({ state, onSaved, onBack }: StepProps) {
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      state.classes.map((c) => [c.id, c.sections.length ? c.sections.map((s) => s.name) : ['A']]),
    ),
  )
  const toggle = (classId: string, name: string) =>
    setPicked((p) => {
      const cur = p[classId] ?? []
      const next = cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name].sort()
      return { ...p, [classId]: next }
    })

  if (!state.classes.length) {
    return (
      <StepCard title="Sections" subtitle="Add your classes first." onBack={onBack} onSaved={onSaved} save={setupApi.get}>
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
          There are no classes yet. Go back to the Classes step to add them.
        </p>
      </StepCard>
    )
  }

  return (
    <StepCard
      title="Sections"
      subtitle="Choose the sections for each class. Every class needs at least one."
      onBack={onBack}
      onSaved={onSaved}
      save={() => {
        const empty = state.classes.find((c) => !(picked[c.id] ?? []).length)
        if (empty) return Promise.reject(new Error(`Pick at least one section for ${empty.name}`))
        return setupApi.saveSections(state.classes.map((c) => ({ class_id: c.id, sections: picked[c.id] })))
      }}
    >
      <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
        {state.classes.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
            <span className="flex items-center gap-2 font-bold text-ink">
              <Hash className="size-4 text-muted" /> {c.name}
            </span>
            <span className="flex gap-2">
              {SECTION_OPTIONS.map((s) => {
                const on = (picked[c.id] ?? []).includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(c.id, s)}
                    aria-pressed={on}
                    aria-label={`${c.name} section ${s}`}
                    className={`grid size-10 place-items-center rounded-xl font-extrabold ring-1 transition ${
                      on ? 'bg-brand text-white ring-brand' : 'bg-white text-muted ring-line hover:ring-brand/50'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </span>
          </li>
        ))}
      </ul>
    </StepCard>
  )
}

// ------------------------------------------------------------------ 5. Users

const emptyStaff = { full_name: '', email: '', role: 'Teacher' as 'Admin' | 'Teacher', password: '' }

export function UsersStep({ state, onSaved, onUpdate, onBack }: StepProps) {
  const [form, setForm] = useState(emptyStaff)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add() {
    setAdding(true)
    setError(null)
    try {
      onUpdate(await setupApi.addStaff(form))
      setForm(emptyStaff)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  async function remove(memberId: string) {
    try {
      onUpdate(await setupApi.removeStaff(memberId))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const canAdd = form.full_name.trim().length >= 2 && form.email.includes('@') && form.password.length >= 8

  return (
    <StepCard
      title="Basic User Setup"
      subtitle="Add teachers or admins who'll use SchoolBee. You can skip this and add them later."
      onBack={onBack}
      onSaved={onSaved}
      submitLabel="Finish Setup"
      save={setupApi.complete}
    >
      <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
        {state.staff.map((m) => (
          <li key={m.member_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="leading-tight">
              <span className="block font-bold text-ink">{m.full_name}</span>
              <span className="text-sm text-muted">{m.email}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-brand">{m.role}</span>
              {m.role !== 'Owner' && (
                <button type="button" onClick={() => void remove(m.member_id)} className="text-muted hover:text-rose-600" aria-label={`Remove ${m.full_name}`}>
                  <Trash2 className="size-4" />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      {/* Not a nested <form>: this section adds a person, the card's submit finishes setup. */}
      <div className="space-y-4 rounded-xl bg-slate-50 p-4 ring-1 ring-line">
        <p className="font-bold text-ink">Add a staff member</p>
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" icon={UserRound} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          <Field label="Email" icon={Mail} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <div>
            <label htmlFor="sb-role" className="mb-1 block text-sm font-bold text-ink">
              Role
            </label>
            <select
              id="sb-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'Admin' | 'Teacher' }))}
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-ink outline-none focus:border-brand"
            >
              <option value="Teacher">Teacher</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <Field
            label="Temporary Password"
            icon={Lock}
            type="text"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </div>
        <button type="button" disabled={!canAdd || adding} onClick={() => void add()} className="btn-outline disabled:opacity-50">
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add Staff
        </button>
      </div>
    </StepCard>
  )
}
