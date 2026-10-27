import { expect, test } from 'vitest'
import { clampWidth } from './column'

const column = { key: 'customer', label: 'Customer' }

test('a width is kept between 64 and 640 px unless the column says otherwise', () => {
  expect(clampWidth(column, 20)).toBe(64)
  expect(clampWidth(column, 2000)).toBe(640)
  expect(clampWidth(column, 180.6)).toBe(181)
  expect(clampWidth({ ...column, minWidth: 120, maxWidth: 200 }, 90)).toBe(120)
  expect(clampWidth({ ...column, minWidth: 120, maxWidth: 200 }, 900)).toBe(200)
})
