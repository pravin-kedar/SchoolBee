import { Star } from 'lucide-react'

import { testimonials } from '../../content/home'
import { SectionHeading } from './SectionHeading'

const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')

export function Testimonials() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="container-sb">
        <SectionHeading eyebrow="What school owners say" title="Loved by Preschools Across India" />

        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 sm:mt-12 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
          {testimonials.map((t) => (
            <li key={t.name} className="flex w-[85%] max-w-sm shrink-0 snap-center flex-col rounded-2xl border border-line bg-white p-6 shadow-card md:w-auto md:max-w-none">
              <div className="flex gap-0.5 text-honey" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="size-5" fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 leading-relaxed">“{t.quote}”</blockquote>
              <div className="mt-5 flex items-center gap-3">
                <span className={`grid size-11 place-items-center rounded-full font-bold ${t.avatar}`}>
                  {initials(t.name)}
                </span>
                <span className="leading-tight">
                  <span className="block font-bold text-ink">{t.name}</span>
                  <span className="text-sm text-muted">{t.school}</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
