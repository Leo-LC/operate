"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 border border-transparent bg-clip-padding text-[13px] font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /* primary — bronze fill */
        primary:
          "bg-bronze text-white border-bronze hover:bg-[var(--bronze-2)] active:bg-[var(--bronze-2)] focus-visible:ring-[var(--focus-ring)]",
        default:
          "bg-bronze text-white border-bronze hover:bg-[var(--bronze-2)] active:bg-[var(--bronze-2)] focus-visible:ring-[var(--focus-ring)]",
        /* secondary — outlined */
        secondary:
          "bg-[var(--surface)] text-[var(--fg)] border-[var(--line)] hover:bg-[var(--row-hover)] focus-visible:ring-[var(--focus-ring)]",
        outline:
          "bg-[var(--surface)] text-[var(--fg)] border-[var(--line)] hover:bg-[var(--row-hover)] focus-visible:ring-[var(--focus-ring)]",
        /* ghost — no border, hover only */
        ghost:
          "text-[var(--fg-2)] hover:bg-[var(--row-hover)] hover:text-[var(--fg)] focus-visible:ring-[var(--focus-ring)]",
        /* danger */
        danger:
          "bg-[var(--bad-soft)] text-[var(--bad)] border-[var(--bad-soft)] hover:bg-[var(--bad)]/20 focus-visible:ring-[var(--bad)]/30",
        destructive:
          "bg-[var(--bad-soft)] text-[var(--bad)] border-[var(--bad-soft)] hover:bg-[var(--bad)]/20 focus-visible:ring-[var(--bad)]/30",
        /* quiet — very muted */
        quiet:
          "text-[var(--fg-3)] hover:bg-[var(--row-hover)] hover:text-[var(--fg-2)] focus-visible:ring-[var(--focus-ring)]",
        link: "text-[var(--bronze)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        /* sm = 28px high */
        sm: "h-7 px-2.5 rounded-[var(--r-sm)] text-[12px] [&_svg:not([class*='size-'])]:size-3.5",
        /* md = 34px high (default) */
        default: "h-[34px] px-3 rounded-[var(--r-sm)]",
        md: "h-[34px] px-3 rounded-[var(--r-sm)]",
        /* lg = 40px high */
        lg: "h-10 px-4 rounded-[var(--r-sm)] text-[14px]",
        /* icon variants */
        icon: "size-[34px] rounded-[var(--r-sm)]",
        "icon-sm": "size-7 rounded-[var(--r-sm)]",
        "icon-lg": "size-10 rounded-[var(--r-sm)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
