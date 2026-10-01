import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, Landmark, Loader2, Phone, Save, UserRound, X } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { todayIso } from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { EMPTY_STAFF, staffApi, type StaffDetail, type StaffInput, type StaffType } from '../../lib/staff'

const TYPES: StaffType[] = ['Teacher', 'Shadow Teacher', 'Nanny / Helper', 'Office Admin', 'Accountant', 'Driver', 'Other']
const inputCls = `${selectCls} mt-1 w-full font-normal`

const toInput = (d: StaffDetail): StaffInput => Object.fromEntries(Object.keys(EMPTY_STAFF).map((k) => [k, d[k as keyof StaffInput] ?? null])) as unknown as StaffInput

/** Add a staff member, or edit one (/staff/:id/edit). Owner only. */
export function StaffFormPage() {
  const { id } = useParams()
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const [form, setForm] = useState<StaffInput | null>(id ? null : { ...EMPTY_STAFF, joining_date: todayIso() })
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    staffApi.get(id).then(
      (d) => (setForm(toInput(d)), setCode(d.employee_code)),
      (err) => setError(errorMessage(err)),
    )
  }, [id])

  if (!token) return <Navigate to="/login" replace />

  const set = (patch: Partial<StaffInput>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const text = (key: keyof StaffInput, label: string, props: Record<string, unknown> = {}) => (
    <label className="block text-sm font-bold text-ink">
      {label}
      <input
        value={(form?.[key] as string | number | null) ?? ''}
        onChange={(e) => set({ [key]: e.target.value === '' ? null : key === 'experience_years' ? Number(e.target.value) : e.target.value } as Partial<StaffInput>)}
        aria-label={label}
        className={inputCls}
        {...props}
      />
    </label>
  )

  async function save() {
    if (!form) return
    setBusy(true)
    setError(null)
    try {
      const out = id ? await staffApi.update(id, form) : await staffApi.create(form)
      navigate(`/staff/${out.id}${id ? '' : '?welcome=1'}`, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to={id ? `/staff/${id}` : '/staff'} className="inline-flex items-center gap-1 text-sm font-bold text-brand">
              <ArrowLeft className="size-4" /> {id ? 'Back to profile' : 'Staff'}
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{id ? `Edit ${form?.full_name ?? 'staff member'}` : 'Add staff member'}</h1>
            <p className="mt-0.5">{id ? `Employee ID ${code ?? ''}` : 'Only the name and role are required — the rest can be filled in later.'}</p>
          </div>
          <button onClick={() => void save()} disabled={busy || !form || form.full_name.trim().length < 2} className="btn-primary px-5 py-3 disabled:opacity-60">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />} {id ? 'Save changes' : 'Add staff member'}
          </button>
        </div>

        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}

        {!form ? (
          !error && <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <Section icon={UserRound} tone="bg-sky-100 text-brand" title="Personal details">
              <div className="sm:col-span-2">{text('full_name', 'Full name *', { maxLength: 255 })}</div>
              <label className="block text-sm font-bold text-ink">
                Gender
                <select value={form.gender ?? ''} onChange={(e) => set({ gender: (e.target.value || null) as StaffInput['gender'] })} aria-label="Gender" className={inputCls}>
                  <option value="">—</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </label>
              {text('date_of_birth', 'Date of birth', { type: 'date' })}
              {text('phone', 'Phone', { inputMode: 'tel', maxLength: 20 })}
              {text('email', 'Email', { type: 'email', maxLength: 255 })}
              <div className="sm:col-span-2">{text('address', 'Address', { maxLength: 500 })}</div>
              {text('city', 'City', { maxLength: 100 })}
              {text('state', 'State', { maxLength: 100 })}
              {text('pincode', 'PIN code', { inputMode: 'numeric', maxLength: 10 })}
            </Section>

            <Section icon={Briefcase} tone="bg-violet-100 text-violet-600" title="Job">
              <label className="block text-sm font-bold text-ink">
                Role *
                <select value={form.staff_type} onChange={(e) => set({ staff_type: e.target.value as StaffType })} aria-label="Role" className={inputCls}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              {text('designation', 'Designation', { maxLength: 100, placeholder: 'e.g. Class Teacher, Senior Teacher' })}
              {text('joining_date', 'Joining date', { type: 'date' })}
              {text('qualification', 'Qualification', { maxLength: 200, placeholder: 'e.g. B.A., D.El.Ed.' })}
              {text('experience_years', 'Experience (years)', { type: 'number', min: 0, max: 60 })}
              {text('previous_employer', 'Previous school / employer', { maxLength: 200 })}
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-ink">
                  Notes <span className="font-normal text-muted">(private, for you)</span>
                  <textarea rows={2} maxLength={1000} value={form.notes ?? ''} onChange={(e) => set({ notes: e.target.value || null })} aria-label="Notes" className={`${inputCls} resize-none`} />
                </label>
              </div>
            </Section>

            <Section icon={Phone} tone="bg-rose-100 text-rose-500" title="Emergency contact">
              {text('emergency_name', 'Name', { maxLength: 255 })}
              {text('emergency_relation', 'Relation', { maxLength: 50, placeholder: 'e.g. Spouse, Father' })}
              {text('emergency_phone', 'Phone', { inputMode: 'tel', maxLength: 20 })}
            </Section>

            <Section icon={Landmark} tone="bg-emerald-100 text-emerald-600" title="Bank & ID (for salary)">
              {text('bank_account_name', 'Account holder name', { maxLength: 255 })}
              {text('bank_name', 'Bank name', { maxLength: 100 })}
              {text('bank_account_no', 'Account number', { inputMode: 'numeric', maxLength: 34 })}
              {text('bank_ifsc', 'IFSC code', { maxLength: 11, placeholder: 'e.g. HDFC0001234', style: { textTransform: 'uppercase' } })}
              {text('pan', 'PAN', { maxLength: 10, placeholder: 'e.g. ABCDE1234F', style: { textTransform: 'uppercase' } })}
              {text('aadhaar_no', 'Aadhaar number', { inputMode: 'numeric', maxLength: 14 })}
            </Section>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function Section({ icon: Icon, tone, title, children }: { icon: typeof UserRound; tone: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label={title}>
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold">
        <span className={`grid size-9 place-items-center rounded-xl ${tone}`}>
          <Icon className="size-5" />
        </span>
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}
