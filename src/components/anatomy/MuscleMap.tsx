import { memo, useMemo } from 'react'

interface MuscleMapProps {
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  size?: 'small' | 'large'
  className?: string
}

const MUSCLE_COLORS: Record<string, string> = {
  'chest': '#FF4444',
  'upper-chest': '#FF4444',
  'lats': '#4488FF',
  'mid-back': '#4488FF',
  'lower-back': '#4488FF',
  'front-delts': '#FFAA00',
  'side-delts': '#FFAA00',
  'rear-delts': '#FFAA00',
  'biceps': '#44DD44',
  'triceps': '#DD44DD',
  'quads': '#FF8844',
  'glutes': '#FF6644',
  'hamstrings': '#FFCC44',
  'calves': '#DDAA44',
  'traps': '#88CCFF',
  'forearms': '#66BB66',
  'core': '#CCCC44',
}

const INACTIVE_COLOR = '#1a1a1a'

function getMuscleStyle(
  muscleId: string,
  primary: Set<string>,
  secondary: Set<string>,
): { fill: string; opacity: number; filter?: string } {
  if (primary.has(muscleId)) {
    return {
      fill: MUSCLE_COLORS[muscleId] ?? INACTIVE_COLOR,
      opacity: 1,
      filter: 'url(#muscle-glow)',
    }
  }
  if (secondary.has(muscleId)) {
    return {
      fill: MUSCLE_COLORS[muscleId] ?? INACTIVE_COLOR,
      opacity: 0.4,
    }
  }
  return { fill: INACTIVE_COLOR, opacity: 1 }
}

interface MusclePathProps {
  d: string
  muscleId: string
  primary: Set<string>
  secondary: Set<string>
  mirror?: boolean
}

function MusclePath({ d, muscleId, primary, secondary, mirror }: MusclePathProps) {
  const style = getMuscleStyle(muscleId, primary, secondary)
  return (
    <path
      d={d}
      data-muscle={muscleId}
      fill={style.fill}
      opacity={style.opacity}
      filter={style.filter}
      stroke={style.fill === INACTIVE_COLOR ? 'none' : style.fill}
      strokeWidth={style.fill === INACTIVE_COLOR ? 0 : 0.3}
      transform={mirror ? 'scale(-1,1)' : undefined}
    />
  )
}

