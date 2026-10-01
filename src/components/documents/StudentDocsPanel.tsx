import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock,
  CloudUpload,
  Download,
  Ellipsis,
  Eye,
  FileText,
  HeartPulse,
  IdCard,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'

import { Avatar } from '../students/StudentUi'
import { Dialog } from '../ui/Dialog'
import { errorMessage } from '../../lib/api'
import { ACCEPTED, documentsApi, fileProblem, fileSize, type DocSlot, type DocStatus, type DocStudentDetail, type StudentDoc } from '../../lib/documents'
import { formatDate } from '../../lib/students'

const STATUS: Record<DocStatus | 'Missing', { label: string; icon: LucideIcon; tone: string }> = {
  Verified: { label: 'Verified', icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  Uploaded: { label: 'Pending', icon: Clock, tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  Rejected: { label: 'Rejected', icon: CircleX, tone: 'bg-rose-50 text-rose-600 ring-rose-200' },
  Missing: { label: 'Missing', icon: CircleX, tone: 'bg-slate-100 text-muted ring-line' },
}

function typeIcon(name: string): { icon: LucideIcon; tone: string } {
  const n = name.toLowerCase()
  if (n.includes('photo')) return { icon: ImageIcon, tone: 'bg-sky-100 text-brand' }
  if (n.includes('medical') || n.includes('vaccin') || n.includes('health')) return { icon: HeartPulse, tone: 'bg-violet-100 text-violet-600' }
  if (n.includes('aadhaar') || n.includes('id')) return { icon: IdCard, tone: 'bg-emerald-100 text-emerald-600' }
  return { icon: FileText, tone: 'bg-sky-100 text-brand' }
}

export function DocStatusBadge({ status }: { status: DocStatus | 'Missing' }) {
  const { label, icon: Icon, tone } = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${tone}`}>
      <Icon className="size-3.5" /> {label}
    </span>
  )
}

/** One student's documents. `header` adds the student card (Documents page). */
export function StudentDocsPanel({
  studentId,
  header = false,
  onChanged,
}: {
  studentId: string
  header?: boolean
  onChanged?: (detail: DocStudentDetail) => void
}) {
  const [detail, setDetail] = useState<DocStudentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [preview, setPreview] = useState<DocSlot | null>(null)
  const [rejecting, setRejecting] = useState<DocSlot | null>(null)
  const [deleting, setDeleting] = useState<DocSlot | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    documentsApi
      .student(studentId)
      .then((d) => live && (setDetail(d), setError(null)))
      .catch((err) => live && setError(errorMessage(err)))
      .finally(() => live && setLoadedId(studentId))
    return () => {
      live = false
    }
  }, [studentId])

  const apply = (d: DocStudentDetail) => {
    setDetail(d)
    onChanged?.(d)
    setPreview((p) => (p ? (d.slots.find((s) => s.type_id === p.type_id) ?? null) : null))
  }

  async function run(slotId: string, fn: () => Promise<DocStudentDetail>) {
    setBusySlot(slotId)
    setError(null)
    try {
      apply(await fn())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusySlot(null)
    }
  }

  const upload = (slot: DocSlot, file: File | undefined) => {
    if (!file) return
    const problem = fileProblem(file)
    if (problem) return setError(`${slot.type_name}: ${problem}`)
    void run(slot.type_id, () => documentsApi.upload(studentId, slot.type_id, file))
  }

  if (loadedId !== studentId && !detail) return <div className="h-80 animate-pulse rounded-2xl bg-slate-200/60" />
  if (!detail) return error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p> : null

  const done = detail.submitted === detail.total
  const activeSlots = detail.slots.filter((s) => s.active)
  const oldSlots = detail.slots.filter((s) => !s.active)

  return (
    <div className={`space-y-5 ${loadedId !== studentId ? 'opacity-60' : ''}`}>
      {header && (
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={detail.full_name} url={detail.photo_url} gender={detail.gender} size="size-24 text-2xl rounded-2xl" />
          <div className="min-w-0 flex-1 leading-relaxed">
            <h2 className="text-2xl font-extrabold">{detail.full_name}</h2>
            <p className="text-sm font-semibold text-ink/80">
              {detail.admission_no}
              <span className="mx-2 text-line">|</span>
              {detail.class_name ?? 'No class'}
              {detail.section_name ? ` - ${detail.section_name}` : ''}
            </p>
            {detail.date_of_birth && (
              <p className="flex items-center gap-2 text-sm">
                <CalendarDays className="size-4 text-muted" /> Date of Birth: {formatDate(detail.date_of_birth)}
              </p>
            )}
            {(detail.father_name || detail.mother_name) && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Users className="size-4 text-muted" />
                {detail.father_name && <>Father: {detail.father_name}</>}
                {detail.father_name && detail.mother_name && <span className="text-line">|</span>}
                {detail.mother_name && <>Mother: {detail.mother_name}</>}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-xl px-4 py-2 font-extrabold ring-1 ${done ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
              {detail.submitted} / {detail.total} Documents
            </span>
            <Link to={`/students/${detail.id}`} className="btn-outline py-1.5 text-sm">
              <UserRound className="size-4" /> View Profile
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">Required Documents</h3>
        {detail.can_review && (
          <Link to="/settings?tab=documents" className="btn-outline py-1.5 text-sm">
            Manage Required Documents
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
          {error}
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </p>
      )}

      {activeSlots.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-muted ring-1 ring-line">
          No document types are active. Add them in Settings → Document Settings.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {activeSlots.map((slot) => (
            <SlotCard
              key={slot.type_id}
              slot={slot}
              busy={busySlot === slot.type_id}
              canReview={detail.can_review}
              onUpload={(f) => upload(slot, f)}
              onPreview={() => setPreview(slot)}
              onVerify={() => slot.document && void run(slot.type_id, () => documentsApi.review(slot.document!.id, 'Verified'))}
              onPending={() => slot.document && void run(slot.type_id, () => documentsApi.review(slot.document!.id, 'Uploaded'))}
              onReject={() => setRejecting(slot)}
              onDelete={() => setDeleting(slot)}
            />
          ))}
        </ul>
      )}

      {oldSlots.some((s) => s.document) && (
        <div>
          <p className="mb-2 text-sm font-bold text-muted">No longer required (kept for records)</p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {oldSlots.map((slot) => (
              <SlotCard
                key={slot.type_id}
                slot={slot}
                busy={busySlot === slot.type_id}
                canReview={detail.can_review}
                readOnly
                onUpload={() => undefined}
                onPreview={() => setPreview(slot)}
                onVerify={() => undefined}
                onPending={() => undefined}
                onReject={() => undefined}
                onDelete={() => setDeleting(slot)}
              />
            ))}
          </ul>
        </div>
      )}

      {preview?.document && (
        <PreviewDialog
          slot={preview}
          canReview={detail.can_review && preview.active}
          busy={busySlot === preview.type_id}
          onClose={() => setPreview(null)}
          onVerify={() => void run(preview.type_id, () => documentsApi.review(preview.document!.id, 'Verified'))}
          onReject={() => setRejecting(preview)}
        />
      )}
      {rejecting?.document && (
        <RejectDialog
          slot={rejecting}
          onClose={() => setRejecting(null)}
          onReject={async (remark) => apply(await documentsApi.review(rejecting.document!.id, 'Rejected', remark))}
        />
      )}
      {deleting?.document && (
        <Dialog
          title={`Delete ${deleting.type_name}?`}
          subtitle={`${deleting.document.file_name} will be removed permanently. The document will show as missing.`}
          submitLabel="Delete"
          danger
          onClose={() => setDeleting(null)}
          onSubmit={async () => apply(await documentsApi.remove(deleting.document!.id))}
        />
      )}
    </div>
  )
}

function SlotCard({
  slot,
  busy,
  canReview,
  readOnly = false,
  onUpload,
  onPreview,
  onVerify,
  onPending,
  onReject,
  onDelete,
}: {
  slot: DocSlot
  busy: boolean
  canReview: boolean
  readOnly?: boolean
  onUpload: (f: File | undefined) => void
  onPreview: () => void
  onVerify: () => void
  onPending: () => void
  onReject: () => void
  onDelete: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const doc = slot.document
  const { icon: Icon, tone } = typeIcon(slot.type_name)

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  const dropProps = readOnly
    ? {}
    : {
        onDragOver: (e: React.DragEvent) => (e.preventDefault(), setDrag(true)),
        onDragLeave: () => setDrag(false),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          setDrag(false)
          onUpload(e.dataTransfer.files[0])
        },
      }

  return (
    <li {...dropProps} className={`relative flex flex-col rounded-2xl bg-white p-4 shadow-card ring-1 transition ${drag ? 'ring-2 ring-brand' : 'ring-line/70'}`} aria-label={slot.type_name}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}>
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold text-ink">{slot.type_name}</span>
            <span className={`text-[11px] font-semibold ${slot.required ? 'text-rose-500' : 'text-muted'}`}>{slot.required ? 'Required' : 'Optional'}</span>
          </span>
        </span>
        {doc && !readOnly && (
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenu((m) => !m)} className="grid size-7 place-items-center rounded-lg text-muted hover:bg-slate-100" aria-label={`${slot.type_name} actions`} aria-expanded={menu}>
              <Ellipsis className="size-4" />
            </button>
            {menu && (
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl bg-white p-1.5 shadow-float ring-1 ring-line" onClick={() => setMenu(false)}>
                {canReview && doc.status !== 'Verified' && (
                  <MenuItem icon={ShieldCheck} label="Verify" onClick={onVerify} className="text-emerald-700" />
                )}
                {canReview && doc.status !== 'Rejected' && <MenuItem icon={CircleX} label="Reject" onClick={onReject} className="text-rose-600" />}
                {canReview && doc.status !== 'Uploaded' && <MenuItem icon={RotateCcw} label="Mark as pending" onClick={onPending} />}
                <MenuItem icon={RefreshCw} label="Replace file" onClick={() => input.current?.click()} />
              </div>
            )}
          </div>
        )}
      </div>

      {busy ? (
        <div className="mt-3 grid h-40 place-items-center rounded-xl bg-slate-50">
          <Loader2 className="size-6 animate-spin text-brand" />
        </div>
      ) : doc ? (
        <>
          <div className="mt-3 flex gap-3">
            <button onClick={onPreview} className="grid h-24 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-line hover:ring-brand" aria-label={`Preview ${slot.type_name}`}>
              {doc.content_type.startsWith('image/') && doc.url ? (
                <img src={doc.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center text-rose-500">
                  <FileText className="size-8" />
                  <span className="text-[10px] font-extrabold">PDF</span>
                </span>
              )}
            </button>
            <div className="min-w-0 space-y-1 text-xs">
              <DocStatusBadge status={doc.status} />
              <p className="truncate text-muted" title={doc.file_name}>
                {doc.file_name}
              </p>
              <p className="flex items-center gap-1 text-muted">
                <CalendarDays className="size-3" /> {formatDate(doc.uploaded_at)} · {fileSize(doc.size_bytes)}
              </p>
              {doc.status === 'Rejected' && doc.remark && <p className="font-semibold text-rose-600">“{doc.remark}”</p>}
            </div>
          </div>
          <div className="mt-auto flex items-center justify-around border-t border-line pt-3">
            <button onClick={onPreview} className="grid size-8 place-items-center rounded-lg text-ink/70 hover:bg-slate-100" aria-label={`View ${slot.type_name}`}>
              <Eye className="size-4" />
            </button>
            {doc.download_url && (
              <a href={doc.download_url} className="grid size-8 place-items-center rounded-lg text-ink/70 hover:bg-slate-100" aria-label={`Download ${slot.type_name}`}>
                <Download className="size-4" />
              </a>
            )}
            {doc.status === 'Rejected' && !readOnly ? (
              <button onClick={() => input.current?.click()} className="rounded-lg px-2 py-1 text-xs font-bold text-brand hover:bg-sky-50">
                Re-upload
              </button>
            ) : (
              canReview && (
                <button onClick={onDelete} className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={`Delete ${slot.type_name}`}>
                  <Trash2 className="size-4" />
                </button>
              )
            )}
          </div>
        </>
      ) : (
        <div className={`mt-3 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 ${drag ? 'border-brand bg-sky-50' : 'border-sky-200 bg-sky-50/40'}`}>
          <CloudUpload className="size-7 text-sky-400" />
          <span className="text-sm font-semibold text-muted">Not Uploaded</span>
          <button onClick={() => input.current?.click()} className="btn-primary py-1.5 text-sm">
            <Plus className="size-4" /> Upload
          </button>
          <span className="text-[11px] text-muted">or drop a PDF / JPG / PNG</span>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        aria-label={`Upload ${slot.type_name}`}
        onChange={(e) => {
          onUpload(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </li>
  )
}

function MenuItem({ icon: Icon, label, onClick, className = 'text-ink' }: { icon: LucideIcon; label: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50 ${className}`}>
      <Icon className="size-4" /> {label}
    </button>
  )
}

