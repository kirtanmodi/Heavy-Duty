const homePageImport = () => import("../pages/Home");
const workoutPageImport = () => import("../pages/Workout");
const workoutSummaryPageImport = () => import("../pages/WorkoutSummary");
const progressPageImport = () => import("../pages/Progress");
const exercisesPageImport = () => import("../pages/Exercises");
const myGymPageImport = () => import("../pages/MyGym");
const historyPageImport = () => import("../pages/History");
const historyEditPageImport = () => import("../pages/HistoryEdit");

export const loadHomePage = () => homePageImport().then((module) => ({ default: module.Home }));
export const loadWorkoutPage = () => workoutPageImport().then((module) => ({ default: module.Workout }));
export const loadWorkoutSummaryPage = () =>
  workoutSummaryPageImport().then((module) => ({ default: module.WorkoutSummary }));
export const loadProgressPage = () => progressPageImport().then((module) => ({ default: module.Progress }));
export const loadExercisesPage = () => exercisesPageImport().then((module) => ({ default: module.Exercises }));
export const loadMyGymPage = () => myGymPageImport().then((module) => ({ default: module.MyGym }));
export const loadHistoryPage = () => historyPageImport().then((module) => ({ default: module.History }));
export const loadHistoryEditPage = () => historyEditPageImport().then((module) => ({ default: module.HistoryEdit }));

function warm(loader: () => Promise<unknown>) {
  void loader().catch(() => {});
}

export function prefetchRoute(path: string) {
  if (path === "/setup") {
    warm(exercisesPageImport);
    warm(myGymPageImport);
    return;
  }

  if (path === "/" || path.startsWith("/?")) {
    warm(homePageImport);
    return;
  }

  if (path.startsWith("/workout-summary")) {
    warm(workoutSummaryPageImport);
    return;
  }

  if (path.startsWith("/workout")) {
    warm(workoutPageImport);
    return;
  }

  if (path.startsWith("/progress")) {
    warm(progressPageImport);
    return;
  }

  if (path.startsWith("/exercises")) {
    warm(exercisesPageImport);
    return;
  }

  if (path.startsWith("/my-gym")) {
    warm(myGymPageImport);
    return;
  }

  if (/^\/history\/.+\/edit/.test(path)) {
    warm(historyEditPageImport);
    return;
  }

  if (path.startsWith("/history")) {
    warm(historyPageImport);
  }
}
