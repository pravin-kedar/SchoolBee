import { useState } from 'react'
import { School } from 'lucide-react'

/** School logo, or the school icon when there's none - or it fails to load
 *  (e.g. an expired signed link or a deleted file), never a broken image. */
export function SchoolLogo({ url, className = 'size-9' }: { url: string | null | undefined; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (url && url !== failedUrl) {
    return <img src={url} alt="School logo" className={`${className} rounded-lg object-contain`} onError={() => setFailedUrl(url)} />
  }
  return (
    <span className={`${className} grid place-items-center rounded-lg bg-amber-100 text-amber-600`}>
      <School className="size-1/2" />
    </span>
  )
}
