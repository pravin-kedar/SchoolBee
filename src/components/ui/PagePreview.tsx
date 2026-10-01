import { useEffect, useRef, useState } from 'react'

import { pagePx, type Orientation, type Paper } from '../../lib/zapTemplates'

/** A rendered document page (full HTML from the backend) scaled to fit the
 *  width it's given. Sandboxed: no scripts run inside. */
export function PagePreview({
  html,
  paper = 'A4',
  orientation = 'portrait',
  title = 'Document preview',
  className = '',
}: {
  html: string | null
  paper?: Paper
  orientation?: Orientation
  title?: string
  className?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const page = pagePx(paper, orientation)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = width ? width / page.w : 0
  return (
    <div ref={box} className={`relative overflow-hidden rounded-lg bg-white shadow-card ring-1 ring-line ${className}`} style={{ height: page.h * scale || undefined, aspectRatio: scale ? undefined : `${page.w} / ${page.h}` }}>
      {html && scale > 0 && (
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          tabIndex={-1}
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
          style={{ width: page.w, height: page.h, transform: `scale(${scale})` }}
        />
      )}
    </div>
  )
}
