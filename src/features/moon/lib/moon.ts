export const MS_PER_DAY = 86_400_000

export const SYNODIC_MONTH = 29.530588853

export const KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14))

const KNOWN_NEW_MOON_DAYS = KNOWN_NEW_MOON.getTime() / MS_PER_DAY

const PHASE_NAMES = [
  'New moon',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full moon',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent'
] as const

type PhaseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export type MoonPhase = {
  /** 0 = new, 0.5 = full, approaching 1 = new again. */
  phase: number
  ageDays: number
  /** 0 to 1. */
  illumination: number
  name: (typeof PHASE_NAMES)[number]
  nextNewMoon: Date
  nextFullMoon: Date
}

const cyclesSinceKnownNewMoon = (date: Date) => {
  return (date.getTime() / MS_PER_DAY - KNOWN_NEW_MOON_DAYS) / SYNODIC_MONTH
}

const dateAtCycle = (cycle: number) => {
  return new Date((KNOWN_NEW_MOON_DAYS + cycle * SYNODIC_MONTH) * MS_PER_DAY)
}

export const getMoonPhase = (date: Date): MoonPhase => {
  const cycles = cyclesSinceKnownNewMoon(date)
  const cycleIndex = Math.floor(cycles)
  const phase = cycles - cycleIndex
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2
  const nameIndex = (Math.round(phase * PHASE_NAMES.length) % PHASE_NAMES.length) as PhaseIndex

  return {
    phase,
    ageDays: phase * SYNODIC_MONTH,
    illumination,
    name: PHASE_NAMES[nameIndex],
    nextNewMoon: dateAtCycle(cycleIndex + 1),
    nextFullMoon: dateAtCycle(phase < 0.5 ? cycleIndex + 0.5 : cycleIndex + 1.5)
  }
}

export const formatDay = (date: Date) => {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Calendar-day round-trip for URLs. Local time on purpose: the user picks a
// civil date, and toISOString() would shift it across midnight in UTC offsets.
export const toDayParam = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const parseDayParam = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number]
  const date = new Date(year, month - 1, day)
  // Reject overflow like 2026-02-31, which Date would silently roll forward.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return undefined
  return date
}
