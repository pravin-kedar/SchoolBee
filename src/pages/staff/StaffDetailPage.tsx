import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { StatusPill } from '../../components/fees/FeeUi'
import { Avatar } from '../../components/students/StudentUi'
import { selectCls } from '../../components/students/StudentTable'
import { Dialog } from '../../components/ui/Dialog'
import { PagePreview } from '../../components/ui/PagePreview'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import type { CertTemplate } from '../../lib/certificates'
import { inr, shortDate, todayIso } from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { PERMISSION_GROUP_ORDER, monthLabel, payrollApi, staffApi, type SalaryLine, type StaffDetail, type StaffMeta } from '../../lib/staff'

type Tab = 'profile' | 'access' | 'documents' | 'salary' | 'letters' | 'payslips'
const TABS: [Tab, string][] = [
  ['profile', 'Profile'],
  ['access', 'Login & Access'],
  ['documents', 'Documents'],
  ['salary', 'Salary'],
  ['letters', 'Letters'],
  ['payslips', 'Payslips'],
]
const inputCls = `${selectCls} mt-1 w-full font-normal`

export function StaffDetailPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const token = useAccessToken()
  const options = useSchoolOptions()
  const [staff, setStaff] = useState<StaffDetail | null>(null)
  const [meta, setMeta] = useState<StaffMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(params.get('welcome') ? 'Staff member added. Next: turn on their login, set their salary and upload documents.' : null)
  const [relieving, setRelieving] = useState(false)
  const photo = useRef<HTMLInputElement>(null)
  const tab = (TABS.find(([k]) => k === params.get('tab'))?.[0] ?? 'profile') as Tab

  useEffect(() => {
    staffApi.get(id).then(setStaff, (err) => setError(errorMessage(err)))
    staffApi.meta().then(setMeta, () => undefined)
  }, [id])

  if (!token) return <Navigate to="/login" replace />

  async function run(fn: () => Promise<StaffDetail>, text?: string, rethrow = false) {
    setError(null)
    try {
      setStaff(await fn())
      if (text) setNotice(text)
    } catch (err) {
      if (rethrow) throw err
      setError(errorMessage(err))
    }
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <Link to="/staff" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
          <ArrowLeft className="size-4" /> Staff
        </Link>
        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}
        {notice && (
          <p role="status" className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> {notice}
            </span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}

        {!staff ? (
          !error && <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <>
            <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
              <div className="relative">
                <Avatar name={staff.full_name} url={staff.photo_url} gender={staff.gender} size="size-20 text-2xl rounded-2xl" />
                <button onClick={() => photo.current?.click()} className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full bg-ink/75 text-white ring-2 ring-white" aria-label="Change photo">
                  <Camera className="size-4" />
                </button>
                <input
                  ref={photo}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  aria-label="Staff photo"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) void run(() => staffApi.photo(staff.id, f), 'Photo updated')
                  }}
                />
              </div>
              <div className="min-w-0 flex-1 leading-snug">
                <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold">
                  {staff.full_name} <StatusPill status={staff.status} />
                </h1>
                <p className="text-sm text-ink/80">
                  {staff.employee_code} · {staff.designation || staff.staff_type}
                  {staff.class_teacher_of.length ? ` · Class teacher of ${staff.class_teacher_of.map((s) => s.label).join(', ')}` : ''}
                </p>
                <p className="text-xs text-muted">
                  {staff.login_active ? `Portal login on (${staff.username ? `@${staff.username}` : staff.login_email})` : staff.has_login ? 'Portal login turned off' : 'No portal login'}
                  {staff.relieving_date ? ` · Relieved on ${shortDate(staff.relieving_date)}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/staff/${staff.id}/edit`} className="btn-outline">
                  <Pencil className="size-4" /> Edit details
                </Link>
                {staff.status === 'Active' ? (
                  <button onClick={() => setRelieving(true)} className="btn-outline border-rose-200 text-rose-600">
                    <UserMinus className="size-4" /> Relieve
                  </button>
                ) : (
                  <button onClick={() => void run(() => staffApi.rejoin(staff.id), `${staff.full_name} is back on staff`)} className="btn-outline">
                    <UserPlus className="size-4" /> Rejoin
                  </button>
                )}
              </div>
            </section>

            <div className="flex overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
              {TABS.map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setParams(key === 'profile' ? {} : { tab: key }, { replace: true })}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition ${tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'profile' && <ProfileTab staff={staff} />}
            {tab === 'access' && <AccessTab staff={staff} meta={meta} run={run} />}
            {tab === 'documents' && <DocumentsTab staff={staff} meta={meta} run={run} />}
            {tab === 'salary' && <SalaryTab staff={staff} run={run} />}
            {tab === 'letters' && <LettersTab staff={staff} run={run} />}
            {tab === 'payslips' && <PayslipsTab staff={staff} onError={setError} />}
          </>
        )}
      </div>

      {relieving && staff && <RelieveDialog staff={staff} onClose={() => setRelieving(false)} onDone={(s) => (setStaff(s), setNotice(`${s.full_name} is marked as relieved; their login is off.`))} />}
    </AppShell>
  )
}

