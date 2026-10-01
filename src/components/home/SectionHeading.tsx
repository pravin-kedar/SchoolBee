export function SectionHeading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-2 text-[1.7rem] leading-tight font-extrabold sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3">{sub}</p>}
    </div>
  )
}
