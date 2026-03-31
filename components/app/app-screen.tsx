import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppScreenWidth = "default" | "wide" | "full";

const widthClassName: Record<AppScreenWidth, string> = {
  default: "pinly-content-shell",
  wide: "pinly-content-shell--wide",
  full: "w-full"
};

export function AppScreen({
  children,
  footer,
  width = "default",
  className,
  scrollClassName,
  contentClassName,
  footerClassName
}: {
  children: ReactNode;
  footer?: ReactNode;
  width?: AppScreenWidth;
  className?: string;
  scrollClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
}) {
  const resolvedWidthClassName = widthClassName[width];

  return (
    <section className={cn("pinly-screen-layout", footer ? "pinly-screen-layout--with-footer" : null, className)}>
      <div className={cn("pinly-screen-scroll", scrollClassName)} data-pinly-scroll-container="true">
        <div className={cn("pinly-screen-shell", resolvedWidthClassName, contentClassName)}>{children}</div>
      </div>
      {footer ? (
        <div className="pinly-screen-footer">
          <div className={cn("pinly-screen-footer-shell", resolvedWidthClassName, footerClassName)}>{footer}</div>
        </div>
      ) : null}
    </section>
  );
}
