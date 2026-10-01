import { ArrowRight, Heart, Leaf, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

import heroBg from '../../assets/hero-bg.webp'
import { highlights, tones } from '../../content/home'
import { LOGIN_URL, SIGNUP_URL } from '../../config'

const trust = [
  { icon: Leaf, title: 'Free to start', sub: 'No credit card', color: 'text-leaf' },
  { icon: Zap, title: 'Easy to use', sub: 'In 10 minutes', color: 'text-amber' },
  { icon: Heart, title: 'Trusted by', sub: 'Preschools & Daycares', color: 'text-rose-500' },
]

export function Hero() {
  return (
    <section id="home" className="overflow-hidden bg-gradient-to-b from-cream to-white">
      <div className="relative bg-cream">
        {/* Desktop: the illustration is the section background (its left side fades to cream). */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[76%] lg:block">
          <img src={heroBg} alt="" className="h-full w-full object-cover object-[72%_center]" />
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-cream via-cream/50 to-transparent" />
        </div>

        <div className="container-sb relative grid items-center lg:min-h-[560px] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-xl py-10 sm:py-12 lg:py-16">
            <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              Simple • Modern • For Preschools
            </span>

            <h1 className="mt-5 text-[2.05rem] leading-[1.12] font-extrabold min-[400px]:text-4xl sm:text-5xl lg:text-[3.2rem] 2xl:text-[3.6rem]">
              Everything Your Preschool Needs{' '}
              <span className="lg:block">
                in <span className="bg-gradient-to-r from-amber to-honey bg-clip-text text-transparent">One Simple App</span>
              </span>
            </h1>

            <p className="mt-5 max-w-md text-base sm:text-lg">
              Manage students, documents, attendance, assessments and certificates — with ease.{' '}
              <strong className="font-bold text-ink">Start free and grow as your school grows.</strong>
            </p>

            <div className="mt-7 grid gap-3 min-[420px]:flex min-[420px]:flex-wrap">
              <Link to={SIGNUP_URL} className="btn-primary px-6 py-3 text-base">
                Create Your School Free <ArrowRight className="size-4" />
              </Link>
              <Link to={LOGIN_URL} className="btn-outline px-8 py-3 text-base">Login</Link>
            </div>

            <ul className="mt-8 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-x-7 sm:gap-y-3">
              {trust.map(({ icon: Icon, title, sub, color }) => (
                <li key={title} className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <Icon className={`size-6 ${color}`} fill="currentColor" strokeWidth={1.5} />
                  <span className="leading-tight">
                    <span className="block text-sm font-bold text-ink">{title}</span>
                    <span className="text-xs text-muted">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p
            aria-hidden
            className="absolute top-12 right-[6%] hidden -rotate-6 text-center font-hand text-3xl leading-tight font-bold text-ink lg:block"
          >
            Happy Schools
            <br />
            Happier <span className="text-rose-500">Kids</span>
          </p>
        </div>
      </div>

      {/* Mobile/tablet: show the illustration below the copy instead. */}
      <img src={heroBg} alt="" className="h-56 w-full object-cover object-[78%_center] min-[480px]:h-72 sm:h-80 md:h-96 lg:hidden" />

      <div className="container-sb relative pt-2 pb-12 lg:pt-8">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {highlights.map(({ icon: Icon, title, text, tone }) => (
            <li
              key={title}
              className={`rounded-2xl border bg-white/90 p-3 text-center shadow-card backdrop-blur sm:p-4 ${tones[tone].card}`}
            >
              <span className={`mx-auto grid size-11 place-items-center rounded-xl ${tones[tone].icon}`}>
                <Icon className="size-6" />
              </span>
              <h3 className="mt-3 text-sm leading-snug font-bold">{title}</h3>
              <p className="mt-1 text-xs leading-snug text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
