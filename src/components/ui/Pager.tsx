import { ChevronLeft, ChevronRight } from 'lucide-react'

/** "21–40 of 57" + previous/next. Hidden when everything fits on one page. */
export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
      <span className="text-muted">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="grid size-8 place-items-center rounded-lg ring-1 ring-line disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-semibold">
          {page} / {pages}
        </span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="grid size-8 place-items-center rounded-lg ring-1 ring-line disabled:opacity-40" aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
