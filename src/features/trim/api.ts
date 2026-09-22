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

const machineSchema = z.object({
  id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  department: z._default(z.nullable(z.number()), null),
  position: z._default(z.nullable(z.number()), null),
  // What the machine does in its department: the Slinet cuts, the rest bend, and Wrapping is the
  // station after them. It is what tells the Production tab which sub-tab is which.
  kind: z._default(z.nullable(z.string()), null),
  daily_max_pieces: z._default(z.nullable(z.number()), null),
  daily_max_bends: z._default(z.nullable(z.number()), null)
})

export type Machine = z.infer<typeof machineSchema>

// The app's own row against one EBMS line item. Present only once somebody has scheduled, assigned or
// annotated the line; until then the mirror is all there is.
const itemSchema = z.object({
  id: z.number(),
  status: z._default(z.nullable(z.string()), null),
  production_date: z._default(z.nullable(z.string()), null),
  department: z._default(z.nullable(z.number()), null),
  over_due: z._default(z.nullable(z.boolean()), false),
  // What the Manager fills in while reviewing the order.
  flow: z._default(z.nullable(machineSchema), null),
  vented: z._default(z.boolean(), false),
  pull_from_stock: z._default(z.nullable(z.number()), null),
  // Width and description are editable here and deliberately never pushed back to EBMS, so a set
  // value shadows the mirror's.
  width: z._default(z.nullable(z.number()), null),
  description: z._default(z.nullable(z.string()), null)
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
  latest_location_id: z._default(z.nullable(z.number()), null),
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
  scheduled: (search: string | undefined, day: string | null) =>
    [...trimKeys.orders(), 'scheduled', { search: search ?? '', day: day ?? 'all' }] as const,
  machines: () => [...trimKeys.all, 'machines'] as const,
  overdue: (departmentId: number) => [...trimKeys.all, 'overdue', departmentId] as const,
  machineCapacities: (departmentId: number, day: string) =>
    [...trimKeys.all, 'machine-capacities', departmentId, day] as const,
  allocatedStock: (departmentId: number, search: string | undefined) =>
    [...trimKeys.all, 'allocated-stock', departmentId, { search: search ?? '' }] as const,
  dayStrip: (departmentId: number, start: string, days: number) =>
    [...trimKeys.all, 'day-strip', departmentId, start, days] as const,
  priorities: () => [...trimKeys.all, 'priorities'] as const,
  orderNotes: (orders: string[]) => [...trimKeys.all, 'order-notes', orders] as const,
  lineNotes: (originItem: string) => [...trimKeys.all, 'line-notes', originItem] as const,
  // Its own branch, not a child of `lineNotes`: invalidating one thread must reach every table dot,
  // and `lineNotes(<autoid>)` would never match a key sitting under `summary`.
  lineNotesSummaries: () => [...trimKeys.all, 'line-notes-summary'] as const,
  lineNotesSummary: (originItems: string[]) =>
    [...trimKeys.lineNotesSummaries(), originItems] as const,
  stockCards: () => [...trimKeys.all, 'stock-cards'] as const,
  cutlists: () => [...trimKeys.all, 'cutlists'] as const,
  cutlistBoard: (departmentId: number, kind: CutlistKind, machine: number | null, done: boolean) =>
    [
      ...trimKeys.cutlists(),
      departmentId,
      kind,
      machine ?? 'all',
      done ? 'done' : 'active'
    ] as const,
  cutlistCoils: (cutlistId: number) => [...trimKeys.cutlists(), 'coils', cutlistId] as const,
  cutlistSources: (rowIds: number[]) => [...trimKeys.cutlists(), 'sources', rowIds] as const,
  completedOrders: () => [...trimKeys.all, 'completed'] as const,
  completed: (departmentId: number, search: string | undefined) =>
    [...trimKeys.completedOrders(), departmentId, { search: search ?? '' }] as const,
  completedOrder: (departmentId: number, order: string) =>
    [...trimKeys.completedOrders(), departmentId, order] as const,
  coils: () => [...trimKeys.all, 'coils'] as const,
  coilLots: (scope: CoilScope) => [...trimKeys.coils(), scope] as const,
  coilFilters: (departmentId: number) => [...trimKeys.coils(), 'filters', departmentId] as const,
  wrapping: () => [...trimKeys.all, 'wrapping'] as const,
  wrappingRows: (departmentId: number, day: string | null) =>
    [...trimKeys.wrapping(), departmentId, day ?? 'all'] as const,
  wrappingLocations: (departmentId: number) =>
    [...trimKeys.wrapping(), 'locations', departmentId] as const,
  orderLocations: (order: string) => [...trimKeys.wrapping(), 'order-locations', order] as const,
  orderComplete: (departmentId: number, order: string) =>
    [...trimKeys.wrapping(), 'complete', departmentId, order] as const
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

/**
 * The Scheduled tab: orders whose Trim line items carry a production date, released or not.
 *
 * A day narrows the list to that production date; `null` is the board's «All Scheduled Orders».
 */
export const scheduledOrdersQuery = (search: string | undefined, day: string | null) =>
  queryOptions({
    queryKey: trimKeys.scheduled(search, day),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      orderPageSchema.parse(
        await authApi
          .get('ebms/orders/', {
            searchParams: {
              category: TRIM_CATEGORY,
              is_scheduled: true,
              limit: PAGE_SIZE,
              offset: 0,
              ...(day ? { production_date: day } : {}),
              ...(search ? { search } : {})
            }
          })
          .json()
      )
  })

// --- Machines ------------------------------------------------------------

/**
 * The machines a line item can be assigned to. `GET /flows/all/` takes the EBMS category rather than
 * a department, which for this page is the same thing — the two are linked by `category_autoid`.
 */
export const machinesQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: trimKeys.machines(),
    queryFn: async () =>
      z
        .array(machineSchema)
        .parse(
          await authApi
            .get('flows/all/', { searchParams: { category__prod_type: TRIM_CATEGORY } })
            .json()
        ),
    select: (machines: Machine[]) =>
      machines
        .filter(machine => machine.department === null || machine.department === departmentId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  })

// --- Overdue and machine capacities -------------------------------------

const overdueSchema = z.object({
  days: z.catch(z.array(z.string()), []),
  orders_by_day: z.catch(z.record(z.string(), z.number()), {}),
  orders: z._default(z.number(), 0),
  line_items: z._default(z.number(), 0)
})

/** Which production days carry work that is past due — the board's red cascade, in one call. */
export const overdueQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: trimKeys.overdue(departmentId ?? 0),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      overdueSchema.parse(await authApi.get(`departments/${departmentId}/overdue/`).json())
  })

