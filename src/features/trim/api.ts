import { authApi } from '@/api/client'
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  type QueryClient
} from '@tanstack/react-query'
import { HTTPError } from 'ky'
import * as z from 'zod/mini'
import { departmentCoilFilter, filterFor, passesCoilFilter } from './lib/coils'

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
  code: z._default(z.string(), ''),
  position: z._default(z.nullable(z.number()), null)
})

export type Department = z.infer<typeof departmentSchema>

export const departmentsQuery = queryOptions({
  queryKey: ['departments', 'all'] as const,
  queryFn: async () => z.array(departmentSchema).parse(await authApi.get('departments/all/').json())
})

/** The department row the whole page is scoped to. Every query below waits on its id. */
/** The user's role inside one department — `manager`, `worker`, or `null` for no assignment. */
export const departmentRoleQuery = (userId: number | undefined, departmentId: number | undefined) =>
  queryOptions({
    // Outside `trimKeys.all`: an assignment changes in Settings, not with every click on the board.
    queryKey: ['departments', 'role', userId ?? 0, departmentId ?? 0] as const,
    enabled: userId !== undefined && departmentId !== undefined,
    queryFn: async () =>
      z
        .array(z.object({ user: z.number(), department: z.number(), role: z.string() }))
        .parse(
          await authApi
            .get('departments/users/assignments/', {
              searchParams: { user_id: userId!, department_id: departmentId! }
            })
            .json()
        )
        // The filter is the server's, but a role handed to the wrong person is not worth trusting it.
        .find(row => row.user === userId && row.department === departmentId)?.role ?? null
  })

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
  // The list's own `production_date` is the order's earliest day, not the line's, so it is not read.
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

/**
 * The tab lists hand an order over with only the lines that match the tab, so an order scheduled in
 * part arrives on each tab with fewer lines than `count_items`. The count alone is not enough — some
 * orders count a line the list never sends (W20109: 5 against 4) — so only an order that has been put
 * on a day at all is read as narrowed. One with no lines at all is a stock order whose lines the list
 * does not send yet.
 */
export const isNarrowed = (order: TrimOrder) =>
  order.origin_items.length > 0 &&
  order.origin_items.length < (order.count_items ?? 0) &&
  !!order.sales_order?.department_states.some(state => state.production_date)

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
  scheduled: (search: string | undefined) =>
    [...trimKeys.orders(), 'scheduled', { search: search ?? '' }] as const,
  calendar: (from: string, to: string) => [...trimKeys.orders(), 'calendar', { from, to }] as const,
  machines: () => [...trimKeys.all, 'machines'] as const,
  overdue: (departmentId: number) => [...trimKeys.all, 'overdue', departmentId] as const,
  machineCapacities: (departmentId: number, day: string) =>
    [...trimKeys.all, 'machine-capacities', departmentId, day] as const,
  allocatedStock: (departmentId: number, search: string | undefined) =>
    [...trimKeys.all, 'allocated-stock', departmentId, { search: search ?? '' }] as const,
  dayStrip: (departmentId: number, start: string, days: number) =>
    [...trimKeys.all, 'day-strip', departmentId, start, days] as const,
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
  completedOrders: () => [...trimKeys.all, 'completed'] as const,
  completed: (departmentId: number) => [...trimKeys.completedOrders(), departmentId] as const,
  completedOrder: (departmentId: number, order: string) =>
    [...trimKeys.completedOrders(), departmentId, order] as const,
  coils: () => [...trimKeys.all, 'coils'] as const,
  coilLots: () => [...trimKeys.coils(), 'lots'] as const,
  coilFilters: (departmentId: number) => [...trimKeys.coils(), 'filters', departmentId] as const,
  wrapping: () => [...trimKeys.all, 'wrapping'] as const,
  wrappingRows: (departmentId: number, day: string | null) =>
    [...trimKeys.wrapping(), departmentId, day ?? 'all'] as const,
  wrappingLocations: (departmentId: number) =>
    [...trimKeys.wrapping(), 'locations', departmentId] as const,
  stockOrderRows: (departmentId: number, order: string) =>
    [...trimKeys.wrapping(), 'stock-order', departmentId, order] as const,
  manufacturingBatches: (departmentId: number) =>
    [...trimKeys.all, 'manufacturing-batches', departmentId] as const,
  orderPackages: (order: string) => [...trimKeys.wrapping(), 'packages', order] as const,
  orderLocations: (order: string) => [...trimKeys.wrapping(), 'order-locations', order] as const,
  orderComplete: (departmentId: number, order: string) =>
    [...trimKeys.wrapping(), 'complete', departmentId, order] as const,
  remanufacturings: () => [...trimKeys.all, 'remanufacturings'] as const
}

