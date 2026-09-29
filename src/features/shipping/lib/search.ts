import * as z from 'zod/mini'

const isoDay = z.catch(z.optional(z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/))), undefined)

export const SHIPPING_VIEWS = ['unscheduled', 'scheduled'] as const

export type ShippingView = (typeof SHIPPING_VIEWS)[number]

// A hand-typed URL lands on a tab, not a 4xx.
export const shippingSearchSchema = z.object({
  view: z.catch(z.enum(SHIPPING_VIEWS), 'unscheduled'),
  search: z.catch(z.optional(z.string()), undefined),
  day: isoDay
})

/** The Loading and Driver windows work one day at a time. */
export const daySearchSchema = z.object({ day: isoDay })