const machineCapacitySchema = z.object({
  date: z.string(),
  total: z.object({
    pieces: z._default(z.number(), 0),
    pieces_from_stock: z._default(z.number(), 0),
    bends: z._default(z.number(), 0),
    bends_from_stock: z._default(z.number(), 0),
    capacity: z._default(z.nullable(z.number()), null)
  }),
  machines: z.catch(
    z.array(
      z.object({
        flow_id: z.number(),
        name: z._default(z.nullable(z.string()), null),
        pieces: z._default(z.number(), 0),
        pieces_from_stock: z._default(z.number(), 0),
        max_pieces: z._default(z.nullable(z.number()), null),
        bends: z._default(z.number(), 0),
        bends_from_stock: z._default(z.number(), 0),
        max_bends: z._default(z.nullable(z.number()), null),
        over_bends: z._default(z.boolean(), false)
      })
    ),
    []
  ),
  pieces_without_a_machine: z._default(z.number(), 0)
})

export type MachineCapacities = z.infer<typeof machineCapacitySchema>

/** One day broken down by machine — what the gear on a day tab opens. */
export const machineCapacitiesQuery = (departmentId: number | undefined, day: string | null) =>
  queryOptions({
    queryKey: trimKeys.machineCapacities(departmentId ?? 0, day ?? ''),
    enabled: departmentId !== undefined && !!day,
    queryFn: async () =>
      machineCapacitySchema.parse(
        await authApi
          .get(`departments/${departmentId}/machine-capacities/`, { searchParams: { day: day! } })
          .json()
      )
  })

const locationSchema = z.object({
  id: z.number(),
  code: z._default(z.nullable(z.string()), null)
})

export type TrimLocation = z.infer<typeof locationSchema>

/**
 * Where a wrapped order is sitting. Location codes are unique across the whole app, so the label
 * carries no warehouse — the code alone says where to go.
 */
