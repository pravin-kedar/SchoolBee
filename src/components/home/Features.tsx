import beeWave from '../../assets/bees/bee-wave.webp'
import { features, tones } from '../../content/home'
import { SectionHeading } from './SectionHeading'

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-16 py-12 sm:py-16 lg:py-20">
      <img
        src={beeWave}
        alt=""
        className="absolute top-6 right-[4%] hidden w-20 animate-float drop-shadow-lg lg:block xl:w-24"
      />
      <div className="container-sb">
        <SectionHeading
          eyebrow="Features"
          title="All the essential tools in one place"
          sub="Everything you need to run your preschool smoothly."
        />

        <ul className="mt-8 grid gap-4 min-[480px]:grid-cols-2 sm:mt-12 sm:gap-5 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text, tone }) => (
            <li
              key={title}
              className={`rounded-2xl border p-5 transition hover:-translate-y-1 hover:shadow-card sm:p-6 ${tones[tone].card}`}
            >
              <span className={`grid size-12 place-items-center rounded-2xl sm:size-14 ${tones[tone].icon}`}>
                <Icon className="size-7" />
              </span>
              <h3 className="mt-4 text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
