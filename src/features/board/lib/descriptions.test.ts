import { describe, expect, it } from 'vitest'
import { editedDescription, shownDescription } from './descriptions'

const MEMO = 'Barn Ridge Cap  COLORBOND Burgundy\r\n13\' 0" (156") Long\r\n'

describe('shownDescription', () => {
  it('drops the break the memo ends on and keeps the ones inside it', () => {
    expect(shownDescription(MEMO)).toBe('Barn Ridge Cap  COLORBOND Burgundy\r\n13\' 0" (156") Long')
    expect(shownDescription(null)).toBe('')
  })
})

describe('editedDescription', () => {
  it('saves nothing when the field is left as it was read', () => {
    expect(
      editedDescription(MEMO, 'Barn Ridge Cap  COLORBOND Burgundy\n13\' 0" (156") Long')
    ).toBeNull()
    expect(editedDescription(null, '')).toBeNull()
  })

  it('saves an edit with the breaks the memo keeps', () => {
    expect(editedDescription(MEMO, 'Barn Ridge Cap\n14\' 0" Long')).toBe(
      'Barn Ridge Cap\r\n14\' 0" Long'
    )
    expect(editedDescription(null, 'Drip Edge')).toBe('Drip Edge')
  })
})
