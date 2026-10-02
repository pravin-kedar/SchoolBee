import { useState } from 'react'
import { ThumbsUp, TriangleAlert } from 'lucide-react'

import { Dialog } from '../ui/Dialog'
import { progressApi, type NoteKind } from '../../lib/progress'

/** A quick note for one or several children: tap tags, typing optional. */
export function NoteDialog({
  students,
  date,
  tags,
  onClose,
  onSaved,
}: {
  students: { student_id: string; full_name: string }[]
  date: string
  tags: Record<NoteKind, string[]>
  onClose: () => void
  onSaved: () => void
}) {
  const [kind, setKind] = useState<NoteKind>('positive')
  const [picked, setPicked] = useState<string[]>([])
  const [text, setText] = useState('')
  const who = students.length === 1 ? students[0].full_name : `${students.length} children`
  const toggle = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  return (
    <Dialog
      title={`Note for ${who}`}
      subtitle="Tap one or more tags. Writing is optional."
      submitLabel="Save note"
      submitDisabled={!picked.length && !text.trim()}
      onClose={onClose}
      onSubmit={async () => {
        await progressApi.addNotes({ student_ids: students.map((s) => s.student_id), date, kind, tags: picked, text: text.trim() || null })
        onSaved()
      }}
    >
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Note type">
        {(
          [
            ['positive', 'Positive', ThumbsUp, 'bg-emerald-50 text-emerald-800 ring-emerald-300'],
            ['attention', 'Needs attention', TriangleAlert, 'bg-amber-50 text-amber-900 ring-amber-300'],
          ] as const
        ).map(([k, label, Icon, tone]) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => (setKind(k), setPicked([]))}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ring-1 ${kind === k ? tone + ' ring-2' : 'ring-line hover:bg-slate-50'}`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tags">
        {tags[kind].map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={picked.includes(t)}
            onClick={() => toggle(t)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
              picked.includes(t)
                ? kind === 'positive'
                  ? 'bg-emerald-600 text-white ring-emerald-600'
                  : 'bg-amber-500 text-white ring-amber-500'
                : 'ring-line hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <label className="block text-sm font-bold">
        Anything else? <span className="font-normal text-muted">(optional)</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={kind === 'positive' ? 'e.g. Sang the whole rhyme on stage!' : 'e.g. Seemed tired after lunch'}
          aria-label="Note text"
          className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-normal outline-none focus:border-brand"
        />
      </label>
    </Dialog>
  )
}
