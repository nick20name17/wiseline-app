import { authApi } from '@/api/client'
import { keepPreviousData, queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import * as z from 'zod/mini'

/**
 * Trim reads two stores through one API. `ebms/orders/` is a mirror of the EBMS sales orders, keyed by
 * a string autoid; everything this app decides about an order — its production date, priority, whether
 * it has been released — hangs off a `SalesOrder` row of our own, keyed by an integer id and scoped to
 * one department. An EBMS order that nobody has touched yet has no `sales_order` at all, which is why
 * every write below starts by making sure one exists.
 */

// --- Departments ---------------------------------------------------------

/** The stable code for the department this page is, independent of the EBMS category it is linked to. */
export const TRIM_CODE = 'trim'

const departmentSchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  code: z._default(z.string(), '')
})

export type Department = z.infer<typeof departmentSchema>

export const departmentsQuery = queryOptions({
  queryKey: ['departments', 'all'] as const,
  queryFn: async () => z.array(departmentSchema).parse(await authApi.get('departments/all/').json())
})

/** The department row the whole page is scoped to. Every query below waits on its id. */
export const useTrimDepartment = () =>
  useQuery({
    ...departmentsQuery,
    select: departments => departments.find(department => department.code === TRIM_CODE)
  })

// --- Orders --------------------------------------------------------------

const prioritySchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  color: z._default(z.nullable(z.string()), null),
  position: z._default(z.nullable(z.number()), null),
  department: z._default(z.nullable(z.number()), null)
})

export type Priority = z.infer<typeof prioritySchema>

// What one department has decided about an order. An order carries one of these per department it has
// line items in, so the page always picks its own out of the list.
const departmentStateSchema = z.object({
  id: z.number(),
  department: z._default(z.nullable(z.number()), null),
  reviewed: z._default(z.boolean(), false),
  release_to_production: z._default(z.boolean(), false),
  priority: z._default(z.nullable(prioritySchema), null),
  production_date: z._default(z.nullable(z.string()), null),
  status: z._default(z.nullable(z.string()), null),
  over_due: z._default(z.boolean(), false)
})

export type DepartmentState = z.infer<typeof departmentStateSchema>

const salesOrderSchema = z.object({
  id: z.number(),
  order: z._default(z.nullable(z.string()), null),
  is_stock: z._default(z.boolean(), false),
  department_states: z.catch(z.array(departmentStateSchema), [])
})

// The app's own row against one EBMS line item. Present only once somebody has scheduled, assigned or
// annotated the line; until then the mirror is all there is.
const itemSchema = z.object({
  id: z.number(),
  status: z._default(z.nullable(z.string()), null),
  production_date: z._default(z.nullable(z.string()), null),
  department: z._default(z.nullable(z.number()), null),
  over_due: z._default(z.nullable(z.boolean()), false)
})

const lineItemSchema = z.object({
  id: z.string(),
  category: z._default(z.nullable(z.string()), null),
  id_inven: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  quantity: z._default(z.number(), 0),
  width: z._default(z.number(), 0),
  length: z._default(z.number(), 0),
  bends: z._default(z.number(), 0),
  weight: z._default(z.number(), 0),
  production_date: z._default(z.nullable(z.string()), null),
  item: z._default(z.nullable(itemSchema), null)
})

export type TrimLineItem = z.infer<typeof lineItemSchema>

const orderSchema = z.object({
  id: z.string(),
  invoice: z._default(z.string(), ''),
  customer: z._default(z.nullable(z.string()), null),
  ship_date: z._default(z.nullable(z.string()), null),
  crea_date: z._default(z.nullable(z.string()), null),
  count_items: z._default(z.nullable(z.number()), 0),
  total_weight: z._default(z.nullable(z.number()), 0),
  sales_order: z._default(z.nullable(salesOrderSchema), null),
  origin_items: z.catch(z.array(lineItemSchema), [])
})

export type TrimOrder = z.infer<typeof orderSchema>

const orderPageSchema = z.object({
  count: z.number(),
  results: z.array(orderSchema)
})

/** The order's row for this department, or nothing if it has never been touched here. */
export const departmentStateOf = (order: TrimOrder, departmentId: number | undefined) =>
  order.sales_order?.department_states.find(state => state.department === departmentId) ?? null