export const locationsQuery = queryOptions({
  queryKey: ['locations', 'all'] as const,
  queryFn: async () =>
    z
      .object({ count: z.number(), results: z.array(locationSchema) })
      .parse(await authApi.get('locations/', { searchParams: { limit: 500 } }).json()),
  select: (page: { results: TrimLocation[] }) =>
    new Map(page.results.map(location => [location.id, location.code]))
})

// --- Allocated stock -----------------------------------------------------

const allocatedStockSchema = z.array(
  z.object({
    color: z._default(z.nullable(z.string()), null),
    product_id: z._default(z.string(), ''),
    description: z._default(z.nullable(z.string()), null),
    qty: z._default(z.number(), 0),
    starts_color_group: z._default(z.boolean(), false)
  })
)

export type AllocatedStockRow = z.infer<typeof allocatedStockSchema>[number]

/**
 * Every trim due to come from stock that has not been wrapped yet, across the orders marked Reviewed.
 * Read fresh each time: the board wants a live report, and nothing accumulates behind it.
 */
export const allocatedStockQuery = (departmentId: number | undefined, search: string | undefined) =>
  queryOptions({
    queryKey: trimKeys.allocatedStock(departmentId ?? 0, search),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      allocatedStockSchema.parse(
        await authApi
          .get(`departments/${departmentId}/allocated-stock/`, {
            searchParams: search ? { search } : {}
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
/** The thread and the dot that summarises it in the table, which are two different queries. */
const invalidateLineNotes = (
  client: { invalidateQueries: (filters: { queryKey: readonly unknown[] }) => Promise<void> },
  originItem: string
) =>
  Promise.all([
    client.invalidateQueries({ queryKey: trimKeys.lineNotes(originItem) }),
    client.invalidateQueries({ queryKey: trimKeys.lineNotesSummaries() })
  ])

export const useAddLineNote = (originItem: string) =>
  useMutation({
    mutationFn: (text: string) =>
      authApi.post('comments/', { json: { item: originItem, text } }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await invalidateLineNotes(client, originItem)
    }
  })

export const useMarkLineNoteRead = (originItem: string) =>
  useMutation({
    mutationFn: (noteId: number) => authApi.post(`notes/${noteId}/read/`).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await invalidateLineNotes(client, originItem)
    }
  })

// --- Scheduling ----------------------------------------------------------

/**
 * Every write below is keyed on our own `SalesOrder` id, and an EBMS order that nobody has scheduled,
 * prioritised or annotated has none yet, so one is made on the way.
 *
 * `POST /sales-orders/` is not idempotent — the autoid is unique — so the write that follows must
 * refresh the orders list whether it succeeded or not. Otherwise a failed schedule leaves a row on the
 * server and a cached order that still says there is none, and the retry answers 500 on the
 * constraint instead of repeating the real error. Hence `onSettled` below rather than `onSuccess`.
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
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    },
    onSuccess: onSuccess
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
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    },
    onSuccess: onSuccess
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
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    },
    onSuccess: onSuccess
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
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    }
  })

/**
 * Reviewed: the Manager has been through the order and it is ready to be released.
 *
 * Turning it on is silent; turning it back off is what the board puts a confirmation behind, which is
 * the caller's business rather than this hook's.
 */
export const useSetReviewed = () =>
  useMutation({
    mutationFn: async ({
      order,
      departmentId,
      reviewed
    }: {
      order: TrimOrder
      departmentId: number
      reviewed: boolean
    }) => {
      const id = await ensureSalesOrderId(order)
      return authApi
        .patch(`sales-orders/${id}/departments/${departmentId}/`, { json: { reviewed } })
        .json()
    },
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    }
  })

const releaseResultSchema = z.object({
  released: z.catch(z.array(z.number()), []),
  cutlists: z.catch(z.array(z.number()), [])
})

/**
 * Release To Production: the ticked orders go to the floor and their cutlists and bendlists are made.
 *
 * One call for the batch rather than one per order — orders sharing a production date, gauge/colour
 * and priority share a cutlist, and that grouping only happens when they arrive together.
 */
export const useReleaseOrders = (onSuccess: (cutlists: number) => void) =>
  useMutation({
    mutationFn: async ({
      salesOrderIds,
      departmentId
    }: {
      salesOrderIds: number[]
      departmentId: number
    }) =>
      releaseResultSchema.parse(
        await authApi
          .post(`departments/${departmentId}/release/`, {
            json: { sales_order_ids: salesOrderIds }
          })
          .json()
      ),
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    },
    onSuccess: result => onSuccess(result.cutlists.length)
  })

/** Take a release back. Refused once production has started, which the server decides. */
export const useUnreleaseOrder = () =>
  useMutation({
    mutationFn: ({ salesOrderId, departmentId }: { salesOrderId: number; departmentId: number }) =>
      authApi
        .post(`sales-orders/${salesOrderId}/departments/${departmentId}/release/`, {
          json: { released: false }
        })
        .json(),
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    }
  })

/** Send the order back to Unscheduled. This also discards the Manager's edits, as the board says. */
export const useUnscheduleOrder = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ salesOrderId, departmentId }: { salesOrderId: number; departmentId: number }) =>
      authApi.post(`sales-orders/${salesOrderId}/departments/${departmentId}/unschedule/`).json(),
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
    },
    onSuccess
  })

