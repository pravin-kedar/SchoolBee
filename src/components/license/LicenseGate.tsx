import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Crown, LogOut, Mail, PauseCircle, ShieldAlert } from 'lucide-react'

import logo from '../../assets/logo-full.webp'
import { logout, useMe } from '../../lib/auth'
import { shortDate, useLicenseStatus, type LicenseStatus } from '../../lib/license'

const OPEN = ['/plan', '/choose-plan', '/profile'] // work whatever the licence

/** Wraps every school page: while the school has no plan, or its plan has
 *  expired / is on hold, people can log in but only reach the Plan page.
 *  (The API refuses everything else too - this just shows why.) */
export function SchoolGate() {
  const { me, isLoggedIn, failed } = useMe()
  const { pathname } = useLocation()
  const key = me?.active_school_id ? `${me.id}:${me.active_school_id}` : null
  const { status, loading } = useLicenseStatus(key)
  const wait = <div className="grid min-h-dvh place-items-center bg-cream font-semibold text-ink">Loading…</div>
  if (!isLoggedIn || failed || OPEN.includes(pathname)) return <Outlet /> // pages send logged-out people to /login
  if (!me) return wait // don't let a page call the API before we know the licence
  if (!key) return <Outlet /> // an account without a school yet
  if (loading || !status) return wait
  if (!status.blocked) return <Outlet />
  if (status.status === 'none' && me.is_owner) return <Navigate to="/choose-plan" replace />
  return <BlockedScreen status={status} owner={me.is_owner} />
}

function BlockedScreen({ status: s, owner }: { status: LicenseStatus; owner: boolean }) {
  const navigate = useNavigate()
  const text = {
    none: {
      icon: Crown,
      title: 'Your school hasn’t chosen a plan yet',
      body: 'SchoolBee opens once the school owner chooses a plan or starts the free trial. Please ask them.',
    },
    expired: {
      icon: ShieldAlert,
      title: `Your ${s.status === 'expired' && s.plan_name !== 'No plan' ? s.plan_name + ' ' : ''}plan has expired`,
      body: owner
        ? `It ended on ${shortDate(s.ends_on)}, so access to the dashboard is paused. Renew your plan to continue — everything comes back the moment the payment is received.`
        : `It ended on ${shortDate(s.ends_on)}, so access is paused. Please ask the school owner to renew the plan.`,
    },
    suspended: {
      icon: PauseCircle,
      title: 'Your SchoolBee licence is on hold',
      body: `${s.suspended_reason ? `Reason: ${s.suspended_reason}. ` : ''}${owner ? 'Please contact us to restore access.' : 'Please ask the school owner.'}`,
    },
    trial: { icon: Crown, title: '', body: '' },
    active: { icon: Crown, title: '', body: '' },
  }[s.status]
  const Icon = text.icon
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f6f9ff] p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-float ring-1 ring-line/60 sm:p-8" role="alert" aria-label="Plan required">
        <img src={logo} alt="SchoolBee" className="mx-auto h-16" />
        <span className={`mx-auto mt-6 grid size-14 place-items-center rounded-2xl ${s.status === 'expired' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
          <Icon className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">{text.title}</h1>
        <p className="mt-2 text-muted">{text.body}</p>
        {s.status === 'expired' && s.delete_on && (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ring-1 ring-rose-200">
            Your school&rsquo;s data is kept until <b>{shortDate(s.delete_on)}</b>. After that it may be permanently deleted as per our data policy.
          </p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {owner && s.status === 'expired' && (
            <Link to="/plan" className="btn-primary justify-center">
              <Crown className="size-4" /> Review plan &amp; pay
            </Link>
          )}
          {owner && s.status === 'suspended' && (
            <a href="mailto:info@paperbee.in" className="btn-primary justify-center">
              <Mail className="size-4" /> Contact us
            </a>
          )}
          <button
            onClick={async () => {
              await logout()
              navigate('/login', { replace: true })
            }}
            className="btn-outline justify-center"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      </div>
    </div>
  )
}
