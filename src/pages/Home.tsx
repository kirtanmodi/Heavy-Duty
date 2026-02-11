import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { useSettingsStore } from '../store/settingsStore'
import { useWorkoutStore } from '../store/workoutStore'
import { getProgram } from '../data/programs'
import { getExercise, muscleColors } from '../data/exercises'
import { getRandomQuote } from '../data/quotes'
import { MuscleMap } from '../components/anatomy/MuscleMap'
import type { ProgramDay } from '../types'

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const fullDayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayTypeColors: Record<string, string> = {
  lift: 'bg-accent-red',
  cardio: 'bg-accent-blue',
  recovery: 'bg-accent-green',
  rest: 'bg-text-dim',
}

export function Home() {
  const navigate = useNavigate()
  const activeProgram = useSettingsStore(s => s.activeProgram)
  const { history, clearAll: clearWorkouts } = useWorkoutStore()
  const clearSettings = useSettingsStore(s => s.clearAll)
  const [selectedDay, setSelectedDay] = useState<ProgramDay | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [quote] = useState(getRandomQuote)
  const [showBigPicture, setShowBigPicture] = useState(false)

  const program = activeProgram ? getProgram(activeProgram) : null

  const stats = useMemo(() => {
    const total = history.length
    const avgSets = total > 0
      ? Math.round(history.reduce((sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0), 0) / total)
      : 0

    let streak = 0
    const now = new Date()
    for (let i = 0; i < 30; i++) {
      const day = new Date(now)
      day.setDate(day.getDate() - i)
      const dateStr = day.toISOString().split('T')[0]
      const hasWorkout = history.some(w => w.date.startsWith(dateStr))
      if (i < 7 && !hasWorkout) continue
      if (hasWorkout) streak++
      else break
    }

    return { total, avgSets, streak }
  }, [history])

  const todayDow = new Date().getDay()

  const getDayForDow = (dow: number): ProgramDay | undefined => {
    if (!program) return undefined
    return program.days.find(d => d.dayOfWeek === dow)
  }

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

  const getAllMusclesForDay = (day: ProgramDay) => {
    const muscles = new Set<string>()
    day.exercises.forEach(exId => {
      const ex = getExercise(exId)
      if (ex) ex.primaryMuscles.forEach(m => muscles.add(m))
    })
    return Array.from(muscles)
  }

  return (
    <PageLayout>
      {/* Header */}
      <div className="pt-6 pb-4">
        <h1 className="font-[var(--font-display)] text-3xl font-bold uppercase tracking-[3px] text-text-primary">
          Heavy Duty
        </h1>
        <p className="mt-0.5 text-xs text-text-muted">
          Minimum volume. Maximum intensity.
        </p>
      </div>

      {/* Today's Workout Hero Card */}
      <TodayHeroCard
        todayDay={getDayForDow(todayDow)}
        todayDow={todayDow}
        muscles={getDayForDow(todayDow) ? getAllMusclesForDay(getDayForDow(todayDow)!) : []}
        onStartWorkout={getDayForDow(todayDow) ? () => navigate(`/workout/${getDayForDow(todayDow)!.id}`) : () => {}}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Workouts', value: stats.total },
          { label: 'Avg Sets', value: stats.avgSets },
          { label: 'This Week', value: stats.streak },
        ].map(stat => (
          <div key={stat.label} className="rounded-[14px] border border-border-card bg-bg-card p-3 text-center">
            <div className="font-[var(--font-display)] text-2xl font-bold text-accent-red">{stat.value}</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quote / Big Picture toggle */}
      <button
        onClick={() => setShowBigPicture(!showBigPicture)}
        className="mb-5 w-full rounded-[14px] border border-border-card bg-bg-card p-4 text-left"
      >
        {showBigPicture ? (
          <div>
            <div className="mb-2 font-[var(--font-display)] text-xs font-semibold uppercase tracking-wider text-accent-yellow">
              The Big Picture
            </div>
            <div className="space-y-1 text-sm text-text-secondary">
              <p>Lifting 3x/week <span className="text-text-dim">(muscle + metabolism)</span></p>
              <p>+ Cardio 2x/week <span className="text-text-dim">(heart + endurance)</span></p>
              <p>+ Walking 1x/week <span className="text-text-dim">(recovery + extra burn)</span></p>
              <p>+ Calorie deficit + high protein <span className="text-text-dim">(fat loss)</span></p>
              <p>+ Sleep 7 hrs <span className="text-text-dim">(recovery)</span></p>
              <p className="pt-1 font-semibold text-accent-green">= Visible results in 6-8 weeks</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="mt-0.5 w-1 shrink-0 rounded-full bg-accent-red" />
            <div>
              <p className="text-sm italic leading-relaxed text-text-secondary">"{quote}"</p>
              <p className="mt-1 text-xs text-text-dim">— Mike Mentzer</p>
            </div>
          </div>
        )}
      </button>

      {/* Program header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted">
          {program.name}
        </span>
        <button
          onClick={() => navigate('/program-select')}
          className="text-xs font-medium text-accent-red"
        >
          Change
        </button>
      </div>

      {/* Weekly calendar strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 0].map(dow => {
          const day = getDayForDow(dow)
          const isToday = dow === todayDow
          return (
            <button
              key={dow}
              onClick={() => day && setSelectedDay(selectedDay?.dayOfWeek === dow ? null : day)}
              className={`flex flex-col items-center gap-1.5 rounded-xl py-2 transition-all ${
                isToday ? 'bg-bg-input ring-1 ring-accent-red/50' : ''
              } ${selectedDay?.dayOfWeek === dow ? 'bg-bg-input' : ''}`}
            >
              <span className="text-[10px] font-medium uppercase text-text-dim">
                {dayLabels[dow]}
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${day ? dayTypeColors[day.type] : 'bg-text-dim'}`} />
            </button>
          )
        })}
      </div>

      {/* Day-type legend */}
      <div className="mt-2 mb-5 flex items-center justify-center gap-4">
        {Object.entries(dayTypeColors).map(([type, colorClass]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${colorClass}`} />
            <span className="text-[10px] font-medium capitalize text-text-dim">{type}</span>
          </div>
        ))}
      </div>

      {/* Selected day card */}
      {selectedDay && (
        <DayCard
          day={selectedDay}
          onStartWorkout={() => navigate(`/workout/${selectedDay.id}`)}
          muscles={getAllMusclesForDay(selectedDay)}
        />
      )}

      {/* Remaining lift days (if none selected) */}
      {!selectedDay && (() => {
        const todayDay = getDayForDow(todayDow)
        const remainingLiftDays = program.days.filter(
          d => d.type === 'lift' && !(todayDay?.type === 'lift' && d.dayOfWeek === todayDow)
        )
        if (remainingLiftDays.length === 0) return null
        return (
          <>
            <h2 className="mb-3 font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted">
              This Week's Workouts
            </h2>
            {remainingLiftDays.map(day => (
              <CompactDayCard
                key={day.id}
                day={day}
                onStartWorkout={() => navigate(`/workout/${day.id}`)}
                muscles={getAllMusclesForDay(day)}
              />
            ))}
          </>
        )
      })()}

      {/* Cardio/rest info (if selected) */}
      {selectedDay && selectedDay.type !== 'lift' && (
        <div className="mb-4 rounded-[14px] border border-border-card bg-bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className={`h-3 w-3 rounded-full ${dayTypeColors[selectedDay.type]}`} />
            <h3 className="font-[var(--font-display)] text-base font-semibold uppercase tracking-wide text-text-primary">
              {selectedDay.focus}
            </h3>
          </div>
          {selectedDay.duration && (
            <p className="mb-2 text-sm text-accent-yellow">{selectedDay.duration}</p>
          )}
          {selectedDay.description && (
            <p className="text-sm leading-relaxed text-text-secondary">{selectedDay.description}</p>
          )}
          {selectedDay.tips && (
            <p className="mt-3 text-xs italic text-text-dim">{selectedDay.tips}</p>
          )}
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

function DayCard({
  day,
  onStartWorkout,
  muscles,
}: {
  day: ProgramDay
  onStartWorkout: () => void
  muscles: string[]
}) {
  const navigate = useNavigate()

  if (day.type !== 'lift') return null

  return (
    <div className="mb-4 rounded-[14px] border border-border-card bg-bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-[var(--font-display)] text-base font-semibold uppercase tracking-wide text-text-primary">
            {day.name}
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            {day.exercises.length} exercises • 2 sets each to failure
          </p>
          {day.supersets.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] text-accent-yellow">⚡ {day.supersets.length} superset{day.supersets.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <MuscleMap primaryMuscles={muscles} size="small" />
      </div>

      {/* Exercise list */}
      <div className="mt-4 space-y-1.5">
        {day.exercises.map((exId, i) => {
          const ex = getExercise(exId)
          if (!ex) return null
          const isFirstInSuperset = day.supersets.some(s => s[0] === exId)
          const isSecondInSuperset = day.supersets.some(s => s[1] === exId)

          return (
            <button
              key={exId}
              onClick={() => navigate(`/exercise/${exId}`)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors active:bg-bg-input"
            >
              {isFirstInSuperset && (
                <span className="text-[10px] text-accent-yellow">→</span>
              )}
              {isSecondInSuperset && (
                <span className="text-[10px] text-accent-yellow">←</span>
              )}
              {!isFirstInSuperset && !isSecondInSuperset && (
                <span className="text-text-dim text-xs">{i + 1}.</span>
              )}
              <div className="flex gap-1">
                {ex.primaryMuscles.slice(0, 2).map(m => (
                  <span
                    key={m}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: muscleColors[m] }}
                  />
                ))}
              </div>
              <span className="flex-1 text-sm text-text-secondary">{ex.name}</span>
              <span className="text-xs text-text-dim">{ex.repRange[0]}-{ex.repRange[1]}</span>
            </button>
          )
        })}
      </div>

      {/* Start button */}
      <button
        onClick={onStartWorkout}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent-red to-accent-orange py-3.5 font-[var(--font-display)] text-sm font-semibold uppercase tracking-[1.5px] text-white transition-all active:scale-[0.98]"
      >
        Start Workout
      </button>
    </div>
  )
}

function CompactDayCard({
  day,
  onStartWorkout,
  muscles,
}: {
  day: ProgramDay
  onStartWorkout: () => void
  muscles: string[]
}) {
  if (day.type !== 'lift') return null

  return (
    <div className="mb-3 rounded-[14px] border border-border-card bg-bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-[var(--font-display)] text-sm font-semibold uppercase tracking-wide text-text-primary">
            {fullDayLabels[day.dayOfWeek]} — {day.focus}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-text-muted">
              {day.exercises.length} exercises
            </span>
            {day.supersets.length > 0 && (
              <span className="text-[10px] text-accent-yellow">⚡ {day.supersets.length} superset{day.supersets.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <MuscleMap primaryMuscles={muscles} size="small" />
      </div>
      <button
        onClick={onStartWorkout}
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-accent-red to-accent-orange py-3 font-[var(--font-display)] text-xs font-semibold uppercase tracking-[1.5px] text-white transition-all active:scale-[0.98]"
      >
        Start Workout
      </button>
    </div>
  )
}

const dayTypeLabels: Record<string, string> = {
  lift: 'Lift',
  cardio: 'Cardio',
  recovery: 'Recovery',
  rest: 'Rest',
}

function TodayHeroCard({
  todayDay,
  todayDow,
  muscles,
  onStartWorkout,
}: {
  todayDay: ProgramDay | undefined
  todayDow: number
  muscles: string[]
  onStartWorkout: () => void
}) {
  if (!todayDay) return null

  return (
    <div className="mb-5 rounded-[14px] border border-border-card bg-bg-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className={`h-2.5 w-2.5 rounded-full ${dayTypeColors[todayDay.type]}`} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {dayTypeLabels[todayDay.type]}
          </span>
        </div>
        <h2 className="font-[var(--font-display)] text-xl font-bold uppercase tracking-wide text-text-primary">
          {fullDayLabels[todayDow]} — {todayDay.focus}
        </h2>

        {todayDay.type === 'lift' ? (
          <>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-text-muted">
                {todayDay.exercises.length} exercises
              </span>
              {todayDay.supersets.length > 0 && (
                <span className="text-xs text-accent-yellow">
                  ⚡ {todayDay.supersets.length} superset{todayDay.supersets.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <MuscleMap primaryMuscles={muscles} size="small" />
              <button
                onClick={onStartWorkout}
                className="flex-1 rounded-xl bg-gradient-to-r from-accent-red to-accent-orange py-4 font-[var(--font-display)] text-sm font-semibold uppercase tracking-[1.5px] text-white transition-all active:scale-[0.98]"
              >
                Start Workout
              </button>
            </div>
          </>
        ) : (
          <div className="mt-3">
            {todayDay.duration && (
              <p className="mb-2 text-sm text-accent-yellow">{todayDay.duration}</p>
            )}
            {todayDay.description && (
              <p className="text-sm leading-relaxed text-text-secondary">{todayDay.description}</p>
            )}
            {todayDay.tips && (
              <p className="mt-3 text-xs italic text-text-dim">{todayDay.tips}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