/** What a Manager sets on one line item while reviewing the order. */
export type LineItemEdit = {
  flow?: number | null
  vented?: boolean
  pull_from_stock?: number
  width?: number
  description?: string
}

/**
 * Keyed on this app's own row for the line, which exists by the time an order reaches this tab —
 * scheduling is what puts the production date on it.
 */
export const useUpdateLineItem = () =>
  useMutation({
    mutationFn: ({ itemId, edit }: { itemId: number; edit: LineItemEdit }) =>
      authApi.patch(`items/${itemId}/`, { json: edit }).json(),
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.orders() })
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

/** One row of the Create Stock Order grid, once the blanks have been dropped. */
export type StockOrderLine = { product_id: string; quantity: number }

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
          json: { lines }
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

// --- Cutlists and bendlists ---------------------------------------------

/**
 * A cutlist belongs to the Slinet, which cuts the material; a bendlist belongs to one machine, which
 * bends it. Releasing an order to production is what creates them, and nothing ever adds to one: the
 * same gauge and colour released again later makes a second list beside the first.
 */
export type CutlistKind = 'cutlist' | 'bendlist'

// Which line items are behind a row, and how much each one contributed — what a number in the Total
// column opens up.
const cutlistSourceSchema = z.object({
  order: z._default(z.nullable(z.string()), null),
  origin_item: z._default(z.nullable(z.string()), null),
  quantity: z._default(z.number(), 0)
})

export type CutlistSource = z.infer<typeof cutlistSourceSchema>

const cutlistRowSchema = z.object({
  id: z.number(),
  width: z._default(z.nullable(z.number()), null),
  length: z._default(z.nullable(z.number()), null),
  // The machine this quantity is destined for. On the Slinet's cutlist these are the columns; on a
  // bendlist every row carries the tab's own machine.
  machine: z._default(z.nullable(z.number()), null),
  // Vented pieces leave their machine's column for one of their own, on the Slinet's list only.
  vented: z._default(z.boolean(), false),
  quantity: z._default(z.number(), 0),
  complete: z._default(z.boolean(), false),
  operator_notes: z._default(z.nullable(z.string()), null),
  is_standard_length: z._default(z.boolean(), true),
  sources: z.catch(z.array(cutlistSourceSchema), [])
})

export type CutlistRow = z.infer<typeof cutlistRowSchema>

const cutlistSchema = z.object({
  id: z.number(),
  department: z._default(z.nullable(z.number()), null),
  kind: z._default(z.string(), 'cutlist'),
  machine: z._default(z.nullable(z.number()), null),
  production_date: z._default(z.nullable(z.string()), null),
  gauge: z._default(z.nullable(z.string()), null),
  color: z._default(z.nullable(z.string()), null),
  gauge_color: z._default(z.nullable(z.string()), null),
  priority: z._default(z.nullable(prioritySchema), null),
  released_at: z._default(z.nullable(z.string()), null),
  completed_at: z._default(z.nullable(z.string()), null),
  is_complete: z._default(z.boolean(), false),
  rows: z.catch(z.array(cutlistRowSchema), [])
})

export type Cutlist = z.infer<typeof cutlistSchema>

