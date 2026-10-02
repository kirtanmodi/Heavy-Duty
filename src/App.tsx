import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { BottomNav } from "./components/layout/BottomNav";
import { PageLayout } from "./components/layout/PageLayout";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { useWorkoutStore } from "./store/workoutStore";
import {
  loadExercisesPage,
  loadHistoryEditPage,
  loadHistoryPage,
  loadHomePage,
  loadMyGymPage,
  loadProgressPage,
  loadWorkoutPage,
  loadWorkoutSummaryPage,
} from "./lib/routePrefetch";

const Home = lazy(loadHomePage);
const Workout = lazy(loadWorkoutPage);
const WorkoutSummary = lazy(loadWorkoutSummaryPage);
const History = lazy(loadHistoryPage);
const HistoryEdit = lazy(loadHistoryEditPage);
const Exercises = lazy(loadExercisesPage);
const Progress = lazy(loadProgressPage);
const MyGym = lazy(loadMyGymPage);

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  const radius = className.includes("rounded-") ? "" : "rounded-[0.875rem]";
  return <div className={`animate-pulse bg-fill ${radius} ${className}`} />;
}

function SkeletonCard({ className }: { className: string }) {
  return <section className={`surface-card animate-pulse rounded-[1.25rem] ${className}`} />;
}

function SkeletonHeader({ withEyebrow = false }: { withEyebrow?: boolean }) {
  return (
    <header className="px-1 pt-2">
      {withEyebrow && <SkeletonBlock className="mb-2 h-3.5 w-24" />}
      <SkeletonBlock className="h-8 w-36" />
    </header>
  );
}

function SkeletonSetRow() {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2">
      <SkeletonBlock className="h-8 w-8 rounded-full" />
      <SkeletonBlock className="h-11" />
      <SkeletonBlock className="h-11" />
      <SkeletonBlock className="h-11 rounded-full" />
    </div>
  );
}

function RouteFallback({ pathname }: { pathname: string }) {
  const hideBottomNav = pathname.startsWith("/workout") || /^\/history\/.+\/edit/.test(pathname);
  const isWorkoutRoute = pathname.startsWith("/workout");
  const isProgressRoute = pathname.startsWith("/progress");
  const isHistoryRoute = pathname.startsWith("/history");

  return (
    <PageLayout withBottomNavPadding={!hideBottomNav} className="flex flex-col gap-6">
      {isProgressRoute ? (
        <>
          <SkeletonHeader />
          <SkeletonBlock className="h-10 w-full rounded-full" />
          <div className="px-1">
            <SkeletonBlock className="h-7 w-48" />
            <SkeletonBlock className="mt-2 h-3.5 w-36" />
          </div>
          <SkeletonCard className="h-[4.75rem]" />
          <SkeletonCard className="h-64" />
        </>
      ) : isWorkoutRoute ? (
        <>
          <header className="flex items-start justify-between gap-3 pt-1">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-3.5 w-40" />
              <SkeletonBlock className="mt-2.5 h-8 w-28" />
            </div>
            <SkeletonBlock className="h-11 w-11 shrink-0 rounded-full" />
          </header>
          {[0, 1].map((card) => (
            <section key={card} className="surface-card rounded-[1.25rem] p-4">
              <SkeletonBlock className={`h-5 ${card === 0 ? "w-40" : "w-36"}`} />
              <SkeletonBlock className={`mt-2 h-3.5 ${card === 0 ? "w-28" : "w-24"}`} />
              <div className="mt-4 flex flex-col gap-2">
                <SkeletonSetRow />
                <SkeletonSetRow />
              </div>
            </section>
          ))}
        </>
      ) : isHistoryRoute ? (
        <>
          <SkeletonHeader />
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-16 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-24 rounded-full" />
          </div>
          <div className="flex flex-col gap-2.5">
            <SkeletonBlock className="h-4 w-32" />
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2].map((row) => (
                <section key={row} className="surface-card rounded-[1.25rem] p-4">
                  <SkeletonBlock className="h-5 w-44" />
                  <SkeletonBlock className="mt-2 h-3.5 w-28" />
                  <SkeletonBlock className="mt-3 h-3.5 w-52" />
                </section>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <SkeletonHeader withEyebrow />
          <section className="surface-card rounded-[1.25rem] p-5">
            <SkeletonBlock className="h-3.5 w-20" />
            <SkeletonBlock className="mt-3 h-7 w-32" />
            <SkeletonBlock className="mt-2 h-3.5 w-40" />
            <SkeletonBlock className="mt-5 h-12 w-full rounded-full" />
          </section>
          <div className="flex gap-2">
            <SkeletonBlock className="h-11 w-24 rounded-full" />
            <SkeletonBlock className="h-11 w-28 rounded-full" />
            <SkeletonBlock className="h-11 w-20 rounded-full" />
          </div>
          <div className="flex flex-col gap-2.5">
            <SkeletonBlock className="ml-1 h-4 w-28" />
            <SkeletonCard className="h-64" />
          </div>
        </>
      )}
    </PageLayout>
  );
}

function AppRoutes() {
  const location = useLocation();
  const renderPage = (page: ReactNode) => (
    <Suspense fallback={<RouteFallback pathname={location.pathname} />}>
      <PageTransition>{page}</PageTransition>
    </Suspense>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] min-w-0 flex-col">
      <main className="relative min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={renderPage(<Home />)} />
            <Route path="/workout/:dayId" element={renderPage(<Workout />)} />
            <Route path="/workout-summary" element={renderPage(<WorkoutSummary />)} />
            <Route path="/progress" element={renderPage(<Progress />)} />
            <Route path="/exercises" element={renderPage(<Exercises />)} />
            <Route path="/my-gym" element={renderPage(<MyGym />)} />
            <Route path="/history" element={renderPage(<History />)} />
            <Route path="/history/:workoutId/edit" element={renderPage(<HistoryEdit />)} />
          </Routes>
        </AnimatePresence>
      </main>
      <PwaInstallPrompt />
      <BottomNav />
    </div>
  );
}

function useExpireStaleWorkout() {
  useEffect(() => {
    const expire = () => useWorkoutStore.getState().expireStaleWorkout();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") expire();
    };
    expire();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", expire);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", expire);
    };
  }, []);
}

export default function App() {
  useExpireStaleWorkout();
  return (
    <BrowserRouter>
      <div className="app-shell">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
