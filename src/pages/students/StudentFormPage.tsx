import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Lightbulb,
  Loader2,
  Mail,
  Phone,
  Save,
  Upload,
  UserRound,
  X,
} from 'lucide-react'

import beeBook from '../../assets/bees/bee-book.webp'
import { AppShell } from '../../components/app/AppShell'
import { Field, FormError } from '../../components/auth/Field'
import { ImportDialog } from '../../components/students/ImportDialog'
import { Avatar, SelectField, TextAreaField } from '../../components/students/StudentUi'
import { errorMessage } from '../../lib/api'
import { PHONE_PATTERN } from '../../lib/auth'
import { useAccessToken } from '../../lib/auth-store'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { studentsApi, type Student, type StudentFields } from '../../lib/students'

const STEPS = [
  { title: 'Student Information', short: 'Student Information', hint: 'Let’s start with the child’s basic information.' },
  { title: 'Parent & Guardian Details', short: 'Parent & Guardian', hint: 'Who should the school contact?' },
  { title: 'Address Information', short: 'Address', hint: 'Home address, emergency contact and health notes.' },
  { title: 'Enrollment Details', short: 'Enrollment Details', hint: 'Academic year, class and section.' },
  { title: 'Documents (Optional)', short: 'Documents (optional)', hint: 'Birth certificate, Aadhaar, photos…' },
  { title: 'Review & Submit', short: 'Review', hint: 'Check everything before enrolling.' },
]

const TODAY = new Date().toISOString().slice(0, 10)
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

type Form = Record<keyof StudentFields, string>
const blank = (f: Partial<Form>, k: keyof StudentFields) => !(f[k] ?? '').trim()
const phoneOk = (v: string) => !v.trim() || new RegExp(`^${PHONE_PATTERN}$`).test(v.trim())
const emailOk = (v: string) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

function toForm(s: Student): Form {
  const out = {} as Form
  for (const [k, v] of Object.entries(s)) (out as Record<string, string>)[k] = v == null ? '' : String(v)
  return out
}

/** Per-step checks - the server re-validates everything on save. */
function validate(step: number, f: Form): Record<string, string> {
  const e: Record<string, string> = {}
  if (step === 0) {
    if (blank(f, 'first_name')) e.first_name = 'First name is required'
    if (blank(f, 'last_name')) e.last_name = 'Last name is required'
    if (blank(f, 'date_of_birth')) e.date_of_birth = 'Date of birth is required'
    else if (f.date_of_birth > TODAY) e.date_of_birth = 'Date of birth can’t be in the future'
    if (blank(f, 'gender')) e.gender = 'Choose a gender'
  }
  if (step === 1) {
    for (const who of ['father', 'mother', 'guardian'] as const) {
      if (!phoneOk(f[`${who}_phone`] ?? '')) e[`${who}_phone`] = 'Enter a valid mobile number'
      if (!emailOk(f[`${who}_email`] ?? '')) e[`${who}_email`] = 'Enter a valid email'
    }
    const hasContact = (['father', 'mother', 'guardian'] as const).some((w) => !blank(f, `${w}_name`) && !blank(f, `${w}_phone`))
    if (!hasContact) e._contact = 'Add at least one parent or guardian with a name and mobile number'
  }
  if (step === 2) {
    if (!phoneOk(f.emergency_phone ?? '')) e.emergency_phone = 'Enter a valid mobile number'
    if (!blank(f, 'pincode') && !/^\d{6}$/.test(f.pincode.trim())) e.pincode = 'PIN code must be 6 digits'
  }
  if (step === 3 && blank(f, 'class_id')) e.class_id = 'Choose a class'
  return e
}