/**
 * The lists in one Production sub-tab, already sorted the way the board sorts them: production date
 * first, then priority, then gauge/colour — a list with a priority still sits below one with an
 * earlier date. `done` switches to the completed lists, which the server holds for 90 days.
 */
export const cutlistsQuery = (
  departmentId: number | undefined,
  kind: CutlistKind,
  machine: number | null,
  done: boolean
) =>
  queryOptions({
    queryKey: trimKeys.cutlistBoard(departmentId ?? 0, kind, machine, done),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      z.array(cutlistSchema).parse(
        await authApi
          .get('cutlists/', {
            searchParams: {
              department_id: departmentId!,
              kind,
              completed: done,
              ...(machine === null ? {} : { machine })
            }
          })
          .json()
      )
  })

/**
 * Marking a row complete is how the material gets its status — the Slinet's list cuts it, a machine's
 * list bends it. The server owns that; this only reports the row.
 */
export const useUpdateCutlistRow = () =>
  useMutation({
    mutationFn: ({
      rowId,
      edit
    }: {
      rowId: number
      edit: { complete?: boolean; operator_notes?: string }
    }) => authApi.patch(`cutlists/rows/${rowId}/`, { json: edit }).json(),
    // A completed row moves the line items behind it, and those move their order — so the whole
    // board, not just this list.
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.all })
  })

/**
 * Done takes the list off the Production tab and into Completed, where it stays for 90 days. The
 * server refuses it while any row is outstanding.
 */
export const useFinishCutlist = () =>
  useMutation({
    mutationFn: (cutlistId: number) => authApi.post(`cutlists/${cutlistId}/done/`).json(),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.cutlists() })
  })

const coilLotSchema = z.object({
  id: z.number(),
  lot_autoid: z._default(z.string(), ''),
  lot_number: z._default(z.nullable(z.string()), null),
  product_id: z._default(z.nullable(z.string()), null),
  coil_thickness: z._default(z.nullable(z.number()), null),
  material_thickness: z._default(z.nullable(z.number()), null),
  core_od: z._default(z.nullable(z.number()), null),
  linear_feet: z._default(z.nullable(z.number()), null),
  weight: z._default(z.nullable(z.number()), null),
  in_trim: z._default(z.boolean(), false),
  in_rollforming: z._default(z.boolean(), false),
  in_slinet: z._default(z.boolean(), false),
  note: z._default(z.nullable(z.string()), null),
  // What the server will and will not let this coil do — the checkboxes and Apply read them rather
  // than working the rules out again on this side.
  can_adjust: z._default(z.boolean(), false),
  slinet_available: z._default(z.boolean(), false),
  rollforming_available: z._default(z.boolean(), true)
})

export type CoilLot = z.infer<typeof coilLotSchema>

/**
 * What a number in the Total column is made of. The list itself carries the breakdown, but a row read
 * off the board can arrive without it, so the window asks for it outright — one call per row, because
 * a line of the Slinet's table is several rows, one per machine.
 */
export const cutlistRowSourcesQuery = (rowIds: number[]) =>
  queryOptions({
    queryKey: trimKeys.cutlistSources(rowIds),
    enabled: rowIds.length > 0,
    queryFn: async () => {
      const rows = await Promise.all(
        rowIds.map(rowId => authApi.get(`cutlists/rows/${rowId}/sources/`).json())
      )
      return rows.flatMap(row => z.array(cutlistSourceSchema).parse(row))
    }
  })

/**
 * The Cutlist Coils window: the coils checked into the Slinet whose colour matches the list in front
 * of the worker. Gauge and width deliberately do not narrow it.
 */
export const cutlistCoilsQuery = (cutlistId: number | null) =>
  queryOptions({
    queryKey: trimKeys.cutlistCoils(cutlistId ?? 0),
    enabled: cutlistId !== null,
    queryFn: async () =>
      z.array(coilLotSchema).parse(await authApi.get(`cutlists/${cutlistId}/coils/`).json())
  })

// --- Completed orders ----------------------------------------------------

const completedOrderSchema = z.object({
  order: z._default(z.string(), ''),
  order_number: z._default(z.nullable(z.string()), null),
  customer: z._default(z.nullable(z.string()), null),
  is_stock: z._default(z.boolean(), false),
  completed_at: z._default(z.nullable(z.string()), null),
  production_date: z._default(z.nullable(z.string()), null),
  ship_date: z._default(z.nullable(z.string()), null)
})

