import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { PartyPopper } from 'lucide-react'

import { ProgressCard, SetupSidebar, SetupTopbar, Stepper, TipCards } from '../components/setup/SetupChrome'
import { AcademicYearStep, ClassesStep, SchoolInfoStep, SectionsStep, UsersStep } from '../components/setup/Steps'
import { errorMessage } from '../lib/api'
import { logout, refreshMe, useMe } from '../lib/auth'
import { loadSchoolOptions } from '../lib/schoolOptions'
import { setupApi, type SetupState, type StepKey } from '../lib/setup'

const ORDER: StepKey[] = ['school', 'academic_year', 'classes', 'sections', 'users']

export function SetupPage() {
  const navigate = useNavigate()
  const { me, isLoggedIn } = useMe()
  const [state, setState] = useState<SetupState | null>(null)
  const [step, setStep] = useState<StepKey>('school')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) return
    setupApi
      .get()
      .then((s) => {
        setState(s)
        // Resume at the first unfinished step.
        setStep(s.steps.find((x) => !x.done)?.key ?? 'users')
      })
      .catch((err) => setError(errorMessage(err)))
  }, [isLoggedIn])

  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (me && me.schools.length === 0) return <Navigate to="/dashboard" replace /> // asks for a school name

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!state) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#f6f9ff] px-4 text-center">
        <p className="font-semibold text-ink">{error ?? 'Loading your school…'}</p>
      </div>
    )
  }

  const index = ORDER.indexOf(step)
  const back = index > 0 ? () => setStep(ORDER[index - 1]) : undefined
  const onSaved = (next: SetupState) => {
    setState(next)
    void loadSchoolOptions(true).catch(() => undefined) // classes/sections/year may have changed
    if (next.completed && step === 'users') return
    setStep(ORDER[Math.min(index + 1, ORDER.length - 1)])
  }
  // School name/logo live in the cached /auth/me too (top bar).
  const onUpdate = (next: SetupState) => {
    setState(next)
    refreshMe()
  }
  const stepProps = { state, onSaved: (next: SetupState) => (refreshMe(), onSaved(next)), onUpdate, onBack: back }

  // xl+: the whole page fits the window - only a step's form body scrolls
  // if the screen is short. Smaller screens scroll the page normally.
  return (
    <div className="flex min-h-dvh bg-[#f6f9ff] xl:h-dvh xl:overflow-hidden">
      <SetupSidebar state={state} current={step} onSelect={setStep} />

      <div className="flex min-w-0 flex-1 flex-col">
        <SetupTopbar name={me?.full_name ?? ''} onLogout={onLogout} />

        <div className="grid min-h-0 flex-1 gap-5 px-4 pb-5 sm:px-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:grid-rows-[minmax(0,1fr)]">
          <div className="flex min-h-0 min-w-0 flex-col gap-4">
            <Stepper state={state} current={step} onSelect={setStep} />

            {state.completed && (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-5 py-3 ring-1 ring-emerald-200">
                <p className="flex items-center gap-3 font-bold text-emerald-800">
                  <PartyPopper className="size-5" /> Your school is 100% ready!
                </p>
                <Link to="/dashboard" className="btn-primary py-2">
                  Go to Dashboard
                </Link>
              </div>
            )}

            {/* key: remount a step's form when its saved data changes elsewhere */}
            <div className="min-h-0 flex-1">
              {step === 'school' && <SchoolInfoStep key="school" {...stepProps} />}
              {step === 'academic_year' && <AcademicYearStep key="year" {...stepProps} />}
              {step === 'classes' && <ClassesStep key="classes" {...stepProps} />}
              {step === 'sections' && <SectionsStep key={state.classes.map((c) => c.id).join()} {...stepProps} />}
              {step === 'users' && <UsersStep key="users" {...stepProps} />}
            </div>
          </div>

          <div className="space-y-4 xl:min-h-0 xl:overflow-y-auto">
            <ProgressCard state={state} />
            <TipCards />
          </div>
        </div>
      </div>
    </div>
  )
}