type Run = (fn: () => Promise<StaffDetail>, text?: string, rethrow?: boolean) => Promise<void>

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label={title}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-line/60 py-1.5">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-semibold break-words">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function ProfileTab({ staff }: { staff: StaffDetail }) {
  const masked = (v: string | null, keep = 4) => (v ? `${'•'.repeat(Math.max(0, v.length - keep))}${v.slice(-keep)}` : null)
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card title="Personal">
        <Rows
          rows={[
            ['Gender', staff.gender],
            ['Date of birth', staff.date_of_birth ? shortDate(staff.date_of_birth) : null],
            ['Phone', staff.phone],
            ['Email', staff.email],
            ['Address', [staff.address, staff.city, staff.state, staff.pincode].filter(Boolean).join(', ')],
            ['Emergency contact', [staff.emergency_name, staff.emergency_relation && `(${staff.emergency_relation})`, staff.emergency_phone].filter(Boolean).join(' ')],
          ]}
        />
      </Card>
      <Card title="Job">
        <Rows
          rows={[
            ['Role', staff.staff_type],
            ['Designation', staff.designation],
            ['Joining date', staff.joining_date ? shortDate(staff.joining_date) : null],
            ['Qualification', staff.qualification],
            ['Experience', staff.experience_years != null ? `${staff.experience_years} years` : null],
            ['Previous employer', staff.previous_employer],
            ['Relieving', staff.relieving_date ? `${shortDate(staff.relieving_date)}${staff.relieving_reason ? ` — ${staff.relieving_reason}` : ''}` : null],
          ]}
        />
      </Card>
      <Card title="Bank & ID">
        <Rows
          rows={[
            ['Account holder', staff.bank_account_name],
            ['Bank', staff.bank_name],
            ['Account number', masked(staff.bank_account_no)],
            ['IFSC', staff.bank_ifsc],
            ['PAN', staff.pan],
            ['Aadhaar', masked(staff.aadhaar_no)],
          ]}
        />
      </Card>
      {staff.notes && (
        <Card title="Notes">
          <p className="text-sm whitespace-pre-line">{staff.notes}</p>
        </Card>
      )}
    </div>
  )
}

