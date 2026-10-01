import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import footerBg from '../../assets/footer-bg.webp'
import { LOGIN_URL, SIGNUP_URL } from '../../config'
import { Logo } from '../Logo'

const YEAR = new Date().getFullYear()

export function CtaFooter() {
  return (
    <footer>
      <section className="relative overflow-hidden">
        <img
          src={footerBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[15%_bottom]"
        />
        <div className="container-sb relative flex min-h-[260px] flex-col items-center justify-center gap-6 py-10 text-center sm:py-12 md:flex-row md:justify-end md:gap-8 md:pl-[24%] md:text-left lg:min-h-[320px]">
          <div className="max-w-xl rounded-2xl bg-white/70 p-4 backdrop-blur-sm md:bg-transparent md:p-0 md:backdrop-blur-none">
            <h2 className="text-xl font-extrabold min-[400px]:text-2xl sm:text-3xl">Ready to Simplify Your Preschool Management?</h2>
            <p className="mt-2">Join hundreds of happy schools and start using SchoolBee today.</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3">
            <Link to={SIGNUP_URL} className="btn-primary px-6 py-3">
              Create Your School Free <ArrowRight className="size-4" />
            </Link>
            <Link to={LOGIN_URL} className="btn-outline px-7 py-3">Login</Link>
          </div>
        </div>
      </section>

      <div className="border-t border-line bg-white">
        <div className="container-sb flex flex-col items-center justify-between gap-3 py-6 text-center text-sm text-muted sm:flex-row sm:text-left">
          <Logo className="scale-90" />
          <p>© {YEAR} SchoolBee · Simple School Management. A PaperBee product.</p>
        </div>
      </div>
    </footer>
  )
}