type OrderFilters = Record<string, string | number | boolean>

const orderPage = async (filters: OrderFilters, offset: number, limit: number) =>
  orderPageSchema.parse(
    await authApi
      .get('ebms/orders/', {
        searchParams: { category: TRIM_CATEGORY, ...filters, limit, offset }
      })
      .json()
  )

/**
 * Every page of a paged list: the first says how many there are, so the rest are asked for at once.
 * Returned as pages, so the caller keeps whatever else the first one carries.
 */
const allPages = async <Page extends { count: number }>(
  pageAt: (offset: number) => Promise<Page>
) => {
  const first = await pageAt(0)
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, Math.ceil(first.count / PAGE_SIZE) - 1) }, (_, index) =>
      pageAt((index + 1) * PAGE_SIZE)
    )
  )
  return [first, ...rest] as const
}

/**
 * Every order the filters match. Stock orders ride along on every page, whatever the filters, which
 * is why the orders are deduplicated.
 */
const allOrders = async (filters: OrderFilters) => {
  const pages = await allPages(offset => orderPage(filters, offset, PAGE_SIZE))
  const orders = new Map(pages.flatMap(page => page.results).map(order => [order.id, order]))
  return { count: pages[0].count, results: [...orders.values()] }
}

/** How many orders a tab holds, for the tab strip — one row asked for, the server's total read. */
export const orderCountQuery = (scheduled: boolean) =>
  queryOptions({
    queryKey: [...trimKeys.orders(), 'count', scheduled] as const,
    queryFn: async () => (await orderPage({ is_scheduled: scheduled }, 0, 1)).count
  })

export const unscheduledOrdersQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: trimKeys.unscheduled(search),
    // Each search term is its own cache entry; without this the table falls back to the skeleton on
    // every keystroke pause and resizes itself twice per search.
    placeholderData: keepPreviousData,
    queryFn: () => allOrders({ is_scheduled: false, ...(search ? { search } : {}) })
  })

/**
 * Every Trim line of one order. The tab lists narrow an order's lines to the ones matching the tab —
 * Unscheduled drops the scheduled ones, Scheduled the waiting ones — but an expanded order shows
 * them all, the rest greyed out (p1 (330,354), (316,381)). `order=` is not honoured by the list, so
 * the invoice is searched and the order picked out by id.
 */
export const wholeOrderQuery = (order: TrimOrder) =>
  queryOptions({
    queryKey: [...trimKeys.orders(), 'whole', order.id] as const,
    // An order the list handed over whole needs nothing more.
    enabled: isNarrowed(order),
    placeholderData: order,
    queryFn: async () =>
      (await orderPage({ search: order.invoice || order.id }, 0, PAGE_SIZE)).results.find(
        found => found.id === order.id
      ) ?? order
  })

/**
 * The Scheduled tab: orders whose Trim line items carry a production date, released or not.
 *
 * Every day at once — the tab picks a day's parts out itself. The server's `production_date=` matches
 * an order's earliest day only, so it would drop a split order from the tab of its later day.
 */
export const scheduledOrdersQuery = (search: string | undefined) =>
  queryOptions({
    queryKey: trimKeys.scheduled(search),
    placeholderData: keepPreviousData,
    queryFn: () => allOrders({ is_scheduled: true, ...(search ? { search } : {}) })
  })

/**
 * The orders with a Trim line on a production day in `[from, to]`. The range narrows the line items
 * as well, so a split order carries only its days inside it.
 */
export const calendarOrdersQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: trimKeys.calendar(from, to),
    queryFn: async () =>
      (
        await allOrders({
          is_scheduled: true,
          production_date__gte: from,
          production_date__lte: to
        })
      ).results
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

/**
 * A day holds as many bends as the department's machines can make: the sum of their daily max, as
 * the design has it. The `capacity` the day endpoints return hangs off the EBMS category instead,
 * and nothing on screen sets it, so it is replaced. A machine with no max adds nothing; a department
 * where none has one has no ceiling at all.
 */
