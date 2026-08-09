import * as z from 'zod'

import { persisted } from '@/store/persisted'

/**
 * What Settings publishes to every department.
 *
 * Each of these is written on one screen and read on many, which is the whole reason they are here
 * rather than in a page's own store: a Manager changing a machine's daily capacity is changing what a
 * Worker's board says it can fit today.
 */

/* -- Work days ------------------------------------------------------------------------------- */

/** Sunday first, matching `Date#getUTCDay`, so an index is a day without a lookup. */
const WEEKDAYS_FALLBACK = [false, true, true, true, true, true, false]

const WorkDaysStoredSchema = z.object({
  weekdays: z.array(z.boolean()).optional(),
  /** Older builds wrote bare dates; both forms are still out there. */
  holidays: z
    .array(z.union([z.string(), z.object({ date: z.string(), name: z.string().optional() })]))
    .optional()
})

/** A closure is a named day, because Settings lists it by name and only the scheduler reads the date. */
export type Holiday = { date: string; name: string }

export type WorkDays = { weekdays: boolean[]; holidays: Holiday[] }

export const workDays = persisted<WorkDays, z.infer<typeof WorkDaysStoredSchema>>({
  key: 'wl_workdays_v1',
  schema: WorkDaysStoredSchema,
  fallback: () => ({ weekdays: [...WEEKDAYS_FALLBACK], holidays: [] }),
  decode: stored => ({
    weekdays: stored.weekdays?.length === 7 ? stored.weekdays : [...WEEKDAYS_FALLBACK],
    holidays: (stored.holidays ?? []).map(holiday =>
      typeof holiday === 'string'
        ? { date: holiday, name: '' }
        : { date: holiday.date, name: holiday.name ?? '' }
    )
  }),
  encode: value => value
})

export const isWorkDay = (iso: string) => {
  const { weekdays, holidays } = workDays.get()
  return (
    !!weekdays[new Date(`${iso}T00:00:00Z`).getUTCDay()] &&
    !holidays.some(holiday => holiday.date === iso)
  )
}

/* -- Machine capacities ---------------------------------------------------------------------- */

const MachineCapSchema = z.object({
  dept: z.string(),
  name: z.string(),
  dailyMax: z.number()
})

export type MachineCap = z.infer<typeof MachineCapSchema>

export const machineCaps = persisted<MachineCap[], MachineCap[]>({
  key: 'wl_machines_v1',
  schema: z.array(MachineCapSchema),
  fallback: () => [],
  decode: stored => stored,
  encode: value => value
})

/**
 * A department's seeded machines with any capacity Settings has published for them, matched by name.
 * Anything Settings does not mention keeps its seed — an unconfigured machine is not a zero-capacity
 * one.
 */
export const withPublishedCaps = <T extends { name: string; dailyMax: number }>(
  department: string,
  seed: T[]
): T[] => {
  const published = machineCaps.get()
  return seed.map(machine => {
    const hit = published.find(cap => cap.dept === department && cap.name === machine.name)
    return hit && Number.isFinite(hit.dailyMax) ? { ...machine, dailyMax: hit.dailyMax } : machine
  })
}

/* -- Package weight ceiling ------------------------------------------------------------------ */

const PACKAGE_MAX_FALLBACK = 500

export const packageMaxWeights = persisted<Record<string, number>, Record<string, number>>({
  key: 'wl_pkgmax_v1',
  schema: z.record(z.string(), z.number()),
  fallback: () => ({}),
  decode: stored => stored,
  encode: value => value
})

/** Zero is a real setting — it means no limit — so only a missing or unreadable value falls back. */
export const maxPackageWeight = (department: string) => {
  const configured = packageMaxWeights.get()[department]
  return configured == null || !Number.isFinite(configured) ? PACKAGE_MAX_FALLBACK : configured
}

/* -- Coil filter ----------------------------------------------------------------------------- */

/**
 * Per-department, and a Manager's setting rather than a Worker's: the Worker sees the filter and works
 * within it, but cannot change it (Kevin #209). Stored for every department under one key, which is
 * why a write has to merge rather than replace.
 */
const CoilFilterSchema = z.record(z.string(), z.record(z.string(), z.unknown()))

export const coilFilters = persisted<
  Record<string, Record<string, unknown>>,
  z.infer<typeof CoilFilterSchema>
>({
  key: 'wl_coilfilter_v1',
  schema: CoilFilterSchema,
  fallback: () => ({}),
  decode: stored => stored,
  encode: value => value
})

export const coilFilterFor = (department: string) => coilFilters.get()[department] ?? {}

export const setCoilFilterFor = (department: string, filter: Record<string, unknown>) =>
  coilFilters.set({ ...coilFilters.get(), [department]: filter })
