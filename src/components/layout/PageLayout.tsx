import type { CSSProperties, ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  withBottomNavPadding?: boolean;
}

export function PageLayout({ children, className = "", withBottomNavPadding = true }: PageLayoutProps) {
  const style: CSSProperties = {
    paddingTop: "max(1.1rem, calc(env(safe-area-inset-top) + 0.4rem))",
    paddingLeft: "max(1rem, calc(env(safe-area-inset-left) + 1rem))",
    paddingRight: "max(1rem, calc(env(safe-area-inset-right) + 1rem))",
    paddingBottom: withBottomNavPadding
      ? "calc(7.8rem + env(safe-area-inset-bottom))"
      : "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))",
  };

  return (
    <div className={`page-shell w-full min-h-dvh overflow-x-hidden ${className}`} style={style}>
      {children}
    </div>
  );
}