export type CompletedOrder = z.infer<typeof completedOrderSchema>

const completedPageSchema = z.object({
  count: z._default(z.number(), 0),
  window_days: z._default(z.number(), 90),
  results: z.catch(z.array(completedOrderSchema), [])
})

/** Everything this department finished inside the window the server keeps — 90 days. */
export const completedOrdersQuery = (
  departmentId: number | undefined,
  search: string | undefined
) =>
  queryOptions({
    queryKey: trimKeys.completed(departmentId ?? 0, search),
    enabled: departmentId !== undefined,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      completedPageSchema.parse(
        await authApi
          .get(`departments/${departmentId}/completed-orders/`, {
            searchParams: { limit: PAGE_SIZE, ...(search ? { search } : {}) }
          })
          .json()
      )
  })

const completedDetailSchema = z.object({
  order: z._default(z.string(), ''),
  order_number: z._default(z.nullable(z.string()), null),
  is_stock: z._default(z.boolean(), false),
  completed_at: z._default(z.nullable(z.string()), null),
  line_items: z.catch(
    z.array(
      z.object({
        origin_item: z._default(z.nullable(z.string()), null),
        product_id: z._default(z.nullable(z.string()), null),
        description: z._default(z.nullable(z.string()), null),
        qty_ordered: z._default(z.number(), 0),
        from_stock: z._default(z.number(), 0),
        packaged: z._default(z.number(), 0),
        status: z._default(z.nullable(z.string()), null)
      })
    ),
    []
  ),
  packages: z.catch(
    z.array(
      z.object({
        package_id: z.number(),
        name: z._default(z.nullable(z.string()), null),
        weight: z._default(z.nullable(z.number()), null),
        location: z._default(z.nullable(z.string()), null),
        is_loaded: z._default(z.boolean(), false),
        contents: z.catch(
          z.array(
            z.object({
              origin_item: z._default(z.nullable(z.string()), null),
              quantity: z._default(z.number(), 0)
            })
          ),
          []
        )
      })
    ),
    []
  )
})

export type CompletedDetail = z.infer<typeof completedDetailSchema>

/** One finished order: what was ordered, what came from stock, and what went into each package. */
export const completedOrderQuery = (departmentId: number | undefined, order: string | null) =>
  queryOptions({
    queryKey: trimKeys.completedOrder(departmentId ?? 0, order ?? ''),
    enabled: departmentId !== undefined && !!order,
    queryFn: async () =>
      completedDetailSchema.parse(
        await authApi.get(`departments/${departmentId}/completed-orders/${order}/`).json()
      )
  })

/**
 * The label is rebuilt from the package rather than stored, so one reprinted after the package moved
 * shows where it is now.
 */
export const useReprintPackage = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (packageId: number) => authApi.post(`packages/${packageId}/reprint/`).json(),
    onSuccess
  })

// --- Coils ---------------------------------------------------------------

/** The two lists the board keeps: the coils standing in this department, and the plant's whole stock. */
export type CoilScope = 'trim' | 'all'

// The lots list is not paginated by the server, so one page holds it.
const COIL_PAGE_SIZE = 500

export const coilLotsQuery = (scope: CoilScope) =>
  queryOptions({
    queryKey: trimKeys.coilLots(scope),
    queryFn: async () =>
      z.array(coilLotSchema).parse(
        await authApi
          .get('coils/lots/', {
            searchParams: {
              limit: COIL_PAGE_SIZE,
              ...(scope === 'trim' ? { in_trim: true } : {})
            }
          })
          .json()
      )
  })

/** Material Thickness, Core OD and the coil note — everything the floor types onto a coil. */
export const useUpdateCoilLot = () =>
  useMutation({
    mutationFn: ({
      lotId,
      edit
    }: {
      lotId: number
      edit: { material_thickness?: number; core_od?: number; note?: string }
    }) => authApi.patch(`coils/lots/${lotId}/`, { json: edit }).json(),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.coils() })
  })

/**
 * Checking a coil into Trim, Rollforming or the Slinet. The rules about what that does to the other
 * two are the server's — it answers with the coil as it now stands.
 */