const dailyCapacity = async (client: QueryClient, departmentId: number | undefined) => {
  const machines = (await client.ensureQueryData(machinesQuery(departmentId))).filter(
    machine => machine.department === null || machine.department === departmentId
  )
  const rated = machines.filter(machine => machine.daily_max_bends !== null)
  return rated.length ? rated.reduce((sum, machine) => sum + machine.daily_max_bends!, 0) : null
}

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
    queryFn: async ({ client }) => {
      const [breakdown, capacity] = await Promise.all([
        authApi
          .get(`departments/${departmentId}/machine-capacities/`, { searchParams: { day: day! } })
          .json(),
        dailyCapacity(client, departmentId)
      ])
      const parsed = machineCapacitySchema.parse(breakdown)
      return { ...parsed, total: { ...parsed.total, capacity } }
    }
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
    queryFn: async ({ client }) => {
      const [strip, capacity] = await Promise.all([
        authApi
          .get(`departments/${departmentId}/day-strip/`, { searchParams: { start, days } })
          .json(),
        dailyCapacity(client, departmentId)
      ])
      return dayStripSchema.parse(strip).map(entry => ({
        ...entry,
        capacity,
        over_capacity: capacity !== null && entry.bends > capacity
      }))
    }
  })

// --- Priorities ----------------------------------------------------------

/**
 * The department's priorities plus the ones with no department, which fit anywhere — the server
 * answers `?department=` with exactly that set.
 */
