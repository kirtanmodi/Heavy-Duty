import { Suspense, lazy, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { BottomNav } from "./components/layout/BottomNav";
import { PageLayout } from "./components/layout/PageLayout";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.05] ${className}`} />;
}

function RouteFallback({ pathname }: { pathname: string }) {
  const hideBottomNav = pathname.startsWith("/workout") || /^\/history\/.+\/edit/.test(pathname);
  const isWorkoutRoute = pathname.startsWith("/workout");
  const isProgressRoute = pathname.startsWith("/progress");
  const isHistoryRoute = pathname.startsWith("/history");

  return (
    <PageLayout withBottomNavPadding={!hideBottomNav} className="flex flex-col gap-4">
      <section className="surface-card rounded-[1.9rem] p-5">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="mt-3 h-10 w-36" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-[18rem]" />
      </section>

      {isProgressRoute ? (
        <>
          <section className="hero-surface rounded-[1.9rem] p-5">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-10 w-44" />
            <SkeletonBlock className="mt-3 h-4 w-full max-w-[16rem]" />
            <div className="mt-5 grid grid-cols-3 gap-2">
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
            </div>
          </section>
          <section className="surface-card rounded-[1.75rem] p-4">
            <div className="flex gap-2">
              <SkeletonBlock className="h-9 w-16 rounded-full" />
              <SkeletonBlock className="h-9 w-20 rounded-full" />
              <SkeletonBlock className="h-9 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="mt-4 h-40 w-full" />
          </section>
        </>
      ) : isWorkoutRoute ? (
        <>
          <section className="surface-card-muted rounded-[1.55rem] p-4">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="mt-3 h-5 w-40" />
            <div className="mt-4 flex gap-2">
              <SkeletonBlock className="h-11 w-36" />
              <SkeletonBlock className="h-11 w-28" />
            </div>
          </section>
          <section className="surface-card rounded-[1.7rem] p-4">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="mt-3 h-4 w-28" />
            <div className="mt-4 grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2">
              <SkeletonBlock className="h-11" />
              <SkeletonBlock className="h-11" />
              <SkeletonBlock className="h-11" />
              <SkeletonBlock className="h-11" />
            </div>
          </section>
          <section className="surface-card rounded-[1.7rem] p-4">
            <SkeletonBlock className="h-5 w-36" />
            <div className="mt-4 grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2">
              <SkeletonBlock className="h-11" />
              <SkeletonBlock className="h-11" />
              <SkeletonBlock className="h-11" />
              <SkeletonBlock className="h-11" />
            </div>
          </section>
        </>
      ) : isHistoryRoute ? (
        <>
          <section className="surface-card rounded-[1.6rem] p-4">
            <SkeletonBlock className="h-4 w-14" />
            <SkeletonBlock className="mt-3 h-5 w-52" />
            <SkeletonBlock className="mt-2 h-4 w-full max-w-[18rem]" />
          </section>
          <section className="surface-card rounded-[1.6rem] p-4">
            <SkeletonBlock className="h-4 w-24" />
            <div className="mt-4 flex gap-2">
              <SkeletonBlock className="h-9 w-16 rounded-full" />
              <SkeletonBlock className="h-9 w-20 rounded-full" />
              <SkeletonBlock className="h-9 w-24 rounded-full" />
            </div>
          </section>
          <section className="surface-card rounded-[1.6rem] p-4">
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="mt-3 h-4 w-24" />
            <SkeletonBlock className="mt-4 h-20 w-full" />
          </section>
        </>
      ) : (
        <>
          <section className="surface-card rounded-[1.8rem] p-5">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="mt-3 h-11 w-full" />
          </section>
          <section className="surface-card rounded-[1.75rem] p-4">
            <SkeletonBlock className="h-4 w-24" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
          </section>
          <section className="surface-card rounded-[1.75rem] p-4">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="mt-4 h-52 w-full" />
          </section>
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
