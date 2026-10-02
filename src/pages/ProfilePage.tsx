import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  AtSign,
  Briefcase,
  Camera,
  Check,
  Download,
  FileText,
  Heart,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  Mail,
  Pencil,
  PenLine,
  Phone,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  type LucideIcon,
  UserRound,
} from 'lucide-react'

import schoolBand from '../assets/school-band.webp'
import { AppShell } from '../components/app/AppShell'
import { Field, FormError, PasswordField } from '../components/auth/Field'
import { Avatar } from '../components/students/StudentUi'
import { errorMessage } from '../lib/api'
import { PHONE_PATTERN, useMe } from '../lib/auth'
import { useAccessToken } from '../lib/auth-store'
import { inr, shortDate } from '../lib/fees'
import { meApi, type MyProfile, type StartPage } from '../lib/me'
import { useSchoolOptions } from '../lib/schoolOptions'
import { monthLabel, payrollApi, staffApi, type StaffDetail } from '../lib/staff'
import { formatDate } from '../lib/students'

type Tab = 'info' | 'work' | 'password' | 'preferences'
const ROLE_LABEL: Record<string, string> = { Owner: 'School Owner', Admin: 'Admin', Teacher: 'Teacher', Staff: 'Staff' }

export function ProfilePage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const { me } = useMe()
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'work' ? 'work' : 'info')
  const isStaff = Boolean(me?.has_staff_record && !me.is_owner)

  useEffect(() => {
    if (!token) return
    meApi.profile().then(setProfile, (err) => setError(errorMessage(err)))
  }, [token])

  if (!token) return <Navigate to="/login" replace />

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-sky-50 to-amber-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
          <img
            src={schoolBand}
            alt=""
            className="pointer-events-none absolute top-0 right-10 hidden h-full [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)] 2xl:block"
          />
          <div className="relative">
            <h1 className="text-2xl font-extrabold sm:text-3xl">My Profile</h1>
            <p className="mt-0.5">Manage your personal information and account settings.</p>
          </div>
        </section>

        {error && <FormError message={error} />}

        {!profile ? (
          !error && <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <Header profile={profile} onChange={setProfile} onEdit={() => setTab('info')} />

            <div className="flex overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
              {(
                [
                  ['info', 'Profile Information', UserRound],
                  ...(isStaff ? ([['work', 'My Work', Briefcase]] as const) : []),
                  ['password', profile.has_password ? 'Change Password' : 'Set Password', Lock],
                  ['preferences', 'Preferences', Settings],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex min-w-44 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                    tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            {tab === 'work' && isStaff ? (
              <MyWork />
            ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              {tab === 'info' && <InfoForm profile={profile} onSaved={setProfile} />}
              {tab === 'password' && <PasswordForm hasPassword={profile.has_password} onSaved={() => setProfile({ ...profile, has_password: true })} />}
              {tab === 'preferences' && <PreferencesForm profile={profile} onSaved={setProfile} />}
              <div className="space-y-5">
                <PhotoCard profile={profile} onChange={setProfile} />
                <SignatureCard profile={profile} onChange={setProfile} />
                <AccountCard profile={profile} />
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

// ------------------------------------------------------------------ header

function Header({ profile, onChange, onEdit }: { profile: MyProfile; onChange: (p: MyProfile) => void; onEdit: () => void }) {
  const upload = usePhotoUpload(onChange)
  return (
    <section className="flex flex-wrap items-center gap-6 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60 sm:p-6">
      <div className="relative">
        <Avatar name={profile.full_name} url={profile.photo_url} size="size-32 text-4xl" />
        <button
          onClick={upload.pick}
          disabled={upload.busy}
          className="absolute right-1 bottom-1 grid size-10 place-items-center rounded-full bg-brand text-white ring-4 ring-white hover:bg-brand-dark"
          aria-label="Change photo"
        >
          {upload.busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </button>
        {upload.input}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-extrabold">{profile.full_name}</h2>
          <button onClick={onEdit} className="grid size-9 place-items-center rounded-xl bg-sky-50 text-brand ring-1 ring-sky-100" aria-label="Edit profile">
            <Pencil className="size-4" />
          </button>
        </div>
        <span className="mt-1 inline-block rounded-lg bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700">{ROLE_LABEL[profile.role] ?? profile.role}</span>
        <dl className="mt-3 grid gap-x-10 gap-y-2 text-sm sm:grid-cols-2">
          <Detail icon={Mail} value={profile.email} />
          <Detail icon={AtSign} label="Username" value={profile.username ?? 'Not set'} />
          <Detail icon={Phone} value={profile.mobile ?? 'No mobile number'} />
          <Detail icon={ShieldCheck} label="Role" value={ROLE_LABEL[profile.role] ?? profile.role} />
        </dl>
        {upload.error && <p className="mt-2 text-sm font-semibold text-rose-600">{upload.error}</p>}
      </div>
      <blockquote className="hidden max-w-xs rounded-2xl bg-amber-50 px-6 py-5 text-center text-lg leading-snug font-semibold text-ink ring-1 ring-amber-100 2xl:block">
        <span className="font-display text-3xl text-amber-400">“</span>
        Teaching little minds to dream bigger <Heart className="inline size-5 fill-rose-500 text-rose-500" />
      </blockquote>
    </section>
  )
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label?: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-4 shrink-0 text-muted" />
      {label && <dt className="text-muted">{label}:</dt>}
      <dd className="truncate font-semibold text-ink">{value}</dd>
    </div>
  )
}

// ------------------------------------------------------------- info form

function Card({ icon: Icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-brand">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-sm">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Saved({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <Check className="size-4" /> Saved.
    </p>
  )
}

const toForm = (p: MyProfile) => ({ full_name: p.full_name, username: p.username ?? '', email: p.email ?? '', mobile: p.mobile ?? '' })

function InfoForm({ profile, onSaved }: { profile: MyProfile; onSaved: (p: MyProfile) => void }) {
  const initial = toForm(profile)
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setSaved(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const next = await meApi.update({
        full_name: form.full_name.trim(),
        username: form.username.trim() || null,
        email: form.email.trim(),
        mobile: form.mobile.trim() || null,
      })
      onSaved(next)
      setForm(toForm(next)) // show what was stored (e.g. username lowercased)
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card icon={UserRound} title="Profile Information" subtitle="Update your personal details.">
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <Saved show={saved && !dirty} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name *" icon={UserRound} value={form.full_name} onChange={set('full_name')} minLength={2} required />
          <Field
            label="Username"
            icon={AtSign}
            value={form.username}
            onChange={set('username')}
            pattern="[A-Za-z0-9._]{3,30}"
            title="3–30 letters, numbers, dots or underscores"
            placeholder="e.g. priya.sharma"
            autoComplete="username"
          />
        </div>
        <Field label="Email Address *" icon={Mail} type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile Number" icon={Phone} type="tel" pattern={PHONE_PATTERN} value={form.mobile} onChange={set('mobile')} placeholder="98765 43210" />
          <div>
            <p className="mb-1 text-sm font-bold text-ink">Role</p>
            <p className="rounded-xl bg-slate-100 px-3.5 py-2.5 font-semibold text-muted">{ROLE_LABEL[profile.role] ?? profile.role}</p>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-bold text-ink">Assigned Classes</p>
          {profile.assigned_sections.length ? (
            <p className="flex flex-wrap gap-2">
              {profile.assigned_sections.map((s) => (
                <span key={s} className="rounded-lg bg-sky-50 px-3 py-1.5 text-sm font-bold text-brand ring-1 ring-sky-100">
                  {s}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-sm text-muted">Not a class teacher of any section.</p>
          )}
          <p className="mt-1 text-xs text-muted">
            {profile.role === 'Owner' ? (
              <>
                Class teachers are assigned on the{' '}
                <Link to="/staff" className="font-bold text-brand">
                  Staff
                </Link>{' '}
                page.
              </>
            ) : (
              'Your school owner assigns class teachers.'
            )}
          </p>
        </div>
        <p className="text-xs text-muted">You can log in with your email or your username. Changes also apply to your PaperBee account.</p>
        <div className="flex justify-between gap-3 pt-2">
          <button type="button" onClick={() => (setForm(initial), setError(null))} disabled={!dirty} className="btn-outline disabled:opacity-50">
            <RotateCcw className="size-4" /> Reset
          </button>
          <button type="submit" disabled={busy || !dirty} className="btn-primary px-6 disabled:opacity-60">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Changes
          </button>
        </div>
      </form>
    </Card>
  )
}

// ---------------------------------------------------------- password form

function PasswordForm({ hasPassword, onSaved }: { hasPassword: boolean; onSaved: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (next !== confirm) return setError('The new passwords don’t match')
    setBusy(true)
    try {
      await meApi.changePassword(hasPassword ? current : null, next)
      setDone(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card icon={Lock} title={hasPassword ? 'Change Password' : 'Set a Password'} subtitle={hasPassword ? 'Use at least 8 characters.' : 'You signed in with Google — add a password to also log in with email.'}>
      <form onSubmit={submit} className="max-w-lg space-y-4">
        <FormError message={error} />
        {done && (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <Check className="size-4" /> Password updated. Use it next time you log in.
          </p>
        )}
        {hasPassword && <PasswordField label="Current Password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />}
        <PasswordField label="New Password" value={next} onChange={(e) => (setNext(e.target.value), setDone(false))} autoComplete="new-password" minLength={8} required />
        <PasswordField
          label="Confirm New Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          error={confirm && next !== confirm ? 'Doesn’t match the new password' : undefined}
        />
        <button type="submit" disabled={busy} className="btn-primary px-6">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} {hasPassword ? 'Update Password' : 'Set Password'}
        </button>
      </form>
    </Card>
  )
}

// ------------------------------------------------------- preferences form

function PreferencesForm({ profile, onSaved }: { profile: MyProfile; onSaved: (p: MyProfile) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function save(key: string, body: { email_notifications?: boolean; start_page?: StartPage }) {
    setBusy(key)
    setError(null)
    try {
      onSaved(await meApi.preferences(body))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  return (
    <Card icon={Settings} title="Preferences" subtitle="Changes are saved instantly.">
      <div className="space-y-5">
        <FormError message={error} />
        <div>
          <p className="font-bold text-ink">Start page after login</p>
          <p className="text-sm">Teachers often like to land straight on today’s register.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup">
            {(
              [
                ['dashboard', 'Dashboard', 'School overview and notices'],
                ['attendance', 'Take Attendance', 'Open today’s register'],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                role="radio"
                aria-checked={profile.start_page === value}
                disabled={busy !== null}
                onClick={() => profile.start_page !== value && void save('start', { start_page: value })}
                className={`rounded-xl p-4 text-left ring-1 transition ${profile.start_page === value ? 'bg-sky-50 ring-2 ring-brand' : 'ring-line hover:bg-slate-50'}`}
              >
                <span className="flex items-center justify-between font-bold text-ink">
                  {label} {profile.start_page === value && <Check className="size-4 text-brand" />}
                </span>
                <span className="text-sm text-muted">{hint}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl p-4 ring-1 ring-line">
          <span>
            <span className="block font-bold text-ink">Email notifications</span>
            <span className="text-sm text-muted">Account and school emails. Password-reset emails are always sent.</span>
          </span>
          <span className="relative mt-1 inline-flex">
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={profile.email_notifications}
              disabled={busy !== null}
              onChange={(e) => void save('email', { email_notifications: e.target.checked })}
            />
            <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-brand" />
            <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
      </div>
    </Card>
  )
}

// ------------------------------------------------------------ side cards

function usePhotoUpload(onChange: (p: MyProfile) => void) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function upload(file: File) {
    if (file.size > 2 * 1024 * 1024) return setError('Photo must be under 2 MB')
    setBusy(true)
    setError(null)
    try {
      onChange(await meApi.uploadPhoto(file))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return {
    busy,
    error,
    pick: () => ref.current?.click(),
    input: (
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void upload(f)
          e.target.value = ''
        }}
      />
    ),
  }
}

function PhotoCard({ profile, onChange }: { profile: MyProfile; onChange: (p: MyProfile) => void }) {
  const upload = usePhotoUpload(onChange)
  const [removing, setRemoving] = useState(false)
  return (
    <Card icon={ImageIcon} title="Profile Photo" subtitle="Update your profile photo.">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={profile.full_name} url={profile.photo_url} size="size-28 text-3xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xs leading-relaxed text-muted">
            Recommended size: 300 × 300 px
            <br />
            Max file size: 2 MB
            <br />
            Supported formats: JPG, PNG
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={upload.pick} disabled={upload.busy} className="btn-outline py-2 text-sm">
              {upload.busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4 rotate-180" />} Upload Photo
            </button>
            {profile.photo_url && (
              <button
                onClick={async () => {
                  setRemoving(true)
                  try {
                    onChange(await meApi.removePhoto())
                  } finally {
                    setRemoving(false)
                  }
                }}
                disabled={removing}
                className="btn bg-rose-50 py-2 text-sm text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100"
              >
                {removing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Remove
              </button>
            )}
          </div>
          {upload.error && <p className="text-xs font-semibold text-rose-600">{upload.error}</p>}
          {upload.input}
        </div>
      </div>
    </Card>
  )
}

/** Their signature, printed above "Class Teacher" on progress reports. */
function SignatureCard({ profile, onChange }: { profile: MyProfile; onChange: (p: MyProfile) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async (kind: 'upload' | 'remove', fn: () => Promise<MyProfile>) => {
    setBusy(kind)
    setError(null)
    try {
      onChange(await fn())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  return (
    <Card icon={PenLine} title="My Signature" subtitle="Printed on the progress reports of the class you teach.">
      <div className="grid h-28 place-items-center rounded-xl bg-slate-50 ring-1 ring-line" aria-label="Signature preview">
        {profile.signature_url ? (
          <img src={profile.signature_url} alt="Your signature" className="max-h-24 max-w-[80%] object-contain" />
        ) : (
          <span className="text-sm text-muted">No signature yet</span>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">Sign on white paper, take a clear photo, crop it close. PNG with a transparent background looks best. Max 1 MB.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => ref.current?.click()} disabled={busy !== null} className="btn-outline py-2 text-sm">
          {busy === 'upload' ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />} {profile.signature_url ? 'Replace signature' : 'Upload signature'}
        </button>
        {profile.signature_url && (
          <button
            onClick={() => run('remove', () => meApi.removeSignature())}
            disabled={busy !== null}
            className="btn bg-rose-50 py-2 text-sm text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100"
          >
            {busy === 'remove' ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Remove
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg"
        aria-label="Signature file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          if (f.size > 1024 * 1024) return setError('Signature must be under 1 MB')
          void run('upload', () => meApi.uploadSignature(f))
        }}
      />
    </Card>
  )
}

// ---------------------------------------------------------------- my work

/** A staff member's own job record, approved salary slips and letters. */
function MyWork() {
  const [me, setMe] = useState<StaffDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [dlError, setDlError] = useState<string | null>(null)

  useEffect(() => {
    staffApi.me().then(setMe, (err) => setError(errorMessage(err)))
  }, [])

  if (error) return <FormError message={error} />
  if (!me) return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />

  const job: [string, ReactNode][] = [
    ['Employee ID', me.employee_code],
    ['Role', me.designation ? `${me.designation} (${me.staff_type})` : me.staff_type],
    ['Joined', me.joining_date ? shortDate(me.joining_date) : '—'],
    ['Class teacher of', me.class_teacher_of.length ? me.class_teacher_of.map((s) => s.label).join(', ') : '—'],
    ['Monthly salary', me.salary ? `${inr(me.salary.net)} net · ${inr(me.salary.gross)} gross` : '—'],
  ]
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card icon={Briefcase} title="My job" subtitle="Kept by your school — ask the office to correct anything.">
        <dl className="divide-y divide-line rounded-xl ring-1 ring-line">
          {job.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 px-4 py-2.5 text-sm">
              <dt className="text-muted">{k}</dt>
              <dd className="font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div className="space-y-5">
        <Card icon={Download} title="Salary slips" subtitle="Available once the school approves the month.">
          <FormError message={dlError} />
          {me.payslips.length === 0 ? (
            <p className="text-sm text-muted">No salary slips yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm" aria-label="My salary slips">
              {me.payslips.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="block font-bold">{monthLabel(p.month)}</span>
                    <span className="text-xs text-muted">
                      {p.slip_no} · {p.status}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-bold">{inr(p.net)}</span>
                    <button
                      onClick={async () => {
                        setBusy(p.id)
                        setDlError(null)
                        try {
                          await payrollApi.slipPdf(p.id)
                        } catch (err) {
                          setDlError(errorMessage(err))
                        } finally {
                          setBusy(null)
                        }
                      }}
                      className="btn-outline py-1.5 text-sm"
                      aria-label={`Download slip ${p.month}`}
                    >
                      {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card icon={FileText} title="My letters" subtitle="Appointment, experience and other letters from your school.">
          {me.letters.length === 0 ? (
            <p className="text-sm text-muted">No letters yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm" aria-label="My letters">
              {me.letters.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="block font-bold">{l.template_name}</span>
                    <span className="text-xs text-muted">
                      {l.serial_no} · {shortDate(l.issue_date)}
                    </span>
                  </span>
                  {l.download_url && (
                    <a href={l.download_url} className="btn-outline py-1.5 text-sm" aria-label={`Download ${l.template_name}`}>
                      <Download className="size-4" /> PDF
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

function AccountCard({ profile }: { profile: MyProfile }) {
  const rows: [string, ReactNode][] = [
    ['Username', profile.username ?? <span key="u" className="text-muted">Not set</span>],
    ['Email', profile.email],
    ['Mobile', profile.mobile ?? <span key="m" className="text-muted">—</span>],
    ['Role', <span key="r" className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">{ROLE_LABEL[profile.role] ?? profile.role}</span>],
    ['Account Status', <span key="s" className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{profile.status}</span>],
    ['Member Since', formatDate(profile.member_since)],
  ]
  return (
    <Card icon={Info} title="Account Information">
      <dl className="divide-y divide-line rounded-xl ring-1 ring-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 px-4 py-2.5 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="truncate font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
