import type { ReactNode } from "react";

export function PageLayout({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="w-full min-h-dvh flex flex-col items-center">
      <div className={`w-full min-w-0 mx-auto max-w-[480px] flex-1 px-8 pt-6 pb-28 overflow-x-hidden ${className}`}>{children}</div>
    </div>
  );
}
