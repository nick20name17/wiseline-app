import { describe, expect, it } from 'vitest'
import type { Machine } from '../api'
import { inMachineOrder, reorderMachines } from './order'

const machine = (id: number, position: number, kind: string | null = null) =>
  ({ id, position, kind }) as Machine
const ids = (machines: Machine[] | null) => machines?.map(machine => machine.id) ?? null

describe('inMachineOrder', () => {
  it('keeps the cutter first and Wrapping last, the rest by position', () => {
    expect(
      ids(
        inMachineOrder([
          machine(1, 1, 'wrapping'),
          machine(2, 3),
          machine(3, 5, 'cutting'),
          machine(4, 2)
        ])
      )
    ).toEqual([3, 4, 2, 1])
  })
})

describe('reorderMachines', () => {
  const machines = [
    machine(1, 1, 'cutting'),
    machine(2, 2),
    machine(3, 3),
    machine(4, 4, 'wrapping')
  ]

  it('moves a machine between the ends', () => {
    expect(ids(reorderMachines(machines, 3, 2))).toEqual([1, 3, 2, 4])
  })

  it('moves nothing onto or off an end', () => {
    expect(reorderMachines(machines, 2, 1)).toBeNull()
    expect(reorderMachines(machines, 3, 4)).toBeNull()
    expect(reorderMachines(machines, 1, 2)).toBeNull()
  })
})
