import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { prefetchRoute } from "../../lib/routePrefetch";

const tabs = [
  { path: "/", label: "Home", icon: "home" },
  { path: "/progress", label: "Progress", icon: "progress" },
  { path: "/history", label: "History", icon: "history" },
  { path: "/setup", label: "Setup", icon: "setup" },
] as const;

const setupLinks = [
  { path: "/exercises", label: "Exercises", icon: "exercises" },
  { path: "/my-gym", label: "My Gym", icon: "gym" },
] as const;

function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  switch (icon) {
    case "home":
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
    case "progress":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-6 w-6">
          <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 16l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "exercises":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-6 w-6">
          <path d="M6.5 6v12M17.5 6v12M6.5 12h11M4 8v8M20 8v8" strokeLinecap="round" />
        </svg>
      );
    case "gym":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-6 w-6">
          <path d="M3 21h18" strokeLinecap="round" />
          <path d="M5 21V7l7-4 7 4v14" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" strokeLinecap="round" strokeWidth={active ? 2.5 : 2} />
        </svg>
      );
    case "setup":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="h-6 w-6">
          <path d="M12 3v4M12 17v4M4.2 7.2l2.8 2.8M17 14l2.8 2.8M3 12h4M17 12h4M4.2 16.8L7 14M17 10l2.8-2.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r={active ? "3.5" : "3"} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v5l3 2" />
        </svg>
      );
  }
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSetupMenu, setShowSetupMenu] = useState(false);

  useEffect(() => {
    setShowSetupMenu(false);
  }, [location.pathname]);

  const isSetupRoute = setupLinks.some((link) => location.pathname.startsWith(link.path));
  const shouldHide = location.pathname.startsWith("/workout") || /^\/history\/.+\/edit/.test(location.pathname);
  const primeRoute = (path: string) => {
    prefetchRoute(path);
  };
  const primeSetupRoutes = () => {
    prefetchRoute("/setup");
  };

  if (shouldHide) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[460px]">
        {showSetupMenu && (
          <div className="mb-3 flex justify-end">
            <div className="sheet-surface w-full max-w-[13rem] rounded-[1.5rem] p-2">
              <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim">Setup</p>
              <div className="flex flex-col gap-1">
                {setupLinks.map((link) => {
                  const active = location.pathname.startsWith(link.path);
                  return (
                    <button
                      key={link.path}
                      onClick={() => navigate(link.path)}
                      onMouseEnter={() => primeRoute(link.path)}
                      onFocus={() => primeRoute(link.path)}
                      onTouchStart={() => primeRoute(link.path)}
                      className={`flex items-center justify-between rounded-[1.1rem] px-3 py-3 text-left transition-colors ${
                        active ? "bg-white/[0.07] text-text-primary" : "text-text-secondary active:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <TabIcon icon={link.icon} active={active} />
                        <span className="text-sm font-medium">{link.label}</span>
                      </div>
                      {active && <span className="h-2 w-2 rounded-full bg-accent-red" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="floating-nav grid grid-cols-4 rounded-[1.75rem] p-2">
          {tabs.map((tab) => {
            const active =
              tab.path === "/"
                ? location.pathname === "/"
                : tab.path === "/setup"
                  ? isSetupRoute || showSetupMenu
                  : location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => {
                  if (tab.path === "/setup") {
                    setShowSetupMenu((prev) => !prev);
                    return;
                  }
                  setShowSetupMenu(false);
                  navigate(tab.path);
                }}
                onMouseEnter={() => (tab.path === "/setup" ? primeSetupRoutes() : primeRoute(tab.path))}
                onFocus={() => (tab.path === "/setup" ? primeSetupRoutes() : primeRoute(tab.path))}
                onTouchStart={() => (tab.path === "/setup" ? primeSetupRoutes() : primeRoute(tab.path))}
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