export const isStockOrder = (order: TrimOrder) => order.sales_order?.is_stock ?? false

// The EBMS category that routes a line item to this department. `ebms/orders/` filters on the category
// name rather than on the department id, and narrows the returned line items to it as well.
const TRIM_CATEGORY = 'Trim'

// One page holds the tab. The board's Unscheduled list is a working queue, not an archive.
const PAGE_SIZE = 100

export const trimKeys = {
  all: ['trim'] as const,
  orders: () => [...trimKeys.all, 'orders'] as const,
  unscheduled: (search: string | undefined) =>
    [...trimKeys.orders(), 'unscheduled', { search: search ?? '' }] as const,
  dayStrip: (departmentId: number, start: string, days: number) =>
    [...trimKeys.all, 'day-strip', departmentId, start, days] as const,
  priorities: () => [...trimKeys.all, 'priorities'] as const,
  orderNotes: (orders: string[]) => [...trimKeys.all, 'order-notes', orders] as const,
  lineNotes: (originItem: string) => [...trimKeys.all, 'line-notes', originItem] as const,
  lineNotesSummary: (originItems: string[]) =>
    [...trimKeys.all, 'line-notes', 'summary', originItems] as const,
  stockCards: () => [...trimKeys.all, 'stock-cards'] as const
}

export const unscheduledOrdersQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: trimKeys.unscheduled(search),
    // Each search term is its own cache entry; without this the table falls back to the skeleton on
    // every keystroke pause and resizes itself twice per search.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      orderPageSchema.parse(
        await authApi
          .get('ebms/orders/', {
            searchParams: {
              category: TRIM_CATEGORY,
              is_scheduled: false,
              limit: PAGE_SIZE,
              offset: 0,
              ...(search ? { search } : {})
            }
          })
          .json()
      )
  })

// --- The day strip -------------------------------------------------------

const dayStripSchema = z.array(
  z.object({
    date: z.string(),
    pieces: z._default(z.number(), 0),
    pieces_from_stock: z._default(z.number(), 0),
    bends: z._default(z.number(), 0),
    bends_from_stock: z._default(z.number(), 0),
    capacity: z._default(z.nullable(z.number()), null),
    over_capacity: z._default(z.boolean(), false)
  })
)

export type DayStripEntry = z.infer<typeof dayStripSchema>[number]

/** `used / capacity` per day — what the board puts on every day pill. */
export const dayStripQuery = (departmentId: number | undefined, start: string, days: number) =>
  queryOptions({
    queryKey: trimKeys.dayStrip(departmentId ?? 0, start, days),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      dayStripSchema.parse(
        await authApi
          .get(`departments/${departmentId}/day-strip/`, { searchParams: { start, days } })
          .json()
      )
  })

// --- Priorities ----------------------------------------------------------

/**
 * Priorities are created per department and must not leak between them, so the list is narrowed here:
 * `GET /priorities/` takes no department parameter. One with no department of its own belongs to none
 * in particular and fits anywhere, which is how the backend validates it too.
 */
export const prioritiesQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: trimKeys.priorities(),
    queryFn: async () => z.array(prioritySchema).parse(await authApi.get('priorities/').json()),
    select: (priorities: Priority[]) =>
      priorities
        .filter(priority => priority.department === null || priority.department === departmentId)
        // The board's Hierarchy is ascending: the priority numbered 1 sits on top.
        .sort(
          (a, b) =>
            (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
        )
  })

// --- Notes ---------------------------------------------------------------

const orderNoteSchema = z.object({
  has_note: z._default(z.boolean(), false),
  text: z._default(z.nullable(z.string()), null),
  author: z._default(z.nullable(z.string()), null),
  created_at: z._default(z.nullable(z.string()), null),
  read: z._default(z.boolean(), false),
  read_at: z._default(z.nullable(z.string()), null)
})

export type OrderNote = z.infer<typeof orderNoteSchema>

/**
 * Note state for every row on screen in one call, which is what the dots in the Notes column need —
 * one request per row would be a request per keystroke of the search box.
 */
export const orderNotesQuery = (orders: string[]) =>
  queryOptions({
    queryKey: trimKeys.orderNotes(orders),
    enabled: orders.length > 0,
    queryFn: async () =>
      z
        .record(z.string(), orderNoteSchema)
        .parse(await authApi.post('orders/notes/', { json: { orders } }).json())
  })

