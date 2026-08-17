import { machineCaps, packageMaxWeights, workDays, type Holiday } from '@/store/shared/settings'

import { createStore } from '@/store/create-store'

import seed from './seed.json'

export type Warehouse = {
  id: number
  name: string
  address: string
  description: string
  isDefault: boolean
}

export type LocationType = {
  id: number
  name: string
  dept: string
  warehouseId: number
  description: string
}

export type SettingsLocation = {
  id: number
  name: string
  dept: string
  warehouseId: number
  locationTypeId: number
  maxWeight: number
  multiOrder: boolean
  numOrders: number
  description: string
}

export type Priority = {
  id: number
  name: string
  dept: string
  color: string
  hierarchy: number
}

export type Machine = { id: number; name: string; dept: string; dailyMax: number | null }

export type User = { id: number; name: string; email: string; role: string; depts: string[] }

export type Truck = { id: number; name: string; plate: string; maxWeight: number }

export type SettingsState = {
  activeArea: string
  activeDept: string
  workdays: { weekdays: boolean[]; holidays: Holiday[] }
  warehouses: Warehouse[]
  locationTypes: LocationType[]
  locations: SettingsLocation[]
  priorities: Priority[]
  machines: Machine[]
  coilSuppliers: string[]
  pkgMax: Record<string, number>
  users: User[]
  trucks: Truck[]
}

export const DEPARTMENTS = ['Trim', 'Rollforming', 'Accessories', 'Shipping']
export const DOW_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
]
export const DOW_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MON_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

/** N-173: Trim's day is measured in bends, every other department's in pieces. */
export const capUnit = (dept: string) => (dept === 'Trim' ? 'bends' : 'pieces')

const seeded = seed as unknown as SettingsState

/**
 * Settings is the one screen that both seeds and reads the cross-page contracts.
 *
 * Machine capacities and the package ceiling are published on every edit and hydrated on load, in
 * that order: a page that republished its seed over a saved edit would silently undo a Manager's
 * change the next time anyone opened Settings.
 */
export const settingsStore = createStore<SettingsState>({
  ...seeded,
  workdays: workDays.get(),
  machines: seeded.machines.map(machine => {
    const hit = machineCaps
      .get()
      .find(cap => cap.dept === machine.dept && cap.name === machine.name)
    return hit && Number.isFinite(hit.dailyMax) ? { ...machine, dailyMax: hit.dailyMax } : machine
  }),
  pkgMax: { ...seeded.pkgMax, ...packageMaxWeights.get() }
})

export const setArea = (area: string) =>
  settingsStore.set(state => {
    const depts = AREA_DEPTS[area] ?? DEPARTMENTS
    return {
      activeArea: area,
      activeDept: depts.includes(state.activeDept) ? state.activeDept : depts[0]
    }
  })

export const setDept = (activeDept: string) => settingsStore.set({ activeDept })

/** Location-scoped areas exclude Shipping: it holds no racks of its own. */
export const AREA_DEPTS: Record<string, string[]> = {
  locationTypes: ['Trim', 'Rollforming', 'Accessories'],
  locations: ['Trim', 'Rollforming', 'Accessories']
}

export const toggleWorkDay = (index: number) => {
  const weekdays = settingsStore.get().workdays.weekdays.slice()
  weekdays[index] = !weekdays[index]

  const workdays = { ...settingsStore.get().workdays, weekdays }
  settingsStore.set({ workdays })
  workDays.set(workdays)

  return weekdays[index]
}

export const removeHoliday = (date: string) => {
  const current = settingsStore.get().workdays
  const workdays = {
    ...current,
    holidays: current.holidays.filter(holiday => holiday.date !== date)
  }
  settingsStore.set({ workdays })
  workDays.set(workdays)
}

export const deleteRow = (
  area:
    | 'warehouses'
    | 'locationTypes'
    | 'locations'
    | 'priorities'
    | 'machines'
    | 'users'
    | 'trucks',
  id: number
) =>
  settingsStore.set(state => {
    const rows = (state[area] as { id: number }[]).filter(row => row.id !== id)
    if (area === 'machines') publishMachines(rows as Machine[])
    return { [area]: rows } as Partial<SettingsState>
  })

