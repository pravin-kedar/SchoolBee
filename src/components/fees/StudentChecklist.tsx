import { useState } from 'react'
import { Search } from 'lucide-react'

import { Avatar } from '../students/StudentUi'
import { selectCls } from '../students/StudentTable'
import type { CertStudent } from '../../lib/certificates'
import type { SchoolClass } from '../../lib/setup'

/** Tick students from the whole school, narrowed by class and search. Ticks
 *  survive changing the filter. `taken` students are shown but locked. */
export function StudentChecklist({
  students,
  classes,
  selected,
  onChange,
  taken = new Set(),
}: {
  students: CertStudent[]
  classes: SchoolClass[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  taken?: Set<string>
}) {
  const [classId, setClassId] = useState('')
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const shown = students.filter(
    (s) => (!classId || s.class_id === classId) && (!term || s.full_name.toLowerCase().includes(term) || s.admission_no.toLowerCase().includes(term)),
  )
  const pickable = shown.filter((s) => !taken.has(s.id))
  const allOn = pickable.length > 0 && pickable.every((s) => selected.has(s.id))

  const toggle = (ids: string[], on: boolean) => {
    const next = new Set(selected)
    for (const id of ids) {
      if (on) next.add(id)
      else next.delete(id)
    }
    onChange(next)
  }

  return (
    <div className="rounded-xl ring-1 ring-line">
      <div className="flex flex-wrap gap-2 border-b border-line p-2">
        <select aria-label="Filter class" value={classId} onChange={(e) => setClassId(e.target.value)} className={`${selectCls} flex-1 py-2`}>
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="relative flex-[2]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search students to add" className={`${selectCls} w-full py-2 pl-9`} />
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-sm">
        <span className="font-bold">{selected.size} selected</span>
        <button type="button" onClick={() => toggle(pickable.map((s) => s.id), !allOn)} disabled={!pickable.length} className="text-xs font-bold text-brand disabled:opacity-40">
          {allOn ? 'Clear these' : `Select all ${pickable.length}`}
        </button>
      </div>
      <ul className="max-h-64 overflow-auto p-1.5">
        {shown.map((s) => {
          const isTaken = taken.has(s.id)
          return (
            <li key={s.id}>
              <label className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${isTaken ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  disabled={isTaken}
                  checked={isTaken || selected.has(s.id)}
                  aria-label={s.full_name}
                  onChange={(e) => toggle([s.id], e.target.checked)}
                />
                <Avatar name={s.full_name} url={s.photo_url} gender={s.gender} size="size-7 text-xs" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.full_name}</span>
                <span className="text-xs text-muted">{isTaken ? 'already added' : [s.class_name, s.section_name].filter(Boolean).join(' - ')}</span>
              </label>
            </li>
          )
        })}
        {shown.length === 0 && <li className="px-2 py-3 text-sm text-muted">No students found</li>}
      </ul>
    </div>
  )
}
