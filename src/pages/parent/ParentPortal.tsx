import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, ChevronRight, Download, FileText, KeyRound, Loader2, LogOut, Phone, School } from 'lucide-react'

import logo from '../../assets/logo-full.webp'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { Field, FormError, PasswordField } from '../../components/auth/Field'
import { GoogleButton, OrDivider } from '../../components/auth/GoogleButton'
import { AiInsights } from '../../components/progress/AiInsights'
import { StarDisplay } from '../../components/progress/Stars'
import { ProgressSummary } from '../../components/students/StudentProgressTab'
import { Avatar } from '../../components/students/StudentUi'
import { errorMessage } from '../../lib/api'
import { shortDate } from '../../lib/license'
import {
  PARENT_GOOGLE_URL,
  parentApi,
  parentClaims,
  setParentToken,
  useParentToken,
  type ChildOverview,
  type ParentChild,
  type ParentReport,
} from '../../lib/parent'

// ------------------------------------------------------------------ sign in

export function ParentLoginPage() {
  const token = useParentToken()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  if (token && !busy) return <Navigate to={parentClaims(token)?.mustChange ? '/parent/password' : '/parent'} replace />
  const error = params.get('error')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFormError(null)
    try {
      const r = await parentApi.login(phone.trim(), password)
      setParentToken(r.access_token)
      navigate(r.must_change_password ? '/parent/password' : '/parent', { replace: true })
    } catch (err) {
      setFormError(errorMessage(err))
      setBusy(false)
    }
  }
  return (
    <AuthLayout>
      <div className="mt-6 text-center">
        <h1 className="text-3xl font-extrabold">Parent login</h1>
        <p className="mt-1">See how your child is doing at school — progress, reports and upcoming events.</p>
      </div>
      {error === 'not_registered' ? (
        <p role="alert" className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
          We couldn&rsquo;t find <b>{params.get('email')}</b> on any child&rsquo;s school record. Please sign in with the email you gave the school, or ask the
          school to add this email as the father&rsquo;s, mother&rsquo;s or guardian&rsquo;s email.
        </p>
      ) : (
        error && (
          <p role="alert" className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            Google sign-in didn&rsquo;t complete. Please try again.
          </p>
        )
      )}
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <FormError message={formError} />
        <Field
          label="Mobile number"
          icon={Phone}
          type="tel"
          autoComplete="username"
          inputMode="tel"
          placeholder="The number the school has for you"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <PasswordField label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <p className="text-xs text-muted">First time? Use the password your school gave you — you&rsquo;ll set your own right after.</p>
        <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 text-base disabled:opacity-70">
          {busy ? 'Signing in…' : 'Sign in'} {!busy && <ArrowRight className="size-5" />}
        </button>
      </form>
      <OrDivider />
      <GoogleButton href={PARENT_GOOGLE_URL} label="Continue with Google" />
      <p className="mt-3 text-center text-xs text-muted">Google works with the email the school has for you (father, mother or guardian).</p>
      <p className="mt-7 text-center text-sm">
        School staff?{' '}
        <Link to="/login" className="font-bold text-brand">
          Staff login
        </Link>
      </p>
    </AuthLayout>
  )
}

export function ParentCompletePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const code = params.get('code')
    if (!code) {
      navigate('/parent/login?error=google_auth_failed', { replace: true })
      return
    }
    parentApi.exchange(code).then(
      (r) => {
        setParentToken(r.access_token)
        navigate('/parent', { replace: true })
      },
      (err) => setError(errorMessage(err)),
    )
  }, [params, navigate])
  return (
    <div className="grid min-h-dvh place-items-center bg-cream p-4 text-center font-semibold text-ink">
      {error ? (
        <p>
          {error}{' '}
          <Link to="/parent/login" className="text-brand">
            Try again
          </Link>
        </p>
      ) : (
        'Signing you in…'
      )}
    </div>
  )
}

export function ParentPasswordPage() {
  const token = useParentToken()
  const navigate = useNavigate()
  const claims = parentClaims(token)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!token || !claims) return <Navigate to="/parent/login" replace />
  if (claims.method !== 'phone') return <Navigate to="/parent" replace />
  const forced = claims.mustChange

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (next !== again) {
      setError('The two new passwords don’t match')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const r = await parentApi.changePassword(next, forced ? null : current)
      setParentToken(r.access_token)
      navigate('/parent', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }
  return (
    <AuthLayout>
      <div className="mt-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <KeyRound className="size-6" />
        </span>
        <h1 className="mt-3 text-3xl font-extrabold">{forced ? 'Set your own password' : 'Change password'}</h1>
        <p className="mt-1">
          {forced
            ? 'You signed in with the school’s default password. Choose your own to continue — only you will know it.'
            : 'Choose a new password for the parent portal.'}
        </p>
      </div>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <FormError message={error} />
        {!forced && (
          <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        )}
        <PasswordField label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} />
        <PasswordField label="New password again" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={6} />
        <p className="text-xs text-muted">At least 6 characters.</p>
        <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 text-base disabled:opacity-70">
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
      {!forced && (
        <p className="mt-6 text-center text-sm">
          <Link to="/parent" className="font-bold text-brand">
            Back
          </Link>
        </p>
      )}
    </AuthLayout>
  )
}

