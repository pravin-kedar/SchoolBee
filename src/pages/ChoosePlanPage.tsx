import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

import logo from '../assets/logo-full.webp'
import { PayDialog } from '../components/license/PayDialog'
import { PlanPicker } from '../components/license/PlanPicker'
import { errorMessage } from '../lib/api'
import { logout, useMe } from '../lib/auth'
import { licenseApi, refreshLicenseStatus, type Cycle, type LicenseDetail, type Plan } from '../lib/license'

/** First step after creating a school: the free trial or a paid plan. */
export function ChoosePlanPage() {
  const navigate = useNavigate()
  const { me, isLoggedIn, loading } = useMe()
  const [d, setD] = useState<LicenseDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [buying, setBuying] = useState<{ plan: Plan; cycle: Cycle } | null>(null)
  const owner = Boolean(me?.is_owner && me.active_school_id)

  useEffect(() => {
    if (!owner) return
    licenseApi.detail().then(setD, (err) => setError(errorMessage(err)))
  }, [owner])

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!loading && me && !owner) return <Navigate to="/dashboard" replace />
  if (d && d.status.status !== 'none') return <Navigate to="/dashboard" replace />

  const started = () => {
    refreshLicenseStatus()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-amber-50/70 via-white to-[#f6f9ff]">
      <header className="container-sb flex items-center justify-between py-4">
        <img src={logo} alt="SchoolBee" className="h-14" />
        <button
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </header>
      <main className="container-sb pb-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Choose how to start</h1>
          <p className="mt-2 text-muted">
            Try everything free, or pick a plan now. You can upgrade any time from <b>Plan &amp; Licence</b>.
          </p>
        </div>
        {error && <p className="mx-auto mt-6 max-w-xl rounded-xl bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
        <div className="mx-auto mt-8 max-w-5xl">
          {d ? (
            <PlanPicker
              plans={d.plans}
              catalog={d.catalog}
              trial={d.trial}
              busy={busy}
              onTrial={async () => {
                setBusy(d.trial?.key ?? 'trial')
                setError(null)
                try {
                  await licenseApi.startTrial()
                  started()
                } catch (err) {
                  setError(errorMessage(err))
                  setBusy(null)
                }
              }}
              onBuy={(plan, cycle) => setBuying({ plan, cycle })}
            />
          ) : (
            !error && <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
          )}
        </div>
      </main>
      {buying && d && (
        <PayDialog plan={buying.plan} cycle={buying.cycle} online={d.online_payment} contact={d.contact} onClose={() => setBuying(null)} onPaid={() => started()} />
      )}
    </div>
  )
}
