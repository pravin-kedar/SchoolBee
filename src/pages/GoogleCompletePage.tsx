import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { exchangeGoogleCode } from '../lib/auth'

// The code is single-use; StrictMode runs effects twice in dev, so remember
// which codes were already sent.
const sent = new Set<string>()

/** Backend's Google callback redirects here with a one-time code. */
export function GoogleCompletePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const code = params.get('code')
    if (!code) {
      navigate('/login?error=google_auth_failed', { replace: true })
      return
    }
    if (sent.has(code)) return
    sent.add(code)
    exchangeGoogleCode(code)
      .then(() => navigate('/start', { replace: true }))
      .catch(() => navigate('/login?error=google_auth_failed', { replace: true }))
  }, [params, navigate])

  return (
    <div className="grid min-h-dvh place-items-center bg-cream">
      <p className="font-semibold text-ink">Signing you in…</p>
    </div>
  )
}
