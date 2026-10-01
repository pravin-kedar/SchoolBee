import { useEffect, useState } from 'react'
import { ArrowRight, CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import beeThumbs from '../../assets/bees/bee-thumbs.webp'
import { plans as fallback, type Plan } from '../../content/home'
import { gb, licenseApi, limitText, type Feature, type Plan as LivePlan } from '../../lib/license'
import { SIGNUP_URL } from '../../config'
import { SectionHeading } from './SectionHeading'

function toCard(p: LivePlan, catalog: Record<string, Feature>): Plan {
  return {
    name: p.name,
    tagline: p.description ?? '',
    price: p.is_trial ? '0' : p.price_monthly.toLocaleString('en-IN'),
    period: p.is_trial ? `for ${p.trial_days} days` : '/ month',
    perks: p.is_trial
      ? ['All features included', 'No card needed', 'Choose a plan any time']
      : [
          `${p.students == null ? 'Unlimited' : `Up to ${limitText(p.students)}`} students`,
          `${gb(p.storage_mb)} document storage`,
          `${limitText(p.staff_logins)} staff logins`,
          ...p.features.slice(0, 2).map((f) => catalog[f]?.name ?? f),
        ],
    cta: p.is_trial ? 'Start Free Trial' : `Choose ${p.name}`,
    popular: p.highlight,
  }
}

export function Pricing() {
  const [plans, setPlans] = useState<Plan[]>(fallback)
  useEffect(() => {
    licenseApi.publicPlans().then(
      (r) => r.plans.length && setPlans(r.plans.slice(0, 3).map((p) => toCard(p, r.catalog))),
      () => undefined, // keep the built-in list
    )
  }, [])
  return (
    <section id="pricing" className="scroll-mt-16 bg-gradient-to-b from-amber-50/60 to-white py-12 sm:py-16 lg:py-20">
      <div className="container-sb">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple and Transparent Pricing"
          sub="Start with a free trial and choose a plan when you're ready."
        />

        <div className="mx-auto mt-8 grid max-w-md items-center gap-6 sm:mt-12 md:max-w-none md:grid-cols-3 md:gap-4 lg:grid-cols-[1fr_1fr_1fr_0.9fr] lg:gap-6">
          {plans.map((p) => (
            <article
              key={p.name}
              className={`relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-card md:p-5 lg:p-6 ${
                p.popular ? 'border-violet-200 ring-2 ring-violet-200 lg:-my-3 lg:py-9' : 'border-line'
              }`}
            >
              {p.popular && (
                <span className="absolute top-4 right-4 rounded-md bg-violet-500 px-2 py-0.5 text-xs font-bold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-muted">{p.tagline}</p>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-4xl font-extrabold text-ink md:text-3xl lg:text-4xl">
                  {/* Poppins has no ₹ glyph — render the symbol in the system font. */}
                  <span className="font-[system-ui] font-bold">₹</span>
                  {p.price}
                </span>
                <span className="text-sm text-muted">{p.period}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm">
                    <CircleCheck className="size-5 shrink-0 fill-leaf text-white" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Link to={SIGNUP_URL} className={`mt-6 w-full ${p.popular || p.price === '0' ? 'btn-primary' : 'btn-outline'}`}>
                {p.cta} <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}

          <div className="relative mx-auto hidden w-56 lg:block" aria-hidden>
            <img src={beeThumbs} alt="" className="relative z-10 mx-auto w-32 animate-float drop-shadow-lg" />
            <div className="-mt-6 -rotate-3 rounded-xl border-4 border-amber-700/70 bg-amber-50 px-4 py-5 text-center font-hand text-2xl leading-snug font-bold text-ink shadow-card">
              Start Free
              <br />
              Grow Anytime
              <br />
              No Hidden Charges
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