// ------------------------------------------------------------------ shell

function ParentShell({ children, kids, current }: { children: ReactNode; kids?: ParentChild[]; current?: string }) {
  const navigate = useNavigate()
  const byPhone = parentClaims(useParentToken())?.method === 'phone'
  return (
    <div className="min-h-dvh bg-[#f6f9ff]">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/parent" className="flex items-center gap-2">
            <img src={logo} alt="SchoolBee" className="h-12" />
            <span className="hidden text-sm font-bold text-muted sm:inline">Parent</span>
          </Link>
          <span className="flex items-center gap-2">
            {kids && kids.length > 1 && (
              <select
                value={current}
                onChange={(e) => navigate(`/parent/child/${e.target.value}`)}
                aria-label="Child"
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold"
              >
                {kids.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.first_name}
                  </option>
                ))}
              </select>
            )}
            {byPhone && (
              <Link
                to="/parent/password"
                className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-slate-100 hover:text-ink sm:inline-flex"
              >
                <KeyRound className="size-4" /> Change password
              </Link>
            )}
            <button
              onClick={() => {
                setParentToken(null)
                navigate('/parent/login', { replace: true })
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-slate-100 hover:text-ink"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">{children}</main>
    </div>
  )
}

function useKids() {
  const [kids, setKids] = useState<ParentChild[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    parentApi.me().then(
      (r) => setKids(r.children),
      (err) => setError(errorMessage(err)),
    )
  }, [])
  return { kids, error }
}

// ------------------------------------------------------------------ pick a child

