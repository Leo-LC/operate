"use client"

import * as React from "react"
import { Dialog as ModalPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 560,
}: ModalProps) {
  /* Esc key — base-ui handles it via the Dialog primitive,
     but we wire it here too for nested usage. */
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  return (
    <ModalPrimitive.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <ModalPrimitive.Portal>
        <ModalPrimitive.Backdrop
          className="fixed inset-0 z-50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0"
          style={{
            background: "rgba(43,35,27,0.45)",
            backdropFilter: "blur(2px)",
            transitionDuration: "var(--dur-2)",
          }}
        />
        <ModalPrimitive.Popup
          className="fixed inset-0 z-50 m-auto flex max-h-[90vh] w-full flex-col data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95"
          style={{
            maxWidth: width,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--shadow-drawer)",
            transitionDuration: "var(--dur-2)",
            transitionTimingFunction: "var(--ease)",
          }}
        >
          {(title || description) && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
                borderBottom: "1px solid var(--line)",
                padding: "var(--s-4) var(--s-5)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                {title && (
                  <ModalPrimitive.Title
                    style={{ fontSize: "var(--t-15)", fontWeight: 600, color: "var(--fg)" }}
                  >
                    {title}
                  </ModalPrimitive.Title>
                )}
                {description && (
                  <ModalPrimitive.Description
                    style={{ fontSize: "var(--t-13)", color: "var(--fg-3)" }}
                  >
                    {description}
                  </ModalPrimitive.Description>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
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
          )}

          {/* Body */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "var(--s-5)" }}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div style={{ borderTop: "1px solid var(--line)", padding: "var(--s-4) var(--s-5)", flexShrink: 0 }}>
              {footer}
            </div>
          )}
        </ModalPrimitive.Popup>
      </ModalPrimitive.Portal>
    </ModalPrimitive.Root>
  )
}