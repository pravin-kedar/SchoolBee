import { Navigate } from 'react-router-dom'

import { useMe } from '../lib/auth'
import { startPath } from '../lib/me'

/** Where login lands: the user's chosen start page (My Profile →
 *  Preferences). Accounts without a school go to /dashboard, which asks
 *  them to create one. */
export function StartPage() {
  const { me, loading, failed, isLoggedIn } = useMe()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (loading) return <div className="grid min-h-dvh place-items-center bg-cream font-semibold text-ink">Loading…</div>
  if (failed || !me || !me.active_school_id) return <Navigate to="/dashboard" replace />
  return <Navigate to={startPath(me.start_page)} replace />
}
