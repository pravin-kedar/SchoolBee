import { Link, Navigate } from 'react-router-dom'

import beeLaptop from '../assets/bees/bee-desk.webp'
import { AppShell } from '../components/app/AppShell'
import { useAccessToken } from '../lib/auth-store'

/** Placeholder for sidebar modules that aren't built yet. */
export function ComingSoonPage({ title }: { title: string }) {
  if (!useAccessToken()) return <Navigate to="/login" replace />
  return (
    <AppShell>
      <div className="grid h-full place-items-center p-6 text-center">
        <div className="max-w-md">
          <img src={beeLaptop} alt="" className="mx-auto w-36" />
          <h1 className="mt-4 text-3xl font-extrabold">{title}</h1>
          <p className="mt-2">We’re building this next. It’ll show up here as soon as it’s ready.</p>
          <Link to="/dashboard" className="btn-primary mt-6">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
