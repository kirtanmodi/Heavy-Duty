import type { CSSProperties, ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  withBottomNavPadding?: boolean;
}

export function PageLayout({ children, className = "", withBottomNavPadding = true }: PageLayoutProps) {
  const style: CSSProperties = {
    paddingTop: "max(1.75rem, env(safe-area-inset-top))",
    paddingLeft: "max(1.5rem, calc(env(safe-area-inset-left) + 1rem))",
    paddingRight: "max(1.5rem, calc(env(safe-area-inset-right) + 1rem))",
    paddingBottom: withBottomNavPadding
      ? "calc(7.5rem + env(safe-area-inset-bottom))"
      : "max(2rem, env(safe-area-inset-bottom))",
  };

  return (
    <div className={`w-full min-h-dvh overflow-x-hidden ${className}`} style={style}>
      {children}
    </div>
  );
}
