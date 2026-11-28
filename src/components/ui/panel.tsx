import * as React from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("ui-panel", className)} {...props} />;
}

export function PanelHead({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("ui-panel-head", className)} {...props} />;
}

export function PanelTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("ui-panel-title", className)} {...props} />;
}

export function PanelSub({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("ui-panel-sub", className)} {...props} />;
}

export function PanelBody({
  className,
  flush = false,
  ...props
}: React.ComponentProps<"div"> & { flush?: boolean }) {
  return (
    <div
      className={cn("ui-panel-body", flush && "ui-panel-body-flush", className)}
      {...props}
    />
  );
}

export function PanelFoot({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("ui-panel-foot", className)} {...props} />;
}