export const useSetCoilLocation = () =>
  useMutation({
    mutationFn: ({
      lotId,
      location
    }: {
      lotId: number
      location: { in_trim?: boolean; in_rollforming?: boolean; in_slinet?: boolean }
    }) => authApi.post(`coils/lots/${lotId}/location/`, { json: location }).json(),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.coils() })
  })

/** Enter exactly one of the three; the other two follow from the Material Thickness and Core OD. */
export type CoilAdjustment = { coil_thickness?: number; linear_feet?: number; weight?: number }

const coilApplySchema = z.object({
  action: z._default(z.string(), 'make_adjustment'),
  lot_autoid: z._default(z.string(), ''),
  detail: z._default(z.nullable(z.string()), null),
  coil_thickness: z._default(z.nullable(z.number()), null),
  linear_feet: z._default(z.nullable(z.number()), null),
  weight: z._default(z.nullable(z.number()), null)
})

export type CoilApply = z.infer<typeof coilApplySchema>

/**
 * Apply asks one of two questions: a coil thickness of zero means the coil is used up and should be
 * depleted and deleted, anything else is an adjustment whose new Linear Feet goes back to EBMS.
 * Nothing is pushed here — that is the confirming call's job.
 */
export const useApplyCoilAdjustment = () =>
  useMutation({
    mutationFn: async ({ lotId, values }: { lotId: number; values: CoilAdjustment }) =>
      coilApplySchema.parse(
        await authApi.post(`coils/lots/${lotId}/apply/`, { json: values }).json()
      )
  })

/** Confirming an adjustment: EBMS first, and only then the coil here. */
export const useConfirmCoilAdjustment = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ lotId, values }: { lotId: number; values: CoilAdjustment }) =>
      authApi.post(`coils/lots/${lotId}/adjust/`, { json: values }).json(),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.coils() })
  })

/** Confirming Deplete & Delete: zeroed in EBMS, then gone from here. */
export const useDepleteCoil = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (lotId: number) => authApi.post(`coils/lots/${lotId}/deplete/`).json(),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.coils() })
  })

const coilFilterSchema = z.object({
  id: z.number(),
  folder_name: z._default(z.nullable(z.string()), null),
  thickness_min: z._default(z.nullable(z.number()), null),
  thickness_max: z._default(z.nullable(z.number()), null),
  width_min: z._default(z.nullable(z.number()), null),
  width_max: z._default(z.nullable(z.number()), null),
  grade_min: z._default(z.nullable(z.number()), null),
  grade_max: z._default(z.nullable(z.number()), null),
  apply_all: z._default(z.boolean(), false)
})

export type CoilFilter = z.infer<typeof coilFilterSchema>

/** Which coils EBMS is allowed to send this department — the bounds the Manager set. */
export const coilFiltersQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: trimKeys.coilFilters(departmentId ?? 0),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      z
        .array(coilFilterSchema)
        .parse(
          await authApi
            .get('coils/filters/', { searchParams: { department_id: departmentId! } })
            .json()
        )
  })

// --- Wrapping ------------------------------------------------------------

const wrappingRowSchema = z.object({
  origin_item: z._default(z.string(), ''),
  order: z._default(z.string(), ''),
  order_number: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  production_date: z._default(z.nullable(z.string()), null),
  priority: z._default(z.nullable(z.string()), null),
  status: z._default(z.nullable(z.string()), null),
  qty_ordered: z._default(z.number(), 0),
  wrapped: z._default(z.number(), 0),
  left_to_wrap: z._default(z.number(), 0),
  // Wrapping is blocked until the trim has actually been made, by whatever «made» means here.
  can_wrap: z._default(z.boolean(), false),
  auto_fill_available: z._default(z.boolean(), false),
  auto_fill_amount: z._default(z.number(), 0)
})

export type WrappingRow = z.infer<typeof wrappingRowSchema>

/** Every line item released to production, with what is left to wrap on each. */
export const wrappingRowsQuery = (departmentId: number | undefined, day: string | null) =>
  queryOptions({
    queryKey: trimKeys.wrappingRows(departmentId ?? 0, day),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      z.array(wrappingRowSchema).parse(
        await authApi
          .get('wrapping/', {
            searchParams: {
              department_id: departmentId!,
              ...(day ? { production_date: day } : {})
            }
          })
          .json()
      )
  })

