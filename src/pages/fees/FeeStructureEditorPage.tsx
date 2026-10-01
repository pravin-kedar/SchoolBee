import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, CircleAlert, CircleCheck, Copy, Loader2, Plus, Save, Trash2, TriangleAlert, X } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { selectCls } from '../../components/students/StudentTable'
import { Dialog } from '../../components/ui/Dialog'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { feesApi, inr, todayIso, type FeeClassRow, type FeeStructure } from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'

type ItemRow = { key: number; name: string; amount: string; optional: boolean }
type InstRow = { key: number; name: string; due_date: string; amount: string }

const COMMON = [
  ['Admission Fee', false],
  ['Tuition Fee', false],
  ['Annual Charges', false],
  ['Activity Fee', false],
  ['Books & Stationery', false],
  ['Uniform', false],
  ['Transport', true],
  ['Meals', true],
] as const

const PLANS = [
  { n: 1, label: 'One-time' },
  { n: 2, label: '2 installments' },
  { n: 3, label: '3 terms' },
  { n: 4, label: '4 quarters' },
  { n: 12, label: 'Monthly' },
]

let seq = 0
const nextKey = () => ++seq
const toInt = (s: string) => (s.trim() === '' ? 0 : Math.max(0, Math.floor(Number(s.replace(/[^\d]/g, '')) || 0)))
const inputCls = `${selectCls} w-full`

