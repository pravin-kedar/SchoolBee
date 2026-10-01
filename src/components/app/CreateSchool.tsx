import { useState, type FormEvent } from 'react'
import { ArrowRight, Phone, School } from 'lucide-react'

import { AuthLayout } from '../auth/AuthLayout'
import { Field, FormError } from '../auth/Field'
import { errorMessage } from '../../lib/api'
import { PHONE_PATTERN, createSchool } from '../../lib/auth'

/** For an account with no school yet (Google sign-in, or a PaperBee login). */
export function CreateSchool({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [schoolName, setSchoolName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // New tokens trigger useMe to reload, which swaps this form out.
      await createSchool(schoolName.trim(), phone.trim())
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-extrabold">Welcome, {name.split(' ')[0]}!</h1>
        <p className="mt-1">One last thing — what’s your school called?</p>
      </div>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <FormError message={error} />
        <Field
          label="School Name"
          icon={School}
          placeholder="e.g. Sunshine Preschool"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          minLength={2}
          required
        />
        <Field
          label="Phone Number (optional)"
          icon={Phone}
          type="tel"
          placeholder="+91 98765 43210"
          pattern={PHONE_PATTERN}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 text-base disabled:opacity-70">
          {busy ? 'Creating…' : 'Create My School'} {!busy && <ArrowRight className="size-5" />}
        </button>
      </form>
      <button onClick={onLogout} className="mx-auto mt-6 block text-sm font-bold text-muted hover:text-ink">
        Log out
      </button>
    </AuthLayout>
  )
}
