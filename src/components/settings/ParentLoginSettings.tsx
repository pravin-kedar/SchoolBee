import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, HeartHandshake, KeyRound, Loader2, RotateCcw } from 'lucide-react'

import { errorMessage } from '../../lib/api'
import { usePermission } from '../../lib/auth'
import { parentLoginSettingsApi } from '../../lib/parent'
import { formatDate } from '../../lib/students'

const inputCls = 'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand'

/** School Settings → Parent Login (owner): the default password parents
 *  first sign in with, and resetting a parent who forgot theirs. */
export function ParentLoginSettings() {
  const { isOwner } = usePermission()
  const [info, setInfo] = useState<{ default_is_custom: boolean; set_at: string | null; built_in_default: string } | null>(null)
  const [pw, setPw] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!isOwner) return
    parentLoginSettingsApi.get().then(setInfo, (err) => setMsg({ ok: false, text: errorMessage(err) }))
  }, [isOwner])

  if (!isOwner) return <p className="rounded-2xl bg-white p-6 text-sm shadow-card ring-1 ring-line/60">Only the school owner can change parent login settings.</p>

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key)
    setMsg(null)
    try {
      setMsg({ ok: true, text: await fn() })
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setBusy(null)
    }
  }
  const saveDefault = (e: FormEvent) => {
    e.preventDefault()
    void run('default', async () => {
      setInfo(await parentLoginSettingsApi.setDefault(pw))
      setPw('')
      return 'Default parent password saved. Parents who haven’t set their own password use it from now on.'
    })
  }
  const reset = (e: FormEvent) => {
    e.preventDefault()
    void run('reset', async () => {
      const r = await parentLoginSettingsApi.reset(phone)
      setPhone('')
      return `Password for ${r.phone} reset to the school default. The parent sets a new one at their next sign-in.`
    })
  }
  return (
    <div className="space-y-5">
      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${msg.ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
          {msg.ok && <CheckCircle2 className="size-4" />} {msg.text}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Default parent password">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <HeartHandshake className="size-5 text-amber-600" /> Parent login
          </h2>
          <p className="mt-1 text-sm">
            Parents sign in at <b>Parent login</b> with the <b>mobile number on their child&rsquo;s record</b> (father, mother or guardian) and this default password —
            then they must choose their own. They can also use Google with the email on the record.
          </p>
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-line">
            {info == null ? (
              'Loading…'
            ) : info.default_is_custom ? (
              <>Your own default password is set{info.set_at ? ` (changed ${formatDate(info.set_at.slice(0, 10))})` : ''}.</>
            ) : (
              <>
                The default is still <b className="font-mono">{info.built_in_default}</b>. Set your own so outsiders can&rsquo;t guess it.
              </>
            )}
          </p>
          <form onSubmit={saveDefault} className="mt-4 space-y-2">
            <label className="block text-sm font-bold">
              New default parent password
              <input value={pw} onChange={(e) => setPw(e.target.value)} minLength={4} maxLength={64} required aria-label="Default parent password" className={`${inputCls} mt-1`} />
            </label>
            <button disabled={busy !== null || pw.length < 4} className="btn-primary disabled:opacity-60">
              {busy === 'default' ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Save default password
            </button>
            <p className="text-xs text-muted">Share it with parents (e.g. on WhatsApp). Parents who already chose their own password aren&rsquo;t affected.</p>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-line/60" aria-label="Reset a parent's password">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <RotateCcw className="size-5 text-brand" /> A parent forgot their password?
          </h2>
          <p className="mt-1 text-sm">Reset it to the school default. They sign in with the default and choose a new password straight away.</p>
          <form onSubmit={reset} className="mt-4 space-y-2">
            <label className="block text-sm font-bold">
              Parent&rsquo;s mobile number
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required aria-label="Parent mobile number" className={`${inputCls} mt-1`} />
            </label>
            <button disabled={busy !== null || phone.replace(/\D/g, '').length < 10} className="btn-outline disabled:opacity-60">
              {busy === 'reset' ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Reset password
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