export const prioritiesQuery = (departmentId: number | undefined) =>
  queryOptions({
    // Under the Priorities page's own `['priorities']` root, so an edit or a drag there reaches the
    // board too.
    queryKey: ['priorities', 'department', departmentId ?? 0] as const,
    enabled: departmentId !== undefined,
    queryFn: async () =>
      z
        .array(prioritySchema)
        .parse(
          await authApi
            .get('priorities/', { searchParams: { department: departmentId ?? 0 } })
            .json()
        ),
    // The board's Hierarchy is ascending: the priority numbered 1 sits on top.
    select: (priorities: Priority[]) =>
      priorities.toSorted(
        (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
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
  // A negative id is the stand-in an optimistic update drew, not a row the server has.
  if (order.sales_order && order.sales_order.id > 0) return order.sales_order.id
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
/**
 * Every cached copy of one order under the order lists — a tab's page, a whole order — rewritten by
 * `edit`.
 */
const patchCachedOrder = (
  client: QueryClient,
  orderId: string,
  edit: (order: TrimOrder) => TrimOrder
) => {
  const patch = (order: TrimOrder) => (order.id === orderId ? edit(order) : order)
  client.setQueriesData({ queryKey: trimKeys.orders() }, (data: unknown) => {
    if (!data || typeof data !== 'object') return data
    if ('results' in data && Array.isArray(data.results))
      return { ...data, results: (data.results as TrimOrder[]).map(patch) }
    if ('origin_items' in data) return patch(data as TrimOrder)
    return data
  })
}

/** The newest cached copy of an order that has a real sales order, or the one given. */
const freshOrder = (client: QueryClient, order: TrimOrder) =>
  client
    .getQueriesData({ queryKey: trimKeys.orders() })
    .flatMap(([, data]): TrimOrder[] =>
      data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)
        ? (data.results as TrimOrder[])
        : data && typeof data === 'object' && 'origin_items' in data
          ? [data as TrimOrder]
          : []
    )
    .find(cached => cached.id === order.id && (cached.sales_order?.id ?? 0) > 0) ?? order

/**
 * The order with `priority` on its row for the department, the row made up if it has none yet. A
 * made-up sales order carries id -1, which `ensureSalesOrderId` reads as none.
 */
const withPriority = (order: TrimOrder, departmentId: number, priority: Priority | null) => {
  const states = order.sales_order?.department_states ?? []
  const has = states.some(state => state.department === departmentId)
  const blank: DepartmentState = {
    id: -1,
    department: departmentId,
    reviewed: false,
    release_to_production: false,
    priority: null,
    production_date: null,
    status: null,
    over_due: false
  }
  return {
    ...order,
    sales_order: {
      id: order.sales_order?.id ?? -1,
      order: order.sales_order?.order ?? order.id,
      is_stock: order.sales_order?.is_stock ?? false,
      department_states: (has ? states : [...states, blank]).map(state =>
        state.department === departmentId ? { ...state, priority } : state
      )
    }
  }
}

/**
 * A priority shows the moment it is picked; the save follows in the background and the pick snaps
 * back if it is refused. `scope` queues one order's picks, so two quick ones reach the server in the
 * order they were made.
 */
export const useSetPriority = (orderId: string) =>
  useMutation({
    meta: { errorTitle: 'The priority was not saved' },
    scope: { id: `priority:${orderId}` },
    mutationFn: async (
      {
        order,
        departmentId,
        priority
      }: {
        order: TrimOrder
        departmentId: number
        priority: Priority | null
      },
      { client }
    ) => {
      // The order as it stands now, not as it was clicked: a pick queued behind the one that created
      // the sales order must use that order, not the stand-in the first pick drew.
      const id = await ensureSalesOrderId(freshOrder(client, order))
      return authApi
        .patch(`sales-orders/${id}/departments/${departmentId}/`, {
          json: { priority: priority?.id ?? null }
        })
        .json()
    },
    onMutate: async ({ order, departmentId, priority }, { client }) => {
      await client.cancelQueries({ queryKey: trimKeys.orders() })
      patchCachedOrder(client, order.id, cached => withPriority(cached, departmentId, priority))
    },
    // Only this order goes back: a snapshot of every list would also undo another order's pick that
    // is still on its way.
    onError: (_, { order, departmentId }, __, { client }) =>
      patchCachedOrder(client, order.id, cached =>
        withPriority(cached, departmentId, departmentStateOf(order, departmentId)?.priority ?? null)
      ),
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
export const useReleaseOrders = (onSuccess: (released: number, cutlists: number) => void) =>
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
    onSuccess: result => onSuccess(result.released.length, result.cutlists.length)
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

type StockCardValues = { stock_minimum: number; order_qty: number; image_id: number }

/**
 * The card's picture is uploaded first — the card needs its `image_id` — and claimed by the card when
 * it is created. The response's `full_path` is the only place the picture can be shown from.
 */
export const useUploadStockCardImage = () =>
  useMutation({
    meta: { errorTitle: 'The image was not uploaded' },
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      return z
        .object({ id: z.number(), full_path: z._default(z.nullable(z.string()), null) })
        .parse(
          await authApi
            .post('files/models/', { searchParams: { model_name: 'StockCard' }, body })
            .json()
        )
    }
  })

/**
 * Create adds the card; the description is filled from EBMS by the server, which also refuses a
 * product ID EBMS does not know. Edit changes everything but the product.
 */
export const useSaveStockCard = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'The stock card was not saved' },
    mutationFn: ({
      id,
      productId,
      values
    }: {
      id?: number
      productId: string
      values: StockCardValues
    }) =>
      id
        ? authApi.patch(`stock-cards/${id}/`, { json: values }).json()
        : authApi.post('stock-cards/', { json: { product_id: productId, ...values } }).json(),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.stockCards() })
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

/**
 * One row of the Create Stock Order grid, once the blanks have been dropped. A line left without a
 * description or length takes the product's own from EBMS.
 */
export type StockOrderLine = {
  product_id: string
  quantity: number
  description?: string
  length?: number
}

/**
 * Create Stock Order: the rows the Manager filled in become an order of our own, which then goes
 * through Unscheduled and everything after it exactly like a customer's order from EBMS. Blank rows
 * are dropped rather than rejected — the modal always offers more than anyone fills.
 */
export const useCreateStockOrder = (onSuccess: (order: string) => void) =>
  useMutation({
    meta: { errorTitle: 'The stock order was not created' },
    // The answer names the new order — the «S» number the floor will look for.
    mutationFn: async (lines: StockOrderLine[]) =>
      z
        .object({ order: z.string() })
        .parse(await authApi.post('stock-orders/', { json: { lines } }).json()),
    onSuccess: async (created, _, __, { client }) => {
      await client.invalidateQueries({ queryKey: trimKeys.all })
      onSuccess(created.order)
    }
  })

/** Scanning a Stock Card's QR fills the Order Qty and Product ID into a row of the grid. */
export const useScanStockCard = () =>
  useMutation({
    // Its caller tells the floor to type the line instead; the server's reason is of no use to them.
    meta: { skipErrorToast: true },
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

// One line item's share of a row — what a number in the Total column opens up. `quantity` is that
// share; the rest describes the line itself.
const cutlistSourceSchema = z.object({
  order: z._default(z.nullable(z.string()), null),
  origin_item: z._default(z.nullable(z.string()), null),
  quantity: z._default(z.number(), 0),
  // `null` once the line item is deleted; the breakdown outlives it.
  item_id: z._default(z.nullable(z.number()), null),
  product_id: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  qty_ordered: z._default(z.nullable(z.number()), null),
  pull_from_stock: z._default(z.nullable(z.number()), null),
  status: z._default(z.nullable(z.string()), null),
  is_stock: z._default(z.boolean(), false)
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
  is_remanufacture: z._default(z.boolean(), false),
  remanufacturing_id: z._default(z.nullable(z.number()), null),
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
    // A finished remake list moves its remanufacture on (Cut, then Bent), which the badges read.
    onSettled: (_, __, ___, ____, { client }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: trimKeys.cutlists() }),
        client.invalidateQueries({ queryKey: trimKeys.remanufacturings() })
      ])
  })

