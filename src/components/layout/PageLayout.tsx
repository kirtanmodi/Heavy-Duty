import type { CSSProperties, ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  withBottomNavPadding?: boolean;
}

export function PageLayout({ children, className = "", withBottomNavPadding = true }: PageLayoutProps) {
  const style: CSSProperties = {
    paddingTop: "max(1.25rem, calc(env(safe-area-inset-top) + 0.75rem))",
    paddingLeft: "max(1.125rem, calc(env(safe-area-inset-left) + 1.125rem))",
    paddingRight: "max(1.125rem, calc(env(safe-area-inset-right) + 1.125rem))",
    paddingBottom: withBottomNavPadding
      ? "calc(7rem + env(safe-area-inset-bottom))"
      : "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))",
  };

  return (
    <div className={`page-shell w-full min-h-dvh overflow-x-hidden ${className}`} style={style}>
      {children}
    </div>
  );
}
