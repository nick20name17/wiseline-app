import { describe, expect, it } from 'vitest'
import { BOARDS } from './boards'
import { defaultView, viewsFor } from './views'

describe('viewsFor', () => {
  it('gives a Trim Worker the floor tabs only', () => {
    expect(viewsFor(BOARDS.trim, 'worker')).toEqual(['production', 'coils', 'completed'])
  })

  it('gives Accessories a Packaging tab where Trim has Production and Coils', () => {
    expect(viewsFor(BOARDS.accessories, 'manager')).toEqual([
      'unscheduled',
      'scheduled',
      'packaging',
      'calendar',
      'completed'
    ])
    expect(defaultView(BOARDS.accessories, 'worker')).toBe('packaging')
  })
})
