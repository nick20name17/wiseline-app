import { describe, expect, it } from 'vitest'
import { isLinked, suggestedTexts } from './suggest'

const options = [
  { text: '26GA. Charcoal', color: null },
  { text: 'Charcoal 8306', color: null },
  { text: 'CSG90438306 CHARCOAL', color: null },
  { text: 'Charcoal Lynx', color: null },
  { text: 'Charcoalish', color: null },
  { text: 'Black 8262', color: 'Black' }
]

describe('suggestedTexts', () => {
  it('offers every unlinked text that names the colour as a word, whatever the case', () => {
    expect(suggestedTexts('Charcoal', options)).toEqual([
      '26GA. Charcoal',
      'Charcoal 8306',
      'CSG90438306 CHARCOAL',
      'Charcoal Lynx'
    ])
  })

  it('leaves a text another colour already has', () => {
    expect(suggestedTexts('Black', options)).toEqual([])
  })

  it('matches a name of several words as a phrase', () => {
    const ebony = [
      { text: '26GA Ebony  Textured', color: null },
      { text: 'Ebony', color: null }
    ]
    expect(suggestedTexts('Ebony Textured', ebony)).toEqual(['26GA Ebony  Textured'])
  })
})

describe('isLinked', () => {
  it('is true once a text or a product is kept for the colour', () => {
    expect(isLinked({ coil_colors: [], coil_products: [] })).toBe(false)
    expect(isLinked({ coil_colors: [], coil_products: ['CS1'] })).toBe(true)
  })
})
