import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { useSettingsStore } from '../store/settingsStore'
import { useWorkoutStore } from '../store/workoutStore'
import { getProgram } from '../data/programs'
import { getExercise } from '../data/exercises'

const fullDayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function Home() {
  const navigate = useNavigate()
  const activeProgram = useSettingsStore(s => s.activeProgram)
  const clearWorkouts = useWorkoutStore(s => s.clearAll)
  const clearSettings = useSettingsStore(s => s.clearAll)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const program = activeProgram ? getProgram(activeProgram) : null

  const handleClearAll = () => {
    clearWorkouts()
    clearSettings()
    setShowClearConfirm(false)
    window.location.reload()
  }

  if (!program) {
    navigate('/program-select')
    return null
  }

  const todayDow = new Date().getDay()
  const todayDay = program.days.find(d => d.dayOfWeek === todayDow)

  const otherLiftDays = program.days.filter(
    d => d.type === 'lift' && d.dayOfWeek !== todayDow
  )

  const getExerciseCount = (exerciseIds: string[]) =>
    exerciseIds.filter(id => getExercise(id)).length

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-baseline justify-between pt-8 pb-2">
        <h1 className="font-[var(--font-display)] text-3xl font-bold uppercase tracking-[3px] text-text-primary">
          Heavy Duty
        </h1>
        <button
          onClick={() => navigate('/program-select')}
          className="text-xs font-medium text-text-muted"
        >
          {program.shortName}
        </button>
      </div>

      {/* Today section */}
      {todayDay && (
        <div className="mt-10 mb-12">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-text-dim">
            Today — {fullDayLabels[todayDow]}
          </div>
          <h2 className="font-[var(--font-display)] text-2xl font-bold uppercase tracking-wide text-text-primary">
            {todayDay.focus}
          </h2>
          {todayDay.type === 'lift' && (
            <p className="mt-1 text-sm text-text-muted">
              {getExerciseCount(todayDay.exercises)} exercises
            </p>
          )}
          {todayDay.type !== 'lift' && todayDay.duration && (
            <p className="mt-1 text-sm text-text-muted">{todayDay.duration}</p>
          )}
          {todayDay.type === 'lift' && (
            <button
              onClick={() => navigate(`/workout/${todayDay.id}`)}
              className="mt-6 w-full rounded-xl bg-accent-red py-4 font-[var(--font-display)] text-sm font-semibold uppercase tracking-[1.5px] text-white transition-all active:scale-[0.98]"
            >
              Start Workout
            </button>
          )}
        </div>
      )}

      {!todayDay && (
        <div className="mt-10 mb-12">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-text-dim">
            Today — {fullDayLabels[todayDow]}
          </div>
          <h2 className="font-[var(--font-display)] text-2xl font-bold uppercase tracking-wide text-text-primary">
            Rest Day
          </h2>
          <p className="mt-1 text-sm text-text-muted">No workout scheduled</p>
        </div>
      )}

      {/* Other training days */}
      {otherLiftDays.length > 0 && (
        <div className="mb-12">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-text-dim">
            Other Days
          </div>
          <div className="space-y-1">
            {otherLiftDays.map(day => (
              <button
                key={day.id}
                onClick={() => navigate(`/workout/${day.id}`)}
                className="flex w-full items-center justify-between rounded-xl px-1 py-3.5 text-left transition-colors active:bg-bg-input"
              >
                <span className="text-sm text-text-secondary">
                  {fullDayLabels[day.dayOfWeek]} — {day.focus}
                </span>
                <span className="text-text-dim">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear All Data */}
      <div className="mt-8 mb-4">
        {showClearConfirm ? (
          <div className="rounded-[14px] border border-accent-red/30 bg-accent-red/5 p-4">
            <p className="mb-3 text-sm text-text-secondary">
              Are you sure? This will delete all workout history and settings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearAll}
                className="flex-1 rounded-xl bg-accent-red py-3 font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-white"
              >
                Delete Everything
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-xl border border-border bg-bg-input py-3 font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full rounded-xl border border-accent-red/20 py-3 font-[var(--font-display)] text-xs font-semibold uppercase tracking-wider text-accent-red/60 transition-colors active:bg-accent-red/5"
          >
            Clear All Data
          </button>
        )}
      </div>
    </PageLayout>
  )
}
