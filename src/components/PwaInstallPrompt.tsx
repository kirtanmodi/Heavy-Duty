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
  const [showIosSteps, setShowIosSteps] = useState(false);
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
  const isHomeRoute = location.pathname === "/";

  const canShowPrompt =
    isHomeRoute && !isHiddenRoute && !dismissed && !isStandalone && (Boolean(deferredPrompt) || isIos);

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

  return (
    <>
      {canShowPrompt && <div aria-hidden className="h-24 shrink-0" />}
      <AnimatePresence>
        {canShowPrompt ? (
          <motion.aside
            key="pwa-install-prompt"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="pointer-events-none fixed inset-x-0 bottom-[max(5.625rem,calc(env(safe-area-inset-bottom)+5rem))] z-40 px-4"
          >
            <div className="pointer-events-auto mx-auto w-full max-w-[460px]">
              <div className="glass rounded-[1.25rem] py-2 pl-3 pr-2">
                <div className="flex items-center gap-3">
                  <img src="/pwa-icon.svg" alt="" aria-hidden className="h-10 w-10 shrink-0" />

                  {deferredPrompt ? (
                    <>
                      <div className="min-w-0 flex-1 py-1">
                        <p className="text-[15px] font-semibold leading-snug tracking-tight text-text-primary">Install Heavy Duty</p>
                        <p className="text-[13px] leading-snug text-text-muted">Works offline</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleInstall}
                        className="btn-secondary min-h-11 shrink-0 px-4 text-[14px]"
                        disabled={isInstalling}
                      >
                        {isInstalling ? "Opening..." : "Install"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowIosSteps((value) => !value)}
                      aria-expanded={showIosSteps}
                      className="min-h-11 min-w-0 flex-1 py-1 text-left"
                    >
                      <span className="block text-[15px] font-semibold leading-snug tracking-tight text-text-primary">
                        Install Heavy Duty
                      </span>
                      <span className="inline-flex items-center gap-1 text-[13px] leading-snug text-text-muted">
                        {showIosSteps ? "Hide steps" : "Show steps"}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`h-3.5 w-3.5 transition-transform ${showIosSteps ? "rotate-180" : ""}`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={dismiss}
                    className="btn-icon -ml-1 shrink-0 bg-transparent active:bg-fill"
                    aria-label="Dismiss install prompt"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      className="h-[18px] w-[18px]"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>

                {!deferredPrompt && showIosSteps && (
                  <p className="pb-1.5 pl-[3.25rem] pr-3 text-[13px] leading-relaxed text-text-muted">
                    Tap <span className="font-medium text-text-secondary">Share</span>, then choose{" "}
                    <span className="font-medium text-text-secondary">Add to Home Screen</span>.
                  </p>
                )}
              </div>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
