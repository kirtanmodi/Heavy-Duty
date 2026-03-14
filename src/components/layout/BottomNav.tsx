import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";

const tabs = [
  { path: "/", label: "Home", icon: "home" },
  { path: "/progress", label: "Progress", icon: "progress" },
  { path: "/exercises", label: "Exercises", icon: "exercises" },
  { path: "/my-gym", label: "My Gym", icon: "gym" },
  { path: "/history", label: "History", icon: "history" },
] as const;

function TabIcon({ icon, active }: { icon: (typeof tabs)[number]["icon"]; active: boolean }) {
  if (icon === "home") {
    return (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.5} className="h-6 w-6">
        {active ? (
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
        ) : (
          <>
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5.5 9.8V20h13V9.8" />
          </>
        )}
      </svg>
    );
  }

  if (icon === "progress") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-6 w-6">
        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 16l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === "exercises") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-6 w-6">
        <path d="M6.5 6v12M17.5 6v12M6.5 12h11M4 8v8M20 8v8" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "gym") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-6 w-6">
        <path d="M3 21h18" strokeLinecap="round" />
        <path d="M5 21V7l7-4 7 4v14" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" strokeLinecap="round" strokeWidth={active ? 2.5 : 2} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3 2" />
    </svg>
  );
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.startsWith("/workout")) return null;
  if (/^\/history\/.+\/edit/.test(location.pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[460px]">
        <div className="floating-nav grid grid-cols-5 rounded-[1.75rem] p-2">
          {tabs.map((tab) => {
            const active = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[1.2rem] px-2 transition-colors ${
                  active ? "text-text-primary" : "text-text-muted active:text-text-secondary"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-[1.2rem] bg-white/[0.07]"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
                {active && <span className="absolute top-2 h-1 w-1 rounded-full bg-accent-red" />}
                <span className="relative z-10">
                  <TabIcon icon={tab.icon} active={active} />
                </span>
                <span className="relative z-10 text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