function AccessTab({ staff, meta, run }: { staff: StaffDetail; meta: StaffMeta | null; run: Run }) {
  const [perms, setPerms] = useState<Set<string>>(new Set(staff.permissions))
  const [sections, setSections] = useState<Set<string>>(new Set(staff.class_teacher_of.map((s) => s.id)))
  const [login, setLogin] = useState<{ email: string; username: string; password: string } | null>(null)
  const [resetting, setResetting] = useState(false)
  const permsChanged = [...perms].sort().join() !== [...staff.permissions].sort().join()
  const sectionsChanged = [...sections].sort().join() !== staff.class_teacher_of.map((s) => s.id).sort().join()

  const groups = PERMISSION_GROUP_ORDER.map((g) => [g, meta?.permissions.filter((p) => p.group === g) ?? []] as const)
  const toggle = (set: Set<string>, value: string, on: boolean) => {
    const next = new Set(set)
    if (on) next.add(value)
    else next.delete(value)
    return next
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="space-y-5">
        <Card
          title="Portal login"
          action={
            staff.login_active ? (
              <button onClick={() => void run(() => staffApi.loginOff(staff.id), 'Login turned off — they can’t sign in any more')} className="btn-outline border-rose-200 py-1.5 text-sm text-rose-600">
                Turn off login
              </button>
            ) : (
              staff.status === 'Active' && (
                <button onClick={() => setLogin({ email: staff.login_email ?? staff.email ?? '', username: staff.username ?? '', password: '' })} className="btn-primary py-1.5 text-sm">
                  <KeyRound className="size-4" /> {staff.has_login ? 'Turn login back on' : 'Give portal login'}
                </button>
              )
            )
          }
        >
          {staff.has_login ? (
            <Rows
              rows={[
                ['Status', <span key="s" className={staff.login_active ? 'text-emerald-700' : 'text-rose-600'}>{staff.login_active ? 'Can sign in' : 'Turned off'}</span>],
                ['Email', staff.login_email],
                ['Username', staff.username ? `@${staff.username}` : null],
                ['Last sign-in', staff.last_login_at ? new Date(staff.last_login_at).toLocaleString('en-IN') : 'Never'],
              ]}
            />
          ) : (
            <p className="text-sm text-muted">
              No login — {staff.full_name} is a record only (salary, documents, letters). Give a login if they should use SchoolBee (e.g. teachers taking
              attendance).
            </p>
          )}
          {staff.login_active && staff.can_reset_password && (
            <button onClick={() => setResetting(true)} className="btn-outline mt-3 py-1.5 text-sm">
              <KeyRound className="size-4" /> Reset password
            </button>
          )}
        </Card>

        <Card
          title="Class teacher of"
          action={
            <button onClick={() => void run(() => staffApi.setSections(staff.id, [...sections]), 'Class teacher assignment saved')} disabled={!sectionsChanged} className="btn-primary py-1.5 text-sm disabled:opacity-50">
              <Save className="size-4" /> Save
            </button>
          }
        >
          {!staff.has_login ? (
            <p className="text-sm text-muted">Give them a portal login first — a class teacher needs to sign in to take attendance.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">Each section has one class teacher; picking one here replaces its current teacher.</p>
              <div className="flex flex-wrap gap-2">
                {meta?.sections.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={sections.has(s.id)}
                    onClick={() => setSections((prev) => toggle(prev, s.id, !prev.has(s.id)))}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${sections.has(s.id) ? 'bg-brand text-white ring-brand' : 'ring-line hover:bg-slate-50'}`}
                  >
                    {s.label}
                  </button>
                ))}
                {meta && meta.sections.length === 0 && <p className="text-sm text-muted">Add classes and sections first.</p>}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card
        title="What they can do"
        action={
          <button onClick={() => void run(() => staffApi.setAccess(staff.id, [...perms]), 'Access saved — it applies from their next click')} disabled={!permsChanged} className="btn-primary py-1.5 text-sm disabled:opacity-50">
            <ShieldCheck className="size-4" /> Save access
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Start from a role:</span>
          {meta &&
            Object.entries(meta.presets).map(([role, list]) => (
              <button key={role} type="button" onClick={() => setPerms(new Set(list))} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold hover:bg-slate-200">
                {role}
              </button>
            ))}
        </div>
        <div className="space-y-4">
          {groups.map(([group, items]) =>
            items.length ? (
              <fieldset key={group}>
                <legend className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">{group}</legend>
                {items.map((p) => (
                  <label key={p.key} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                    <input type="checkbox" className="size-4 accent-brand" checked={perms.has(p.key)} onChange={(e) => setPerms((prev) => toggle(prev, p.key, e.target.checked))} aria-label={p.label} />
                    <span className="text-sm">{p.label}</span>
                  </label>
                ))}
              </fieldset>
            ) : null,
          )}
        </div>
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted ring-1 ring-line">
          Always yours only: staff, salaries and payroll, access rights, and choosing class teachers.
        </p>
      </Card>

      {login && (
        <Dialog
          title={staff.has_login ? 'Turn login back on' : `Give ${staff.full_name} a login`}
          subtitle="Share the email/username and first password with them. An email that already has an account keeps its own password."
          submitLabel="Turn on login"
          submitDisabled={!login.email.includes('@') || (!staff.has_login && login.password.length < 8)}
          onClose={() => setLogin(null)}
          onSubmit={async () =>
            run(
              () => staffApi.loginOn(staff.id, { email: login.email.trim(), username: login.username.trim() || null, password: login.password || 'unchanged-password' }),
              'Login turned on',
              true,
            )
          }
        >
          <label className="block text-sm font-bold text-ink">
            Email
            <input value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} type="email" aria-label="Login email" className={inputCls} />
          </label>
          <label className="block text-sm font-bold text-ink">
            Username <span className="font-normal text-muted">(optional — for signing in without email)</span>
            <input value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '') })} aria-label="Login username" className={inputCls} />
          </label>
          {!staff.has_login && (
            <label className="block text-sm font-bold text-ink">
              First password <span className="font-normal text-muted">(8+ characters)</span>
              <input value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} aria-label="First password" className={inputCls} />
            </label>
          )}
        </Dialog>
      )}
      {resetting && (
        <PasswordDialog
          name={staff.full_name}
          shared={staff.shared_account}
          onClose={() => setResetting(false)}
          onSave={(pw) => run(() => staffApi.resetPassword(staff.id, pw), `Password changed — share the new password with ${staff.full_name}`, true)}
        />
      )}
    </div>
  )
}

function PasswordDialog({ name, shared, onClose, onSave }: { name: string; shared: boolean; onClose: () => void; onSave: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState('')
  return (
    <Dialog
      title={`Reset ${name}’s password`}
      subtitle="For when they’ve forgotten it. Set a new one and share it with them — they can change it later from My Profile."
      submitLabel="Set password"
      submitDisabled={pw.length < 8}
      onClose={onClose}
      onSubmit={() => onSave(pw)}
    >
      <input autoFocus value={pw} onChange={(e) => setPw(e.target.value)} aria-label="New password" placeholder="8+ characters" className={inputCls} />
      {shared && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          This login is also used outside your school (e.g. PaperBee). The new password will apply there too.
        </p>
      )}
    </Dialog>
  )
}

function DocumentsTab({ staff, meta, run }: { staff: StaffDetail; meta: StaffMeta | null; run: Run }) {
  const input = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState('Aadhaar Card')
  const [busy, setBusy] = useState(false)
  const uploaded = new Set(staff.documents.map((d) => d.doc_type))
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[20rem_1fr]">
      <Card title="Checklist">
        <ul className="space-y-1.5 text-sm">
          {meta?.document_types
            .filter((t) => t !== 'Other')
            .map((t) => (
              <li key={t} className="flex items-center justify-between">
                <span>{t}</span>
                {uploaded.has(t) ? <CheckCircle2 className="size-4 text-emerald-500" aria-label="uploaded" /> : <span className="text-xs text-muted">missing</span>}
              </li>
            ))}
        </ul>
      </Card>
      <Card
        title="Documents"
        action={
          <div className="flex items-center gap-2">
            <select value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Document type" className={selectCls}>
              {meta?.document_types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button onClick={() => input.current?.click()} disabled={busy} className="btn-primary py-2 text-sm">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Upload
            </button>
            <input
              ref={input}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="hidden"
              aria-label="Staff document file"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                setBusy(true)
                await run(() => staffApi.uploadDoc(staff.id, docType, f), `${docType} uploaded`)
                setBusy(false)
              }}
            />
          </div>
        }
      >
        {staff.documents.length === 0 ? (
          <p className="text-sm text-muted">No documents yet. PDF, JPG or PNG up to 5 MB.</p>
        ) : (
          <ul className="divide-y divide-line">
            {staff.documents.map((d) => (
              <li key={d.id} aria-label={d.doc_type} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-3">
                  <FileText className="size-5 shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="block font-bold">{d.doc_type}</span>
                    <span className="block truncate text-xs text-muted">
                      {d.file_name} · {shortDate(d.uploaded_at.slice(0, 10))}
                    </span>
                  </span>
                </span>
                <span className="flex gap-1">
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noreferrer" className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label={`View ${d.doc_type}`}>
                      <Eye className="size-4" />
                    </a>
                  )}
                  {d.download_url && (
                    <a href={d.download_url} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label={`Download ${d.doc_type}`}>
                      <Download className="size-4" />
                    </a>
                  )}
                  <button onClick={() => void run(() => staffApi.deleteDoc(staff.id, d.id), `${d.doc_type} deleted`)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Delete ${d.doc_type}`}>
                    <Trash2 className="size-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

type Line = { name: string; amount: string }
const toLines = (xs: SalaryLine[] | undefined, mult: number): Line[] => (xs ?? []).map((x) => ({ name: x.name, amount: String(x.amount * mult) }))

function SalaryTab({ staff, run }: { staff: StaffDetail; run: Run }) {
  const s = staff.salary
  const [mode, setMode] = useState<'monthly' | 'annual'>(s?.entered_as ?? 'monthly')
  const mult = mode === 'annual' ? 12 : 1
  const [earnings, setEarnings] = useState<Line[]>(s ? toLines(s.earnings, mult) : [{ name: 'Basic', amount: '' }])
  const [deductions, setDeductions] = useState<Line[]>(s ? toLines(s.deductions, mult) : [])
  const [from, setFrom] = useState(s?.effective_from ?? '')
  const [busy, setBusy] = useState(false)

  const monthly = (v: string) => Math.round((Number(v) || 0) / mult)
  const gross = earnings.reduce((t, e) => t + monthly(e.amount), 0)
  const ded = deductions.reduce((t, d) => t + monthly(d.amount), 0)

  function switchMode(next: 'monthly' | 'annual') {
    if (next === mode) return
    const factor = next === 'annual' ? 12 : 1 / 12
    const conv = (xs: Line[]) => xs.map((x) => ({ ...x, amount: x.amount ? String(Math.round(Number(x.amount) * factor)) : '' }))
    setEarnings(conv)
    setDeductions(conv)
    setMode(next)
  }

  const editor = (label: string, lines: Line[], setLines: (l: Line[]) => void, presets: string[]) => (
    <div>
      <p className="mb-2 text-sm font-bold">{label}</p>
      <ul className="space-y-2">
        {lines.map((l, i) => (
          <li key={i} className="grid grid-cols-[1fr_9rem_auto] items-center gap-2" aria-label={`${label} ${l.name || i + 1}`}>
            <input value={l.name} maxLength={60} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label={`${label} name`} className={`${selectCls} w-full`} />
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">₹</span>
              <input
                inputMode="numeric"
                value={l.amount}
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/[^\d]/g, '') } : x)))}
                aria-label={`${label} amount`}
                className={`${selectCls} w-full pl-7 text-right`}
              />
            </div>
            <button onClick={() => setLines(lines.filter((_, j) => j !== i))} className="grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Remove ${l.name}`}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets
          .filter((p) => !lines.some((l) => l.name === p))
          .map((p) => (
            <button key={p} type="button" onClick={() => setLines([...lines, { name: p, amount: '' }])} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold hover:bg-slate-200">
              + {p}
            </button>
          ))}
        <button type="button" onClick={() => setLines([...lines, { name: '', amount: '' }])} className="rounded-full px-3 py-1 text-xs font-bold text-brand ring-1 ring-sky-200">
          + Other
        </button>
      </div>
    </div>
  )

  async function save() {
    setBusy(true)
    const clean = (xs: Line[]) => xs.filter((x) => x.name.trim() && Number(x.amount) > 0).map((x) => ({ name: x.name.trim(), amount: monthly(x.amount) }))
    await run(() => payrollApi.setSalary(staff.id, { entered_as: mode, earnings: clean(earnings), deductions: clean(deductions), effective_from: from || null }), 'Salary saved')
    setBusy(false)
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_22rem]">
      <Card title="Salary structure">
        <div className="mb-4 flex gap-2" role="group" aria-label="Salary entered as">
          {(
            [
              ['monthly', 'Monthly salary'],
              ['annual', 'Annual package'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={mode === k} onClick={() => switchMode(k)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${mode === k ? 'bg-sky-50 text-brand ring-brand' : 'ring-line hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="mb-4 text-xs text-muted">{mode === 'annual' ? 'Enter yearly amounts — each month is 1/12 of them.' : 'Enter the amounts paid every month.'}</p>
        <div className="grid gap-6 lg:grid-cols-2">
          {editor('Earnings', earnings, setEarnings, ['Basic', 'HRA', 'Conveyance', 'Special Allowance'])}
          {editor('Deductions', deductions, setDeductions, ['PF', 'Professional Tax', 'ESI'])}
        </div>
        <label className="mt-5 block max-w-xs text-sm font-bold">
          Effective from <span className="font-normal text-muted">(optional)</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Effective from" className={inputCls} />
        </label>
      </Card>
      <Card title="Per month">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Gross</dt>
            <dd className="font-semibold">{inr(gross)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Deductions</dt>
            <dd className="font-semibold">− {inr(ded)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-1.5 text-base font-extrabold">
            <dt>Net pay</dt>
            <dd aria-label="Net pay">{inr(gross - ded)}</dd>
          </div>
          <div className="flex justify-between text-xs text-muted">
            <dt>Annual (gross)</dt>
            <dd>{inr(gross * 12)}</dd>
          </div>
        </dl>
        <button onClick={() => void save()} disabled={busy || gross <= 0 || ded > gross} className="btn-primary mt-4 w-full justify-center disabled:opacity-50">
          {busy && <Loader2 className="size-4 animate-spin" />} Save salary
        </button>
        <p className="mt-2 text-xs text-muted">Used by payroll months you start from now on (and Draft months when refreshed).</p>
      </Card>
    </div>
  )
}

function LettersTab({ staff, run }: { staff: StaffDetail; run: Run }) {
  const [templates, setTemplates] = useState<CertTemplate[] | null>(null)
  const [templateId, setTemplateId] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [issueDate, setIssueDate] = useState(todayIso())
  const [preview, setPreview] = useState<{ html: string; serial_no: string; field_problems: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const template = templates?.find((t) => t.id === templateId) ?? null

  useEffect(() => {
    staffApi.letterTemplates().then(setTemplates, () => setTemplates([]))
  }, [])

  const key = JSON.stringify([templateId, values, issueDate])
  useEffect(() => {
    if (!templateId) return
    let live = true
    const t = setTimeout(() => {
      staffApi.previewLetter(staff.id, { template_id: templateId, values, issue_date: issueDate }).then((p) => live && setPreview(p), () => undefined)
    }, 400)
    return () => {
      live = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[26rem_1fr]">
      <div className="space-y-5">
        <Card title="Issue a letter">
          {templates && templates.length === 0 ? (
            <p className="text-sm text-muted">No letter templates are available yet.</p>
          ) : (
            <div className="space-y-3">
              <select value={templateId} onChange={(e) => (setTemplateId(e.target.value), setValues({}), setPreview(null))} aria-label="Letter" className={`${selectCls} w-full`}>
                <option value="">Choose a letter…</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {template?.description && <p className="text-xs text-muted">{template.description}</p>}
              {template && (
                <>
                  <label className="block text-sm font-bold">
                    Date
                    <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} aria-label="Letter date" className={inputCls} />
                  </label>
                  {template.fields.map((f) => (
                    <label key={f.key} className="block text-sm font-bold">
                      {f.label} {f.required ? <span className="text-rose-500">*</span> : <span className="font-normal text-muted">(optional)</span>}
                      {f.type === 'select' ? (
                        <select value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} aria-label={f.label} className={inputCls}>
                          <option value="">Choose…</option>
                          {f.options.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea rows={3} value={values[f.key] ?? ''} placeholder={f.placeholder ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} aria-label={f.label} className={`${inputCls} resize-none`} />
                      ) : (
                        <input
                          type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                          value={values[f.key] ?? ''}
                          placeholder={f.placeholder ?? ''}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          aria-label={f.label}
                          className={inputCls}
                        />
                      )}
                    </label>
                  ))}
                  {template.category === 'Experience' && staff.status === 'Active' && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">They haven’t been relieved — the letter will say “to the date of this letter”.</p>
                  )}
                  {preview?.field_problems.map((p) => (
                    <p key={p} className="text-sm font-semibold text-rose-600">
                      {p}
                    </p>
                  ))}
                  <button
                    onClick={async () => {
                      setBusy(true)
                      await run(() => staffApi.issueLetter(staff.id, { template_id: templateId, values, issue_date: issueDate }), `${template.name} issued`)
                      setBusy(false)
                      setTemplateId('')
                      setPreview(null)
                    }}
                    disabled={busy || !preview || preview.field_problems.length > 0}
                    className="btn-primary w-full justify-center disabled:opacity-50"
                  >
                    {busy && <Loader2 className="size-4 animate-spin" />} Issue {template.name}
                  </button>
                </>
              )}
            </div>
          )}
        </Card>
        <Card title="Issued letters">
          {staff.letters.length === 0 ? (
            <p className="text-sm text-muted">None yet.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {staff.letters.map((l) => (
                <li key={l.id} aria-label={l.serial_no} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    <span className="block font-bold">{l.template_name}</span>
                    <span className="text-xs text-muted">
                      {l.serial_no} · {shortDate(l.issue_date)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <StatusPill status={l.status} />
                    {l.download_url && (
                      <a href={l.download_url} className="grid size-8 place-items-center rounded-lg hover:bg-slate-100" aria-label={`Download ${l.serial_no}`}>
                        <Download className="size-4" />
                      </a>
                    )}
                    {l.status === 'Issued' && (
                      <button onClick={() => setCancelling(l.id)} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Cancel ${l.serial_no}`}>
                        <X className="size-4" />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Preview">
        {template && preview ? (
          <div className="rounded-xl bg-slate-100 p-4">
            <PagePreview html={preview.html} paper={template.paper} orientation={template.orientation} title="Letter preview" className="mx-auto w-full max-w-xl" />
            <p className="mt-2 text-center text-xs text-muted">Reference number when issued: {preview.serial_no}</p>
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-muted">Choose a letter to see it with {staff.full_name}’s details.</p>
        )}
      </Card>
      {cancelling && (
        <Dialog
          title="Cancel this letter?"
          subtitle="It stays on record but is no longer shown to the staff member. Its number isn’t reused."
          submitLabel="Cancel letter"
          danger
          onClose={() => setCancelling(null)}
          onSubmit={() => run(() => staffApi.cancelLetter(staff.id, cancelling), 'Letter cancelled', true)}
        />
      )}
    </div>
  )
}

function PayslipsTab({ staff, onError }: { staff: StaffDetail; onError: (m: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  return (
    <Card title="Payslips">
      {staff.payslips.length === 0 ? (
        <p className="text-sm text-muted">No payslips yet — they appear here once a payroll month includes {staff.full_name}.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {staff.payslips.map((p) => (
            <li key={p.id} aria-label={p.month} className="flex items-center justify-between gap-3 py-2.5">
              <span>
                <span className="block font-bold">{monthLabel(p.month)}</span>
                <span className="text-xs text-muted">{p.slip_no ?? 'Not approved yet'}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-bold">{inr(p.net)}</span>
                <StatusPill status={p.status} />
                <button
                  onClick={async () => {
                    setBusy(p.id)
                    try {
                      await payrollApi.slipPdf(p.id)
                    } catch (err) {
                      onError(errorMessage(err))
                    } finally {
                      setBusy(null)
                    }
                  }}
                  className="grid size-8 place-items-center rounded-lg hover:bg-slate-100"
                  aria-label={`Download slip ${p.month}`}
                >
                  {busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function RelieveDialog({ staff, onClose, onDone }: { staff: StaffDetail; onClose: () => void; onDone: (s: StaffDetail) => void }) {
  const [on, setOn] = useState(todayIso())
  const [reason, setReason] = useState('')
  return (
    <Dialog
      title={`Relieve ${staff.full_name}?`}
      subtitle="Their login is turned off and class-teacher duties cleared. Their record, documents, payslips and letters are kept, and you can issue an experience letter."
      submitLabel="Relieve"
      danger
      submitDisabled={!on}
      onClose={onClose}
      onSubmit={async () => onDone(await staffApi.relieve(staff.id, { relieving_date: on, reason: reason.trim() || null }))}
    >
      <label className="block text-sm font-bold">
        Last working day
        <input type="date" value={on} onChange={(e) => setOn(e.target.value)} aria-label="Relieving date" className={inputCls} />
      </label>
      <label className="block text-sm font-bold">
        Reason <span className="font-normal text-muted">(optional)</span>
        <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} aria-label="Relieving reason" placeholder="e.g. Relocating" className={inputCls} />
      </label>
    </Dialog>
  )
}
