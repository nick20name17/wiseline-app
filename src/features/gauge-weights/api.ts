import { authApi } from '@/api/client'
import { queryOptions, useMutation, type QueryClient } from '@tanstack/react-query'
import * as z from 'zod/mini'

// A gauge some active EBMS coil has, with its weight once one is set.
const gaugeSchema = z.object({
  gauge: z.number(),
  products: z._default(z.number(), 0),
  weight: z._default(z.nullable(z.number()), null)
})

const gaugeWeightSchema = z.object({
  id: z.number(),
  gauge: z.number(),
  weight: z.number(),
  description: z._default(z.nullable(z.string()), null)
})

/**
 * A gauge's row: lb per square foot, paint included. The paint weighs the same on every gauge, so
 * it is not proportional to the steel and Kevin types it in. `id` is set once a weight is.
 */
export type GaugeRow = {
  gauge: number
  products: number
  id: number | null
  weight: number | null
  description: string | null
}

export const gaugeWeightFormSchema = z.object({
  weight: z
    .number('Enter the weight as a number, e.g. 1.25')
    .check(z.positive('Must be more than zero')),
  description: z.nullable(z.string().check(z.maxLength(255, 'At most 255 characters')))
})

export type GaugeWeightForm = z.infer<typeof gaugeWeightFormSchema>

const gaugeWeightsKeys = { all: ['gauge-weights'] as const }

/** Every gauge EBMS's coils come in, joined with the weights set for them. */
export const gaugeRowsQuery = queryOptions({
  queryKey: gaugeWeightsKeys.all,
  queryFn: async (): Promise<GaugeRow[]> => {
    const [gauges, weights] = await Promise.all([
      authApi
        .get('coils/gauges/')
        .json()
        .then(json => z.array(gaugeSchema).parse(json)),
      authApi
        .get('coils/gauge-weights/')
        .json()
        .then(json => z.array(gaugeWeightSchema).parse(json))
    ])
    const byGauge = new Map(weights.map(weight => [weight.gauge, weight]))
    return gauges
      .map(({ gauge, products }) => {
        const set = byGauge.get(gauge)
        return {
          gauge,
          products,
          id: set?.id ?? null,
          weight: set?.weight ?? null,
          description: set?.description ?? null
        }
      })
      .toSorted((a, b) => a.gauge - b.gauge)
  }
})

// A coil's weight is worked out from these, so every coil list reads them again.
const invalidate = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: gaugeWeightsKeys.all }),
    client.invalidateQueries({ queryKey: ['board'] })
  ])

export const useSaveGaugeWeight = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'The weight was not saved' },
    mutationFn: ({ row, values }: { row: GaugeRow; values: GaugeWeightForm }) =>
      row.id === null
        ? authApi.post('coils/gauge-weights/', { json: { gauge: row.gauge, ...values } }).json()
        : authApi.patch(`coils/gauge-weights/${row.id}/`, { json: values }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await invalidate(client)
      onSuccess()
    }
  })

/** Back to EBMS's own product weight for the gauge. */
export const useClearGaugeWeight = () =>
  useMutation({
    meta: { errorTitle: 'The weight stayed' },
    mutationFn: (id: number) => authApi.delete(`coils/gauge-weights/${id}/`),
    onSuccess: (_, __, ___, { client }) => invalidate(client)
  })