function MuscleMapInner({
  primaryMuscles = [],
  secondaryMuscles = [],
  size = 'large',
  className = '',
}: MuscleMapProps) {
  const primary = useMemo(() => new Set(primaryMuscles), [primaryMuscles])
  const secondary = useMemo(() => new Set(secondaryMuscles), [secondaryMuscles])

  const height = size === 'small' ? 120 : 280

  return (
    <svg
      viewBox="0 0 280 340"
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="muscle-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ==================== FRONT VIEW ==================== */}
      <g transform="translate(70, 28)">
        {/* Label */}
        <text
          x="0"
          y="-10"
          textAnchor="middle"
          fill="#555555"
          fontSize="7"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
          letterSpacing="2"
        >
          FRONT
        </text>

        {/* Head */}
        <ellipse cx="0" cy="10" rx="12" ry="14" fill="#111" stroke="#333" strokeWidth="0.8" />

        {/* Neck */}
        <rect x="-5" y="23" width="10" height="8" rx="2" fill="#111" stroke="#333" strokeWidth="0.5" />

        {/* === FRONT TRAPS (visible from front as neck-to-shoulder slope) === */}
        <MusclePath
          muscleId="traps"
          primary={primary}
          secondary={secondary}
          d="M -5,25 Q -12,26 -22,32 L -18,30 Q -10,26 -5,27 Z"
        />
        <MusclePath
          muscleId="traps"
          primary={primary}
          secondary={secondary}
          d="M 5,25 Q 12,26 22,32 L 18,30 Q 10,26 5,27 Z"
        />

        {/* === FRONT DELTS (anterior) === */}
        <MusclePath
          muscleId="front-delts"
          primary={primary}
          secondary={secondary}
          d="M -18,30 Q -26,30 -30,38 Q -31,44 -28,50 Q -24,46 -22,40 Q -20,35 -18,32 Z"
        />
        <MusclePath
          muscleId="front-delts"
          primary={primary}
          secondary={secondary}
          d="M 18,30 Q 26,30 30,38 Q 31,44 28,50 Q 24,46 22,40 Q 20,35 18,32 Z"
        />

        {/* === SIDE DELTS (lateral, visible as outer shoulder cap) === */}
        <MusclePath
          muscleId="side-delts"
          primary={primary}
          secondary={secondary}
          d="M -28,50 Q -32,42 -33,37 Q -34,32 -30,30 Q -26,29 -22,32 L -24,36 Q -30,40 -28,50 Z"
        />
        <MusclePath
          muscleId="side-delts"
          primary={primary}
          secondary={secondary}
          d="M 28,50 Q 32,42 33,37 Q 34,32 30,30 Q 26,29 22,32 L 24,36 Q 30,40 28,50 Z"
        />

        {/* === UPPER CHEST (clavicular head) === */}
        <MusclePath
          muscleId="upper-chest"
          primary={primary}
          secondary={secondary}
          d="M -18,32 Q -14,30 -3,33 L -3,40 Q -12,38 -18,36 Q -20,35 -22,40 L -20,36 Z"
        />
        <MusclePath
          muscleId="upper-chest"
          primary={primary}
          secondary={secondary}
          d="M 18,32 Q 14,30 3,33 L 3,40 Q 12,38 18,36 Q 20,35 22,40 L 20,36 Z"
        />

        {/* === CHEST (pectoralis major) === */}
        <MusclePath
          muscleId="chest"
          primary={primary}
          secondary={secondary}
          d="M -3,40 Q -14,39 -22,42 Q -24,46 -22,52 Q -18,56 -10,56 Q -4,55 -3,52 Z"
        />
        <MusclePath
          muscleId="chest"
          primary={primary}
          secondary={secondary}
          d="M 3,40 Q 14,39 22,42 Q 24,46 22,52 Q 18,56 10,56 Q 4,55 3,52 Z"
        />

        {/* === BICEPS === */}
        <MusclePath
          muscleId="biceps"
          primary={primary}
          secondary={secondary}
          d="M -28,52 Q -26,50 -24,52 Q -22,58 -22,66 Q -23,72 -25,76 Q -28,78 -30,76 Q -32,70 -32,64 Q -31,56 -28,52 Z"
        />
        <MusclePath
          muscleId="biceps"
          primary={primary}
          secondary={secondary}
          d="M 28,52 Q 26,50 24,52 Q 22,58 22,66 Q 23,72 25,76 Q 28,78 30,76 Q 32,70 32,64 Q 31,56 28,52 Z"
        />

        {/* === FOREARMS === */}
        <MusclePath
          muscleId="forearms"
          primary={primary}
          secondary={secondary}
          d="M -25,78 Q -23,76 -22,78 Q -20,86 -20,96 Q -20,104 -21,110 Q -22,112 -24,110 Q -26,104 -27,96 Q -28,88 -25,78 Z"
        />
        <MusclePath
          muscleId="forearms"
          primary={primary}
          secondary={secondary}
          d="M 25,78 Q 23,76 22,78 Q 20,86 20,96 Q 20,104 21,110 Q 22,112 24,110 Q 26,104 27,96 Q 28,88 25,78 Z"
        />

        {/* === CORE (rectus abdominis) === */}
        <MusclePath
          muscleId="core"
          primary={primary}
          secondary={secondary}
          d="M -8,56 Q -3,58 0,58 Q 3,58 8,56 L 8,58
             Q 9,68 9,78 Q 9,88 7,96
             Q 4,100 0,100 Q -4,100 -7,96
             Q -9,88 -9,78 Q -9,68 -8,58 Z"
        />

        {/* Body side outline (obliques area — not a targetable muscle, just structure) */}
        <path
          d="M -22,54 Q -18,58 -14,58 L -9,56 Q -10,68 -10,80 Q -10,92 -8,98 L -14,100 Q -18,96 -18,88 Q -18,74 -20,62 Z"
          fill="#111"
          stroke="#333"
          strokeWidth="0.4"
        />
        <path
          d="M 22,54 Q 18,58 14,58 L 9,56 Q 10,68 10,80 Q 10,92 8,98 L 14,100 Q 18,96 18,88 Q 18,74 20,62 Z"
          fill="#111"
          stroke="#333"
          strokeWidth="0.4"
        />

        {/* === QUADS === */}
        <MusclePath
          muscleId="quads"
          primary={primary}
          secondary={secondary}
          d="M -14,102 Q -10,100 -6,102 Q -3,106 -3,116 Q -3,130 -4,146
             Q -5,156 -6,164 Q -8,168 -10,168 Q -14,166 -16,160
             Q -18,150 -18,138 Q -18,122 -16,112 Q -15,106 -14,102 Z"
        />
        <MusclePath
          muscleId="quads"
          primary={primary}
          secondary={secondary}
          d="M 14,102 Q 10,100 6,102 Q 3,106 3,116 Q 3,130 4,146
             Q 5,156 6,164 Q 8,168 10,168 Q 14,166 16,160
             Q 18,150 18,138 Q 18,122 16,112 Q 15,106 14,102 Z"
        />

        {/* Knee area */}
        <ellipse cx="-10" cy="170" rx="6" ry="4" fill="#111" stroke="#333" strokeWidth="0.4" />
        <ellipse cx="10" cy="170" rx="6" ry="4" fill="#111" stroke="#333" strokeWidth="0.4" />

        {/* === CALVES (front — tibialis anterior) === */}
        <MusclePath
          muscleId="calves"
          primary={primary}
          secondary={secondary}
          d="M -12,176 Q -10,174 -7,176 Q -5,184 -5,196 Q -5,210 -6,224
             Q -7,232 -8,240 Q -10,242 -11,240 Q -14,230 -15,218
             Q -15,204 -14,190 Q -13,182 -12,176 Z"
        />
        <MusclePath
          muscleId="calves"
          primary={primary}
          secondary={secondary}
          d="M 12,176 Q 10,174 7,176 Q 5,184 5,196 Q 5,210 6,224
             Q 7,232 8,240 Q 10,242 11,240 Q 14,230 15,218
             Q 15,204 14,190 Q 13,182 12,176 Z"
        />

        {/* Feet */}
        <path d="M -13,244 Q -10,242 -6,244 L -5,252 Q -8,254 -14,254 Q -15,250 -13,244 Z" fill="#111" stroke="#333" strokeWidth="0.4" />
        <path d="M 13,244 Q 10,242 6,244 L 5,252 Q 8,254 14,254 Q 15,250 13,244 Z" fill="#111" stroke="#333" strokeWidth="0.4" />

        {/* Hands */}
        <path d="M -23,112 Q -21,116 -22,120 Q -24,124 -26,122 Q -27,118 -25,114 Z" fill="#111" stroke="#333" strokeWidth="0.3" />
        <path d="M 23,112 Q 21,116 22,120 Q 24,124 26,122 Q 27,118 25,114 Z" fill="#111" stroke="#333" strokeWidth="0.3" />
      </g>

      {/* ==================== BACK VIEW ==================== */}
      <g transform="translate(210, 28)">
        {/* Label */}
        <text
          x="0"
          y="-10"
          textAnchor="middle"
          fill="#555555"
          fontSize="7"
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
          letterSpacing="2"
        >
          BACK
        </text>

        {/* Head */}
        <ellipse cx="0" cy="10" rx="12" ry="14" fill="#111" stroke="#333" strokeWidth="0.8" />

        {/* Neck */}
        <rect x="-5" y="23" width="10" height="8" rx="2" fill="#111" stroke="#333" strokeWidth="0.5" />

        {/* === TRAPS (upper trapezius — large diamond from neck to mid-back) === */}
        <MusclePath
          muscleId="traps"
          primary={primary}
          secondary={secondary}
          d="M -5,25 Q -8,26 -20,32 Q -14,38 -6,40 L -3,36 Q -3,30 -5,26 Z"
        />
        <MusclePath
          muscleId="traps"
          primary={primary}
          secondary={secondary}
          d="M 5,25 Q 8,26 20,32 Q 14,38 6,40 L 3,36 Q 3,30 5,26 Z"
        />

        {/* === REAR DELTS (posterior deltoid) === */}
        <MusclePath
          muscleId="rear-delts"
          primary={primary}
          secondary={secondary}
          d="M -20,32 Q -28,31 -32,36 Q -34,42 -30,50 Q -26,46 -24,42 Q -22,36 -20,34 Z"
        />
        <MusclePath
          muscleId="rear-delts"
          primary={primary}
          secondary={secondary}
          d="M 20,32 Q 28,31 32,36 Q 34,42 30,50 Q 26,46 24,42 Q 22,36 20,34 Z"
        />

        {/* === MID-BACK (rhomboids — between spine and scapulae) === */}
        <MusclePath
          muscleId="mid-back"
          primary={primary}
          secondary={secondary}
          d="M -3,40 Q -6,42 -12,44 Q -14,50 -12,56 Q -8,54 -3,52 Z"
        />
        <MusclePath
          muscleId="mid-back"
          primary={primary}
          secondary={secondary}
          d="M 3,40 Q 6,42 12,44 Q 14,50 12,56 Q 8,54 3,52 Z"
        />

        {/* === LATS (latissimus dorsi — large V-shape) === */}
        <MusclePath
          muscleId="lats"
          primary={primary}
          secondary={secondary}
          d="M -12,44 Q -20,46 -22,52 Q -20,58 -18,62 Q -16,68 -14,72
             Q -12,76 -10,78 Q -8,76 -6,72 Q -4,66 -3,58 Q -3,52 -4,48
             Q -6,44 -12,44 Z"
        />
        <MusclePath
          muscleId="lats"
          primary={primary}
          secondary={secondary}
          d="M 12,44 Q 20,46 22,52 Q 20,58 18,62 Q 16,68 14,72
             Q 12,76 10,78 Q 8,76 6,72 Q 4,66 3,58 Q 3,52 4,48
             Q 6,44 12,44 Z"
        />

        {/* === LOWER BACK (erector spinae) === */}
        <MusclePath
          muscleId="lower-back"
          primary={primary}
          secondary={secondary}
          d="M -6,72 Q -3,70 0,70 Q 3,70 6,72
             Q 8,80 8,88 Q 7,96 4,100
             Q 2,101 0,101 Q -2,101 -4,100
             Q -7,96 -8,88 Q -8,80 -6,72 Z"
        />

        {/* === TRICEPS === */}
        <MusclePath
          muscleId="triceps"
          primary={primary}
          secondary={secondary}
          d="M -28,52 Q -26,50 -24,52 Q -22,58 -22,66 Q -23,72 -25,76
             Q -28,78 -30,76 Q -32,70 -32,64 Q -31,56 -28,52 Z"
        />
        <MusclePath
          muscleId="triceps"
          primary={primary}
          secondary={secondary}
          d="M 28,52 Q 26,50 24,52 Q 22,58 22,66 Q 23,72 25,76
             Q 28,78 30,76 Q 32,70 32,64 Q 31,56 28,52 Z"
        />

        {/* === FOREARMS (back view) === */}
        <MusclePath
          muscleId="forearms"
          primary={primary}
          secondary={secondary}
          d="M -25,78 Q -23,76 -22,78 Q -20,86 -20,96 Q -20,104 -21,110
             Q -22,112 -24,110 Q -26,104 -27,96 Q -28,88 -25,78 Z"
        />
        <MusclePath
          muscleId="forearms"
          primary={primary}
          secondary={secondary}
          d="M 25,78 Q 23,76 22,78 Q 20,86 20,96 Q 20,104 21,110
             Q 22,112 24,110 Q 26,104 27,96 Q 28,88 25,78 Z"
        />

        {/* Side body fill */}
        <path
          d="M -22,54 Q -18,58 -14,58 L -10,56 Q -10,68 -10,80 Q -10,92 -10,98 L -14,100 Q -18,96 -18,88 Q -18,74 -20,62 Z"
          fill="#111"
          stroke="#333"
          strokeWidth="0.4"
        />
        <path
          d="M 22,54 Q 18,58 14,58 L 10,56 Q 10,68 10,80 Q 10,92 10,98 L 14,100 Q 18,96 18,88 Q 18,74 20,62 Z"
          fill="#111"
          stroke="#333"
          strokeWidth="0.4"
        />

        {/* === GLUTES === */}
        <MusclePath
          muscleId="glutes"
          primary={primary}
          secondary={secondary}
          d="M -4,100 Q -8,98 -14,100 Q -18,104 -18,110 Q -16,116 -12,118
             Q -8,118 -4,116 Q -2,112 -2,106 Q -2,102 -4,100 Z"
        />
        <MusclePath
          muscleId="glutes"
          primary={primary}
          secondary={secondary}
          d="M 4,100 Q 8,98 14,100 Q 18,104 18,110 Q 16,116 12,118
             Q 8,118 4,116 Q 2,112 2,106 Q 2,102 4,100 Z"
        />

        {/* === HAMSTRINGS === */}
        <MusclePath
          muscleId="hamstrings"
          primary={primary}
          secondary={secondary}
          d="M -14,120 Q -10,118 -6,120 Q -3,126 -3,136 Q -3,148 -4,158
             Q -5,164 -7,168 Q -10,168 -14,166 Q -16,160 -18,150
             Q -18,138 -17,128 Q -16,122 -14,120 Z"
        />
        <MusclePath
          muscleId="hamstrings"
          primary={primary}
          secondary={secondary}
          d="M 14,120 Q 10,118 6,120 Q 3,126 3,136 Q 3,148 4,158
             Q 5,164 7,168 Q 10,168 14,166 Q 16,160 18,150
             Q 18,138 17,128 Q 16,122 14,120 Z"
        />

        {/* Knee area */}
        <ellipse cx="-10" cy="170" rx="6" ry="4" fill="#111" stroke="#333" strokeWidth="0.4" />
        <ellipse cx="10" cy="170" rx="6" ry="4" fill="#111" stroke="#333" strokeWidth="0.4" />

        {/* === CALVES (back — gastrocnemius) === */}
        <MusclePath
          muscleId="calves"
          primary={primary}
          secondary={secondary}
          d="M -13,176 Q -10,174 -7,176 Q -4,182 -4,192 Q -4,200 -5,208
             Q -6,218 -7,226 Q -8,234 -8,240 Q -10,242 -11,240
             Q -14,232 -15,222 Q -16,210 -16,198 Q -15,186 -13,176 Z"
        />
        <MusclePath
          muscleId="calves"
          primary={primary}
          secondary={secondary}
          d="M 13,176 Q 10,174 7,176 Q 4,182 4,192 Q 4,200 5,208
             Q 6,218 7,226 Q 8,234 8,240 Q 10,242 11,240
             Q 14,232 15,222 Q 16,210 16,198 Q 15,186 13,176 Z"
        />

        {/* Feet */}
        <path d="M -13,244 Q -10,242 -6,244 L -5,252 Q -8,254 -14,254 Q -15,250 -13,244 Z" fill="#111" stroke="#333" strokeWidth="0.4" />
        <path d="M 13,244 Q 10,242 6,244 L 5,252 Q 8,254 14,254 Q 15,250 13,244 Z" fill="#111" stroke="#333" strokeWidth="0.4" />

        {/* Hands */}
        <path d="M -23,112 Q -21,116 -22,120 Q -24,124 -26,122 Q -27,118 -25,114 Z" fill="#111" stroke="#333" strokeWidth="0.3" />
        <path d="M 23,112 Q 21,116 22,120 Q 24,124 26,122 Q 27,118 25,114 Z" fill="#111" stroke="#333" strokeWidth="0.3" />
      </g>
    </svg>
  )
}

export const MuscleMap = memo(MuscleMapInner)
export default MuscleMap
