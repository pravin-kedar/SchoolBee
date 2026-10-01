import { Plus } from 'lucide-react'

import { faqs } from '../../content/home'

export function Faq() {
  return (
    <section id="faqs" className="scroll-mt-16 pb-12 sm:pb-16 lg:pb-20">
      <div className="container-sb">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-2 text-[1.7rem] font-extrabold sm:text-3xl">Frequently Asked Questions</h2>
          </div>
          {/* TODO: point to a dedicated FAQ page once it exists */}
          <a href="#faqs" className="btn-outline py-2">View All FAQs</a>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map((f, i) => (
            <details
              key={f.q}
              open={i < 2}
              className="group rounded-xl border border-line bg-white px-5 py-4 shadow-card open:ring-1 open:ring-sky-100"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <Plus className="size-5 shrink-0 text-muted transition group-open:rotate-45" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