// EBMS pads its folder ids to the column width, so they are trimmed once here rather than at every
// comparison; a blank one means none.
const folderId = z._default(
  z.pipe(
    z.nullable(z.string()),
    z.transform(id => id?.trim() || null)
  ),
  null
)

const coilLotSchema = z.object({
  id: z.number(),
  lot_autoid: z._default(z.string(), ''),
  lot_number: z._default(z.nullable(z.string()), null),
  product_id: z._default(z.nullable(z.string()), null),
  // Read live from the EBMS coil product behind the lot.
  color: z._default(z.nullable(z.string()), null),
  gauge: z._default(z.nullable(z.number()), null),
  width: z._default(z.nullable(z.number()), null),
  // The EBMS product-tree folder, the same id the folder tabs are named by.
  folder_id: folderId,
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
  ship_date: z._default(z.nullable(z.string()), null),
  // The codes the order's packages stand on, oldest first.
  trim_location: z.catch(z.array(z.string()), [])
})

export type CompletedOrder = z.infer<typeof completedOrderSchema>

const completedPageSchema = z.object({
  count: z._default(z.number(), 0),
  window_days: z._default(z.number(), 90),
  results: z.catch(z.array(completedOrderSchema), [])
})

/**
 * Everything this department finished inside the window the server keeps — 90 days — however many
 * pages that takes (p1 (912,545)): the first says how many there are, so the rest are asked at once.
 */
export const completedOrdersQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: trimKeys.completed(departmentId ?? 0),
    enabled: departmentId !== undefined,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const pages = await allPages(async offset =>
        completedPageSchema.parse(
          await authApi
            .get(`departments/${departmentId}/completed-orders/`, {
              searchParams: { limit: PAGE_SIZE, offset }
            })
            .json()
        )
      )
      return { ...pages[0], results: pages.flatMap(page => page.results) }
    }
  })

/** A package as the server describes it, at the bench and once the order is complete alike. */
const packageSchema = z.object({
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

export type Package = z.infer<typeof packageSchema>

const completedDetailSchema = z.object({
  order: z._default(z.string(), ''),
  order_number: z._default(z.nullable(z.string()), null),
  is_stock: z._default(z.boolean(), false),
  // The footer. A stock order has no EBMS order behind it, so all but `customer` are null there.
  customer: z._default(z.nullable(z.string()), null),
  po: z._default(z.nullable(z.string()), null),
  salesman: z._default(z.nullable(z.string()), null),
  ship_via: z._default(z.nullable(z.string()), null),
  ship_date: z._default(z.nullable(z.string()), null),
  production_date: z._default(z.nullable(z.string()), null),
  priority: z._default(z.nullable(z.string()), null),
  trim_location: z.catch(z.array(z.string()), []),
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
  packages: z.catch(z.array(packageSchema), [])
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
export const useReprintPackage = (onSuccess?: () => void) =>
  useMutation({
    meta: { errorTitle: 'The label was not printed' },
    mutationFn: (packageId: number) => authApi.post(`packages/${packageId}/reprint/`).json(),
    onSuccess
  })

// --- Coils ---------------------------------------------------------------

// The lots list is not paginated by the server, so one page holds it.
const COIL_PAGE_SIZE = 500

/** Every coil in the company. Trim Coils are narrowed from it by the department's Coil Filter. */
export const coilLotsQuery = queryOptions({
  queryKey: trimKeys.coilLots(),
  queryFn: async () =>
    z
      .array(coilLotSchema)
      .parse(await authApi.get('coils/lots/', { searchParams: { limit: COIL_PAGE_SIZE } }).json())
})

/** The Cutlist Coils window reads its coils through the cutlist, so both lists hear of a change. */
const invalidateCoils = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: trimKeys.coils() }),
    client.invalidateQueries({ queryKey: trimKeys.cutlists() })
  ])

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
    onSettled: (_, __, ___, ____, { client }) => invalidateCoils(client)
  })

/**
 * Checking a coil into Trim, Rollforming or the Slinet. The rules about what that does to the other
 * two are the server's — it answers with the coil as it now stands.
 */
