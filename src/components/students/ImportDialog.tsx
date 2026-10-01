import { useEffect, useRef, useState } from 'react'
import {
  CircleAlert,
  CircleCheck,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react'

import { errorMessage } from '../../lib/api'
import { studentsApi, type ImportResult } from '../../lib/students'

type Stage = { kind: 'pick' } | { kind: 'checking' } | { kind: 'checked'; result: ImportResult } | { kind: 'importing' } | { kind: 'done'; imported: number }

/** Download template → upload → see every problem by row → confirm.
 *  The server imports only when all rows are valid (all-or-nothing). */
export function ImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>({ kind: 'pick' })
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function check(picked: File) {
    setFile(picked)
    setError(null)
    setStage({ kind: 'checking' })
    try {
      setStage({ kind: 'checked', result: await studentsApi.import(picked, true) })
    } catch (err) {
      setError(errorMessage(err))
      setStage({ kind: 'pick' })
    }
  }

  async function confirm() {
    if (!file) return
    setStage({ kind: 'importing' })
    try {
      const result = await studentsApi.import(file, false)
      if (result.imported) {
        setStage({ kind: 'done', imported: result.imported })
        onImported()
      } else setStage({ kind: 'checked', result }) // something changed since the check
    } catch (err) {
      setError(errorMessage(err))
      setStage({ kind: 'pick' })
    }
  }

  async function template() {
    setDownloading(true)
    setError(null)
    try {
      await studentsApi.downloadTemplate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setStage({ kind: 'pick' })
    if (input.current) input.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal aria-labelledby="import-title">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id="import-title" className="text-xl font-extrabold">
              Import Students
            </h2>
            <p className="text-sm">Add many students at once from Excel or CSV.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}

          {stage.kind === 'done' ? (
            <div className="py-6 text-center">
              <CircleCheck className="mx-auto size-14 text-emerald-500" />
              <p className="mt-3 text-xl font-extrabold text-ink">{stage.imported} students imported</p>
              <p className="mt-1 text-sm">They’re now in your student list with their Student IDs.</p>
            </div>
          ) : (
            <>
              <ol className="grid gap-3 sm:grid-cols-2">
                <li className="rounded-xl bg-sky-50 p-4 ring-1 ring-sky-100">
                  <p className="text-xs font-extrabold tracking-wider text-brand uppercase">Step 1</p>
                  <p className="mt-1 font-bold text-ink">Download the template</p>
                  <p className="mt-0.5 text-sm">It has your classes and sections as dropdowns, and an Instructions sheet.</p>
                  <button onClick={() => void template()} disabled={downloading} className="btn-outline mt-3 py-2 text-sm">
                    {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download Template
                  </button>
                </li>
                <li className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100">
                  <p className="text-xs font-extrabold tracking-wider text-amber-600 uppercase">Step 2</p>
                  <p className="mt-1 font-bold text-ink">Fill it in and upload</p>
                  <p className="mt-0.5 text-sm">We check every row first. Nothing is saved until you confirm.</p>
                  <button onClick={() => input.current?.click()} className="btn-primary mt-3 py-2 text-sm" disabled={stage.kind !== 'pick' && stage.kind !== 'checked'}>
                    <Upload className="size-4" /> Upload File
                  </button>
                </li>
              </ol>
              <input
                ref={input}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void check(f)
                }}
              />

              {(stage.kind === 'checking' || stage.kind === 'importing') && (
                <p className="flex items-center justify-center gap-2 py-6 font-semibold text-ink">
                  <Loader2 className="size-5 animate-spin text-brand" />
                  {stage.kind === 'checking' ? `Checking ${file?.name}…` : 'Importing students…'}
                </p>
              )}

              {stage.kind === 'checked' && <CheckResult result={stage.result} fileName={file?.name ?? ''} />}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
          {stage.kind === 'checked' ? (
            <button onClick={reset} className="btn-outline border-line text-ink">
              <RotateCcw className="size-4" /> Choose Another File
            </button>
          ) : (
            <span />
          )}
          {stage.kind === 'done' ? (
            <button onClick={onClose} className="btn-primary">
              Done
            </button>
          ) : stage.kind === 'checked' && stage.result.errors.length === 0 ? (
            <button onClick={() => void confirm()} className="btn-primary">
              Import {stage.result.valid_rows} Student{stage.result.valid_rows === 1 ? '' : 's'}
            </button>
          ) : (
            <button onClick={onClose} className="btn-outline border-line text-ink">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckResult({ result, fileName }: { result: ImportResult; fileName: string }) {
  const ok = result.errors.length === 0
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-3 rounded-xl p-4 ring-1 ${ok ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
        <FileSpreadsheet className={`size-8 shrink-0 ${ok ? 'text-emerald-600' : 'text-rose-500'}`} />
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{fileName}</p>
          <p className="text-sm">
            {result.total_rows} row{result.total_rows === 1 ? '' : 's'} found ·{' '}
            <span className="font-bold text-emerald-700">{result.valid_rows} ready</span>
            {!ok && (
              <>
                {' '}
                · <span className="font-bold text-rose-600">{result.errors.length} problem{result.errors.length === 1 ? '' : 's'}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {ok ? (
        <div>
          <p className="mb-2 text-sm font-bold text-ink">Preview</p>
          <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
            {result.preview.map((p) => (
              <li key={p.row} className="flex justify-between px-4 py-2 text-sm">
                <span className="font-semibold text-ink">{p.full_name}</span>
                <span className="text-muted">
                  {p.class_name}
                  {p.section_name ? ` - ${p.section_name}` : ''}
                </span>
              </li>
            ))}
            {result.valid_rows > result.preview.length && (
              <li className="px-4 py-2 text-sm text-muted">and {result.valid_rows - result.preview.length} more…</li>
            )}
          </ul>
        </div>
      ) : (
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
            <CircleAlert className="size-4 text-rose-500" /> Fix these in your file, then upload it again
          </p>
          <div className="max-h-64 overflow-y-auto rounded-xl ring-1 ring-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-muted uppercase">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Column</th>
                  <th className="px-3 py-2">Problem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.errors.map((e, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-bold text-ink">{e.row}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{e.column}</td>
                    <td className="px-3 py-2">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
