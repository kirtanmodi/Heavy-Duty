import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useState } from "react";
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
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: active ? 2 : 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[22px] w-[22px]",
  };
  switch (icon) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 10.2 12 4l8 6.2V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill={active ? "currentColor" : "none"} />
        </svg>
      );
    case "progress":
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 15.5v-4M12 15.5V6.5M17 15.5v-7" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.2l2.8 1.8" />
        </svg>
      );
    case "exercises":
      return (
        <svg {...common}>
          <path d="M6.5 7v10M17.5 7v10M6.5 12h11M4 9.5v5M20 9.5v5" />
        </svg>
      );
    case "gym":
      return (
        <svg {...common}>
          <path d="M4 20h16M6 20V9.5L12 5l6 4.5V20" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "setup":
      return (
        <svg {...common}>
          <path d="M5 7h9M18 7h1M5 17h1M10 17h9" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSetupMenu, setShowSetupMenu] = useState(false);

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
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[460px]">
        {showSetupMenu && (
          <div className="mb-2 flex justify-end">
            <div className="sheet-surface w-full max-w-[13.5rem] rounded-[1.25rem] p-1.5">
              <div className="flex flex-col gap-0.5">
                {setupLinks.map((link) => {
                  const active = location.pathname.startsWith(link.path);
                  return (
                    <button
                      key={link.path}
                      onClick={() => {
                        setShowSetupMenu(false);
                        navigate(link.path);
                      }}
                      onMouseEnter={() => primeRoute(link.path)}
                      onFocus={() => primeRoute(link.path)}
                      onTouchStart={() => primeRoute(link.path)}
                      className={`flex min-h-[48px] items-center justify-between rounded-[0.9rem] px-3 text-left transition-colors ${
                        active ? "bg-white/[0.07] text-text-primary" : "text-text-secondary active:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <TabIcon icon={link.icon} active={active} />
                        <span className="text-sm font-medium">{link.label}</span>
                      </div>
                      {active && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-text-muted">
                          <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="floating-nav grid grid-cols-4 rounded-full p-1.5">
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
                aria-current={active && tab.path !== "/setup" ? "page" : undefined}
                className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-full px-2 transition-colors ${
                  active ? "text-text-primary" : "text-text-muted active:text-text-secondary"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-full bg-white/[0.08]"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
                <span className="relative z-10">
                  <TabIcon icon={tab.icon} active={active} />
                </span>
                <span className="relative z-10 text-[10.5px] font-medium tracking-[-0.005em]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
