import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Banknote, Contact, KeyRound, Loader2, Plus, Search, UserCheck, UserMinus, Users } from 'lucide-react'

import { AppShell } from '../../components/app/AppShell'
import { MoneyCard, StatusPill } from '../../components/fees/FeeUi'
import { Avatar, PageBanner } from '../../components/students/StudentUi'
import { selectCls } from '../../components/students/StudentTable'
import { errorMessage } from '../../lib/api'
import { usePermission } from '../../lib/auth'
import { useAccessToken } from '../../lib/auth-store'
import { inr, todayIso } from '../../lib/fees'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { monthLabel, payrollApi, staffApi, type RunRow, type StaffRow } from '../../lib/staff'

const TYPES = ['Teacher', 'Shadow Teacher', 'Nanny / Helper', 'Office Admin', 'Accountant', 'Driver', 'Other']

export function StaffPage() {
  const token = useAccessToken()
  const access = usePermission()
  const options = useSchoolOptions()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'payroll' ? 'payroll' : 'staff'

  if (!token) return <Navigate to="/login" replace />
  if (access.ready && !access.isOwner) {
    return (
      <AppShell academicYear={options?.activeYear?.name}>
        <p className="m-6 rounded-xl bg-amber-50 px-4 py-3 font-semibold text-amber-800 ring-1 ring-amber-200">Staff and payroll are managed by the school owner.</p>
      </AppShell>
    )
  }

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <PageBanner title="Staff" subtitle="Onboard your team, decide what each person can do, and run monthly payroll." message="Together we build brighter futures!" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
            {(
              [
                ['staff', 'Staff', Users],
                ['payroll', 'Payroll', Banknote],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setParams(key === 'payroll' ? { tab: 'payroll' } : {}, { replace: true })}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'}`}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          {tab === 'staff' && (
            <Link to="/staff/new" className="btn-primary px-5 py-3">
              <Plus className="size-5" /> Add Staff
            </Link>
          )}
        </div>
        {access.ready && (tab === 'staff' ? <StaffList /> : <PayrollList />)}
      </div>
    </AppShell>
  )
}