export const useSetCoilLocation = () =>
  useMutation({
    meta: { errorTitle: 'The coil stayed where it was' },
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
export const useConfirmCoilAdjustment = (onSuccess?: () => void) =>
  useMutation({
    mutationFn: ({ lotId, values }: { lotId: number; values: CoilAdjustment }) =>
      authApi.post(`coils/lots/${lotId}/adjust/`, { json: values }).json(),
    onSuccess,
    // Its callers word the failure differently — one coil, or a batch of them under one toast.
    meta: { skipErrorToast: true },
    onSettled: (_, __, ___, ____, { client }) => invalidateCoils(client)
  })

/** Confirming Deplete & Delete: zeroed in EBMS, then gone from here. */
export const useDepleteCoil = (onSuccess?: () => void) =>
  useMutation({
    mutationFn: (lotId: number) => authApi.post(`coils/lots/${lotId}/deplete/`).json(),
    onSuccess,
    meta: { skipErrorToast: true },
    onSettled: (_, __, ___, ____, { client }) => invalidateCoils(client)
  })

const coilFilterSchema = z.object({
  id: z.number(),
  // Blank for the department-wide filter, of which a department holds one.
  folder_autoid: folderId,
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

export type CoilFilterForm = {
  thickness_min: number | null
  thickness_max: number | null
  width_min: number | null
  width_max: number | null
  grade_min: number | null
  grade_max: number | null
  apply_all: boolean
}

/**
 * The department-wide Coil Filter, as the window writes it: the first Apply creates it, later ones
 * change it — a department holds one, and a second is refused. A bound sent as null is unbounded.
 */
export const useSaveCoilFilter = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'The coil filter was not saved' },
    mutationFn: ({
      departmentId,
      filterId,
      values
    }: {
      departmentId: number
      filterId?: number
      values: CoilFilterForm
    }) =>
      filterId
        ? authApi.patch(`coils/filters/${filterId}/`, { json: values }).json()
        : authApi.post('coils/filters/', { json: { department: departmentId, ...values } }).json(),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.coils() })
  })

/** Removing the filter lets every coil through to the department again. */
export const useDeleteCoilFilter = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'The coil filter stayed' },
    mutationFn: (filterId: number) => authApi.delete(`coils/filters/${filterId}/`),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.coils() })
  })

/** The folder tabs: only folders holding a coil that passes the department's filter. */
export const coilFoldersQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: [...trimKeys.coils(), 'folders', departmentId ?? 0] as const,
    enabled: departmentId !== undefined,
    queryFn: async () =>
      z
        .array(
          z.object({
            folder_id: z.pipe(
              z.string(),
              z.transform(id => id.trim())
            ),
            name: z._default(z.string(), ''),
            coils: z._default(z.number(), 0)
          })
        )
        .parse(
          await authApi
            .get('coils/folders/', { searchParams: { department_id: departmentId! } })
            .json()
        )
  })

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

/**
 * Every coil in the company, and the ones inside the department's Coil Filter — what the Coils tab
 * lists and what its count on the strip says. The lots endpoint cannot apply a department's filter
 * itself, so both are read and the narrowing happens here.
 */
export const useTrimCoils = (departmentId: number | undefined) => {
  const { data: lots, isPending } = useQuery(coilLotsQuery)
  const { data: filters, isLoading: filterLoading } = useQuery(coilFiltersQuery(departmentId))
  const filter = departmentCoilFilter(filters)

  return {
    lots,
    trimLots: lots?.filter(lot => passesCoilFilter(lot, filterFor(lot, filters))),
    filter,
    isPending,
    filterLoading
  }
}

// --- Wrapping ------------------------------------------------------------

const wrappingRowSchema = z.object({
  origin_item: z._default(z.string(), ''),
  order: z._default(z.string(), ''),
  order_number: z._default(z.nullable(z.string()), null),
  product_id: z._default(z.nullable(z.string()), null),
  // «Stock» for a stock order.
  customer: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  production_date: z._default(z.nullable(z.string()), null),
  priority: z._default(z.nullable(z.string()), null),
  status: z._default(z.nullable(z.string()), null),
  qty_ordered: z._default(z.number(), 0),
  // How much of the line comes off the shelf.
  from_stock: z._default(z.number(), 0),
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

/**
 * The warehouse Select Location opens on, by the name a location slot carries. Keyed under the
 * warehouses root, so marking another default in Settings reaches the bench.
 */
export const defaultWarehouseQuery = queryOptions({
  queryKey: ['warehouses', 'default'] as const,
  queryFn: async () =>
    z
      .object({
        results: z.array(
          z.object({
            name: z._default(z.nullable(z.string()), null),
            is_default: z._default(z.boolean(), false)
          })
        )
      })
      .parse(await authApi.get('warehouses/', { searchParams: { limit: 200 } }).json())
      .results.find(warehouse => warehouse.is_default)?.name ?? null
})

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

/**
 * Select Location: moves the order's packages onto a location — all of them, or the ones given, which
 * is how a second location is added. Works on a completed order too; weight is not checked here.
 */
export const useMoveOrderPackages = () =>
  useMutation({
    meta: { errorTitle: 'The packages stayed where they were' },
    mutationFn: ({
      order,
      locationId,
      packageIds
    }: {
      order: string
      locationId: number
      packageIds?: number[]
    }) =>
      authApi
        .post(`wrapping/orders/${order}/locations/`, {
          json: {
            location_id: locationId,
            ...(packageIds?.length ? { package_ids: packageIds } : {})
          }
        })
        .json(),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.all })
  })

