"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 border border-transparent bg-clip-padding text-[12.5px] font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-white border-[var(--accent)] hover:bg-[#1d4ed8] active:bg-[#1e40af] focus-visible:ring-[var(--focus-ring)]",
        default:
          "bg-[var(--accent)] text-white border-[var(--accent)] hover:bg-[#1d4ed8] active:bg-[#1e40af] focus-visible:ring-[var(--focus-ring)]",
        secondary:
          "bg-[var(--surface-raised)] text-[var(--fg)] border-[var(--line)] hover:bg-[var(--row-hover)] focus-visible:ring-[var(--focus-ring)]",
        outline:
          "bg-[var(--surface-raised)] text-[var(--fg)] border-[var(--line)] hover:bg-[var(--row-hover)] focus-visible:ring-[var(--focus-ring)]",
        ghost:
          "text-[var(--fg-3)] hover:bg-[var(--row-hover)] hover:text-[var(--fg)] focus-visible:ring-[var(--focus-ring)]",
        danger:
          "bg-[var(--bad)] text-white border-[var(--bad)] hover:bg-[#dc2626] focus-visible:ring-[var(--bad)]/30",
        destructive:
          "bg-[var(--bad)] text-white border-[var(--bad)] hover:bg-[#dc2626] focus-visible:ring-[var(--bad)]/30",
        quiet:
          "text-[var(--fg-3)] hover:bg-[var(--row-hover)] hover:text-[var(--fg-2)] focus-visible:ring-[var(--focus-ring)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-7 px-2.5 rounded-[var(--r-sm)] text-[12px] [&_svg:not([class*='size-'])]:size-3.5",
        default: "h-8 px-3 rounded-[var(--r-sm)]",
        md: "h-8 px-3 rounded-[var(--r-sm)]",
        lg: "h-9 px-4 rounded-[var(--r-sm)] text-[13px]",
        icon: "size-8 rounded-[var(--r-sm)]",
        "icon-sm": "size-7 rounded-[var(--r-sm)]",
        "icon-lg": "size-9 rounded-[var(--r-sm)]",
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
