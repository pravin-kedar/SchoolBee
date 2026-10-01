import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, CalendarCheck, FileText, GraduationCap, LockOpen, School, Users } from 'lucide-react'

import { Card, SchoolStatus, Stat, ZapShell } from '../../components/zap/ZapShell'
import { Dialog } from '../../components/ui/Dialog'
import { ZapLicenseCard } from '../../components/zap/ZapLicenseCard'
import { errorMessage } from '../../lib/api'
import { dateTime, timeAgo, zap, type ZapMember, type ZapSchoolDetail } from '../../lib/zap'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

type Blocking = { kind: 'school' } | { kind: 'user'; member: ZapMember }

export function ZapSchoolPage() {
  const { id = '' } = useParams()
  const [data, setData] = useState<ZapSchoolDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [blocking, setBlocking] = useState<Blocking | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    zap.school(id).then(setData, (err) => setError(errorMessage(err)))
  }, [id])

  async function run(key: string, fn: () => Promise<ZapSchoolDetail>) {
    setBusy(key)
    setError(null)
    try {
      setData(await fn())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const s = data?.school
  const blocked = Boolean(s?.blocked_at)

  return (
    <ZapShell
      title={s?.name ?? 'School'}
      subtitle={s ? `Joined ${dateTime(s.created_at, false)}` : undefined}
      actions={
        s &&
        (blocked ? (
          <button onClick={() => void run('school', () => zap.unblockSchool(id))} disabled={busy === 'school'} className="btn bg-emerald-600 text-white hover:bg-emerald-700">
            <LockOpen className="size-4" /> Unblock school
          </button>
        ) : (
          <button onClick={() => setBlocking({ kind: 'school' })} className="btn bg-rose-600 text-white hover:bg-rose-700">
            <Ban className="size-4" /> Block school
          </button>
        ))
      }
    >
      <Link to="/zap/schools" className="inline-flex items-center gap-1 text-sm font-bold text-brand">
        <ArrowLeft className="size-4" /> All schools
      </Link>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {s && blocked && (
        <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200">
          <Ban className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">This school is blocked — nobody in it can log in.</p>
            <p className="text-sm">
              Reason: {s.blocked_reason} · since {dateTime(s.blocked_at!)}
            </p>
          </div>
        </div>
      )}

      {!data ? (
        !error && <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Students" value={data.stats.students} hint={`${data.stats.students_inactive} inactive`} icon={GraduationCap} tone="bg-emerald-100 text-emerald-600" />
            <Stat label="Classes" value={data.stats.classes} hint={plural(data.stats.sections, 'section')} icon={School} tone="bg-sky-100 text-brand" />
            <Stat label="Staff" value={data.stats.staff} hint={plural(data.stats.teachers, 'teacher')} icon={Users} tone="bg-violet-100 text-violet-600" />
            <Stat
              label="Documents"
              value={data.stats.documents}
              hint={
                <>
                  <CalendarCheck className="inline size-3" /> {plural(data.stats.attendance_days, 'attendance day')}
                </>
              }
              icon={FileText}
              tone="bg-amber-100 text-amber-600"
            />
          </section>

          <ZapLicenseCard schoolId={id} schoolName={data.school.name} />

          <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
            <Card title="School details">
              <div className="mb-4 flex items-center gap-3">
                {data.logo_url ? (
                  <img src={data.logo_url} alt="" className="size-14 rounded-xl object-contain ring-1 ring-line" />
                ) : (
                  <span className="grid size-14 place-items-center rounded-xl bg-sky-100 text-xl font-bold text-brand">{s!.name[0]?.toUpperCase()}</span>
                )}
                <SchoolStatus blocked={blocked} setupDone={s!.setup_done} />
              </div>
              <dl className="space-y-2.5 text-sm">
                {(
                  [
                    ['Owner', s!.owner_name ? `${s!.owner_name} (${s!.owner_email})` : null],
                    ['School email', s!.email],
                    ['Phone', s!.phone],
                    ['Address', s!.address],
                    ['Principal', data.principal_name],
                    ['Website', data.website],
                    ['Registration no.', data.registration_number],
                    ['Setup finished', data.setup_completed_at ? dateTime(data.setup_completed_at, false) : 'Not yet'],
                    ['Last login', timeAgo(s!.last_login_at)],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[8rem_1fr] gap-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-semibold break-words text-ink">{v || '—'}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card title={`Users (${data.members.length})`}>
              <div className="-mx-4 overflow-x-auto sm:-mx-5">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold tracking-wide text-muted uppercase">
                    <tr>
                      <th className="px-4 py-2.5 sm:px-5">Name</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5">Last login</th>
                      <th className="px-4 py-2.5">Access</th>
                      <th className="px-4 py-2.5 sm:px-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.members.map((m) => (
                      <tr key={m.member_id} aria-label={m.full_name}>
                        <td className="px-4 py-3 sm:px-5">
                          <p className="font-bold">{m.full_name}</p>
                          <p className="text-xs text-muted">{[m.email, m.username && `@${m.username}`].filter(Boolean).join(' · ')}</p>
                        </td>
                        <td className="px-4 py-3">{m.role}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{timeAgo(m.last_login_at)}</td>
                        <td className="px-4 py-3">
                          {m.blocked_at ? (
                            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600 ring-1 ring-rose-200" title={m.blocked_reason ?? ''}>
                              Blocked
                            </span>
                          ) : m.status !== 'Active' ? (
                            <span className="text-xs font-semibold text-muted">{m.status}</span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-700">Can log in</span>
                          )}
                          {m.blocked_reason && <p className="mt-1 max-w-48 truncate text-xs text-rose-600">{m.blocked_reason}</p>}
                        </td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          {m.blocked_at ? (
                            <button
                              onClick={() => void run(m.user_id, () => zap.unblockUser(id, m.user_id))}
                              disabled={busy === m.user_id}
                              className="rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => setBlocking({ kind: 'user', member: m })}
                              className="rounded-lg px-3 py-1.5 text-xs font-bold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                            >
                              Block
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title="Recent logins" action={<Link to={`/zap/logins?school_id=${id}`} className="text-sm font-bold text-brand">Full history</Link>}>
            <ul className="divide-y divide-line text-sm">
              {data.logins.map((l, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <span className="font-bold">{l.user_name ?? 'Unknown user'}</span> <span className="text-muted">{l.user_email}</span>
                  </span>
                  <span className="text-xs text-muted">
                    {dateTime(l.at)} {l.ip_address && `· ${l.ip_address}`}
                  </span>
                </li>
              ))}
              {data.logins.length === 0 && <li className="py-6 text-center text-muted">No logins recorded yet</li>}
            </ul>
          </Card>
        </>
      )}

      {blocking && s && (
        <BlockDialog
          title={blocking.kind === 'school' ? `Block ${s.name}?` : `Block ${blocking.member.full_name}?`}
          subtitle={
            blocking.kind === 'school'
              ? 'Everyone in this school is logged out and can’t log in until you unblock it.'
              : 'They’re logged out and can’t use SchoolBee (any school) until you unblock them. Their PaperBee access is not affected.'
          }
          onClose={() => setBlocking(null)}
          onBlock={async (reason) =>
            setData(blocking.kind === 'school' ? await zap.blockSchool(id, reason) : await zap.blockUser(id, blocking.member.user_id, reason))
          }
        />
      )}
    </ZapShell>
  )
}

function BlockDialog({ title, subtitle, onClose, onBlock }: { title: string; subtitle: string; onClose: () => void; onBlock: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('')
  const quick = ['Payment pending', 'Terms of use violation', 'Requested by the school', 'Suspicious activity']
  return (
    <Dialog title={title} subtitle={subtitle} submitLabel="Block" danger submitDisabled={reason.trim().length < 3} onClose={onClose} onSubmit={() => onBlock(reason.trim())}>
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <button key={q} type="button" onClick={() => setReason(q)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink hover:bg-slate-200">
            {q}
          </button>
        ))}
      </div>
      <label className="block text-sm font-bold text-ink">
        Reason (shown to them when they try to log in)
        <textarea
          autoFocus
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </label>
    </Dialog>
  )
}
