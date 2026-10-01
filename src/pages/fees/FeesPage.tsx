import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AlarmClock, BadgePercent, CheckCircle2, Download, IndianRupee, Loader2, PartyPopper, Receipt, Search, Settings2, TriangleAlert, Wallet, X } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { ChargesTab } from '../../components/fees/ChargesTab'
import { MoneyCard, StatusPill, YearSelect } from '../../components/fees/FeeUi'
import { PaymentDialog } from '../../components/fees/PaymentDialog'
import { Avatar, PageBanner } from '../../components/students/StudentUi'
import { selectCls } from '../../components/students/StudentTable'
import { Pager } from '../../components/ui/Pager'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { usePermission } from '../../lib/auth'
import { METHODS, feesApi, inr, payTargets, shortDate, type FeeStudentRow, type FeeStudents, type Payments, type StudentFee } from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'

const STATUSES = ['', 'Overdue', 'Pending', 'Partial', 'Paid', 'No structure'] as const

export function FeesPage() {
  const token = useAccessToken()
  const access = usePermission()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'payments' ? 'payments' : params.get('tab') === 'charges' ? 'charges' : 'students'
  const yearId = params.get('year') ?? ''
  const [receipt, setReceipt] = useState<{ id: string; text: string } | null>(null)
  const [downloading, setDownloading] = useState(false)

  const update = (patch: Record<string, string | number>, resetPage = true) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v === '' || v == null) next.delete(k)
          else next.set(k, String(v))
        }
        if (resetPage) next.delete('page')
        return next
      },
      { replace: true },
    )

  if (!token) return <Navigate to="/login" replace />
  if (!access.ready) {
    return (
      <AppShell academicYear={options?.activeYear?.name}>
        <div className="m-6 h-64 animate-pulse rounded-2xl bg-slate-200/60" />
      </AppShell>
    )
  }
  if (!access.can('fees.view')) {
    return (
      <AppShell academicYear={options?.activeYear?.name}>
        <p className="m-6 rounded-xl bg-amber-50 px-4 py-3 font-semibold text-amber-800 ring-1 ring-amber-200">You don't have access to fees — ask the school owner.</p>
      </AppShell>
    )
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <PageBanner title="Fee Management" subtitle="Track what's collected and what's pending, record payments and share receipts." message="Every rupee, in its place!" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex max-w-full overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
            {(
              [
                ['students', 'Students & dues', Wallet],
                ['charges', 'Additional charges', PartyPopper],
                ['payments', 'Payments received', Receipt],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setParams({ ...(key !== 'students' ? { tab: key } : {}), ...(yearId ? { year: yearId } : {}) }, { replace: true })}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'}`}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <YearSelect years={options?.years} value={yearId || options?.activeYear?.id || ''} onChange={(id) => update({ year: id })} />
            <Link to={`/fees/structure${yearId ? `?year=${yearId}` : ''}`} className="btn-outline" hidden={!access.can('fees.manage')}>
              <Settings2 className="size-4" /> Fee Structure
            </Link>
          </div>
        </div>

        {receipt && (
          <p role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" /> {receipt.text}
            </span>
            <span className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setDownloading(true)
                  try {
                    await feesApi.receipt(receipt.id)
                  } finally {
                    setDownloading(false)
                  }
                }}
                className="btn-primary py-1.5 text-sm"
              >
                {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download receipt
              </button>
              <button onClick={() => setReceipt(null)} aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </span>
          </p>
        )}

        {tab === 'students' ? (
          <StudentsTab params={params} update={update} yearId={yearId} onPaid={setReceipt} />
        ) : tab === 'charges' ? (
          <ChargesTab yearId={yearId} canManage={access.can('fees.manage')} />
        ) : (
          <PaymentsTab params={params} update={update} yearId={yearId} />
        )}
      </div>
    </AppShell>
  )
}

