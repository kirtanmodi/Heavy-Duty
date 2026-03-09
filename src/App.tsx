import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { BottomNav } from "./components/layout/BottomNav";
import { Home } from "./pages/Home";
import { Workout } from "./pages/Workout";
import { WorkoutSummary } from "./pages/WorkoutSummary";
import { History } from "./pages/History";
import { HistoryEdit } from "./pages/HistoryEdit";
import { Exercises } from "./pages/Exercises";
import { Progress } from "./pages/Progress";

function PageTransition({ children }: { children: React.ReactNode }) {
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

function AppRoutes() {
  const location = useLocation();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] min-w-0 flex-col">
      <main className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/workout/:dayId" element={<PageTransition><Workout /></PageTransition>} />
            <Route path="/workout-summary" element={<PageTransition><WorkoutSummary /></PageTransition>} />
            <Route path="/progress" element={<PageTransition><Progress /></PageTransition>} />
            <Route path="/exercises" element={<PageTransition><Exercises /></PageTransition>} />
            <Route path="/history" element={<PageTransition><History /></PageTransition>} />
            <Route path="/history/:workoutId/edit" element={<PageTransition><HistoryEdit /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