function payload(f: Form): Partial<StudentFields> {
  const out: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(f)) {
    if (k in EDITABLE) out[k] = v.trim() ? v.trim() : null
  }
  return out as Partial<StudentFields>
}
// Keys the form may send (everything in StudentFields).
const EDITABLE: Record<keyof StudentFields, true> = Object.fromEntries(
  (
    'first_name middle_name last_name date_of_birth gender blood_group nationality religion caste father_name father_phone father_email mother_name mother_phone mother_email guardian_name guardian_relation guardian_phone guardian_email address city state pincode emergency_name emergency_relation emergency_phone allergies medical_conditions notes academic_year_id class_id section_id admission_date admission_no'.split(
      ' ',
    ) as (keyof StudentFields)[]
  ).map((k) => [k, true]),
) as Record<keyof StudentFields, true>

export function StudentFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = useAccessToken()
  const options = useSchoolOptions()

  const [student, setStudent] = useState<Student | null>(null)
  // "Add Student" from a class/section roster pre-selects it.
  const [form, setForm] = useState<Form>(
    () => ({ nationality: 'Indian', class_id: params.get('class_id') ?? '', section_id: params.get('section_id') ?? '' }) as Form,
  )
  const [loading, setLoading] = useState(Boolean(id))
  const [step, setStep] = useState(() => Math.min(5, Math.max(0, Number(params.get('step') ?? 0))))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [showImport, setShowImport] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const photoPreview = usePreview(photo)

  const editing = Boolean(id)
  const isDraft = !student || student.status === 'Draft'

  useEffect(() => {
    if (!id || !token) return
    studentsApi
      .get(id)
      .then((s) => {
        setStudent(s)
        setForm(toForm(s))
      })
      .catch((err) => setServerError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [id, token])

  if (!token) return <Navigate to="/login" replace />

  const set = (k: keyof StudentFields) => (e: { target: { value: string } }) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [k]: value, ...(k === 'class_id' ? { section_id: '' } : {}) }))
    setErrors((er) => {
      const rest = { ...er }
      delete rest[k]
      delete rest._contact
      return rest
    })
  }

  function goTo(target: number) {
    // Moving forward validates the steps in between; back is always free.
    for (let s = step; s < target; s++) {
      const e = validate(s, form)
      if (Object.keys(e).length) {
        setStep(s)
        setErrors(e)
        return
      }
    }
    setErrors({})
    setServerError(null)
    setStep(target)
  }

  async function save(mode: 'draft' | 'submit') {
    setServerError(null)
    setSavedNote(null)
    if (mode === 'draft' && blank(form, 'first_name')) {
      setStep(0)
      setErrors({ first_name: 'Add at least a first name to save a draft' })
      return
    }
    if (mode === 'submit') {
      for (let s = 0; s < 4; s++) {
        const e = validate(s, form)
        if (Object.keys(e).length) {
          setStep(s)
          setErrors(e)
          return
        }
      }
    }
    setSaving(mode)
    try {
      const body = { ...payload(form), ...(mode === 'draft' ? (isDraft ? { status: 'Draft' as const } : {}) : isDraft ? { status: 'Active' as const } : {}) }
      let saved = student ? await studentsApi.update(student.id, body) : await studentsApi.create(body)
      if (photo) saved = await studentsApi.uploadPhoto(saved.id, photo)
      setStudent(saved)
      setForm(toForm(saved))
      setPhoto(null)
      if (mode === 'submit') navigate(`/students/${saved.id}`, { replace: true, state: { justSaved: editing ? 'updated' : 'enrolled' } })
      else setSavedNote(`Draft saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
    } catch (err) {
      setServerError(errorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  const classOptions = options?.classes ?? []
  const sections = classOptions.find((c) => c.id === form.class_id)?.sections ?? []
  const name = [form.first_name, form.last_name].filter(Boolean).join(' ')
  const title = editing ? (isDraft ? 'Finish Enrollment' : `Edit ${student?.full_name ?? 'Student'}`) : 'Add New Student'

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="p-4 sm:p-6">
        <nav className="flex items-center gap-1.5 text-sm font-semibold" aria-label="Breadcrumb">
          <Link to="/students" className="text-muted hover:text-brand">
            Students
          </Link>
          <ChevronRight className="size-4 text-muted" />
          {student && editing && (
            <>
              <Link to={`/students/${student.id}`} className="text-muted hover:text-brand">
                {student.full_name}
              </Link>
              <ChevronRight className="size-4 text-muted" />
            </>
          )}
          <span className="text-ink">{editing ? 'Edit' : 'Add New Student'}</span>
        </nav>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="mt-0.5">Fill in the details below to {editing && !isDraft ? 'update this student' : 'enroll a new student in your preschool'}.</p>

        {loading ? (
          <div className="mt-6 h-96 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
              <Stepper step={step} onSelect={(s) => (s < step ? goTo(s) : goTo(s))} />

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (step < 5) goTo(step + 1)
                  else void save('submit')
                }}
                className="rounded-2xl bg-white shadow-card ring-1 ring-line/60"
                noValidate
              >
                <div className="space-y-5 p-5 sm:p-6">
                  <FormError message={serverError} />
                  {savedNote && (
                    <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      <Check className="size-4" /> {savedNote} — you can finish it later from the student list.
                    </p>
                  )}

                  {step === 0 && (
                    <>
                      <Section title="Student Information" subtitle="Enter the basic details of the student.">
                        <div className="grid gap-5 md:grid-cols-[170px_minmax(0,1fr)]">
                          <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                              <Avatar name={name || '?'} url={photoPreview ?? student?.photo_url} gender={form.gender} size="size-32 text-3xl" />
                              <button
                                type="button"
                                onClick={() => photoInput.current?.click()}
                                className="absolute right-1 bottom-1 grid size-9 place-items-center rounded-full bg-ink/70 text-white hover:bg-ink"
                                aria-label="Choose photo"
                              >
                                <Camera className="size-4" />
                              </button>
                            </div>
                            <button type="button" onClick={() => photoInput.current?.click()} className="btn-outline py-1.5 text-sm">
                              <Upload className="size-4" /> Upload Photo
                            </button>
                            <p className="text-xs text-muted">JPG / PNG • Max 5 MB</p>
                            {errors.photo && <p className="text-xs font-semibold text-rose-600">{errors.photo}</p>}
                            <input
                              ref={photoInput}
                              type="file"
                              accept="image/png,image/jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (!f) return
                                if (f.size > 5 * 1024 * 1024) setErrors((er) => ({ ...er, photo: 'Photo must be under 5 MB' }))
                                else {
                                  setPhoto(f)
                                  setErrors((er) => {
                                    const rest = { ...er }
                                    delete rest.photo
                                    return rest
                                  })
                                }
                              }}
                            />
                          </div>
                          <div className="grid content-start gap-4 sm:grid-cols-3">
                            <Plain label="First Name *" value={form.first_name} onChange={set('first_name')} error={errors.first_name} placeholder="e.g. Aarav" />
                            <Plain label="Middle Name" value={form.middle_name} onChange={set('middle_name')} placeholder="Enter middle name" />
                            <Plain label="Last Name *" value={form.last_name} onChange={set('last_name')} error={errors.last_name} placeholder="e.g. Patil" />
                            <Plain
                              label="Date of Birth *"
                              type="date"
                              max={TODAY}
                              value={form.date_of_birth}
                              onChange={set('date_of_birth')}
                              error={errors.date_of_birth}
                            />
                            <div>
                              <p className="mb-1 text-sm font-bold text-ink">Gender *</p>
                              <div className="flex gap-2" role="radiogroup" aria-label="Gender">
                                {(['Male', 'Female', 'Other'] as const).map((g) => (
                                  <button
                                    key={g}
                                    type="button"
                                    role="radio"
                                    aria-checked={form.gender === g}
                                    onClick={() => set('gender')({ target: { value: g } })}
                                    className={`flex-1 rounded-xl px-2 py-2.5 text-sm font-bold ring-1 transition ${
                                      form.gender === g ? 'bg-sky-50 text-brand ring-brand' : 'bg-white text-ink ring-line hover:ring-brand/40'
                                    }`}
                                  >
                                    {g}
                                  </button>
                                ))}
                              </div>
                              {errors.gender && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.gender}</p>}
                            </div>
                            <SelectField label="Blood Group" value={form.blood_group ?? ''} onChange={set('blood_group')}>
                              <option value="">Select</option>
                              {BLOOD_GROUPS.map((b) => (
                                <option key={b}>{b}</option>
                              ))}
                            </SelectField>
                          </div>
                        </div>
                      </Section>
                      <Section title="Additional Information" optional>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Plain label="Nationality" value={form.nationality} onChange={set('nationality')} placeholder="Indian" />
                          <SelectField label="Religion" value={form.religion ?? ''} onChange={set('religion')}>
                            <option value="">Select religion</option>
                            {RELIGIONS.map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </SelectField>
                          <Plain label="Caste (Optional)" value={form.caste} onChange={set('caste')} placeholder="Enter caste" />
                        </div>
                        <TextAreaField
                          label="Special Notes (Optional)"
                          placeholder="E.g. likes drawing, needs extra attention at nap time…"
                          value={form.notes ?? ''}
                          onChange={set('notes')}
                        />
                      </Section>
                    </>
                  )}

                  {step === 1 && (
                    <Section title="Parent & Guardian Details" subtitle="Add at least one parent or guardian with a mobile number.">
                      {errors._contact && <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">{errors._contact}</p>}
                      {(['father', 'mother'] as const).map((who) => (
                        <PersonBlock key={who} title={who === 'father' ? 'Father' : 'Mother'}>
                          <Field label="Full Name" icon={UserRound} value={form[`${who}_name`] ?? ''} onChange={set(`${who}_name`)} />
                          <Field label="Mobile Number" icon={Phone} type="tel" value={form[`${who}_phone`] ?? ''} onChange={set(`${who}_phone`)} error={errors[`${who}_phone`]} placeholder="98765 43210" />
                          <Field label="Email" icon={Mail} type="email" value={form[`${who}_email`] ?? ''} onChange={set(`${who}_email`)} error={errors[`${who}_email`]} />
                        </PersonBlock>
                      ))}
                      <PersonBlock title="Guardian (Optional)" extra={<Plain label="Relation" value={form.guardian_relation} onChange={set('guardian_relation')} placeholder="e.g. Uncle" />}>
                        <Field label="Full Name" icon={UserRound} value={form.guardian_name ?? ''} onChange={set('guardian_name')} />
                        <Field label="Mobile Number" icon={Phone} type="tel" value={form.guardian_phone ?? ''} onChange={set('guardian_phone')} error={errors.guardian_phone} />
                        <Field label="Email" icon={Mail} type="email" value={form.guardian_email ?? ''} onChange={set('guardian_email')} error={errors.guardian_email} />
                      </PersonBlock>
                    </Section>
                  )}

                  {step === 2 && (
                    <>
                      <Section title="Address Information" subtitle="Where does the child live?">
                        <TextAreaField label="Address" value={form.address ?? ''} onChange={set('address')} placeholder="House no., street, area" />
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Plain label="City" value={form.city} onChange={set('city')} placeholder="e.g. Pune" />
                          <SelectField label="State" value={form.state ?? ''} onChange={set('state')}>
                            <option value="">Select state</option>
                            {STATES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </SelectField>
                          <Plain label="PIN Code" inputMode="numeric" maxLength={6} value={form.pincode} onChange={set('pincode')} error={errors.pincode} placeholder="411038" />
                        </div>
                      </Section>
                      <Section title="Emergency Contact" subtitle="Someone we can reach if parents aren’t available.">
                        <div className="flex flex-wrap gap-2">
                          {(['father', 'mother', 'guardian'] as const)
                            .filter((w) => !blank(form, `${w}_name`))
                            .map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({
                                    ...f,
                                    emergency_name: f[`${w}_name`],
                                    emergency_phone: f[`${w}_phone`],
                                    emergency_relation: w === 'guardian' ? f.guardian_relation || 'Guardian' : w === 'father' ? 'Father' : 'Mother',
                                  }))
                                }
                                className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-brand ring-1 ring-sky-100 hover:bg-sky-100"
                              >
                                Same as {w}
                              </button>
                            ))}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Plain label="Contact Name" value={form.emergency_name} onChange={set('emergency_name')} />
                          <Plain label="Relationship" value={form.emergency_relation} onChange={set('emergency_relation')} placeholder="e.g. Uncle" />
                          <Plain label="Mobile Number" type="tel" value={form.emergency_phone} onChange={set('emergency_phone')} error={errors.emergency_phone} />
                        </div>
                      </Section>
                      <Section title="Health" optional>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <TextAreaField label="Allergies" value={form.allergies ?? ''} onChange={set('allergies')} placeholder="e.g. Peanuts" />
                          <TextAreaField label="Medical Conditions" value={form.medical_conditions ?? ''} onChange={set('medical_conditions')} placeholder="e.g. Asthma" />
                        </div>
                      </Section>
                    </>
                  )}

                  {step === 3 && (
                    <Section title="Enrollment Details" subtitle="Where will the child study?">
                      {classOptions.length === 0 && options && (
                        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm ring-1 ring-amber-200">
                          Your school has no classes yet. <Link to="/setup" className="font-bold text-brand">Add them in Settings</Link> first.
                        </p>
                      )}
                      <div className="grid gap-4 sm:grid-cols-3">
                        {/* Blank = the school's active year (the server fills it in). */}
                        <SelectField label="Academic Year" value={form.academic_year_id || options?.activeYear?.id || ''} onChange={set('academic_year_id')}>
                          <option value="">—</option>
                          {options?.years.map((y) => (
                            <option key={y.id} value={y.id}>
                              {y.name}
                              {y.is_active ? ' (active)' : ''}
                            </option>
                          ))}
                        </SelectField>
                        <SelectField label="Class *" value={form.class_id ?? ''} onChange={set('class_id')} error={errors.class_id}>
                          <option value="">Select class</option>
                          {classOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </SelectField>
                        <SelectField label="Section" value={form.section_id ?? ''} onChange={set('section_id')} disabled={!sections.length}>
                          <option value="">{sections.length ? 'Select section' : '—'}</option>
                          {sections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </SelectField>
                        <Plain label="Admission Date" type="date" value={form.admission_date} onChange={set('admission_date')} />
                        <Plain
                          label="Admission No."
                          value={form.admission_no}
                          onChange={set('admission_no')}
                          placeholder={student ? student.admission_no : 'Auto-generated'}
                        />
                      </div>
                      {!student && <p className="text-xs text-muted">Leave Admission No. blank and SchoolBee assigns the next one (e.g. ADM-{(options?.activeYear?.name ?? '').slice(0, 4) || TODAY.slice(0, 4)}-001). Admission date defaults to today.</p>}
                    </Section>
                  )}

                  {step === 4 && (
                    <Section title="Documents" optional subtitle="Birth certificate, Aadhaar, photos and medical records.">
                      <div className="flex items-start gap-4 rounded-2xl bg-sky-50 p-5 ring-1 ring-sky-100">
                        <FileText className="size-8 shrink-0 text-brand" />
                        <div>
                          <p className="font-bold text-ink">Document uploads are coming with the Documents module</p>
                          <p className="mt-1 text-sm">
                            You’ll be able to upload and verify each student’s documents from their profile. For now, continue to review and
                            enroll.
                          </p>
                        </div>
                      </div>
                    </Section>
                  )}

                  {step === 5 && <Review form={form} options={options} photo={photoPreview ?? student?.photo_url ?? null} onEdit={(s) => goTo(s)} />}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => navigate(student ? `/students/${student.id}` : '/students')} className="btn-outline border-line text-ink">
                      <X className="size-4" /> Cancel
                    </button>
                    {step > 0 && (
                      <button type="button" onClick={() => goTo(step - 1)} className="btn-outline border-line text-ink">
                        <ArrowLeft className="size-4" /> Back
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isDraft && (
                      <button type="button" disabled={Boolean(saving)} onClick={() => void save('draft')} className="btn-outline">
                        {saving === 'draft' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Draft
                      </button>
                    )}
                    {editing && !isDraft && step < 5 && (
                      <button type="button" disabled={Boolean(saving)} onClick={() => void save('submit')} className="btn-outline">
                        {saving === 'submit' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Changes
                      </button>
                    )}
                    <button type="submit" disabled={Boolean(saving)} className="btn-primary px-6">
                      {saving === 'submit' && step === 5 ? <Loader2 className="size-4 animate-spin" /> : null}
                      {step < 5 ? 'Continue' : isDraft ? 'Enroll Student' : 'Save Changes'}
                      {step < 5 && <ArrowRight className="size-4" />}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right rail */}
            <aside className="space-y-5">
              <div className="relative overflow-hidden rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
                <img src={beeBook} alt="" className="absolute -right-2 -bottom-2 w-24 opacity-90" />
                <p className="text-sm font-extrabold text-amber-700">
                  Step {step + 1} of {STEPS.length}
                </p>
                <p className="mt-1 text-lg font-extrabold text-ink">{STEPS[step].title}</p>
                <p className="mt-1 max-w-[70%] text-sm">{STEPS[step].hint}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60">
                <h2 className="text-lg font-bold">Enrollment Progress</h2>
                <ol className="mt-3">
                  {STEPS.map((s, i) => (
                    <li key={s.title} className="relative flex items-center gap-3 pb-4 last:pb-0">
                      {i < STEPS.length - 1 && <span className="absolute top-8 left-[15px] h-[calc(100%-1.75rem)] w-0.5 bg-line" />}
                      <span
                        className={`z-10 grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                          i === step ? 'bg-brand text-white' : i < step ? 'bg-leaf text-white' : 'bg-slate-100 text-muted'
                        }`}
                      >
                        {i < step ? <Check className="size-4" /> : i + 1}
                      </span>
                      <button type="button" onClick={() => goTo(i)} className={`text-left text-sm ${i === step ? 'font-bold text-ink' : 'text-muted hover:text-ink'}`}>
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                <Lightbulb className="size-6 shrink-0 fill-honey text-amber-500" />
                <div>
                  <p className="font-bold text-ink">Tip</p>
                  <p className="text-sm">You can save the enrollment as a draft and complete it later.</p>
                </div>
              </div>
              {!editing && (
                <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
                  <p className="flex items-center gap-2 font-bold text-ink">
                    <FileSpreadsheet className="size-5 text-emerald-600" /> Adding many students?
                  </p>
                  <p className="mt-1 text-sm">Download our Excel template, fill it in, and import everyone at once.</p>
                  <button type="button" onClick={() => setShowImport(true)} className="btn-outline mt-3 w-full py-2 text-sm">
                    <Upload className="size-4" /> Bulk Import from Excel
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
      {showImport && <ImportDialog onClose={() => setShowImport(false)} onImported={() => navigate('/students')} />}
    </AppShell>
  )
}

// ------------------------------------------------------------ small parts

function Stepper({ step, onSelect }: { step: number; onSelect: (s: number) => void }) {
  return (
    <ol className="flex overflow-x-auto rounded-2xl bg-white px-3 py-4 shadow-card ring-1 ring-line/60">
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex min-w-24 flex-1 items-start">
          <button type="button" onClick={() => onSelect(i)} className="flex w-full flex-col items-center gap-1.5 text-center">
            <span
              className={`grid size-9 place-items-center rounded-full text-sm font-extrabold ${
                i === step ? 'bg-brand text-white shadow-[0_6px_16px_-6px_rgb(23_102_232/0.8)]' : i < step ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-muted'
              }`}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={`text-xs leading-tight ${i === step ? 'font-bold text-ink' : 'text-muted'}`}>{s.short}</span>
          </button>
          {i < STEPS.length - 1 && <span className={`mt-[18px] hidden h-0.5 w-full min-w-4 sm:block ${i < step ? 'bg-brand' : 'bg-line'}`} />}
        </li>
      ))}
    </ol>
  )
}

function Section({ title, subtitle, optional, children }: { title: string; subtitle?: string; optional?: boolean; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold">
          {title} {optional && <span className="text-sm font-semibold text-muted">(Optional)</span>}
        </h2>
        {subtitle && <p className="text-sm">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function PersonBlock({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50/70 p-4 ring-1 ring-line">
      <p className="mb-3 font-bold text-ink">{title}</p>
      <div className="grid gap-4 sm:grid-cols-3">{children}</div>
      {extra && <div className="mt-4 grid gap-4 sm:grid-cols-3">{extra}</div>}
    </div>
  )
}

/** Input without an icon, same look as Field. */
function Plain({ label, error, value, ...input }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; value: string | undefined }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-ink">
        {label}
        <input
          aria-invalid={Boolean(error)}
          value={value ?? ''}
          className={`mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 font-normal text-ink outline-none placeholder:text-muted/80 focus:border-brand focus:ring-4 focus:ring-brand/10 ${error ? 'border-rose-400' : 'border-line'}`}
          {...input}
        />
      </label>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  )
}

function Review({
  form,
  options,
  photo,
  onEdit,
}: {
  form: Form
  options: ReturnType<typeof useSchoolOptions>
  photo: string | null
  onEdit: (step: number) => void
}) {
  const cls = options?.classes.find((c) => c.id === form.class_id)
  const section = cls?.sections.find((s) => s.id === form.section_id)
  const year = options?.years.find((y) => y.id === form.academic_year_id) ?? options?.activeYear
  const name = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')
  const person = (who: 'father' | 'mother' | 'guardian') =>
    form[`${who}_name`] ? `${form[`${who}_name`]}${form[`${who}_phone`] ? ` · ${form[`${who}_phone`]}` : ''}` : ''
  const groups: { title: string; step: number; rows: [string, string | undefined][] }[] = [
    { title: 'Student', step: 0, rows: [['Name', name], ['Date of Birth', form.date_of_birth], ['Gender', form.gender], ['Blood Group', form.blood_group], ['Religion', form.religion]] },
    { title: 'Parents & Guardian', step: 1, rows: [['Father', person('father')], ['Mother', person('mother')], ['Guardian', person('guardian')]] },
    { title: 'Address & Emergency', step: 2, rows: [['Address', [form.address, form.city, form.state, form.pincode].filter(Boolean).join(', ')], ['Emergency', form.emergency_name ? `${form.emergency_name} (${form.emergency_relation || '—'}) · ${form.emergency_phone || ''}` : ''], ['Allergies', form.allergies]] },
    { title: 'Enrollment', step: 3, rows: [['Academic Year', year?.name], ['Class', cls?.name], ['Section', section?.name], ['Admission No.', form.admission_no || 'Auto-generated']] },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar name={name || '?'} url={photo} gender={form.gender} size="size-16 text-xl" />
        <div>
          <h2 className="text-xl font-extrabold">{name}</h2>
          <p className="text-sm">Please check the details below.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title} className="rounded-xl p-4 ring-1 ring-line">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold text-ink">{g.title}</p>
              <button type="button" onClick={() => onEdit(g.step)} className="text-sm font-bold text-brand hover:underline">
                Edit
              </button>
            </div>
            <dl className="space-y-1 text-sm">
              {g.rows.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold break-words text-ink">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Object URL for a picked file, revoked when the file changes. */
function usePreview(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])
  return url
}

