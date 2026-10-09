import { expect, test } from 'vitest'
import { withNewColumns } from './column-order.ts'

test('a saved order is kept as it was dragged', () => {
  expect(withNewColumns(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b'])
})

test('a column the table no longer declares is dropped', () => {
  expect(withNewColumns(['c', 'gone', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b'])
})

test('a new column lands after the one it follows in the declaration', () => {
  // Gauge is declared between Color and Width; the saved order moved Width to the front.
  expect(withNewColumns(['width', 'pid', 'color'], ['pid', 'color', 'gauge', 'width'])).toEqual([
    'width',
    'pid',
    'color',
    'gauge'
  ])
})

test('a new first column goes first', () => {
  expect(withNewColumns(['b', 'a'], ['new', 'a', 'b'])).toEqual(['new', 'b', 'a'])
})

test('consecutive new columns keep their declared order', () => {
  expect(withNewColumns(['b', 'a'], ['a', 'x', 'y', 'b'])).toEqual(['b', 'a', 'x', 'y'])
})

test('nothing saved yet reads as the declaration', () => {
  expect(withNewColumns([], ['a', 'b'])).toEqual(['a', 'b'])
})