function StaffList() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<{ items: StaffRow[]; total: number; summary: Record<string, number> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const statusParam = params.get('status') ?? 'Active' // 'all' = everyone
  const filters = useMemo(
    () => ({ q: params.get('q') ?? '', staff_type: params.get('type') ?? '', status: statusParam === 'all' ? '' : statusParam }),
    [params, statusParam],
  )
  const [search, setSearch] = useState(filters.q)
  const update = (patch: Record<string, string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: true },
    )

  useEffect(() => {
    if (search.trim() === filters.q) return // nothing changed (also the run on mount)
    const t = setTimeout(() => update({ q: search.trim() }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  useEffect(() => {
    let live = true
    staffApi.list(filters).then(
      (d) => live && (setData(d), setError(null)),
      (err) => live && setError(errorMessage(err)),
    )
    return () => {
      live = false
    }
  }, [filters])

  const s = data?.summary
  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <MoneyCard label="Total staff" value={String(s?.total ?? '—')} icon={Users} tone="bg-sky-100 text-brand" />
        <MoneyCard label="Teachers" value={String(s?.teachers ?? '—')} icon={Contact} tone="bg-violet-100 text-violet-600" />
        <MoneyCard label="Support staff" value={String(s?.support ?? '—')} icon={UserCheck} tone="bg-amber-100 text-amber-600" />
        <MoneyCard label="With portal login" value={String(s?.with_login ?? '—')} icon={KeyRound} tone="bg-emerald-100 text-emerald-600" />
        <MoneyCard label="Relieved" value={String(s?.relieved ?? '—')} icon={UserMinus} tone="bg-slate-100 text-muted" />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Role">
          {['', ...TYPES].map((t) => (
            <button
              key={t || 'all'}
              onClick={() => update({ type: t })}
              aria-pressed={filters.staff_type === t}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ${filters.staff_type === t ? 'bg-ink text-white ring-ink' : 'text-ink/70 ring-line hover:bg-slate-50'}`}
            >
              {t || 'All roles'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-60 flex-[2]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, phone, email or username…" aria-label="Search staff" className={`${selectCls} w-full pl-9`} />
          </div>
          <select aria-label="Status" value={statusParam} onChange={(e) => update({ status: e.target.value === 'Active' ? '' : e.target.value })} className={`${selectCls} flex-1`}>
            <option value="Active">Current staff</option>
            <option value="Relieved">Relieved</option>
            <option value="all">Everyone</option>
          </select>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Class teacher of</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Portal login</th>
                <th className="px-4 py-3 text-right">Monthly salary</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.items.map((r) => (
                <tr key={r.id} aria-label={r.full_name} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <Link to={`/staff/${r.id}`} className="flex items-center gap-3">
                      <Avatar name={r.full_name} url={r.photo_url} gender={r.gender} size="size-9" />
                      <span className="leading-tight">
                        <span className="block font-bold text-ink hover:text-brand">{r.full_name}</span>
                        <span className="text-xs text-muted">{r.employee_code}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${r.staff_type.includes('Teacher') ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                      {r.staff_type}
                    </span>
                    {r.designation && r.designation !== r.staff_type && <span className="mt-0.5 block text-xs text-muted">{r.designation}</span>}
                  </td>
                  <td className="px-4 py-3">{r.class_teacher_of.join(', ') || '—'}</td>
                  <td className="px-4 py-3">{r.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.login_active ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        On{r.username ? ` · @${r.username}` : ''}
                      </span>
                    ) : r.has_login ? (
                      <span className="text-xs font-semibold text-rose-600">Turned off</span>
                    ) : (
                      <span className="text-xs text-muted">No login</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{r.monthly_salary != null ? inr(r.monthly_salary) : <span className="text-xs text-amber-700">Not set</span>}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status === 'Active' ? 'Active' : 'Relieved'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data && !error && <div className="m-4 h-32 animate-pulse rounded-xl bg-slate-100" />}
        {data && data.items.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-lg font-bold">No staff here yet</p>
            <p className="text-sm text-muted">Add your teachers, shadow teachers, nannies and office team.</p>
          </div>
        )}
      </section>
    </>
  )
}

function PayrollList() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<RunRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState(() => todayIso().slice(0, 7))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    payrollApi.runs().then(setRuns, (err) => setError(errorMessage(err)))
  }, [])

  async function start() {
    setBusy(true)
    setError(null)
    try {
      const existing = runs?.find((r) => r.month === month)
      navigate(`/staff/payroll/${existing ? existing.id : (await payrollApi.createRun(month)).id}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <>
      <section className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <label className="text-sm font-bold">
          Month
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Payroll month" className={`${selectCls} mt-1 block`} />
        </label>
        <button onClick={() => void start()} disabled={busy || !month} className="btn-primary">
          {busy && <Loader2 className="size-4 animate-spin" />} {runs?.some((r) => r.month === month) ? 'Open payroll' : 'Start payroll'} for {month ? monthLabel(month) : '…'}
        </button>
        <p className="text-sm text-muted">Everyone with a salary set is added; then add bonuses, unpaid leave and approve.</p>
      </section>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
      <section className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3 text-right">Net pay</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {runs?.map((r) => (
              <tr key={r.id} aria-label={r.month} className="cursor-pointer hover:bg-slate-50/70" onClick={() => navigate(`/staff/payroll/${r.id}`)}>
                <td className="px-4 py-3 font-bold text-brand">{monthLabel(r.month)}</td>
                <td className="px-4 py-3">{r.staff}</td>
                <td className="px-4 py-3 text-right font-semibold">{inr(r.net)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{inr(r.paid)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status === 'Approved' ? (r.paid >= r.net && r.net > 0 ? 'Paid' : 'Approved') : 'Draft'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs && runs.length === 0 && <p className="py-10 text-center text-muted">No payroll yet — start with this month.</p>}
      </section>
    </>
  )
}
