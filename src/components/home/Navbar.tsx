import { useEffect, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Logo } from '../Logo'
import { navLinks } from '../../content/home'
import { LOGIN_URL, SIGNUP_URL } from '../../config'

/** Phone: logo + menu. Tablet: + Login / Get Started. Laptop and up: + links. */
export function Navbar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onWide = () => window.innerWidth >= 1024 && setOpen(false)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onWide)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onWide)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-white/85 backdrop-blur">
      <nav className="container-sb flex h-16 items-center justify-between gap-3">
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l, i) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition hover:text-brand xl:px-3.5 ${i === 0 ? 'bg-sky-50 text-brand' : 'text-ink/80'}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:ml-0">
          <Link to={LOGIN_URL} className="btn-outline hidden py-2 sm:inline-flex">
            Login
          </Link>
          <Link to={SIGNUP_URL} className="btn-primary hidden py-2 whitespace-nowrap sm:inline-flex">
            Get Started Free <ArrowRight className="size-4" />
          </Link>
          <button
            className="grid size-10 place-items-center rounded-lg text-ink hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="home-menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="home-menu" className="border-t border-line bg-white shadow-card lg:hidden">
          <ul className="container-sb flex flex-col py-3">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 font-semibold text-ink hover:bg-slate-50">
                  {l.label}
                </a>
              </li>
            ))}
            <li className="mt-3 grid grid-cols-2 gap-3 sm:hidden">
              <Link to={LOGIN_URL} className="btn-outline">
                Login
              </Link>
              <Link to={SIGNUP_URL} className="btn-primary">
                Get Started
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
