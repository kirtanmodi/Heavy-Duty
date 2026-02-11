import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", label: "Home", icon: "home" },
  { path: "/program-select", label: "Programs", icon: "programs" },
  { path: "/library", label: "Library", icon: "library" },
  { path: "/history", label: "History", icon: "history" },
] as const;

function TabIcon({ icon }: { icon: (typeof tabs)[number]["icon"] }) {
  if (icon === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5.5 9.8V20h13V9.8" />
      </svg>
    );
  }

  if (icon === "programs") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="4" width="7" height="7" rx="1.5" />
        <rect x="14" y="4" width="7" height="7" rx="1.5" />
        <rect x="3" y="13" width="7" height="7" rx="1.5" />
        <rect x="14" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  }

  if (icon === "library") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z" />
        <path d="M8 4v19" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3 2" />
    </svg>
  );
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.startsWith("/workout/")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[460px] rounded-2xl border border-border-card bg-bg-card p-1.5">
        <div className="grid min-w-0 grid-cols-4 gap-1.5">
          {tabs.map((tab) => {
            const active = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 transition-colors ${
                  active ? "bg-bg-input text-text-primary" : "text-text-muted active:bg-bg-input/80"
                }`}
              >
                <TabIcon icon={tab.icon} />
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
