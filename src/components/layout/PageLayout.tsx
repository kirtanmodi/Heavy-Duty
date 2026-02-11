import type { ReactNode } from "react";

export function PageLayout({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[480px] min-h-dvh px-5 pb-28 ${className}`}>{children}</div>;
}
