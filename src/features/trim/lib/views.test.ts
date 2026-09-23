import { describe, expect, it } from 'vitest'
import { viewsFor } from './views'

describe('viewsFor', () => {
  it('gives a Worker the floor tabs only', () => {
    expect(viewsFor('worker')).toEqual(['production', 'coils', 'completed'])
  })
})
