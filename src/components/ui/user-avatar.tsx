import * as React from "react"
import { cn } from "@/lib/utils"

type AvatarSize = 20 | 22 | 28 | 32 | 40

const AVATAR_HUES = [24, 38, 185, 145, 260, 310, 350, 60]

function deterministicBg(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return `hsl(${AVATAR_HUES[Math.abs(h) % AVATAR_HUES.length]}, 50%, 50%)`
}

function getInitials(name: string): string {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

const SIZES: Record<AvatarSize, { wh: number; fontSize: number }> = {
  20: { wh: 20, fontSize: 8 },
  22: { wh: 22, fontSize: 9 },
  28: { wh: 28, fontSize: 11 },
  32: { wh: 32, fontSize: 12 },
  40: { wh: 40, fontSize: 14 },
}

interface UserAvatarProps extends React.ComponentProps<"div"> {
  name: string
  size?: AvatarSize
}

export function UserAvatar({ name, size = 28, className, style, ...props }: UserAvatarProps) {
  const { wh, fontSize } = SIZES[size]
  return (
    <div
      aria-label={name}
      className={cn("inline-flex items-center justify-center shrink-0 select-none", className)}
      style={{
        width: wh,
        height: wh,
        borderRadius: "var(--r-pill)",
        background: deterministicBg(name),
        fontSize,
        fontWeight: 600,
        color: "#fff",
        letterSpacing: "0.02em",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
      {...props}
    >
      {getInitials(name)}
    </div>
  )
}
