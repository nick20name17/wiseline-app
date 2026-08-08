import * as z from 'zod'

import { persisted } from '@/store/persisted'

/**
 * Stock orders a Stock Card has created but no department has picked up yet.
 *
 * Written by the Stock Cards screen, read by every production department, which turns each thin record
 * into a full order of its own shape. They are app-native: an «S» order has no EBMS counterpart, which
 * is why it carries an order number and nothing that would join back to `ARINV`.
 */
const PENDING_VERSION = 1

const PendingStockOrderSchema = z.object({
  orderNo: z.string(),
  entryDate: z.string().optional(),
  qty: z.number().optional(),
  pid: z.string().optional(),
  desc: z.string().optional(),
  gaugeColour: z.string().optional(),
  width: z.number().optional(),
  length: z.number().optional()
})

export type PendingStockOrder = z.infer<typeof PendingStockOrderSchema>

const StoredSchema = z.object({
  v: z.literal(PENDING_VERSION),
  orders: z.array(PendingStockOrderSchema)
})

export const pendingStockOrders = persisted<PendingStockOrder[], z.infer<typeof StoredSchema>>({
  key: 'wl_orders_pending_v1',
  schema: StoredSchema,
  fallback: () => [],
  decode: stored => stored.orders,
  encode: orders => ({ v: PENDING_VERSION, orders })
})

/** The ones a department has not already turned into an order of its own. */
export const unclaimedStockOrders = (existingOrderNumbers: Iterable<string>) => {
  const existing = new Set(existingOrderNumbers)
  return pendingStockOrders
    .get()
    .filter(pending => pending.orderNo && !existing.has(pending.orderNo))
}
