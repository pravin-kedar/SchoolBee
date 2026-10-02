import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, HeartHandshake, Mail } from 'lucide-react'

import { AuthLayout } from '../components/auth/AuthLayout'
import { Field, FormError, PasswordField } from '../components/auth/Field'
import { GoogleButton, OrDivider } from '../components/auth/GoogleButton'
import { BLOCKED_KEY, errorMessage } from '../lib/api'
import { login } from '../lib/auth'
import { useAccessToken } from '../lib/auth-store'
import { SIGNUP_URL, SUPPORT_EMAIL } from '../config'

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = useAccessToken()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    if (params.get('error') === 'google_auth_failed') return 'Google sign-in didn’t work. Please try again.'
    if (params.get('zap') === 'expired') return 'Your admin session ended. Please log in again.'
    try {
      return sessionStorage.getItem(BLOCKED_KEY) // set when a blocked session was ended
    } catch {
      return null
    }
  })
  const [showReset, setShowReset] = useState(false)

  if (token && !busy) return <Navigate to="/start" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Kept until now on purpose: a block ends the session with a client-side
      // redirect AND a full reload, and both render this page.
      sessionStorage.removeItem(BLOCKED_KEY)
    } catch {
      /* ignore */
    }
    try {
      const where = await login(email.trim(), password, remember)
      navigate(where === 'zap' ? '/zap' : '/start', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-extrabold">Welcome Back!</h1>
        <p className="mt-1">Login to manage your preschool easily.</p>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <FormError message={error} />
        <Field
          label="Email or Username"
          icon={Mail}
          autoComplete="username"
          placeholder="Enter your email or username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PasswordField
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 accent-brand"
            />
            Remember me
          </label>
          <button type="button" onClick={() => setShowReset((s) => !s)} className="font-bold text-brand underline">
            Forgot password?
          </button>
        </div>
        {/* TODO: self-serve reset needs a SchoolBee-branded email first. */}
        {showReset && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
            Password reset is coming soon. Until then, email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-brand">
              {SUPPORT_EMAIL}
            </a>{' '}
            from your registered address and we’ll help you get back in.
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 text-base disabled:opacity-70">
          {busy ? 'Logging in…' : 'Login'} {!busy && <ArrowRight className="size-5" />}
        </button>
      </form>

      <OrDivider />
      <GoogleButton />

      <p className="mt-7 text-center text-sm">
        Don’t have an account?{' '}
        <Link to={SIGNUP_URL} className="font-bold text-brand">
          Sign up
        </Link>
      </p>
      <Link
        to="/parent/login"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
      >
        <HeartHandshake className="size-4" /> Parent login — see your child’s progress
      </Link>
    </AuthLayout>
  )
}
