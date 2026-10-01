import { Link } from 'react-router-dom'

import beeBook from '../assets/bees/bee-book.webp'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-1.5 ${className}`} aria-label="SchoolBee home">
      <img src={beeBook} alt="" className="h-9 w-auto" />
      <span className="font-display text-2xl font-extrabold tracking-tight">
        <span className="text-ink">School</span>
        <span className="bg-gradient-to-b from-honey to-amber bg-clip-text text-transparent">Bee</span>
      </span>
    </Link>
  )
}
