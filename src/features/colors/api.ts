import { authApi } from '@/api/client'
import { queryOptions, useMutation } from '@tanstack/react-query'
import * as z from 'zod/mini'

// Every trim colour EBMS has, each with what the app keeps for it. `id` is null until something is
// saved for the colour — the row is made then, not before.
const colorSchema = z.object({
  id: z._default(z.nullable(z.number()), null),
  name: z.string(),
  hex: z._default(z.nullable(z.string()), null),
  coil_colors: z._default(z.array(z.string()), []),
  coil_products: z._default(z.array(z.string()), []),
  // A colour kept here can outlive every trim that went by it.
  in_ebms: z._default(z.boolean(), true)
})

export type Color = z.infer<typeof colorSchema>

const colorPageSchema = z.object({
  count: z._default(z.number(), 0),
  results: z._default(z.array(colorSchema), [])
})

// What a colour can be given: the coils' colour texts, and the coil products EBMS gives no colour.
// Each says which colour already has it — one colour per text or product.
const coilOptionsSchema = z.object({
  coil_colors: z._default(
    z.array(
      z.object({
        text: z.string(),
        coils: z._default(z.number(), 0),
        color: z._default(z.nullable(z.string()), null)
      })
    ),
    []
  ),
  coil_products: z._default(
    z.array(
      z.object({
        product_id: z.string(),
        description: z._default(z.nullable(z.string()), null),
        color: z._default(z.nullable(z.string()), null)
      })
    ),
    []
  )
})

export type CoilOptions = z.infer<typeof coilOptionsSchema>

export const colorsKeys = {
  all: ['colors'] as const,
  list: () => [...colorsKeys.all, 'list'] as const,
  coilOptions: () => [...colorsKeys.all, 'coil-options'] as const
}

// A few hundred names at most, filtered on the page as the Manager types.
const ALL = 1000

export const colorsQuery = queryOptions({
  queryKey: colorsKeys.list(),
  queryFn: async () =>
    colorPageSchema.parse(await authApi.get('colors/', { searchParams: { limit: ALL } }).json())
      .results
})

export const coilOptionsQuery = queryOptions({
  queryKey: colorsKeys.coilOptions(),
  queryFn: async () => coilOptionsSchema.parse(await authApi.get('colors/coil-options/').json())
})

export type ColorPayload = {
  name: string
  hex: string | null
  coil_colors: string[]
  coil_products: string[]
}

export const useSaveColor = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'The colour was not saved' },
    mutationFn: ({ id, payload }: { id: number | null; payload: ColorPayload }) =>
      id === null
        ? authApi.post('colors/', { json: payload }).json()
        : authApi.patch(`colors/${id}/`, { json: payload }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      // Which coils a cutlist can be cut from is read off these links, on another feature's lists.
      // Invalidating everything refetches only what is on screen and marks the rest stale.
      await client.invalidateQueries()
      onSuccess()
    }
  })