const publishMachines = (machines: Machine[]) =>
  machineCaps.set(
    machines
      .filter(machine => machine.dailyMax != null)
      .map(machine => ({ name: machine.name, dept: machine.dept, dailyMax: machine.dailyMax! }))
  )

/** Hierarchy is the list order, so a reorder renumbers every priority in the department. */
export const reorderPriority = (dragId: number, targetId: number) =>
  settingsStore.set(state => {
    const dragged = state.priorities.find(priority => priority.id === dragId)
    const target = state.priorities.find(priority => priority.id === targetId)
    if (!dragged || !target || dragged.dept !== target.dept || dragId === targetId) return {}

    const scoped = state.priorities
      .filter(priority => priority.dept === dragged.dept)
      .sort((a, b) => a.hierarchy - b.hierarchy)

    const without = scoped.filter(priority => priority.id !== dragId)
    const at = without.findIndex(priority => priority.id === targetId)
    without.splice(at, 0, dragged)

    const renumbered = new Map(without.map((priority, index) => [priority.id, index + 1]))
    return {
      priorities: state.priorities.map(priority =>
        renumbered.has(priority.id)
          ? { ...priority, hierarchy: renumbered.get(priority.id)! }
          : priority
      )
    }
  })

export const warehouseName = (state: SettingsState, id: number) =>
  state.warehouses.find(warehouse => warehouse.id === id)?.name ?? '—'

export const locationTypeName = (state: SettingsState, id: number) =>
  state.locationTypes.find(type => type.id === id)?.name ?? '—'

export const fmtHoliday = (iso: string) => {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

let seq = 1000

const publish = (area: string, rows: unknown[]) => {
  if (area === 'machines') publishMachines(rows as Machine[])
}

export const addRow = (area: string, draft: Record<string, unknown>) =>
  settingsStore.set(state => {
    const id = ++seq
    // a new priority goes last in its department; dragging is how it gets anywhere else
    const entry =
      area === 'priorities'
        ? {
            ...draft,
            hierarchy: state.priorities.filter(priority => priority.dept === draft.dept).length + 1
          }
        : draft
    const rows = [...(state[area as keyof SettingsState] as unknown[]), { ...entry, id }]
    publish(area, rows)

    // one default warehouse: naming a new one demotes whichever held it
    if (area === 'warehouses' && draft.isDefault)
      return {
        warehouses: (rows as Warehouse[]).map(warehouse => ({
          ...warehouse,
          isDefault: warehouse.id === id
        }))
      }

    return { [area]: rows } as Partial<SettingsState>
  })

export const saveRow = (area: string, id: number, draft: Record<string, unknown>) =>
  settingsStore.set(state => {
    const rows = (state[area as keyof SettingsState] as { id: number }[]).map(row =>
      row.id === id ? { ...row, ...draft } : row
    )
    publish(area, rows)

    if (area === 'warehouses' && draft.isDefault)
      return {
        warehouses: (rows as Warehouse[]).map(warehouse => ({
          ...warehouse,
          isDefault: warehouse.id === id
        }))
      }

    return { [area]: rows } as Partial<SettingsState>
  })

export const setSuppliers = (coilSuppliers: string[]) => settingsStore.set({ coilSuppliers })

export const setPkgMax = (dept: string, max: number) =>
  settingsStore.set(state => {
    const pkgMax = { ...state.pkgMax, [dept]: max }
    packageMaxWeights.set(pkgMax)
    return { pkgMax }
  })

export const addHoliday = (date: string, name: string) => {
  const current = settingsStore.get().workdays
  if (current.holidays.some(holiday => holiday.date === date)) return

  const workdays = { ...current, holidays: [...current.holidays, { date, name }] }
  settingsStore.set({ workdays })
  workDays.set(workdays)
}
