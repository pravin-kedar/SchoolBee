import { Fragment } from 'react'
import { ArrowRight, CalendarCheck, ChartColumnIncreasing, School, UserPlus, UserRound } from 'lucide-react'

import { steps } from '../../content/home'
import { SectionHeading } from './SectionHeading'

const stepIcons = [UserRound, School, UserPlus, CalendarCheck, ChartColumnIncreasing]

export function HowItWorks() {
  return (
    <section className="bg-gradient-to-b from-sky-50/70 via-sky-50/40 to-white py-12 sm:py-16 lg:py-20">
      <div className="container-sb">
        <SectionHeading title="How It Works?" sub="Get started in just a few simple steps." />

        <ol className="mx-auto mt-8 grid max-w-md gap-5 sm:mt-12 sm:max-w-none sm:grid-cols-2 sm:gap-8 md:grid-cols-3 lg:flex lg:items-start lg:gap-2">
          {steps.map((s, i) => {
            const Icon = stepIcons[i]
            return (
              <Fragment key={s.title}>
                {/* Phone: icon beside the text. Tablet up: stacked and centred. */}
                <li className="flex flex-1 items-center gap-4 text-left sm:block sm:text-center">
                  <span className="relative shrink-0 sm:mx-auto sm:block sm:w-fit">
                    <span className="grid size-14 place-items-center rounded-2xl bg-white text-ink shadow-card sm:size-16">
                      <Icon className="size-7 sm:size-8" />
                    </span>
                    <span className={`absolute -top-2 -left-2 grid size-7 place-items-center rounded-full text-xs font-extrabold text-white ring-2 ring-white ${s.color}`}>
                      {i + 1}
                    </span>
                  </span>
                  <span className="block min-w-0">
                    <h3 className="text-base font-bold sm:mt-4">{s.title}</h3>
                    <p className="mt-0.5 text-sm sm:mx-auto sm:mt-1 sm:max-w-[12rem]">{s.text}</p>
                  </span>
                </li>
                {i < steps.length - 1 && (
                  <li aria-hidden className="hidden pt-5 text-muted lg:block">
                    <ArrowRight className="size-6" />
                  </li>
                )}
              </Fragment>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