export const useRemoveOrderLocation = () =>
  useMutation({
    meta: { errorTitle: 'The location stayed' },
    mutationFn: ({ order, locationId }: { order: string; locationId: number }) =>
      authApi.delete(`wrapping/orders/${order}/locations/${locationId}/`).json(),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.wrapping() })
  })

/** The packages made for an order still at the bench — See Packages. */
export const orderPackagesQuery = (order: string | null, enabled: boolean) =>
  queryOptions({
    queryKey: trimKeys.orderPackages(order ?? ''),
    enabled: enabled && !!order,
    queryFn: async () =>
      z.array(packageSchema).parse(await authApi.get(`wrapping/orders/${order}/packages/`).json())
  })

// --- Stock window (a stock order at the bench) ---------------------------

const stockOrderRowSchema = z.object({
  origin_item: z.string(),
  product_id: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  length: z._default(z.nullable(z.number()), null),
  qty_ordered: z._default(z.number(), 0),
  // Both blank once the row has its batch.
  left_to_wrap: z._default(z.nullable(z.number()), null),
  wrapped: z._default(z.nullable(z.number()), null),
  qty_manufactured: z._default(z.nullable(z.number()), null),
  manufactured: z._default(z.boolean(), false),
  status: z._default(z.nullable(z.string()), null),
  can_wrap: z._default(z.boolean(), false),
  can_select: z._default(z.boolean(), false)
})

export type StockOrderRow = z.infer<typeof stockOrderRowSchema>

/** A stock order is not packed: the floor enters what it wrapped and sends a batch per row. */
export const stockOrderRowsQuery = (departmentId: number | undefined, order: string | null) =>
  queryOptions({
    queryKey: trimKeys.stockOrderRows(departmentId ?? 0, order ?? ''),
    enabled: departmentId !== undefined && !!order,
    queryFn: async () =>
      z.array(stockOrderRowSchema).parse(
        await authApi
          .get(`wrapping/stock-orders/${order}/`, {
            searchParams: { department_id: departmentId! }
          })
          .json()
      )
  })

/** The Wrapped keypad. The server takes the row's new total; the +/- arithmetic happens here. */
export const useSetStockWrapped = () =>
  useMutation({
    meta: { errorTitle: 'Wrapped was not changed' },
    mutationFn: ({
      departmentId,
      order,
      originItem,
      wrapped
    }: {
      departmentId: number
      order: string
      originItem: string
      wrapped: number
    }) =>
      authApi
        .patch(`wrapping/stock-orders/${order}/lines/${originItem}/`, {
          json: { department: departmentId, wrapped }
        })
        .json(),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.wrapping() })
  })

/**
 * Create Manufacturing Batch for the checked rows, each at its Wrapped figure. EBMS may refuse the
 * batch (502), and then nothing changes.
 */
export const useCreateStockBatch = (onSuccess: (completed: boolean) => void) =>
  useMutation({
    meta: { errorTitle: 'EBMS refused the batch' },
    mutationFn: async ({
      departmentId,
      order,
      originItems
    }: {
      departmentId: number
      order: string
      originItems: string[]
    }) =>
      z.object({ completed: z._default(z.boolean(), false) }).parse(
        await authApi
          .post(`wrapping/stock-orders/${order}/manufacturing-batch/`, {
            json: { department: departmentId, origin_items: originItems }
          })
          .json()
      ),
    onSuccess: result => onSuccess(result.completed),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.all })
  })

// --- Stock Manufacturing (pieces made against no order) --------------------

const manufacturingBatchSchema = z.object({
  id: z.number(),
  // The stock order it came from; empty for Stock Manufacturing.
  order: z._default(z.nullable(z.string()), null),
  ebms_batch: z._default(z.nullable(z.string()), null),
  created_at: z._default(z.nullable(z.string()), null),
  lines: z.catch(
    z.array(
      z.object({
        product_id: z._default(z.string(), ''),
        description: z._default(z.nullable(z.string()), null),
        quantity: z._default(z.number(), 0)
      })
    ),
    []
  )
})

export type ManufacturingBatch = z.infer<typeof manufacturingBatchSchema>

