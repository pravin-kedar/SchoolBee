import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Award, Eye, FileCheck2, Plus, Search, X } from 'lucide-react'

import beeReading from '../../assets/bees/bee-reading.webp'
import { AppShell } from '../../components/app/AppShell'
import { IssuedRegister } from '../../components/certificates/IssuedRegister'
import { PageBanner } from '../../components/students/StudentUi'
import { selectCls } from '../../components/students/StudentTable'
import { PagePreview } from '../../components/ui/PagePreview'
import { errorMessage } from '../../lib/api'
import { useAccessToken } from '../../lib/auth-store'
import { CATEGORY_TONE, certificatesApi, useCanIssue, type CertTemplate } from '../../lib/certificates'
import { useSchoolOptions } from '../../lib/schoolOptions'
import { CATEGORY_LABEL, type TemplateCategory } from '../../lib/zapTemplates'

export function CertificatesPage() {
  const token = useAccessToken()
  const options = useSchoolOptions()
  const canIssue = useCanIssue()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'issued' ? 'issued' : 'templates'

  if (!token) return <Navigate to="/login" replace />

  return (
    <AppShell academicYear={options?.activeYear?.name}>
      <div className="space-y-5 p-4 sm:p-6">
        <PageBanner
          title="Certificates"
          subtitle="Issue Bonafide, Leaving, Character and Achievement certificates in a few clicks."
          message="Small steps, big achievements!"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60" role="tablist">
            {(
              [
                ['templates', 'Certificate Templates', Award],
                ['issued', 'Issued Certificates', FileCheck2],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setParams(key === 'issued' ? { tab: 'issued' } : {}, { replace: true })}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === key ? 'bg-brand text-white' : 'text-ink/70 hover:bg-slate-50'}`}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          {canIssue && (
            <Link to="/certificates/generate" className="btn-primary px-5 py-3">
              <Plus className="size-5" /> Generate Certificate
            </Link>
          )}
        </div>

        {tab === 'templates' ? <Gallery canIssue={canIssue} /> : <IssuedRegister batchId={params.get('batch') ?? undefined} />}
      </div>
    </AppShell>
  )
}

function Gallery({ canIssue }: { canIssue: boolean }) {
  const [templates, setTemplates] = useState<CertTemplate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [previewing, setPreviewing] = useState<CertTemplate | null>(null)

  useEffect(() => {
    certificatesApi.templates().then(setTemplates, (err) => setError(errorMessage(err)))
  }, [])

  const term = q.trim().toLowerCase()
  const shown = (templates ?? []).filter((t) => (!category || t.category === category) && (!term || t.name.toLowerCase().includes(term)))

  return (
    <>
      <section className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60">
        <select aria-label="Certificate type" value={category} onChange={(e) => setCategory(e.target.value)} className={`${selectCls} min-w-48 flex-1`}>
          <option value="">All types</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="relative min-w-60 flex-[2]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates by name…" aria-label="Search templates" className={`${selectCls} w-full pl-9`} />
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {!templates ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl bg-white py-14 text-center shadow-card ring-1 ring-line/60">
          <img src={beeReading} alt="" className="mx-auto h-24" />
          <p className="mt-3 text-lg font-bold">{templates.length ? 'No templates match' : 'No certificate templates yet'}</p>
          {!templates.length && <p className="text-sm">SchoolBee will add ready-made designs here soon.</p>}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {shown.map((t) => (
            <TemplateCard key={t.id} t={t} canIssue={canIssue} onPreview={() => setPreviewing(t)} />
          ))}
        </ul>
      )}

      {previewing && <PreviewModal t={previewing} canIssue={canIssue} onClose={() => setPreviewing(null)} />}
    </>
  )
}

function useTemplateHtml(id: string) {
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    certificatesApi.templatePreview(id).then((p) => live && setHtml(p.html), () => undefined)
    return () => {
      live = false
    }
  }, [id])
  return html
}

function TemplateCard({ t, canIssue, onPreview }: { t: CertTemplate; canIssue: boolean; onPreview: () => void }) {
  const html = useTemplateHtml(t.id)
  return (
    <li className="flex flex-col rounded-2xl bg-white p-3 shadow-card ring-1 ring-line/60" aria-label={t.name}>
      <button onClick={onPreview} className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-amber-50 p-4" aria-label={`Preview ${t.name}`}>
        <PagePreview html={html} paper={t.paper} orientation={t.orientation} title={`${t.name} preview`} className={t.orientation === 'landscape' ? 'w-full' : 'w-[62%]'} />
        {t.custom && <span className="absolute top-2 right-2 rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white">Made for your school</span>}
      </button>
      <div className="mt-3 flex-1 px-1">
        <p className="font-bold text-ink">{t.name}</p>
        {t.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{t.description}</p>}
        <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${CATEGORY_TONE[t.category] ?? CATEGORY_TONE.Other}`}>
          {CATEGORY_LABEL[t.category as TemplateCategory] ?? t.category}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onPreview} className="btn-outline justify-center py-2">
          <Eye className="size-4" /> Preview
        </button>
        {canIssue ? (
          <Link to={`/certificates/generate?template=${t.id}`} className="btn-primary justify-center py-2">
            Use Template
          </Link>
        ) : (
          <span className="grid place-items-center rounded-xl bg-slate-50 px-2 text-center text-[11px] text-muted">Owner/admin can issue</span>
        )}
      </div>
    </li>
  )
}

function PreviewModal({ t, canIssue, onClose }: { t: CertTemplate; canIssue: boolean; onClose: () => void }) {
  const html = useTemplateHtml(t.id)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal aria-label={`${t.name} preview`}>
      <button className="absolute inset-0 bg-ink/60" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[94dvh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-float">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div>
            <p className="font-extrabold">{t.name}</p>
            <p className="text-xs text-muted">With your school's details and a sample student</p>
          </div>
          <div className="flex items-center gap-2">
            {canIssue && (
              <Link to={`/certificates/generate?template=${t.id}`} className="btn-primary py-2">
                Use Template
              </Link>
            )}
            <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100" aria-label="Close preview">
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 overflow-auto bg-slate-100 p-5">
          <PagePreview html={html} paper={t.paper} orientation={t.orientation} title={`${t.name} full preview`} className={t.orientation === 'landscape' ? 'w-full' : 'mx-auto w-full max-w-lg'} />
        </div>
      </div>
    </div>
  )
}
