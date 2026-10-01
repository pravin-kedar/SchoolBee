import { useMemo, useRef, useState } from 'react'

/** Chart for a report: column (single series), stacked column (2-3 series)
 *  or donut (a few slices). Every chart sits above the report's full table,
 *  so the table is the accessible / exact view; marks get hover tooltips. */
export interface ChartSpec {
  kind: 'bar' | 'stacked' | 'line' | 'donut'
  title: string
  labels: string[]
  series: { name: string; values: number[] }[]
  unit?: '%' | '₹'
}

// Validated categorical order (dataviz reference palette, light surface).
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']
const INK = { primary: '#13214f', secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' }

const compact = (n: number, unit?: string) => {
  const abs = Math.abs(n)
  const s = abs >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : abs >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : abs >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : `${Math.round(n * 10) / 10}`
  return unit === '₹' ? `₹${s}` : unit === '%' ? `${s}%` : s
}
const full = (n: number, unit?: string) => (unit === '₹' ? `₹${n.toLocaleString('en-IN')}` : unit === '%' ? `${n}%` : n.toLocaleString('en-IN'))

/** Clean axis ticks: 0..top in steps of 1/2/5 x 10^k (whole steps for counts). */
function niceTicks(v: number, unit?: string, integer = true): number[] {
  if (unit === '%') return [0, 25, 50, 75, 100]
  const max = Math.max(v, 1)
  const rough = max / 4
  const pow = 10 ** Math.floor(Math.log10(rough))
  let step = ([1, 2, 5, 10].find((m) => m * pow >= rough) ?? 10) * pow
  if (integer) step = Math.max(1, Math.round(step))
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
}

type Tip = { x: number; y: number; title: string; lines: { name: string; value: string; color: string }[] }

/** A donut keeps at most 6 slices; the rest fold into "Other" (never a generated hue). */
function fold(spec: ChartSpec): ChartSpec {
  if (spec.kind !== 'donut' || spec.labels.length <= 6) return spec
  const v = spec.series[0].values
  const rest = v.slice(5).reduce((t, x) => t + x, 0)
  return { ...spec, labels: [...spec.labels.slice(0, 5), 'Other'], series: [{ ...spec.series[0], values: [...v.slice(0, 5), rest] }] }
}

export function ReportChart({ spec: raw }: { spec: ChartSpec }) {
  const spec = fold(raw)
  const box = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<Tip | null>(null)
  const show = (e: React.MouseEvent | React.FocusEvent, t: Omit<Tip, 'x' | 'y'>) => {
    const r = box.current?.getBoundingClientRect()
    const target = (e.currentTarget as Element).getBoundingClientRect()
    if (!r) return
    setTip({ ...t, x: target.left + target.width / 2 - r.left, y: target.top - r.top })
  }
  const legend = spec.series.length > 1 && spec.kind !== 'donut'

  return (
    <section className="w-fit max-w-full min-w-[min(100%,26rem)] rounded-2xl bg-white p-4 shadow-card ring-1 ring-line/60 sm:p-5" aria-label={spec.title}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-ink">{spec.title}</h3>
        {legend && (
          <ul className="flex flex-wrap gap-3 text-xs" aria-label="Legend">
            {spec.series.map((s, i) => (
              <li key={s.name} className="flex items-center gap-1.5" style={{ color: INK.secondary }}>
                <span className="size-2.5 rounded-sm" style={{ background: SERIES[i] }} /> {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={box} className="relative" onMouseLeave={() => setTip(null)}>
        {spec.kind === 'donut' ? <Donut spec={spec} onTip={show} /> : <Columns spec={spec} onTip={show} />}
        {tip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-white px-3 py-2 text-xs shadow-float ring-1 ring-line"
            style={{ left: tip.x, top: tip.y - 6 }}
          >
            <p className="mb-1 font-bold text-ink">{tip.title}</p>
            {tip.lines.map((l) => (
              <p key={l.name} className="flex items-center gap-1.5 whitespace-nowrap" style={{ color: INK.secondary }}>
                <span className="size-2 rounded-full" style={{ background: l.color }} /> {l.name}: <b className="text-ink tabular-nums">{l.value}</b>
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Columns({ spec, onTip }: { spec: ChartSpec; onTip: (e: React.MouseEvent | React.FocusEvent, t: Omit<Tip, 'x' | 'y'>) => void }) {
  const n = spec.labels.length
  const H = 200
  const padL = 44
  const padB = 34
  const slot = Math.max(28, Math.min(72, 640 / Math.max(1, n)))
  const W = padL + slot * n + 8
  const stacked = spec.kind === 'stacked'
  const totals = useMemo(() => spec.labels.map((_, i) => (stacked ? spec.series.reduce((t, s) => t + (s.values[i] || 0), 0) : Math.max(...spec.series.map((s) => s.values[i] || 0)))), [spec, stacked])
  const ticks = niceTicks(Math.max(0, ...totals), spec.unit, spec.series.every((s) => s.values.every((v) => Number.isInteger(v))))
  const max = ticks[ticks.length - 1]
  const y = (v: number) => H - (v / max) * H
  const bar = Math.min(24, slot * 0.55)
  const rotate = n > 8 || spec.labels.some((l) => l.length * 6.5 > slot)

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + padB + (rotate ? 30 : 0) + 20}`} width={W} height={H + padB + (rotate ? 30 : 0) + 20} className="max-w-none" role="img" aria-label={spec.title}>
        <g transform="translate(0,18)">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke={t === 0 ? INK.axis : INK.grid} strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={INK.muted} className="tabular-nums">
                {compact(t, spec.unit)}
              </text>
            </g>
          ))}
          {spec.labels.map((label, i) => {
            const cx = padL + slot * i + slot / 2
            let base = 0
            const parts = spec.series.map((s, k) => {
              const v = s.values[i] || 0
              const top = stacked ? base + v : v
              const seg = { k, v, y0: y(stacked ? base : 0), y1: y(top) }
              if (stacked) base = top
              return seg
            })
            const lastVisible = [...parts].reverse().find((p) => p.v > 0)?.k
            const tipLines = spec.series.map((s, k) => ({ name: s.name, value: full(s.values[i] || 0, spec.unit), color: SERIES[k] }))
            return (
              <g key={label + i}>
                <rect
                  x={padL + slot * i}
                  y={0}
                  width={slot}
                  height={H}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${label}: ${tipLines.map((l) => `${l.name} ${l.value}`).join(', ')}`}
                  onMouseEnter={(e) => onTip(e, { title: label, lines: tipLines })}
                  onFocus={(e) => onTip(e, { title: label, lines: tipLines })}
                  className="cursor-default outline-none focus:fill-slate-100/50"
                />
                {parts.map((p) => {
                  if (p.v <= 0) return null
                  const h = Math.max(1, p.y0 - p.y1 - (stacked && p.k !== lastVisible ? 2 : 0))
                  const top = p.y1 + (stacked && p.k !== lastVisible ? 2 : 0)
                  const r = !stacked || p.k === lastVisible ? Math.min(4, h) : 0
                  return <path key={p.k} d={roundedTop(cx - bar / 2, top, bar, h, r)} fill={SERIES[p.k]} pointerEvents="none" />
                })}
                {!stacked && n <= 12 && spec.series.length === 1 && (spec.series[0].values[i] || 0) > 0 && (
                  <text x={cx} y={parts[0].y1 - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill={INK.secondary} pointerEvents="none">
                    {compact(spec.series[0].values[i], spec.unit)}
                  </text>
                )}
                <text
                  x={cx}
                  y={H + 16}
                  textAnchor={rotate ? 'end' : 'middle'}
                  transform={rotate ? `rotate(-35 ${cx} ${H + 16})` : undefined}
                  fontSize={11}
                  fill={INK.secondary}
                  pointerEvents="none"
                >
                  {label.length > 16 ? `${label.slice(0, 15)}…` : label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

/** A bar with 4px rounded data-end and a square base. */
function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (r <= 0) return `M${x},${y}h${w}v${h}h${-w}z`
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

function Donut({ spec, onTip }: { spec: ChartSpec; onTip: (e: React.MouseEvent | React.FocusEvent, t: Omit<Tip, 'x' | 'y'>) => void }) {
  const values = spec.series[0]?.values ?? []
  const total = values.reduce((t, v) => t + v, 0) || 1
  const R = 70
  const r = 46
  const starts = values.map((_, i) => -Math.PI / 2 + (values.slice(0, i).reduce((t, x) => t + x, 0) / total) * Math.PI * 2)
  const arcs = values.map((v, i) => {
    const a0 = starts[i]
    const a1 = a0 + (v / total) * Math.PI * 2
    const gap = values.length > 1 ? 0.025 : 0
    const s = a0 + gap
    const e = Math.max(s, a1 - gap)
    const large = e - s > Math.PI ? 1 : 0
    const p = (rad: number, ang: number) => `${90 + rad * Math.cos(ang)},${90 + rad * Math.sin(ang)}`
    const d = values.length === 1 ? `M${p(R, 0)}A${R},${R} 0 1 1 ${p(R, Math.PI)}A${R},${R} 0 1 1 ${p(R, 0)}M${p(r, 0)}A${r},${r} 0 1 0 ${p(r, Math.PI)}A${r},${r} 0 1 0 ${p(r, 0)}` : `M${p(R, s)}A${R},${R} 0 ${large} 1 ${p(R, e)}L${p(r, e)}A${r},${r} 0 ${large} 0 ${p(r, s)}Z`
    return { d, i, v }
  })
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 180 180" width={180} height={180} role="img" aria-label={spec.title}>
        {arcs.map((a) => (
          <path
            key={a.i}
            d={a.d}
            fill={SERIES[a.i % SERIES.length]}
            fillRule="evenodd"
            tabIndex={0}
            className="outline-none"
            aria-label={`${spec.labels[a.i]}: ${full(a.v, spec.unit)}`}
            onMouseEnter={(e) => onTip(e, { title: spec.labels[a.i], lines: [{ name: spec.series[0].name, value: `${full(a.v, spec.unit)} (${Math.round((a.v * 100) / total)}%)`, color: SERIES[a.i % SERIES.length] }] })}
            onFocus={(e) => onTip(e, { title: spec.labels[a.i], lines: [{ name: spec.series[0].name, value: full(a.v, spec.unit), color: SERIES[a.i % SERIES.length] }] })}
          />
        ))}
        <text x={90} y={88} textAnchor="middle" fontSize={20} fontWeight={700} fill={INK.primary}>
          {compact(total === 1 && !values.some(Boolean) ? 0 : total, spec.unit)}
        </text>
        <text x={90} y={106} textAnchor="middle" fontSize={11} fill={INK.muted}>
          total
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm" aria-label="Legend">
        {spec.labels.map((l, i) => (
          <li key={l} className="flex items-center gap-2" style={{ color: INK.secondary }}>
            <span className="size-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
            {l} <b className="text-ink tabular-nums">{full(values[i] || 0, spec.unit)}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
