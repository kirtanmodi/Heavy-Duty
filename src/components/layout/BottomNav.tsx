import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";

const tabs = [
  { path: "/", label: "Home", icon: "home" },
  { path: "/progress", label: "Progress", icon: "progress" },
  { path: "/exercises", label: "Exercises", icon: "exercises" },
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
    <nav className="fixed inset-x-0 bottom-0 z-50 glass pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto grid w-full max-w-[460px] grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                active ? "text-text-primary" : "text-text-muted active:text-text-secondary"
              }`}
            >
              <TabIcon icon={tab.icon} active={active} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-0.5 h-[3px] w-5 rounded-full bg-accent-red"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