const lineNoteSummarySchema = z.object({
  count: z._default(z.number(), 0),
  unread: z._default(z.number(), 0),
  has_notes: z._default(z.boolean(), false)
})

/** Whether each line item's dot is red, green or absent, for a whole expanded order at once. */
export const lineNotesSummaryQuery = (originItems: string[]) =>
  queryOptions({
    queryKey: trimKeys.lineNotesSummary(originItems),
    enabled: originItems.length > 0,
    queryFn: async () =>
      z
        .record(z.string(), lineNoteSummarySchema)
        .parse(await authApi.post('items/notes/', { json: { origin_items: originItems } }).json())
  })

const lineNoteSchema = z.object({
  id: z.number(),
  text: z._default(z.string(), ''),
  author: z._default(
    z.nullable(
      z.object({
        name: z._default(z.nullable(z.string()), null),
        email: z._default(z.nullable(z.string()), null),
        initials: z._default(z.nullable(z.string()), null)
      })
    ),
    null
  ),
  created_at: z._default(z.nullable(z.string()), null),
  read: z._default(z.boolean(), false)
})

const lineNoteThreadSchema = z.object({
  notes: z.catch(z.array(lineNoteSchema), []),
  unread: z._default(z.boolean(), false),
  count: z._default(z.number(), 0)
})

export type LineNote = z.infer<typeof lineNoteSchema>
export type LineNoteThread = z.infer<typeof lineNoteThreadSchema>

const EMPTY_THREAD: LineNoteThread = { notes: [], unread: false, count: 0 }

/**
 * The thread on one line item, oldest first.
 *
 * The endpoint keys off this app's own row for the line, and a line nobody has scheduled or annotated
 * has none — which answers 404. That is not an error to show: no row means no notes, so it reads as an
 * empty thread and the composer below still works, because posting creates the row.
 */
export const lineNotesQuery = (originItem: string | null) =>
  queryOptions({
    queryKey: trimKeys.lineNotes(originItem ?? ''),
    enabled: !!originItem,
    queryFn: async () => {
      try {
        return lineNoteThreadSchema.parse(await authApi.get(`items/${originItem}/notes/`).json())
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 404) return EMPTY_THREAD
        throw error
      }
    }
  })

export const useMarkOrderNoteRead = () =>
  useMutation({
    mutationFn: (order: string) => authApi.post(`orders/${order}/note/read/`).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    }
  })

/**
 * Posted through `comments/` rather than `items/{autoid}/notes/`: this is the one endpoint that
 * creates the app's row for the line when it has none, which is every line on the Unscheduled tab.
 */
export const useAddLineNote = (originItem: string) =>
  useMutation({
    mutationFn: (text: string) =>
      authApi.post('comments/', { json: { item: originItem, text } }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.lineNotes(originItem) })
    }
  })

export const useMarkLineNoteRead = (originItem: string) =>
  useMutation({
    mutationFn: (noteId: number) => authApi.post(`notes/${noteId}/read/`).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.lineNotes(originItem) })
    }
  })

// --- Scheduling ----------------------------------------------------------

/**
 * Every write below is keyed on our own `SalesOrder` id, and an EBMS order that nobody has scheduled,
 * prioritised or annotated has none yet. `POST /sales-orders/` is idempotent enough for this: it takes
 * the EBMS autoid, and the board only reaches here from a row it just read.
 */
const ensureSalesOrderId = async (order: TrimOrder) => {
  if (order.sales_order) return order.sales_order.id
  const created = salesOrderSchema.parse(
    await authApi.post('sales-orders/', { json: { order: order.id } }).json()
  )
  return created.id
}

export type ScheduleOrdersInput = {
  orders: TrimOrder[]
  departmentId: number
  productionDate: string
}

/** Tick several orders, pick one day — the board's main scheduling path. */
export const useScheduleOrders = (onSuccess: () => void) =>
  useMutation({
    mutationFn: async ({ orders, departmentId, productionDate }: ScheduleOrdersInput) => {
      const ids = await Promise.all(orders.map(ensureSalesOrderId))
      return authApi
        .post('sales-orders/schedule/', {
          json: { department: departmentId, orders: ids, production_date: productionDate }
        })
        .json()
    },
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
      onSuccess()
    }
  })

