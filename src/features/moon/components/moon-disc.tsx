type MoonDiscProps = {
  /** 0 = new, 0.5 = full. */
  phase: number
  className?: string
}

const RADIUS = 50

// The lit area as ONE closed shape: the limb (a half of the disc edge) plus the terminator
// (half of an ellipse whose width follows the phase). Drawing it as a single path matters —
// stacking opaque shapes and letting them overlap leaves the two antialiased edges fighting
// over the same pixels, which tears the rim apart wherever the lit part is thin.
const litPath = (phase: number) => {
  const phaseCosine = Math.cos(2 * Math.PI * phase)
  // Sweep flags pick which way each arc bulges: the limb follows the lit side, the terminator
  // bulges towards it while the Moon is a crescent and away from it once it is gibbous.
  const limbSweep = phase < 0.5 ? 1 : 0
  const terminatorSweep = phaseCosine > 0 ? 1 - limbSweep : limbSweep
  const terminatorWidth = Math.abs(phaseCosine) * RADIUS

  return [
    `M 0 ${-RADIUS}`,
    `A ${RADIUS} ${RADIUS} 0 0 ${limbSweep} 0 ${RADIUS}`,
    `A ${terminatorWidth} ${RADIUS} 0 0 ${terminatorSweep} 0 ${-RADIUS}`,
    'Z'
  ].join(' ')
}

export const MoonDisc = ({ phase, className }: MoonDiscProps) => {
  return (
    <svg viewBox='-60 -60 120 120' aria-hidden='true' className={className}>
      {/* Lit must stay brighter than shadow in both themes, so the two tokens swap in dark
          mode: --foreground and --muted invert with the theme, the Moon does not. */}
      <circle r={RADIUS} className='fill-foreground dark:fill-muted' />
      <path d={litPath(phase)} className='fill-muted dark:fill-foreground' />
      <circle
        r={RADIUS}
        fill='none'
        className='stroke-border'
        strokeWidth={1}
        vectorEffect='non-scaling-stroke'
      />
    </svg>
  )
}
