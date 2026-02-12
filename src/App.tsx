import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "./components/layout/BottomNav";
import { Home } from "./pages/Home";
import { Workout } from "./pages/Workout";
import { History } from "./pages/History";
import { Exercises } from "./pages/Exercises";

function AppRoutes() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] min-w-0 flex-col">
      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout/:dayId" element={<Workout />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/history" element={<History />} />
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