function PreviewDialog({
  slot,
  canReview,
  busy,
  onClose,
  onVerify,
  onReject,
}: {
  slot: DocSlot
  canReview: boolean
  busy: boolean
  onClose: () => void
  onVerify: () => void
  onReject: () => void
}) {
  const doc = slot.document as StudentDoc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal aria-label={`${slot.type_name} preview`}>
      <button className="absolute inset-0 bg-ink/60" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-float">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-extrabold text-ink">
              {slot.type_name} <DocStatusBadge status={doc.status} />
            </p>
            <p className="truncate text-xs text-muted">
              {doc.file_name} · {fileSize(doc.size_bytes)} · uploaded {formatDate(doc.uploaded_at)}
              {doc.uploaded_by ? ` by ${doc.uploaded_by}` : ''}
              {doc.reviewed_by && doc.status !== 'Uploaded' ? ` · ${doc.status.toLowerCase()} by ${doc.reviewed_by}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canReview && doc.status !== 'Verified' && (
              <button onClick={onVerify} disabled={busy} className="btn bg-emerald-600 py-2 text-white hover:bg-emerald-700">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Verify
              </button>
            )}
            {canReview && doc.status !== 'Rejected' && (
              <button onClick={onReject} className="btn bg-rose-50 py-2 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100">
                <CircleX className="size-4" /> Reject
              </button>
            )}
            {doc.download_url && (
              <a href={doc.download_url} className="btn-outline py-2">
                <Download className="size-4" /> Download
              </a>
            )}
            <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100" aria-label="Close preview">
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
          {doc.content_type.startsWith('image/') ? (
            <img src={doc.url ?? ''} alt={slot.type_name} className="mx-auto max-h-[75dvh] rounded-lg object-contain shadow-card" />
          ) : (
            <iframe src={doc.url ?? ''} title={slot.type_name} className="h-[75dvh] w-full rounded-lg bg-white" />
          )}
        </div>
      </div>
    </div>
  )
}

function RejectDialog({ slot, onClose, onReject }: { slot: DocSlot; onClose: () => void; onReject: (remark: string) => Promise<void> }) {
  const [remark, setRemark] = useState('')
  const quick = ['Blurry / not readable', 'Wrong document', 'Expired', 'Name does not match']
  return (
    <Dialog
      title={`Reject ${slot.type_name}`}
      subtitle="Tell the parent what to fix. They'll need to upload it again."
      submitLabel="Reject"
      danger
      submitDisabled={!remark.trim()}
      onClose={onClose}
      onSubmit={() => onReject(remark.trim())}
    >
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <button key={q} type="button" onClick={() => setRemark(q)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink hover:bg-slate-200">
            {q}
          </button>
        ))}
      </div>
      <label className="block text-sm font-bold text-ink">
        Reason
        <textarea
          autoFocus
          rows={3}
          maxLength={300}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          className="mt-1 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 font-normal outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      </label>
    </Dialog>
  )
}
