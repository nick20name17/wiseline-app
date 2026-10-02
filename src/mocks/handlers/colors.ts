import { http, HttpResponse } from 'msw'
import { coilColorTexts, coilProductList, colors, type SeedColor } from '../seed/colors'
import { api } from '../url'

type Payload = Pick<SeedColor, 'name' | 'hex' | 'coil_colors' | 'coil_products'>

// One colour per text or product: saving a colour takes its links from whichever had them.
const claim = (owner: SeedColor, payload: Partial<Payload>) => {
  for (const color of colors) {
    if (color === owner) continue
    color.coil_colors = color.coil_colors.filter(text => !payload.coil_colors?.includes(text))
    color.coil_products = color.coil_products.filter(id => !payload.coil_products?.includes(id))
  }
}

const nextId = () => Math.max(0, ...colors.map(color => color.id ?? 0)) + 1

export const colorsHandlers = [
  http.get(api('colors/'), () => HttpResponse.json({ count: colors.length, results: colors })),
  http.get(api('colors/coil-options/'), () => {
    const ownerOf = (match: (color: SeedColor) => boolean) => colors.find(match)?.name ?? null
    return HttpResponse.json({
      coil_colors: coilColorTexts.map(row => ({
        ...row,
        color: ownerOf(color => color.coil_colors.includes(row.text))
      })),
      coil_products: coilProductList.map(row => ({
        ...row,
        color: ownerOf(color => color.coil_products.includes(row.product_id))
      }))
    })
  }),
  http.post(api('colors/'), async ({ request }) => {
    const payload = (await request.json()) as Payload
    // A colour EBMS lists but nothing was saved for gets its row now, not a second one.
    const existing = colors.find(color => color.id === null && color.name === payload.name)
    const color = existing ?? { id: null, in_ebms: false, ...payload }
    Object.assign(color, payload, { id: nextId() })
    if (!existing) colors.push(color)
    claim(color, payload)
    return HttpResponse.json(color, { status: 201 })
  }),
  http.patch(api('colors/:id/'), async ({ params, request }) => {
    const color = colors.find(row => row.id === Number(params.id))
    if (!color) return new HttpResponse(null, { status: 404 })
    const payload = (await request.json()) as Partial<Payload>
    Object.assign(color, payload)
    claim(color, payload)
    return HttpResponse.json(color)
  })
]
