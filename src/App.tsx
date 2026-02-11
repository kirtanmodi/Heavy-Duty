import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { useSettingsStore } from "./store/settingsStore";
import { Home } from "./pages/Home";
import { ProgramSelect } from "./pages/ProgramSelect";
import { Workout } from "./pages/Workout";
import { History } from "./pages/History";
import { ExerciseLibrary } from "./pages/ExerciseLibrary";
import { ExerciseDetail } from "./pages/ExerciseDetail";

function AppRoutes() {
  const activeProgram = useSettingsStore((s) => s.activeProgram);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] min-w-0 flex-col">
      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={activeProgram ? <Home /> : <Navigate to="/program-select" replace />} />
          <Route path="/program-select" element={<ProgramSelect />} />
          <Route path="/workout/:dayId" element={<Workout />} />
          <Route path="/history" element={<History />} />
          <Route path="/library" element={<ExerciseLibrary />} />
          <Route path="/exercise/:id" element={<ExerciseDetail />} />
        </Routes>
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
