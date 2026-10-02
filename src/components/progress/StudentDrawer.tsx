import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, X } from 'lucide-react'

import { StudentHistory } from './StudentHistory'
import { StudentProgressTab } from '../students/StudentProgressTab'

/** Side panel on the Progress page: a child's summary and full history. */
export function StudentDrawer({ studentId, name, today, onClose }: { studentId: string; name: string; today: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-label={`${name} progress`}>
      <button className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-[#f6f9ff] shadow-float">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold">{name}</h2>
            <Link to={`/students/${studentId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
              Open profile <ExternalLink className="size-3.5" />
            </Link>
          </div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100" aria-label="Close panel">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          <StudentProgressTab studentId={studentId} compact />
          <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5">
            <StudentHistory studentId={studentId} today={today} />
          </section>
        </div>
      </aside>
    </div>
  )
}