export type SplitOrderInput = {
  order: TrimOrder
  departmentId: number
  productionDate: string
  /** The EBMS autoids of the line items being split off. */
  originItems: string[]
}

/** Split Order: the ticked line items get a day of their own and the rest stay behind. */
export const useSplitOrder = (onSuccess: () => void) =>
  useMutation({
    mutationFn: async ({ order, departmentId, productionDate, originItems }: SplitOrderInput) => {
      const id = await ensureSalesOrderId(order)
      return authApi
        .post(`sales-orders/${id}/departments/${departmentId}/schedule/`, {
          json: { production_date: productionDate, origin_items: originItems }
        })
        .json()
    },
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
      onSuccess()
    }
  })

/**
 * Bypass Production: the order skips the Slinet and the machines and its trims land in Wrapping as
 * Bypassed. Per order, because the backend gates it per order and department.
 */
export const useBypassProduction = (onSuccess: () => void) =>
  useMutation({
    mutationFn: async ({ orders, departmentId }: { orders: TrimOrder[]; departmentId: number }) => {
      const ids = await Promise.all(orders.map(ensureSalesOrderId))
      return Promise.all(
        ids.map(id => authApi.post(`sales-orders/${id}/departments/${departmentId}/bypass/`).json())
      )
    },
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
      onSuccess()
    }
  })

/** Set or clear an order's Priority. It belongs to one department and never leaks to another. */
export const useSetPriority = () =>
  useMutation({
    mutationFn: async ({
      order,
      departmentId,
      priorityId
    }: {
      order: TrimOrder
      departmentId: number
      priorityId: number | null
    }) => {
      const id = await ensureSalesOrderId(order)
      return authApi
        .patch(`sales-orders/${id}/departments/${departmentId}/`, {
          json: { priority: priorityId }
        })
        .json()
    },
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    }
  })

// --- Stock cards and stock orders ---------------------------------------

const stockCardSchema = z.object({
  id: z.number(),
  product_id: z._default(z.string(), ''),
  description: z._default(z.nullable(z.string()), null),
  stock_minimum: z._default(z.nullable(z.number()), null),
  order_qty: z._default(z.nullable(z.number()), null),
  image_id: z._default(z.nullable(z.number()), null),
  qr_payload: z._default(z.nullable(z.string()), null)
})

export type StockCard = z.infer<typeof stockCardSchema>

export const stockCardsQuery = queryOptions({
  queryKey: trimKeys.stockCards(),
  queryFn: async () => z.array(stockCardSchema).parse(await authApi.get('stock-cards/').json())
})

export const useDeleteStockCard = () =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`stock-cards/${id}/`),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.stockCards() })
    }
  })

export const usePrintStockCards = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (cardIds: number[]) =>
      authApi.post('stock-cards/print/', { json: { card_ids: cardIds } }).json(),
    onSuccess
  })

export const stockOrderLineSchema = z.object({
  quantity: z.nullable(z.number().check(z.minimum(1, 'At least one'))),
  product_id: z.string()
})

export type StockOrderLine = z.infer<typeof stockOrderLineSchema>

/**
 * Create Stock Order: the rows the Manager filled in become an order of our own, which then goes
 * through Unscheduled and everything after it exactly like a customer's order from EBMS. Blank rows
 * are dropped rather than rejected — the modal always offers more than anyone fills.
 */
export const useCreateStockOrder = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (lines: StockOrderLine[]) =>
      authApi
        .post('stock-orders/', {
          json: {
            lines: lines
              .filter(line => line.product_id.trim() && line.quantity)
              .map(line => ({ product_id: line.product_id.trim(), quantity: line.quantity }))
          }
        })
        .json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
      onSuccess()
    }
  })

/** Scanning a Stock Card's QR fills the Order Qty and Product ID into a row of the grid. */
export const useScanStockCard = () =>
  useMutation({
    mutationFn: async (payload: string) =>
      z
        .object({
          product_id: z._default(z.string(), ''),
          description: z._default(z.nullable(z.string()), null),
          order_qty: z._default(z.nullable(z.number()), null)
        })
        .parse(await authApi.post('stock-cards/scan/', { json: { payload } }).json())
  })
