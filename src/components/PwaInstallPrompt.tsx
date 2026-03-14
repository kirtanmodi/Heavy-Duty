import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const INSTALL_PROMPT_DISMISS_KEY = "hd_pwa_install_prompt_hidden";

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as NavigatorWithStandalone).standalone)
  );
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function readDismissedState() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(INSTALL_PROMPT_DISMISS_KEY) === "1";
}

export function PwaInstallPrompt() {
  const location = useLocation();
  const isIos = useMemo(() => isIosDevice(), []);
  const [dismissed, setDismissed] = useState(() => readDismissedState());
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneDisplayMode());
  const [isInstalling, setIsInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalling(false);
      setIsStandalone(true);
      setDismissed(false);
      window.localStorage.removeItem(INSTALL_PROMPT_DISMISS_KEY);
    };

    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = (event?: MediaQueryListEvent) => {
      setIsStandalone(event?.matches ?? isStandaloneDisplayMode());
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (typeof displayMode.addEventListener === "function") {
      displayMode.addEventListener("change", onDisplayModeChange);
    } else {
      displayMode.addListener(onDisplayModeChange);
    }

    onDisplayModeChange();

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);

      if (typeof displayMode.removeEventListener === "function") {
        displayMode.removeEventListener("change", onDisplayModeChange);
      } else {
        displayMode.removeListener(onDisplayModeChange);
      }
    };
  }, []);

  const isHiddenRoute =
    location.pathname.startsWith("/workout") || /^\/history\/.+\/edit/.test(location.pathname);

  const canShowPrompt = !isHiddenRoute && !dismissed && !isStandalone && (Boolean(deferredPrompt) || isIos);

  const dismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(INSTALL_PROMPT_DISMISS_KEY, "1");
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const title = deferredPrompt ? "Install Heavy Duty" : "Add it to your home screen";
  const message = deferredPrompt
    ? "Open the tracker like a native app with offline access and a cleaner full-screen mobile layout."
    : "On iPhone or iPad, tap Share and then Add to Home Screen for the full PWA experience.";

  return (
    <AnimatePresence>
      {canShowPrompt ? (
        <motion.aside
          key="pwa-install-prompt"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(6.4rem+env(safe-area-inset-bottom))] z-40 px-3"
        >
          <div className="pointer-events-auto mx-auto w-full max-w-[460px]">
            <div className="surface-card card-glow-red rounded-[1.45rem] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-red/12 text-accent-red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M12 15V5" strokeLinecap="round" />
                    <path d="M8.5 8.5L12 5l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 18.5h14" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-[0.01em] text-text-primary">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">{message}</p>
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className="touch-target -mr-1 -mt-1 inline-flex items-center justify-center rounded-full text-text-muted active:bg-white/6 active:text-text-secondary"
                  aria-label="Dismiss install prompt"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {deferredPrompt ? (
                  <button type="button" onClick={handleInstall} className="btn-primary px-4 text-sm font-medium" disabled={isInstalling}>
                    {isInstalling ? "Opening..." : "Install App"}
                  </button>
                ) : (
                  <div className="chip text-xs font-medium uppercase tracking-[0.18em] text-accent-yellow">
                    Share &gt; Add to Home Screen
                  </div>
                )}
                <button type="button" onClick={dismiss} className="btn-secondary px-4 text-sm font-medium">
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
