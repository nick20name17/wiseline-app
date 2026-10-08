import type { BoardLineItem, CoilEntry, UnitCoil } from '../api'

type CoilItem = Pick<
  NonNullable<BoardLineItem['item']>,
  'supplier' | 'coil_number' | 'supplier_locked' | 'coil_number_locked' | 'unit_coils'
>

/** Every unit of a line with the coil it rolls off: its own, else the line's p2 (679,416). */
export const unitCoils = (item: CoilItem, quantity: number): UnitCoil[] =>
  Array.from(
    { length: Math.max(0, Math.floor(quantity)) },
    (_, index) =>
      item.unit_coils.find(own => own.unit === index + 1) ?? {
        unit: index + 1,
        supplier: item.supplier,
        coil_number: item.coil_number,
        supplier_locked: item.supplier_locked,
        coil_number_locked: item.coil_number_locked
      }
  )

/** A unit packs only with both p2 (1010,346). */
export const hasCoil = (coil: Pick<UnitCoil, 'supplier' | 'coil_number'>) =>
  !!coil.supplier?.trim() && !!coil.coil_number?.trim()

/** «1–3, 5»: units read as runs. */
export const unitRuns = (units: number[]) => {
  const runs: [number, number][] = []
  for (const unit of [...units].sort((a, b) => a - b)) {
    const last = runs.at(-1)
    if (last && unit === last[1] + 1) last[1] = unit
    else runs.push([unit, unit])
  }
  return runs.map(([from, to]) => (from === to ? `${from}` : `${from}–${to}`)).join(', ')
}

/** One text per coil a split line runs off, with the units on it. */
export const coilSummary = (coils: UnitCoil[]) => {
  const groups = Map.groupBy(
    coils,
    coil => `${coil.supplier ?? 'Undefined'} / ${coil.coil_number ?? 'Undefined'}`
  )
  return [...groups].map(
    ([text, units]) =>
      `${units.length === 1 ? 'Unit' : 'Units'} ${unitRuns(units.map(coil => coil.unit))}: ${text}`
  )
}

/**
 * What a Worker's choice writes: the line, or each of the given units of a split one. A field the
 * Manager or the Slit Line set keeps its value — the server refuses a change to it.
 */
export const fillEntries = (
  originItem: string,
  units: UnitCoil[] | null,
  choice: { supplier: string | null; coilNumber: string | null }
): CoilEntry[] =>
  units
    ? units.map(coil => ({
        origin_item: originItem,
        unit: coil.unit,
        supplier: coil.supplier_locked ? coil.supplier : choice.supplier,
        coil_number: coil.coil_number_locked ? coil.coil_number : choice.coilNumber
      }))
    : [{ origin_item: originItem, supplier: choice.supplier, coil_number: choice.coilNumber }]
