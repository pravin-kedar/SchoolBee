import { screenshots } from '../../content/home'
import { SectionHeading } from './SectionHeading'

export function Screenshots() {
  return (
    <section id="screenshots" className="scroll-mt-16 py-12 sm:py-16 lg:py-20">
      <div className="container-sb">
        <SectionHeading
          eyebrow="Screenshots"
          title="See SchoolBee in Action"
          sub="A clean, modern and easy-to-use interface designed for real schools."
        />
      </div>

      {/* Scrolls sideways on small screens, five-up grid on desktop. */}
      <ul className="container-sb mt-8 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto pb-4 sm:mt-10 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {screenshots.map((s) => (
          <li key={s.label} className="w-[78%] max-w-xs shrink-0 snap-start sm:w-64 lg:w-auto lg:max-w-none">
            <figure className="overflow-hidden rounded-xl border border-line bg-sky-50/60 shadow-card transition hover:-translate-y-1">
              <img src={s.src} alt={`${s.label} screen`} loading="lazy" className="aspect-[16/10] w-full bg-white object-cover object-top" />
              <figcaption className="py-2.5 text-center text-sm font-bold text-ink">{s.label}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  )
}
