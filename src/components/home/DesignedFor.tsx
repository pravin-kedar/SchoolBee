import { CircleCheck } from 'lucide-react'

import dashboard from '../../assets/screens/dashboard.webp'
import beeFlying from '../../assets/bees/bee-flying.webp'
import { designedForPoints } from '../../content/home'

export function DesignedFor() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="container-sb grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div>
          <h2 className="text-[1.7rem] leading-tight font-extrabold sm:text-4xl">
            Designed for <span className="block text-brand">Preschools &amp; Daycares</span>
          </h2>
          <p className="mt-4">
            SchoolBee is built specifically for early education centers, play schools, nurseries, LKG and UKG. A
            simple, modern and easy-to-use system that helps you stay organized and focus on what matters most — your
            kids.
          </p>
          <ul className="mt-6 space-y-3">
            {designedForPoints.map((p) => (
              <li key={p} className="flex items-center gap-3 font-semibold text-ink">
                <CircleCheck className="size-6 shrink-0 fill-leaf text-white" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-float">
            <div className="flex gap-1.5 border-b border-line bg-slate-50 px-4 py-2.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-rose-300" />
              <span className="size-2.5 rounded-full bg-amber-300" />
              <span className="size-2.5 rounded-full bg-emerald-300" />
            </div>
            <img src={dashboard} alt="SchoolBee dashboard showing students, attendance and recent documents" className="w-full" />
          </div>
          <img
            src={beeFlying}
            alt=""
            className="absolute -top-10 -right-4 hidden w-24 animate-float drop-shadow-lg sm:block lg:-right-10"
          />
        </div>
      </div>
    </section>
  )
}