function addMonths(iso: string, months: number, day = 10) {
  const [y, m] = iso.split('-').map(Number)
  const d = new Date(y, m - 1 + months, day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function FeeStructureEditorPage() {
  const { classId = '' } = useParams()
  const [params] = useSearchParams()
  const yearParam = params.get('year') ?? undefined
  const token = useAccessToken()
  const navigate = useNavigate()
  const options = useSchoolOptions()
  const [structure, setStructure] = useState<FeeStructure | null>(null)
  const [classes, setClasses] = useState<FeeClassRow[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [insts, setInsts] = useState<InstRow[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const loaded = useRef(false)

  function load(s: FeeStructure, fresh = true) {
    setItems(s.items.map((i) => ({ key: nextKey(), name: i.name, amount: String(i.amount), optional: i.optional })))
    setInsts(s.installments.map((i) => ({ key: nextKey(), name: i.name, due_date: i.due_date, amount: String(i.amount) })))
    if (fresh) {
      setStructure(s)
      setNotes(s.notes ?? '')
      setDirty(false)
    } else {
      setDirty(true)
    }
  }

  useEffect(() => {
    let live = true
    feesApi.structure(classId, yearParam).then(
      (s) => {
        if (!live) return
        load(s)
        if (!s.exists && !loaded.current) {
          // A sensible start for a new structure.
          setItems([
            { key: nextKey(), name: 'Admission Fee', amount: '', optional: false },
            { key: nextKey(), name: 'Tuition Fee', amount: '', optional: false },
          ])
        }
        loaded.current = true
      },
      (err) => live && setError(errorMessage(err)),
    )
    feesApi.structures(yearParam).then((d) => live && setClasses(d.classes), () => undefined)
    return () => {
      live = false
    }
  }, [classId, yearParam])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const mandatory = useMemo(() => items.filter((i) => !i.optional).reduce((s, i) => s + toInt(i.amount), 0), [items])
  const optionalTotal = useMemo(() => items.filter((i) => i.optional).reduce((s, i) => s + toInt(i.amount), 0), [items])
  const assigned = useMemo(() => insts.reduce((s, i) => s + toInt(i.amount), 0), [insts])
  const year = options?.years.find((y) => y.id === structure?.academic_year_id)

  if (!token) return <Navigate to="/login" replace />

  const touch = () => (setDirty(true), setNotice(null))
  const setItem = (key: number, patch: Partial<ItemRow>) => (setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r))), touch())
  const setInst = (key: number, patch: Partial<InstRow>) => (setInsts((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r))), touch())

  function applyPlan(n: number) {
    touch()
    if (n === 1) return setInsts([])
    const start = year?.start_date ?? todayIso()
    const step = Math.floor(12 / n)
    const each = Math.floor(mandatory / n / 100) * 100
    const monthName = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    const rows = Array.from({ length: n }, (_, i) => {
      const due = addMonths(start, i * step)
      const name = n === 12 ? monthName(due) : n === 3 ? `Term ${i + 1}` : n === 4 ? `Quarter ${i + 1}` : `Installment ${i + 1}`
      return { key: nextKey(), name, due_date: due, amount: String(each) }
    })
    rows[0].amount = String(mandatory - each * (n - 1)) // first one takes the remainder (usually with admission)
    setInsts(rows)
  }

  const names = items.map((i) => i.name.trim().toLowerCase()).filter(Boolean)
  const problems: string[] = []
  if (!items.length) problems.push('Add at least one fee item')
  if (items.some((i) => !i.name.trim())) problems.push('Every fee item needs a name')
  if (new Set(names).size !== names.length) problems.push('Two fee items have the same name')
  if (mandatory <= 0) problems.push('Add an amount that every student pays')
  if (insts.some((i) => !i.name.trim() || !i.due_date)) problems.push('Every installment needs a name and a due date')
  if (insts.length && assigned !== mandatory)
    problems.push(assigned < mandatory ? `${inr(mandatory - assigned)} of the fee isn't in any installment yet` : `Installments are ${inr(assigned - mandatory)} more than the fee`)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const s = await feesApi.saveStructure(
        classId,
        {
          items: items.map((i) => ({ name: i.name.trim(), amount: toInt(i.amount), optional: i.optional })),
          installments: insts.map((i) => ({ name: i.name.trim(), due_date: i.due_date, amount: toInt(i.amount) })),
          notes: notes.trim() || null,
        },
        yearParam,
      )
      load(s)
      setNotice(`Saved — ${s.class_name} pays ${inr(s.total)} a year${s.installments.length ? ` in ${s.installments.length} installments` : ''}.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function copyFrom(otherId: string) {
    if (!otherId) return
    try {
      load(await feesApi.structure(otherId, yearParam), false)
      setNotice(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const others = classes.filter((c) => c.class_id !== classId && c.total !== null)
  const backTo = `/fees/structure${structure ? `?year=${structure.academic_year_id}` : ''}`

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link to={backTo} className="inline-flex items-center gap-1 text-sm font-bold text-brand">
              <ArrowLeft className="size-4" /> Fee Structure
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{structure ? `${structure.class_name} fee · ${structure.academic_year}` : 'Class fee'}</h1>
            <p className="mt-0.5">
              {structure ? `${structure.students} active student${structure.students === 1 ? '' : 's'} in this class.` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {others.length > 0 && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Copy className="size-4 text-muted" />
                <select aria-label="Copy from class" value="" onChange={(e) => void copyFrom(e.target.value)} className={selectCls}>
                  <option value="">Copy from…</option>
                  {others.map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_name} ({inr(c.total ?? 0)})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button onClick={() => void save()} disabled={busy || problems.length > 0 || !dirty} className="btn-primary disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save fee structure
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </p>
        )}
        {notice && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">{notice}</p>}
        {structure && structure.paying_students > 0 && (
          <p className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {structure.paying_students} student{structure.paying_students === 1 ? ' has' : 's have'} already paid. Changes update their balances and
            installments right away.
          </p>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-2">
          {/* ------------------------------ items ------------------------------ */}
          <section className="space-y-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Fee items">
            <div>
              <h2 className="text-lg font-bold">1. Fee items</h2>
              <p className="text-sm text-muted">Optional items (e.g. Transport) are only charged to students you add them for.</p>
            </div>
            <ul className="space-y-2">
              {items.map((i) => (
                <li key={i.key} className="grid grid-cols-[1fr_9rem_auto] items-center gap-2 sm:grid-cols-[1fr_9rem_auto_auto]" aria-label={`Item ${i.name || 'new'}`}>
                  <input value={i.name} maxLength={80} onChange={(e) => setItem(i.key, { name: e.target.value })} placeholder="e.g. Tuition Fee" aria-label="Item name" className={inputCls} />
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">₹</span>
                    <input inputMode="numeric" value={i.amount} onChange={(e) => setItem(i.key, { amount: e.target.value.replace(/[^\d]/g, '') })} placeholder="0" aria-label="Item amount" className={`${inputCls} pl-7 text-right`} />
                  </div>
                  <label className="order-last col-span-2 flex items-center gap-2 text-sm font-semibold whitespace-nowrap sm:order-none sm:col-span-1">
                    <input type="checkbox" checked={i.optional} onChange={(e) => setItem(i.key, { optional: e.target.checked })} className="size-4 accent-brand" aria-label={`${i.name} optional`} />
                    Optional
                  </label>
                  <button onClick={() => (setItems((rows) => rows.filter((r) => r.key !== i.key)), touch())} className="grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Remove ${i.name || 'item'}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => (setItems((r) => [...r, { key: nextKey(), name: '', amount: '', optional: false }]), touch())} className="btn-outline py-1.5 text-sm">
                <Plus className="size-4" /> Add item
              </button>
              {COMMON.filter(([n]) => !names.includes(n.toLowerCase())).map(([n, optional]) => (
                <button
                  key={n}
                  onClick={() => (setItems((r) => [...r, { key: nextKey(), name: n, amount: '', optional }]), touch())}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink hover:bg-slate-200"
                >
                  + {n}
                  {optional ? ' (optional)' : ''}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-line">
              <div>
                <p className="text-muted">Every student pays</p>
                <p className="font-display text-xl font-extrabold">{inr(mandatory)}</p>
              </div>
              <div>
                <p className="text-muted">Optional extras</p>
                <p className="font-display text-xl font-extrabold">{inr(optionalTotal)}</p>
              </div>
            </div>
            <label className="block text-sm font-bold">
              Notes <span className="font-normal text-muted">(optional, for staff)</span>
              <textarea rows={2} maxLength={500} value={notes} onChange={(e) => (setNotes(e.target.value), touch())} className={`${inputCls} mt-1 resize-none font-normal`} aria-label="Notes" />
            </label>
          </section>

          {/* --------------------------- installments --------------------------- */}
          <section className="space-y-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Installments">
            <div>
              <h2 className="text-lg font-bold">2. Installments</h2>
              <p className="text-sm text-muted">
                How the {inr(mandatory)} is paid over the year. A student's own total (with concession or optional items) is split in the same proportions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PLANS.map((p) => (
                <button
                  key={p.n}
                  type="button"
                  onClick={() => applyPlan(p.n)}
                  disabled={mandatory <= 0 && p.n > 1}
                  aria-pressed={p.n === 1 ? insts.length === 0 : insts.length === p.n}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 disabled:opacity-40 ${(p.n === 1 ? insts.length === 0 : insts.length === p.n) ? 'bg-sky-50 text-brand ring-brand' : 'ring-line hover:bg-slate-50'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {insts.length === 0 ? (
              <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-muted ring-1 ring-line">
                <CalendarClock className="size-4" /> Paid in full, any time in the year. Pick a plan above to split it into installments.
              </p>
            ) : (
              <ul className="space-y-2">
                {insts.map((i) => (
                  <li key={i.key} className="grid grid-cols-[1fr_10rem_8rem_auto] items-center gap-2" aria-label={`Installment ${i.name}`}>
                    <input value={i.name} maxLength={60} onChange={(e) => setInst(i.key, { name: e.target.value })} aria-label="Installment name" className={inputCls} />
                    <input type="date" value={i.due_date} onChange={(e) => setInst(i.key, { due_date: e.target.value })} aria-label="Due date" className={inputCls} />
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">₹</span>
                      <input inputMode="numeric" value={i.amount} onChange={(e) => setInst(i.key, { amount: e.target.value.replace(/[^\d]/g, '') })} aria-label="Installment amount" className={`${inputCls} pl-7 text-right`} />
                    </div>
                    <button onClick={() => (setInsts((rows) => rows.filter((r) => r.key !== i.key)), touch())} className="grid size-9 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Remove ${i.name}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {insts.length > 0 && (
              <button
                onClick={() => (setInsts((r) => [...r, { key: nextKey(), name: `Installment ${r.length + 1}`, due_date: r.length ? addMonths(r[r.length - 1].due_date, 1) : '', amount: '' }]), touch())}
                className="btn-outline py-1.5 text-sm"
              >
                <Plus className="size-4" /> Add installment
              </button>
            )}

            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${problems.length ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'}`} role="status" aria-label="Structure check">
              {problems.length ? (
                <>
                  <CircleAlert className="size-4 shrink-0" /> {problems[0]}
                </>
              ) : (
                <>
                  <CircleCheck className="size-4 shrink-0" /> {insts.length ? `${insts.length} installments add up to ${inr(mandatory)}` : `One payment of ${inr(mandatory)}`}
                </>
              )}
            </div>
          </section>
        </div>

        {structure?.exists && (
          <button onClick={() => setDeleting(true)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
            <Trash2 className="size-4" /> Remove {structure.class_name} fee structure
          </button>
        )}
      </div>

      {deleting && structure && (
        <Dialog
          title={`Remove the ${structure.class_name} fee?`}
          subtitle="Students in this class will show as “No structure” until you set it up again. Not possible once anyone has paid."
          submitLabel="Remove"
          danger
          onClose={() => setDeleting(false)}
          onSubmit={async () => {
            await feesApi.deleteStructure(classId, yearParam)
            setDirty(false)
            navigate(backTo, { replace: true })
          }}
        />
      )}
    </AppShell>
  )
}