export function ParentHomePage() {
  const token = useParentToken()
  const { kids, error } = useKids()
  if (!token) return <Navigate to="/parent/login" replace />
  if (parentClaims(token)?.mustChange) return <Navigate to="/parent/password" replace />
  const usable = kids?.filter((k) => k.available) ?? []
  if (kids && kids.length === 1 && usable.length === 1) return <Navigate to={`/parent/child/${usable[0].id}`} replace />
  return (
    <ParentShell>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Choose your child</h1>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
      {!kids && !error && <div className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />}
      {kids && kids.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-line/60">
          No children are linked to this email any more. Please contact the school.
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Children">
        {kids?.map((k) => (
          <li key={k.id}>
            {k.available ? (
              <Link
                to={`/parent/child/${k.id}`}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60 transition hover:ring-brand/40"
                aria-label={k.name}
              >
                <Avatar name={k.name} url={k.photo_url} gender={k.gender} size="size-14" />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold">{k.name}</span>
                  <span className="block text-sm text-muted">
                    {[k.class_name && `${k.class_name}${k.section_name ? ` – ${k.section_name}` : ''}`, k.school_name].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <ChevronRight className="size-5 text-muted" />
              </Link>
            ) : (
              <div className="flex items-center gap-4 rounded-2xl bg-white p-5 opacity-80 shadow-card ring-1 ring-line/60" aria-label={k.name}>
                <Avatar name={k.name} url={k.photo_url} gender={k.gender} size="size-14" />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold">{k.name}</span>
                  <span className="block text-sm text-amber-800">{k.unavailable_reason}</span>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </ParentShell>
  )
}

// ------------------------------------------------------------------ one child

const RANGES = [
  [30, 'Last 30 days'],
  [90, 'Last 3 months'],
  [365, 'This year'],
] as const

export function ParentChildPage() {
  const token = useParentToken()
  const { id = '' } = useParams()
  const { kids } = useKids()
  const [days, setDays] = useState(30)
  const [o, setO] = useState<ChildOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let live = true
    parentApi.child(id, days).then(
      (d) => live && (setO(d), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [token, id, days])

  if (!token) return <Navigate to="/parent/login" replace />
  if (parentClaims(token)?.mustChange) return <Navigate to="/parent/password" replace />
  return (
    <ParentShell kids={kids ?? undefined} current={id}>
      {error && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">{error}</p>}
      {!o ? (
        !error && <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
      ) : (
        <>
          <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-r from-white via-amber-50 to-emerald-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
            <Avatar name={o.child.name} url={o.child.photo_url} gender={o.child.gender} size="size-16" />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold sm:text-3xl">{o.child.name}</h1>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <School className="size-4 text-brand" /> {o.school.name}
                </span>
                {o.child.class_name && (
                  <span>
                    {o.child.class_name}
                    {o.child.section_name ? ` – ${o.child.section_name}` : ''}
                  </span>
                )}
                {o.child.class_teacher && <span className="text-muted">Class teacher: {o.child.class_teacher}</span>}
              </p>
            </div>
          </section>

          {o.reports.length > 0 && (
            <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5" aria-label="Reports">
              <h2 className="flex items-center gap-2 font-bold">
                <FileText className="size-4 text-brand" /> Progress reports
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {o.reports.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <Link to={`/parent/child/${o.child.id}/report/${r.id}`} className="group min-w-0 flex-1" aria-label={`Open ${r.title}`}>
                      <span className="flex items-center gap-1 font-semibold group-hover:text-brand">
                        {r.title} <ChevronRight className="size-4 text-muted" />
                      </span>
                      {r.remarks && <span className="line-clamp-2 block text-sm text-muted italic">“{r.remarks}”</span>}
                    </Link>
                    <span className="flex items-center gap-3">
                      {r.overall != null && <StarDisplay value={r.overall} />}
                      <button
                        onClick={async () => {
                          setBusy(r.id)
                          try {
                            await parentApi.reportPdf(o.child.id, r.id)
                          } catch (err) {
                            setError(errorMessage(err))
                          } finally {
                            setBusy(null)
                          }
                        }}
                        className="btn-outline py-1.5 text-sm"
                        aria-label={`Download ${r.title}`}
                      >
                        {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ProgressSummary
            p={o.summary}
            extra={
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                aria-label="Period"
                className="rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
              >
                {RANGES.map(([d, label]) => (
                  <option key={d} value={d}>
                    {label}
                  </option>
                ))}
              </select>
            }
          />

          <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5" aria-label="Coming up">
            <h2 className="flex items-center gap-2 font-bold">
              <CalendarDays className="size-4 text-emerald-600" /> Coming up at school
            </h2>
            {o.events.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing on the school calendar for the next 30 days.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {o.events.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span>
                      <b>{e.title}</b> <span className="text-muted">· {e.event_type}</span>
                      {e.description && <span className="block text-muted">{e.description}</span>}
                    </span>
                    <span className="font-semibold">
                      {shortDate(e.start_date)}
                      {e.end_date !== e.start_date && ` – ${shortDate(e.end_date)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </ParentShell>
  )
}

export function ParentReportPage() {
  const token = useParentToken()
  const { id = '', rid = '' } = useParams()
  const { kids } = useKids()
  const [r, setR] = useState<ParentReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    parentApi.report(id, rid).then(setR, (err) => setError(errorMessage(err)))
  }, [token, id, rid])
  const loadAi = useCallback(() => parentApi.reportAi(id, rid), [id, rid])

  if (!token) return <Navigate to="/parent/login" replace />
  if (parentClaims(token)?.mustChange) return <Navigate to="/parent/password" replace />
  const firstName = r?.student.name?.split(' ')[0] ?? ''
  return (
    <ParentShell kids={kids ?? undefined} current={id}>
      <Link to={`/parent/child/${id}`} className="inline-flex items-center gap-1 text-sm font-bold text-brand">
        <ArrowLeft className="size-4" /> Back
      </Link>
      {error && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">{error}</p>}
      {!r ? (
        !error && <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-white via-amber-50 to-emerald-50 px-5 py-5 ring-1 ring-line/60 sm:px-7">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted">Progress report · {r.title}</p>
              <h1 className="text-2xl font-extrabold sm:text-3xl">{r.student.name}</h1>
              <p className="text-sm">
                {shortDate(r.date_from)} – {shortDate(r.date_to)}
                {r.student.class && ` · ${r.student.class}${r.student.section ? ` – ${r.student.section}` : ''}`}
                {r.class_teacher && <span className="text-muted"> · Class teacher: {r.class_teacher}</span>}
              </p>
            </div>
            <button
              onClick={async () => {
                setBusy(true)
                try {
                  await parentApi.reportPdf(id, rid)
                } catch (err) {
                  setError(errorMessage(err))
                } finally {
                  setBusy(false)
                }
              }}
              className="btn-outline bg-white py-2 text-sm"
              aria-label={`Download ${r.title}`}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF
            </button>
          </section>

          <AiInsights load={loadAi} firstName={firstName} audience="parent" />

          {r.remarks && (
            <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5">
              <h2 className="font-bold">Class teacher&rsquo;s remarks</h2>
              <p className="mt-2 text-sm whitespace-pre-wrap">{r.remarks}</p>
            </section>
          )}
          <ProgressSummary p={r.summary} />
        </>
      )}
    </ParentShell>
  )
}
