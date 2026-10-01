import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import scene from '../../assets/school-scene.webp'
import beeBook from '../../assets/bees/bee-book.webp'
import { Logo } from '../Logo'

/** Split screen from the login design: illustrated school scene on the
 *  left, white form card on the right. Stacks on small screens. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-sky-100">
      <img src={scene} alt="" className="absolute inset-0 h-full w-full object-cover object-[30%_center]" />
      {/* Soften the sky behind the left-hand copy */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/10 to-transparent lg:bg-gradient-to-r lg:from-white/50 lg:via-transparent" />

      <div className="relative mx-auto grid min-h-dvh max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_minmax(0,480px)] lg:gap-12 lg:py-10">
        <div className="relative hidden self-stretch pt-6 lg:block">
          <Link to="/" className="inline-block" aria-label="SchoolBee home">
            <span className="font-display text-6xl font-extrabold tracking-tight">
              <span className="text-ink">School</span>
              <span className="bg-gradient-to-b from-honey to-amber bg-clip-text text-transparent">Bee</span>
            </span>
          </Link>
          <p className="mt-3 max-w-sm text-2xl leading-snug font-semibold text-ink/70">
            A Smarter Way to Manage Your Preschool
          </p>
          <img src={beeBook} alt="" className="absolute top-44 left-[21rem] w-40 animate-float drop-shadow-xl xl:left-[23rem]" />
        </div>

        <main className="w-full rounded-3xl bg-white/95 p-6 shadow-float ring-1 ring-black/5 backdrop-blur sm:p-10">
          <div className="flex justify-center">
            <Logo />
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
