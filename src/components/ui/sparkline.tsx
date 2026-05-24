import * as React from "react"

interface SparklineProps {
  data: number[]
  color?: string
  width?: number
  height?: number
  filled?: boolean
}

export function Sparkline({
  data,
  color = "var(--bronze)",
  width = 80,
  height = 24,
  filled = true,
}: SparklineProps) {
  if (!data.length || data.every((d) => d === 0)) return null
  const max = Math.max(...data)
  if (max === 0) return null

  const pad = 1
  const usableH = height - pad * 2
  const pts = data.map((v, i) => {
    const x = data.length < 2 ? width / 2 : (i / (data.length - 1)) * width
    const y = pad + usableH - (v / max) * usableH
    return [x, y] as [number, number]
  })

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ")
  const areaPath = `${linePath} L ${pts[pts.length - 1]![0]},${height} L ${pts[0]![0]},${height} Z`

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden
    >
      {filled && (
        <path d={areaPath} fill={color} opacity={0.15} />
      )}
      <path d={linePath} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
    </svg>
  )
}
