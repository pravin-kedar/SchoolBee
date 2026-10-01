import { Link } from 'react-router-dom'
import { CalendarClock, Crown } from 'lucide-react'

import { shortDate, type LicenseStatus } from '../../lib/license'

const days = (n: number | null) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`)

/** Slim strip on every page while the plan is about to end. */
export function LicenseBanner({ status: s, owner }: { status: LicenseStatus; owner: boolean }) {
  if (s.reminder === 'none' || (s.reminder === 'owner' && !owner)) return null
  const urgent = s.reminder === 'all'
  return (
    <div role="status" className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold ring-1 sm:px-6 ${urgent ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200'}`}>
      <span className="flex items-center gap-2">
        <Crown className="size-4 shrink-0" />
        Your {s.status === 'trial' ? 'free trial' : `${s.plan_name} plan`} ends {days(s.days_left)} ({shortDate(s.ends_on)}).
        {owner ? ' Choose a plan to keep using SchoolBee.' : ' Please remind the school owner to renew.'}
      </span>
      {owner && (
        <Link to="/plan" className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-ink shadow-sm ring-1 ring-line hover:bg-slate-50">
          Review plan
        </Link>
      )}
    </div>
  )
}

/** The "your plan is ending" pop-up. */
export function ReminderPopup({ status: s, owner, onClose }: { status: LicenseStatus; owner: boolean; onClose: (goToPlan: boolean) => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal aria-label="Plan ending">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-float">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <span className={`grid size-9 place-items-center rounded-xl ${s.reminder === 'all' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
            <CalendarClock className="size-5" />
          </span>
          Your {s.status === 'trial' ? 'free trial' : `${s.plan_name} plan`} ends {days(s.days_left)}
        </h2>
        <div className="mt-3 space-y-2 text-sm">
          <p>
            SchoolBee access for your school stops on <b>{shortDate(s.ends_on)}</b> unless the plan is renewed.
          </p>
          <p className="text-muted">
            After it expires, nobody can open the school&rsquo;s records
            {s.retention_days ? `, and the school's data is permanently deleted ${s.retention_days} days later` : ''}. Please review your plan before you lose your data.
          </p>
          {!owner && <p className="font-semibold">Only the school owner can renew — please remind them.</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => onClose(false)} className={owner ? 'btn-outline' : 'btn-primary'}>
            {owner ? 'Later' : 'OK'}
          </button>
          {owner && (
            <button onClick={() => onClose(true)} className="btn-primary">
              <Crown className="size-4" /> Review plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