const locationSlotSchema = z.object({
  location_id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  warehouse: z._default(z.nullable(z.string()), null),
  max_weight: z._default(z.nullable(z.number()), null),
  used_weight: z._default(z.number(), 0),
  orders_on_it: z._default(z.number(), 0),
  multi_order: z._default(z.boolean(), false),
  max_orders: z._default(z.nullable(z.number()), null),
  // Greyed out once full; the board still lets the Worker ask for another department's locations.
  available: z._default(z.boolean(), true),
  remaining_weight: z._default(z.nullable(z.number()), null)
})

export type LocationSlot = z.infer<typeof locationSlotSchema>

/** The list behind Select Location, opened on this department's own locations. */
export const wrappingLocationsQuery = (departmentId: number | undefined, enabled: boolean) =>
  queryOptions({
    queryKey: trimKeys.wrappingLocations(departmentId ?? 0),
    enabled: departmentId !== undefined && enabled,
    queryFn: async () =>
      z
        .array(locationSlotSchema)
        .parse(
          await authApi
            .get('wrapping/locations/', { searchParams: { department_id: departmentId! } })
            .json()
        )
  })

const orderLocationSchema = z.object({
  location_id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  max_weight: z._default(z.nullable(z.number()), null),
  packages: z._default(z.number(), 0),
  weight_on_it: z._default(z.number(), 0),
  // Only the newest location still takes packages; the earlier ones are marked, not hidden.
  orange: z._default(z.boolean(), false),
  current: z._default(z.boolean(), false)
})

export type OrderLocation = z.infer<typeof orderLocationSchema>

/** Where this order is standing. Everything but the newest is «put no more packages here». */
export const orderLocationsQuery = (order: string | null) =>
  queryOptions({
    queryKey: trimKeys.orderLocations(order ?? ''),
    enabled: !!order,
    queryFn: async () =>
      z
        .array(orderLocationSchema)
        .parse(await authApi.get(`wrapping/orders/${order}/locations/`).json())
  })

export const useRemoveOrderLocation = () =>
  useMutation({
    mutationFn: ({ order, locationId }: { order: string; locationId: number }) =>
      authApi.delete(`wrapping/orders/${order}/locations/${locationId}/`).json(),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.wrapping() })
  })

export type PackageLine = { origin_item: string; quantity: number }

/**
 * Create & Print. A location is required, a quantity above Left To Wrap is refused, and an
 * over-weight package needs the override the board puts a confirmation behind.
 */
export const useCreatePackage = (onSuccess: () => void) =>
  useMutation({
    mutationFn: (parcel: {
      order: string
      department_id: number
      location_id: number
      lines: PackageLine[]
      weight?: number
      override_weight?: boolean
    }) => authApi.post('wrapping/packages/', { json: parcel }).json(),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.all })
  })

const orderCompleteSchema = z.object({
  can_complete: z._default(z.boolean(), false),
  outstanding: z.catch(
    z.array(
      z.object({
        origin_item: z._default(z.nullable(z.string()), null),
        left: z._default(z.number(), 0)
      })
    ),
    []
  ),
  manufacturing_batch: z.catch(
    z.array(
      z.object({
        origin_item: z._default(z.nullable(z.string()), null),
        qty_ordered: z._default(z.number(), 0),
        from_stock: z._default(z.number(), 0),
        manufactured: z._default(z.number(), 0)
      })
    ),
    []
  )
})

/** Whether Order Complete is available yet, what is outstanding, and the batch EBMS would be sent. */
export const orderCompleteQuery = (departmentId: number | undefined, order: string | null) =>
  queryOptions({
    queryKey: trimKeys.orderComplete(departmentId ?? 0, order ?? ''),
    enabled: departmentId !== undefined && !!order,
    queryFn: async () =>
      orderCompleteSchema.parse(
        await authApi
          .get(`wrapping/orders/${order}/complete/`, {
            searchParams: { department_id: departmentId! }
          })
          .json()
      )
  })

/**
 * Order Complete. The manufacturing batch — ordered minus what came from stock — goes to EBMS first,
 * and the order is only marked complete if that goes through.
 */
export const useCompleteOrder = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ order, departmentId }: { order: string; departmentId: number }) =>
      authApi
        .post(`wrapping/orders/${order}/complete/`, {
          searchParams: { department_id: departmentId }
        })
        .json(),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.all })
  })