type TabProps = {
  params: URLSearchParams
  update: (patch: Record<string, string | number>, resetPage?: boolean) => void
  yearId: string
}

function useDebouncedSearch(initial: string, onChange: (v: string) => void) {
  const [value, setValue] = useState(initial)
  // Only a real change of the text updates the URL - a stray "no change"
  // update (e.g. effects re-run in dev) could undo a navigation away.
  const sent = useRef(initial.trim())
  useEffect(() => {
    const next = value.trim()
    if (next === sent.current) return
    const t = setTimeout(() => {
      sent.current = next
      onChange(next)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return [value, setValue] as const
}

function StudentsTab({ params, update, yearId, onPaid }: TabProps & { onPaid: (r: { id: string; text: string }) => void }) {
  const options = useSchoolOptions()
  const [data, setData] = useState<FeeStudents | null>(null)
  const [loadedKey, setLoadedKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [paying, setPaying] = useState<StudentFee | null>(null)
  const canCollect = usePermission().can('fees.collect')
  const [opening, setOpening] = useState<string | null>(null)

  async function collect(row: FeeStudentRow) {
    setOpening(row.id)
    try {
      setPaying(await feesApi.student(row.id, yearId || undefined))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setOpening(null)
    }
  }
  const filters = useMemo(
    () => ({
      year_id: yearId,
      class_id: params.get('class_id') ?? '',
      section_id: params.get('section_id') ?? '',
      status: params.get('status') ?? '',
      q: params.get('q') ?? '',
      sort: params.get('sort') ?? 'class',
      page: Number(params.get('page') ?? 1),
      page_size: 20,
    }),
    [params, yearId],
  )
  const [search, setSearch] = useDebouncedSearch(filters.q, (q) => update({ q }))

  const key = `${JSON.stringify(filters)}#${reload}`
  const loading = loadedKey !== key
  useEffect(() => {
    let live = true
    feesApi
      .students(filters)
      .then((d) => live && (setData(d), setError(null)))
      .catch((err) => live && setError(errorMessage(err)))
      .finally(() => live && setLoadedKey(key))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const s = data?.summary
  const sections = options?.classes.find((c) => c.id === filters.class_id)?.sections ?? []
  const pct = s && s.expected ? Math.round((s.collected / s.expected) * 100) : 0

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MoneyCard
          label="Total due (expected)"
          value={s ? inr(s.expected) : '—'}
          hint={s && `${s.students} students · incl. ${inr(s.charges_expected)} additional charges · ${inr(s.concessions)} concessions`}
          icon={IndianRupee}
          tone="bg-sky-100 text-brand"
        />
        <MoneyCard label="Collected" value={s ? inr(s.collected) : '—'} icon={Wallet} tone="bg-emerald-100 text-emerald-600">
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {pct}% collected · {s?.paid_students ?? 0} fully paid
          </p>
        </MoneyCard>
        <MoneyCard label="Pending" value={s ? inr(s.pending) : '—'} hint="Still to be paid this year" icon={AlarmClock} tone="bg-amber-100 text-amber-600" />
        <MoneyCard
          label="Overdue"
          value={s ? inr(s.overdue) : '—'}
          hint={s && `${s.overdue_students} student${s.overdue_students === 1 ? '' : 's'} past a due date`}
          icon={TriangleAlert}
          tone="bg-rose-100 text-rose-500"
        />
      </section>

      {s && s.no_structure_students > 0 && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <BadgePercent className="size-4" />
          {s.no_structure_students} student{s.no_structure_students === 1 ? ' is' : 's are'} in a class with no fee set yet.
          <Link to={`/fees/structure${yearId ? `?year=${yearId}` : ''}`} className="font-bold text-brand underline">
            Set up fee structure
          </Link>
        </p>
      )}

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Fee status">
          {STATUSES.map((st) => (
            <button
              key={st || 'all'}
              onClick={() => update({ status: st })}
              aria-pressed={filters.status === st}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ${filters.status === st ? 'bg-ink text-white ring-ink' : 'text-ink/70 ring-line hover:bg-slate-50'}`}
            >
              {st || 'All'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-60 flex-[2]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or admission number…" aria-label="Search students" className={`${selectCls} w-full pl-9`} />
          </div>
          <select aria-label="Class" value={filters.class_id} onChange={(e) => update({ class_id: e.target.value, section_id: '' })} className={`${selectCls} flex-1`}>
            <option value="">All Classes</option>
            {options?.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select aria-label="Section" value={filters.section_id} onChange={(e) => update({ section_id: e.target.value })} disabled={!filters.class_id} className={`${selectCls} flex-1 disabled:bg-slate-50`}>
            <option value="">All Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
          <select aria-label="Sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className={`${selectCls} flex-1`}>
            <option value="class">Sort: Class</option>
            <option value="balance">Sort: Highest balance</option>
            <option value="due">Sort: Next due date</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        <div className="overflow-x-auto">
          <table className={`w-full min-w-[980px] text-left text-sm ${loading && data ? 'opacity-60' : ''}`}>
            <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3 text-right">Total due</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Next due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.items.map((r) => (
                <tr key={r.id} aria-label={r.full_name} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <Link to={`/fees/students/${r.id}${yearId ? `?year=${yearId}` : ''}`} className="flex items-center gap-3">
                      <Avatar name={r.full_name} url={r.photo_url} gender={r.gender} size="size-9" />
                      <span className="leading-tight">
                        <span className="block font-bold text-ink hover:text-brand">{r.full_name}</span>
                        <span className="text-xs text-muted">{r.admission_no}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">{[r.class_name, r.section_name].filter(Boolean).join(' - ') || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'No structure' ? '—' : inr(r.net)}
                    {r.charges_due > 0 && <p className="text-[11px] text-violet-600">incl. {inr(r.charges_due)} charges</p>}
                    {r.discount > 0 && <p className="text-[11px] text-emerald-600">−{inr(r.discount)} concession</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700">{inr(r.paid)}</td>
                  <td className="px-4 py-3 text-right font-bold">{r.status === 'No structure' ? '—' : inr(r.balance)}</td>
                  <td className="px-4 py-3">
                    {r.next_due_name ? (
                      <span className={r.status === 'Overdue' ? 'text-rose-600' : ''}>
                        <span className="font-semibold">{inr(r.next_due_amount)}</span>
                        <span className="block text-xs text-muted">
                          {r.next_due_name}
                          {r.next_due_date ? ` · ${shortDate(r.next_due_date)}` : ''}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.balance > 0 && r.status !== 'No structure' && canCollect ? (
                      <button onClick={() => void collect(r)} disabled={opening === r.id} className="btn-primary px-3 py-1.5 text-sm">
                        {opening === r.id && <Loader2 className="size-4 animate-spin" />} Collect
                      </button>
                    ) : (
                      <Link to={`/fees/students/${r.id}${yearId ? `?year=${yearId}` : ''}`} className="text-sm font-bold text-brand">
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && !data && <div className="m-4 h-40 animate-pulse rounded-xl bg-slate-100" />}
        {data && data.items.length === 0 && <p className="py-12 text-center text-muted">No students match.</p>}
        {data && <Pager page={filters.page} pageSize={filters.page_size} total={data.total} onPage={(page) => update({ page }, false)} />}
      </section>

      {paying && (
        <PaymentDialog
          studentName={paying.full_name}
          targets={payTargets(paying)}
          onClose={() => setPaying(null)}
          onSubmit={async (input) => {
            const out = await feesApi.pay(paying.student_id, input, yearId || undefined)
            const p = out.payments.find((x) => x.id === out.last_payment_id)
            if (p) onPaid({ id: p.id, text: `${inr(p.amount)} received from ${out.full_name} for ${p.paid_for} · receipt ${p.receipt_no}` })
            setReload((n) => n + 1)
          }}
        />
      )}
    </>
  )
}

function PaymentsTab({ params, update, yearId }: TabProps) {
  const [data, setData] = useState<Payments | null>(null)
  const [error, setError] = useState<string | null>(null)
  const filters = useMemo(
    () => ({
      year_id: yearId,
      from: params.get('from') ?? '',
      to: params.get('to') ?? '',
      method: params.get('method') ?? '',
      q: params.get('q') ?? '',
      include_void: params.get('void') === '1',
      page: Number(params.get('page') ?? 1),
      page_size: 20,
    }),
    [params, yearId],
  )
  const [search, setSearch] = useDebouncedSearch(filters.q, (q) => update({ q }))

  useEffect(() => {
    let live = true
    feesApi.payments(filters).then(
      (d) => live && (setData(d), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [filters])

  return (
    <>
      <section className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <div className="relative min-w-56 flex-[2]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Student, receipt or reference no…" aria-label="Search payments" className={`${selectCls} w-full pl-9`} />
        </div>
        <label className="text-xs font-bold text-muted">
          From
          <input type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} aria-label="From date" className={`${selectCls} mt-1 block`} />
        </label>
        <label className="text-xs font-bold text-muted">
          To
          <input type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} aria-label="To date" className={`${selectCls} mt-1 block`} />
        </label>
        <select aria-label="Payment mode" value={filters.method} onChange={(e) => update({ method: e.target.value })} className={selectCls}>
          <option value="">All modes</option>
          {METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 pb-2.5 text-sm font-semibold">
          <input type="checkbox" checked={filters.include_void} onChange={(e) => update({ void: e.target.checked ? '1' : '' })} className="size-4 accent-brand" /> Show voided
        </label>
      </section>

      {data && (
        <section className="flex flex-wrap gap-3">
          <div className="rounded-2xl bg-emerald-50 px-5 py-3 ring-1 ring-emerald-100">
            <p className="text-xs font-bold text-emerald-700 uppercase">Collected{filters.from || filters.to ? ' in range' : ' this year'}</p>
            <p className="font-display text-2xl font-extrabold text-emerald-800">{inr(data.collected)}</p>
          </div>
          {Object.entries(data.by_method).map(([m, v]) => (
            <div key={m} className="rounded-2xl bg-white px-5 py-3 ring-1 ring-line/60">
              <p className="text-xs font-bold text-muted uppercase">{m}</p>
              <p className="font-display text-xl font-extrabold">{inr(v)}</p>
            </div>
          ))}
        </section>
      )}

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">For</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Received by</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.items.map((p) => (
                <tr key={p.id} aria-label={p.receipt_no} className={p.status === 'Void' ? 'text-muted line-through decoration-rose-300' : ''}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{p.receipt_no}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{shortDate(p.paid_on)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/fees/students/${p.student_id}${yearId ? `?year=${yearId}` : ''}`} className="font-bold text-ink hover:text-brand">
                      {p.student_name}
                    </Link>
                    <span className="block text-xs text-muted">{p.class_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.charge_line_id ? 'font-semibold text-violet-700' : ''}>{p.paid_for}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.method}
                    {p.reference && <span className="block text-xs text-muted">{p.reference}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{inr(p.amount)}</td>
                  <td className="px-4 py-3">{p.received_by ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => void feesApi.receipt(p.id)} className="inline-flex items-center gap-1 text-sm font-bold text-brand no-underline" aria-label={`Receipt ${p.receipt_no}`}>
                      <Download className="size-4" /> Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data && !error && <div className="m-4 h-32 animate-pulse rounded-xl bg-slate-100" />}
        {data && data.items.length === 0 && <p className="py-12 text-center text-muted">No payments recorded yet.</p>}
        {data && <Pager page={filters.page} pageSize={filters.page_size} total={data.total} onPage={(page) => update({ page }, false)} />}
      </section>
    </>
  )
}
