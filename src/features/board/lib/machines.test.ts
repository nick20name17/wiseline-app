import { describe, expect, it } from 'vitest'
import type { BoardLineItem, BoardOrder, Machine } from '../api'
import { machineByLine, machineTabsOf, onMachine, rowsOnMachine } from './machines'

const line = (id: string, machine_id: number | null) => ({ id, machine_id }) as BoardLineItem
const order = (id: string, lines: BoardLineItem[], count_items = lines.length) =>
  ({ id, origin_items: lines, count_items }) as BoardOrder

describe('onMachine', () => {
  const orders = [
    order('A', [line('a1', 85), line('a2', 71)]),
    order('B', [line('b1', 71)]),
    order('C', [line('c1', null)])
  ]

  it('narrows each order to the tab’s lines and drops the rest', () => {
    expect(onMachine(orders, 85)).toEqual([order('A', [line('a1', 85)])])
  })

  it('keeps an order that was part-scheduled reading as part-scheduled', () => {
    // Three lines in the department, one of them not sent on this tab's list.
    const partial = order('P', [line('p1', 85), line('p2', 71)], 3)
    expect(onMachine([partial], 85)[0]!.count_items).toBe(2)
    expect(onMachine(orders, 71).map(found => found.id)).toEqual(['A', 'B'])
  })

  it('gathers the lines no machine takes on their own tab', () => {
    expect(onMachine(orders, 'none')).toEqual([order('C', [line('c1', null)])])
  })

  it('leaves the orders whole with no tab', () => {
    expect(onMachine(orders, undefined)).toBe(orders)
  })
})

describe('machineTabsOf', () => {
  it('keeps the department’s rollformers only', () => {
    const machines = [
      { id: 85, department: 2, kind: 'rollforming' },
      { id: 77, department: null, kind: 'rollforming' },
      { id: 90, department: 2, kind: 'cutting' }
    ] as Machine[]
    expect(machineTabsOf(machines, 2).map(machine => machine.id)).toEqual([85])
  })
})

describe('rowsOnMachine', () => {
  const machines = machineByLine([order('A', [line('a1', 85), line('a2', null)])])
  const rows = [{ origin_item: 'a1' }, { origin_item: 'a2' }, { origin_item: 'z9' }]

  it('keeps the rows of the tab’s machine', () => {
    expect(rowsOnMachine(rows, machines, 85)).toEqual([{ origin_item: 'a1' }])
  })

  it('puts a line with no machine, or one not on a released order, on «No machine»', () => {
    expect(rowsOnMachine(rows, machines, 'none')).toEqual([
      { origin_item: 'a2' },
      { origin_item: 'z9' }
    ])
  })
})