/** What has gone to EBMS as manufacturing batches, newest first. */
export const manufacturingBatchesQuery = (departmentId: number | undefined, enabled: boolean) =>
  queryOptions({
    queryKey: trimKeys.manufacturingBatches(departmentId ?? 0),
    enabled: enabled && departmentId !== undefined,
    queryFn: async () =>
      z.array(manufacturingBatchSchema).parse(
        await authApi
          .get(`departments/${departmentId}/manufacturing-batches/`, {
            searchParams: { days: 90 }
          })
          .json()
      )
  })

/** Create Manufacturing Batch in the Stock Manufacturing window. EBMS may refuse it (502). */
export const useCreateStockManufacturing = (onSuccess: (batch: ManufacturingBatch) => void) =>
  useMutation({
    meta: { errorTitle: 'EBMS refused the batch' },
    mutationFn: async ({
      departmentId,
      lines
    }: {
      departmentId: number
      lines: { quantity: number; product_id: string }[]
    }) =>
      manufacturingBatchSchema.parse(
        await authApi
          .post(`departments/${departmentId}/stock-manufacturing/`, { json: { lines } })
          .json()
      ),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.all })
  })

/** A package packed wrong comes apart: its pieces go back to Left To Wrap. */
export const useDeletePackage = () =>
  useMutation({
    meta: { errorTitle: 'The package stayed' },
    mutationFn: (packageId: number) => authApi.delete(`wrapping/packages/${packageId}/`),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.all })
  })

export type PackageLine = { origin_item: string; quantity: number }

/**
 * Create & Print. A location is required, a quantity above Left To Wrap is refused, and an
 * over-weight package needs the override the board puts a confirmation behind.
 */
export const useCreatePackage = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'Nothing was packed' },
    mutationFn: async (parcel: {
      order: string
      department_id: number
      location_id: number
      lines: PackageLine[]
      weight?: number
      override_weight?: boolean
    }) =>
      // The name is the barcode printed on the label, which is what the floor is told back.
      z
        .object({ name: z._default(z.nullable(z.string()), null) })
        .parse(await authApi.post('wrapping/packages/', { json: parcel }).json()),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.all })
  })

const orderCompleteSchema = z.object({
  can_complete: z._default(z.boolean(), false),
  // A stock order is finished through its own Stock window, never through Order Complete.
  is_stock: z._default(z.boolean(), false),
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
    // A refused batch answers 502 with EBMS's own reason, which goes under this title.
    meta: { errorTitle: 'The order was not completed' },
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

// --- Remanufacturing -----------------------------------------------------

const remanufacturingSchema = z.object({
  id: z.number(),
  order: z._default(z.string(), ''),
  origin_item: z._default(z.string(), ''),
  department: z._default(z.nullable(z.number()), null),
  source: z._default(z.nullable(z.string()), null),
  remanufacturing_qty: z._default(z.nullable(z.number()), null),
  pull_from_stock_qty: z._default(z.nullable(z.number()), null),
  note: z._default(z.nullable(z.string()), null),
  // The badge is orange until the material moves: cut by the Slinet, bent by the machine.
  is_cut: z._default(z.boolean(), false),
  is_bent: z._default(z.boolean(), false)
})

export type Remanufacturing = z.infer<typeof remanufacturingSchema>

// One page holds them: a remanufacture is an exception, not a queue.
const REMAN_PAGE_SIZE = 200

/**
 * Every outstanding remake, keyed by the line item it came from. `GET /remanufacturings/` takes no
 * filter, so the page is narrowed here.
 */
export const remanufacturingsQuery = queryOptions({
  queryKey: trimKeys.remanufacturings(),
  queryFn: async () =>
    z
      .object({ count: z.number(), results: z.array(remanufacturingSchema) })
      .parse(
        await authApi.get('remanufacturings/', { searchParams: { limit: REMAN_PAGE_SIZE } }).json()
      ),
  select: (page: { results: Remanufacturing[] }) => {
    const byItem = new Map<string, Remanufacturing[]>()
    for (const reman of page.results)
      byItem.set(reman.origin_item, [...(byItem.get(reman.origin_item) ?? []), reman])
    return byItem
  }
})

/** Where a remake was asked for: a machine that spoiled the bend, or the bench that found it. */
export type RemanufactureSource = 'wrapping' | 'machine'

/**
 * Ask for part of a line item to be remade. The request spins off its own cutlist and bendlist,
 * inheriting the original's production date, gauge/colour, priority and machine, and carrying only
 * the remanufacture quantity.
 */
export const useRequestRemanufacture = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'Nothing was requested' },
    mutationFn: (request: {
      source: RemanufactureSource
      order: string
      origin_item: string
      department: number
      quantity: number
      pull_from_stock_qty?: number
      note?: string
    }) => authApi.post('remanufacturings/request/', { json: request }).json(),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: trimKeys.all })
  })
