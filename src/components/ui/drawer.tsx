"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: string
  side?: "right" | "left"
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  side = "right",
  children,
  footer,
  width,
}: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side={side} showCloseButton={false} style={width ? { maxWidth: `min(${width}px, 92vw)`, width: "100%" } : undefined}>
        {/* Header */}
        {(title || description) && (
          <SheetHeader
            style={{
              borderBottom: "1px solid var(--line)",
              padding: "var(--s-4) var(--s-5)",
              gap: 2,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              {title && (
                <SheetTitle
                  style={{
                    fontSize: "var(--t-15)",
                    fontWeight: 500,
                    color: "var(--fg)",
                  }}
                >
                  {title}
                </SheetTitle>
              )}
              <button
                onClick={onClose}
                style={{
                  width: 28,
                  height: 28,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--r-sm)",
                  color: "var(--fg-4)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <XIcon size={16} />
              </button>
            </div>
            {description && (
              <SheetDescription
                style={{ fontSize: "var(--t-13)", color: "var(--fg-3)" }}
              >
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--s-5)" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <SheetFooter
            style={{
              borderTop: "1px solid var(--line)",
              padding: "var(--s-4) var(--s-5)",
              margin: 0,
            }}
          >
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
