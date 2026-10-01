import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Mail, Phone, School, UserRound } from 'lucide-react'

import { AuthLayout } from '../components/auth/AuthLayout'
import { Field, FormError, PasswordField } from '../components/auth/Field'
import { GoogleButton, OrDivider } from '../components/auth/GoogleButton'
import { errorMessage } from '../lib/api'
import { PHONE_PATTERN, signup, type SignupInput } from '../lib/auth'
import { useAccessToken } from '../lib/auth-store'
import { LOGIN_URL } from '../config'

const empty: SignupInput = { full_name: '', school_name: '', email: '', phone: '', password: '' }

export function SignupPage() {
  const navigate = useNavigate()
  const token = useAccessToken()
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (token && !busy) return <Navigate to="/dashboard" replace />

  const set = (key: keyof SignupInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signup({
        ...form,
        full_name: form.full_name.trim(),
        school_name: form.school_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      })
      navigate('/choose-plan', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-extrabold">Create Your School</h1>
        <p className="mt-1">Start free — set up your preschool in minutes.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <FormError message={error} />
        <Field
          label="Your Name"
          icon={UserRound}
          autoComplete="name"
          placeholder="e.g. Priya Sharma"
          value={form.full_name}
          onChange={set('full_name')}
          minLength={2}
          required
        />
        <Field
          label="School Name"
          icon={School}
          autoComplete="organization"
          placeholder="e.g. Sunshine Preschool"
          value={form.school_name}
          onChange={set('school_name')}
          minLength={2}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="you@school.in"
            value={form.email}
            onChange={set('email')}
            required
          />
          <Field
            label="Phone Number"
            icon={Phone}
            type="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            pattern={PHONE_PATTERN}
            title="Digits, with optional +, spaces or dashes"
            value={form.phone}
            onChange={set('phone')}
            required
          />
        </div>
        <PasswordField
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={set('password')}
          minLength={8}
          required
        />

        <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 text-base disabled:opacity-70">
          {busy ? 'Creating your school…' : 'Create My School'} {!busy && <ArrowRight className="size-5" />}
        </button>
        <p className="text-center text-xs text-muted">Free for up to 50 students. No credit card needed.</p>
      </form>

      <OrDivider />
      <GoogleButton label="Sign up with Google" />

      <p className="mt-7 text-center text-sm">
        Already have an account?{' '}
        <Link to={LOGIN_URL} className="font-bold text-brand">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
