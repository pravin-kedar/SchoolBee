import { Navigate } from 'react-router-dom'

import { Navbar } from '../components/home/Navbar'
import { Hero } from '../components/home/Hero'
import { DesignedFor } from '../components/home/DesignedFor'
import { Features } from '../components/home/Features'
import { HowItWorks } from '../components/home/HowItWorks'
import { Screenshots } from '../components/home/Screenshots'
import { Pricing } from '../components/home/Pricing'
import { Testimonials } from '../components/home/Testimonials'
import { Faq } from '../components/home/Faq'
import { CtaFooter } from '../components/home/CtaFooter'
import { useAccessToken } from '../lib/auth-store'
import { useZapToken } from '../lib/zap'

export function HomePage() {
  // Already signed in: skip the marketing page. /start opens the person's
  // start page (Dashboard unless they chose otherwise in My Profile).
  const token = useAccessToken()
  const zapToken = useZapToken()
  if (token) return <Navigate to="/start" replace />
  if (zapToken) return <Navigate to="/zap" replace />

  return (
    // overflow-x-clip: decorative bees may peek past the edge without making
    // the page scroll sideways (clip, not hidden, so the sticky navbar works).
    <div className="overflow-x-clip">
      <Navbar />
      <main>
        <Hero />
        <DesignedFor />
        <Features />
        <HowItWorks />
        <Screenshots />
        <Pricing />
        <Testimonials />
        <Faq />
      </main>
      <CtaFooter />
    </div>
  )
}
