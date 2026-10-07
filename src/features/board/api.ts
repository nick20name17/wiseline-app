import { authApi } from '@/api/client'
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  type QueryClient
} from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { departmentByCode } from '@/lib/departments'
import * as z from 'zod/mini'

/**
 * A board reads two stores through one API. `ebms/orders/` is a mirror of the EBMS sales orders, keyed by
 * a string autoid; everything this app decides about an order — its production date, priority, whether
 * it has been released — hangs off a `SalesOrder` row of our own, keyed by an integer id and scoped to
 * one department. An EBMS order that nobody has touched yet has no `sales_order` at all, which is why
 * every write below starts by making sure one exists.
 */

const departmentSchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  code: z._default(z.string(), ''),
  position: z._default(z.nullable(z.number()), null),
  // lb; `null` is no ceiling. A package over it asks for an override p1 (940,365).
  max_package_weight: z._default(z.nullable(z.number()), null)
})

export type Department = z.infer<typeof departmentSchema>

export const departmentsQuery = queryOptions({
  queryKey: ['departments', 'all'] as const,
  queryFn: async () => z.array(departmentSchema).parse(await authApi.get('departments/all/').json())
})

/** The user's role inside one department — `manager`, `worker`, or `null` for no assignment. */
export const departmentRoleQuery = (userId: number | undefined, departmentId: number | undefined) =>
  queryOptions({
    // Outside `boardKeys.all`: an assignment changes in Settings, not with every click on the board.
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

/**
 * The department row a board is scoped to, found by its stable code rather than the EBMS category it
 * is linked to. Every query below waits on its id.
 */
export const useBoardDepartment = (code: string) =>
  useQuery({
    ...departmentsQuery,
    select: departments => departmentByCode(departments, code)
  })

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

type DepartmentState = z.infer<typeof departmentStateSchema>

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
  // Reviewed and Released belong to the line's production day p1 (316,381), not the whole order.
  reviewed: z._default(z.boolean(), false),
  is_released: z._default(z.boolean(), false),
  // Rollforming's Export, a release that is also marked exported p2 (544,611).
  exported_at: z._default(z.nullable(z.string()), null),
  // What the Manager fills in while reviewing the order.
  flow: z._default(z.nullable(machineSchema), null),
  vented: z._default(z.boolean(), false),
  pull_from_stock: z._default(z.nullable(z.number()), null),
  // Width and description are editable here and deliberately never pushed back to EBMS, so a set
  // value shadows the mirror's.
  width: z._default(z.nullable(z.number()), null),
  description: z._default(z.nullable(z.string()), null),
  // Rollforming's coil p2 (541,431): `null` is Undefined, any coil from any supplier.
  supplier: z._default(z.nullable(z.string()), null),
  coil_number: z._default(z.nullable(z.string()), null),
  /** `coil`, `waiting_to_slit` or `slit`; none for a line that takes no coil. */
  coil_icon: z._default(z.nullable(z.string()), null),
  // Locked while the Slit Line still owes the coil p2 (1086,321).
  coil_fields_locked: z._default(z.boolean(), false)
})

const lineItemSchema = z.object({
  id: z.string(),
  category: z._default(z.nullable(z.string()), null),
  id_inven: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  quantity: z._default(z.number(), 0),
  // What EBMS has already shipped of the line.
  shipped: z._default(z.number(), 0),
  width: z._default(z.nullable(z.number()), null),
  length: z._default(z.nullable(z.number()), null),
  bends: z._default(z.number(), 0),
  weight: z._default(z.number(), 0),
  // The material the line is made of; EBMS sends the gauge as text or a number.
  color: z._default(z.nullable(z.string()), null),
  gauge: z._default(z.nullable(z.coerce.string()), null),
  // Rollforming: the machine the line is set on, else the one its EBMS profile runs on p2 (516,277).
  profile: z._default(z.nullable(z.string()), null),
  machine_id: z._default(z.nullable(z.number()), null),
  // The list's own `production_date` is the order's earliest day, not the line's, so it is not read.
  item: z._default(z.nullable(itemSchema), null)
})

export type BoardLineItem = z.infer<typeof lineItemSchema>

const orderSchema = z.object({
  id: z.string(),
  invoice: z._default(z.string(), ''),
  customer: z._default(z.nullable(z.string()), null),
  ship_date: z._default(z.nullable(z.string()), null),
  crea_date: z._default(z.nullable(z.string()), null),
  count_items: z._default(z.nullable(z.number()), 0),
  total_weight: z._default(z.nullable(z.number()), 0),
  ship_via: z._default(z.nullable(z.string()), null),
  po_no: z._default(z.nullable(z.string()), null),
  salesman: z._default(z.nullable(z.string()), null),
  // The codes the order's packages stand on, oldest first.
  locations: z.catch(z.array(z.string()), []),
  sales_order: z._default(z.nullable(salesOrderSchema), null),
  origin_items: z.catch(z.array(lineItemSchema), [])
})

export type BoardOrder = z.infer<typeof orderSchema>

const orderPageSchema = z.object({
  count: z.number(),
  results: z.array(orderSchema)
})

/** The order's row for this department, or nothing if it has never been touched here. */
export const departmentStateOf = (order: BoardOrder, departmentId: number | undefined) =>
  order.sales_order?.department_states.find(state => state.department === departmentId) ?? null

export const isStockOrder = (order: BoardOrder) => order.sales_order?.is_stock ?? false

/**
 * The tab lists hand an order over with only the lines that match the tab, so an order scheduled in
 * part arrives on each tab with fewer lines than `count_items`. The count alone is not enough — some
 * orders count a line the list never sends (W20109: 5 against 4) — so only an order that has been put
 * on a day at all is read as narrowed.
 */
export const isNarrowed = (order: BoardOrder) =>
  order.origin_items.length > 0 &&
  order.origin_items.length < (order.count_items ?? 0) &&
  !!order.sales_order?.department_states.some(state => state.production_date)

// One page holds the tab. The board's Unscheduled list is a working queue, not an archive.
const PAGE_SIZE = 100

const boardKeys = {
  all: ['board'] as const,
  orders: () => [...boardKeys.all, 'orders'] as const,
  // A board's orders are its department's: the same EBMS order is listed by each department with only
  // its own lines, so the category is part of every orders key.
  unscheduled: (category: string, search: string | undefined) =>
    [...boardKeys.orders(), category, 'unscheduled', { search: search ?? '' }] as const,
  scheduled: (category: string, search: string | undefined) =>
    [...boardKeys.orders(), category, 'scheduled', { search: search ?? '' }] as const,
  calendar: (category: string, from: string, to: string) =>
    [...boardKeys.orders(), category, 'calendar', { from, to }] as const,
  // Under `orders()`: every write that moves an order moves the counts with it.
  counts: (departmentId: number) => [...boardKeys.orders(), 'counts', departmentId] as const,
  machines: (category: string) => [...boardKeys.all, 'machines', category] as const,
  overdue: (departmentId: number) => [...boardKeys.all, 'overdue', departmentId] as const,
  machineCapacities: (departmentId: number, day: string) =>
    [...boardKeys.all, 'machine-capacities', departmentId, day] as const,
  allocatedStock: (departmentId: number, search: string | undefined) =>
    [...boardKeys.all, 'allocated-stock', departmentId, { search: search ?? '' }] as const,
  dayStrip: (departmentId: number, start: string, days: number) =>
    [...boardKeys.all, 'day-strip', departmentId, start, days] as const,
  workWeek: (departmentId: number, start: string) =>
    [...boardKeys.all, 'day-strip', departmentId, 'work-week', start] as const,
  dayStripDates: (departmentId: number, dates: string[]) =>
    [...boardKeys.all, 'day-strip', departmentId, 'dates', dates] as const,
  orderNotes: (orders: string[]) => [...boardKeys.all, 'order-notes', orders] as const,
  lineNotes: (originItem: string) => [...boardKeys.all, 'line-notes', originItem] as const,
  // Its own branch, not a child of `lineNotes`: invalidating one thread must reach every table dot,
  // and `lineNotes(<autoid>)` would never match a key sitting under `summary`.
  lineNotesSummaries: () => [...boardKeys.all, 'line-notes-summary'] as const,
  lineNotesSummary: (originItems: string[]) =>
    [...boardKeys.lineNotesSummaries(), originItems] as const,
  stockCards: () => [...boardKeys.all, 'stock-cards'] as const,
  cutlists: () => [...boardKeys.all, 'cutlists'] as const,
  cutlistBoard: (departmentId: number, kind: CutlistKind, machine: number | null, done: boolean) =>
    [
      ...boardKeys.cutlists(),
      departmentId,
      kind,
      machine ?? 'all',
      done ? 'done' : 'active'
    ] as const,
  cutlistCoils: (cutlistId: number) => [...boardKeys.cutlists(), 'coils', cutlistId] as const,
  completedOrders: () => [...boardKeys.all, 'completed'] as const,
  completed: (departmentId: number) => [...boardKeys.completedOrders(), departmentId] as const,
  completedOrder: (departmentId: number, order: string) =>
    [...boardKeys.completedOrders(), departmentId, order] as const,
  coils: () => [...boardKeys.all, 'coils'] as const,
  coilLots: () => [...boardKeys.coils(), 'lots'] as const,
  departmentCoilLots: (departmentId: number) => [...boardKeys.coilLots(), departmentId] as const,
  coilFilters: (departmentId: number) => [...boardKeys.coils(), 'filters', departmentId] as const,
  wrapping: () => [...boardKeys.all, 'wrapping'] as const,
  packaging: (departmentId: number) =>
    [...boardKeys.wrapping(), 'packaging', departmentId] as const,
  wrappingRows: (departmentId: number, day: string | null) =>
    [...boardKeys.wrapping(), departmentId, day ?? 'all'] as const,
  wrappingLocations: (departmentId: number, order: string | null) =>
    [...boardKeys.wrapping(), 'locations', departmentId, order ?? ''] as const,
  stockOrderRows: (departmentId: number, order: string) =>
    [...boardKeys.wrapping(), 'stock-order', departmentId, order] as const,
  manufacturingBatches: (departmentId: number) =>
    [...boardKeys.all, 'manufacturing-batches', departmentId] as const,
  orderPackages: (order: string) => [...boardKeys.wrapping(), 'packages', order] as const,
  orderLocations: (order: string) => [...boardKeys.wrapping(), 'order-locations', order] as const,
  orderComplete: (departmentId: number, order: string) =>
    [...boardKeys.wrapping(), 'complete', departmentId, order] as const,
  remanufacturings: () => [...boardKeys.all, 'remanufacturings'] as const,
  departmentRemanufacturings: (departmentId: number) =>
    [...boardKeys.remanufacturings(), departmentId] as const
}

type OrderFilters = Record<string, string | number | boolean>

/**
 * `ebms/orders/` filters on the EBMS category — the department's name — rather than on the department
 * id, and narrows each order's line items to it as well.
 */
const orderPage = async (category: string, filters: OrderFilters, offset: number, limit: number) =>
  orderPageSchema.parse(
    await authApi
      .get('ebms/orders/', { searchParams: { category, ...filters, limit, offset } })
      .json()
  )

/**
 * Every page of a paged list: the first says how many there are, so the rest are asked for at once.
 * Returned as pages, so the caller keeps whatever else the first one carries.
 */
const allPages = async <Page extends { count: number }>(
  pageAt: (offset: number) => Promise<Page>,
  pageSize = PAGE_SIZE
) => {
  const first = await pageAt(0)
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, Math.ceil(first.count / pageSize) - 1) }, (_, index) =>
      pageAt((index + 1) * pageSize)
    )
  )
  return [first, ...rest] as const
}

/** Every order the filters match, stock orders paged with the rest. */
const allOrders = async (category: string, filters: OrderFilters) => {
  const pages = await allPages(offset => orderPage(category, filters, offset, PAGE_SIZE))
  return { count: pages[0].count, results: pages.flatMap(page => page.results) }
}

const countsSchema = z.object({
  unscheduled: z._default(z.number(), 0),
  scheduled: z._default(z.number(), 0),
  // Every coil the department's Coil Filter admits, in Trim or not — what the Coils tab lists.
  coils: z._default(z.nullable(z.number()), null)
})

/** The tab strip's figures in one call — the whole board, whatever the search has narrowed. */
export const countsQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: boardKeys.counts(departmentId ?? 0),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      countsSchema.parse(await authApi.get(`departments/${departmentId}/counts/`).json())
  })

export const unscheduledOrdersQuery = (category: string, search: string | undefined) =>
  queryOptions({
    queryKey: boardKeys.unscheduled(category, search),
    // Each search term is its own cache entry; without this the table falls back to the skeleton on
    // every keystroke pause and resizes itself twice per search.
    placeholderData: keepPreviousData,
    queryFn: () => allOrders(category, { is_scheduled: false, ...(search ? { search } : {}) })
  })

/**
 * Every line of one order in the board's department. The tab lists narrow an order's lines to the ones matching the tab —
 * Unscheduled drops the scheduled ones, Scheduled the waiting ones — but an expanded order shows
 * them all, the rest greyed out (p1 (330,354), (316,381)). `order=` sets the tab filters aside and
 * answers that one order whole; a stock order's id is its S number, which it matches too.
 */
export const wholeOrderQuery = (category: string, order: BoardOrder) =>
  queryOptions({
    queryKey: [...boardKeys.orders(), category, 'whole', order.id] as const,
    // An order the list handed over whole needs nothing more.
    enabled: isNarrowed(order),
    placeholderData: order,
    queryFn: async () =>
      (await orderPage(category, { order: order.id }, 0, 1)).results.find(
        found => found.id === order.id
      ) ?? order
  })

/**
 * The Scheduled tab: orders whose line items in the department carry a day, released or not.
 *
 * Every day at once — the tab picks a day's parts out itself. The server's `production_date=` matches
 * an order's earliest day only, so it would drop a split order from the tab of its later day.
 */
export const scheduledOrdersQuery = (category: string, search: string | undefined) =>
  queryOptions({
    queryKey: boardKeys.scheduled(category, search),
    placeholderData: keepPreviousData,
    queryFn: () => allOrders(category, { is_scheduled: true, ...(search ? { search } : {}) })
  })

/**
 * The orders released to the department's floor: what Rollforming's Production tab lists. The listing
 * answers EBMS-Open orders only by default, and an order released in the app can be invoiced in EBMS
 * (Outstanding, Paid) long before it is rolled.
 *
 * `open` keeps only the orders with a line not yet Wrapped, Packaged or Shipped — Production's list.
 * Wrapping reads every released order: a fully wrapped order stays on its bench until its last
 * package has a location p2 (1144,383), and its lines keep their machine there.
 */
export const releasedOrdersQuery = (category: string, search: string | undefined, open: boolean) =>
  queryOptions({
    queryKey: [
      ...boardKeys.orders(),
      category,
      'released',
      { search: search ?? '', open }
    ] as const,
    placeholderData: keepPreviousData,
    queryFn: () =>
      allOrders(category, {
        is_scheduled: true,
        release_to_production: true,
        // One value, comma-separated: the listing reads only the last of a repeated key.
        origin_status__in: 'U,O,X',
        ...(open ? { has_open_lines: true } : {}),
        ...(search ? { search } : {})
      })
  })

/**
 * The orders with a line in the department on a day in `[from, to]`. The range narrows the line items
 * as well, so a split order carries only its days inside it.
 */
export const calendarOrdersQuery = (category: string, from: string, to: string) =>
  queryOptions({
    queryKey: boardKeys.calendar(category, from, to),
    queryFn: async () =>
      (
        await allOrders(category, {
          is_scheduled: true,
          production_date__gte: from,
          production_date__lte: to
        })
      ).results
  })

/**
 * The machines a line item can be assigned to. `GET /flows/all/` takes the EBMS category rather than
 * a department, which for this page is the same thing — the two are linked by `category_autoid`.
 */
export const machinesQuery = (category: string, departmentId: number | undefined) =>
  queryOptions({
    queryKey: boardKeys.machines(category),
    queryFn: async () =>
      z
        .array(machineSchema)
        .parse(
          await authApi
            .get('flows/all/', { searchParams: { category__prod_type: category } })
            .json()
        ),
    select: (machines: Machine[]) =>
      machines
        .filter(machine => machine.department === null || machine.department === departmentId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  })

const overdueSchema = z.object({
  days: z.catch(z.array(z.string()), []),
  orders_by_day: z.catch(z.record(z.string(), z.number()), {}),
  orders: z._default(z.number(), 0),
  line_items: z._default(z.number(), 0)
})

/** Which production days carry work that is past due — the board's red cascade, in one call. */
export const overdueQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: boardKeys.overdue(departmentId ?? 0),
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
    // The sum of the department's machines' daily max bends.
    capacity: z._default(z.nullable(z.number()), null),
    over_capacity: z._default(z.boolean(), false)
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

/** One day broken down by machine — what the gear on a day tab opens. */
export const machineCapacitiesQuery = (departmentId: number | undefined, day: string | null) =>
  queryOptions({
    queryKey: boardKeys.machineCapacities(departmentId ?? 0, day ?? ''),
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

type BoardLocation = z.infer<typeof locationSchema>

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
  select: (page: { results: BoardLocation[] }) =>
    new Map(page.results.map(location => [location.id, location.code]))
})

const allocatedStockSchema = z.array(
  z.object({
    color: z._default(z.nullable(z.string()), null),
    product_id: z._default(z.string(), ''),
    description: z._default(z.nullable(z.string()), null),
    qty: z._default(z.number(), 0),
    starts_color_group: z._default(z.boolean(), false)
  })
)

/**
 * Every trim due to come from stock that has not been wrapped yet, across the orders marked Reviewed.
 * Read fresh each time: the board wants a live report, and nothing accumulates behind it.
 */
export const allocatedStockQuery = (departmentId: number | undefined, search: string | undefined) =>
  queryOptions({
    queryKey: boardKeys.allocatedStock(departmentId ?? 0, search),
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

const dayStripSchema = z.array(
  z.object({
    date: z.string(),
    pieces: z._default(z.number(), 0),
    pieces_from_stock: z._default(z.number(), 0),
    bends: z._default(z.number(), 0),
    bends_from_stock: z._default(z.number(), 0),
    // The sum of the department's machines' daily max bends; `null` is no ceiling.
    capacity: z._default(z.nullable(z.number()), null),
    over_capacity: z._default(z.boolean(), false),
    // Monday to Friday, plus the weekend when the company works it, and never a holiday.
    is_work_day: z._default(z.boolean(), true),
    // The holiday's name on a day the shop has closed, so a closed day can say why.
    holiday: z._default(z.nullable(z.string()), null)
  })
)

export type DayStripEntry = z.infer<typeof dayStripSchema>[number]

/** `used / capacity` for `days` days in a row from `start` — a month, or a single pinned day. */
export const dayStripQuery = (departmentId: number | undefined, start: string, days: number) =>
  queryOptions({
    queryKey: boardKeys.dayStrip(departmentId ?? 0, start, days),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      dayStripSchema.parse(
        await authApi
          .get(`departments/${departmentId}/day-strip/`, { searchParams: { start, days } })
          .json()
      )
  })

/** Today plus the next work days: the strip the board walks p1 (81,286). */
export const WORK_WEEK_DAYS = 5

/**
 * The work-week strip every tab opens on. The server steps over the days the shop is shut, so the
 * five are work days; one query, so the Unscheduled pills and the Scheduled tabs share it.
 */
export const workWeekQuery = (departmentId: number | undefined, start: string) =>
  queryOptions({
    queryKey: boardKeys.workWeek(departmentId ?? 0, start),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      dayStripSchema.parse(
        await authApi
          .get(`departments/${departmentId}/day-strip/`, {
            searchParams: { start, days: WORK_WEEK_DAYS, work_days_only: true }
          })
          .json()
      )
  })

// The most dates one day-strip request may name; the server refuses more.
const STRIP_DATES_MAX = 62

/** Days that are neither in a row nor recent — the overdue ones — in as few calls as the cap allows. */
export const dayStripDatesQuery = (departmentId: number | undefined, dates: string[]) =>
  queryOptions({
    queryKey: boardKeys.dayStripDates(departmentId ?? 0, dates),
    enabled: departmentId !== undefined && dates.length > 0,
    queryFn: async () => {
      const batches = Array.from(
        { length: Math.ceil(dates.length / STRIP_DATES_MAX) },
        (_, index) => dates.slice(index * STRIP_DATES_MAX, (index + 1) * STRIP_DATES_MAX)
      )
      const strips = await Promise.all(
        batches.map(async batch =>
          dayStripSchema.parse(
            await authApi
              .get(`departments/${departmentId}/day-strip/`, {
                searchParams: new URLSearchParams(batch.map(date => ['dates', date]))
              })
              .json()
          )
        )
      )
      return strips.flat()
    }
  })

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
    queryKey: boardKeys.orderNotes(orders),
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
    queryKey: boardKeys.lineNotesSummary(originItems),
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

type LineNoteThread = z.infer<typeof lineNoteThreadSchema>

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
    queryKey: boardKeys.lineNotes(originItem ?? ''),
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

/** The check on an Order Note, and taking it back when it was made by mistake. */
export const useSetOrderNoteRead = () =>
  useMutation({
    mutationFn: ({ order, read }: { order: string; read: boolean }) =>
      authApi.post(`orders/${order}/note/${read ? 'read' : 'unread'}/`).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: boardKeys.all })
    }
  })

/** The thread and the dot that summarises it in the table, which are two different queries. */
const invalidateLineNotes = (client: QueryClient, originItem: string) =>
  Promise.all([
    client.invalidateQueries({ queryKey: boardKeys.lineNotes(originItem) }),
    client.invalidateQueries({ queryKey: boardKeys.lineNotesSummaries() })
  ])

/**
 * Posted through `comments/` rather than `items/{autoid}/notes/`: this is the one endpoint that
 * creates the app's row for the line when it has none, which is every line on the Unscheduled tab.
 */
export const useAddLineNote = (originItem: string) =>
  useMutation({
    mutationFn: (text: string) =>
      authApi.post('comments/', { json: { item: originItem, text } }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await invalidateLineNotes(client, originItem)
    }
  })

/** One card's check, and taking it back; the thread's dot follows. */
export const useSetLineNoteRead = (originItem: string) =>
  useMutation({
    mutationFn: ({ noteId, read }: { noteId: number; read: boolean }) =>
      authApi.post(`notes/${noteId}/${read ? 'read' : 'unread'}/`).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await invalidateLineNotes(client, originItem)
    }
  })

/**
 * Every write below is keyed on our own `SalesOrder` id, and an EBMS order that nobody has scheduled,
 * prioritised or annotated has none yet, so one is made on the way. The server answers an order that
 * already has one with that row, so a retry after a failed write is safe.
 */
const ensureSalesOrderId = async (order: BoardOrder) => {
  // A negative id is the stand-in an optimistic update drew, not a row the server has.
  if (order.sales_order && order.sales_order.id > 0) return order.sales_order.id
  const created = salesOrderSchema.parse(
    await authApi.post('sales-orders/', { json: { order: order.id } }).json()
  )
  return created.id
}

type ScheduleOrdersInput = {
  orders: BoardOrder[]
  departmentId: number
  productionDate: string
}

/** Tick several orders, pick one day — the board's main scheduling path. */
export const useScheduleOrders = (onSuccess: () => void) =>
  useMutation({
    // A part-scheduled order keeps its part on its own day: the server dates only the lines with
    // no day yet.
    mutationFn: async ({ orders, departmentId, productionDate }: ScheduleOrdersInput) =>
      authApi
        .post('sales-orders/schedule/', {
          json: {
            department: departmentId,
            orders: await Promise.all(orders.map(ensureSalesOrderId)),
            production_date: productionDate
          }
        })
        .json(),
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: boardKeys.all })
    },
    onSuccess: onSuccess
  })

type SplitOrderInput = {
  order: BoardOrder
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
      await client.invalidateQueries({ queryKey: boardKeys.all })
    },
    onSuccess: onSuccess
  })

/**
 * Bypass Production: the order skips the Slinet and the machines and its trims land in Wrapping as
 * Bypassed. Per order, because the backend gates it per order and department.
 */
export const useBypassProduction = (onSuccess: () => void) =>
  useMutation({
    mutationFn: async ({
      orders,
      departmentId
    }: {
      orders: BoardOrder[]
      departmentId: number
    }) => {
      const ids = await Promise.all(orders.map(ensureSalesOrderId))
      return Promise.all(
        ids.map(id => authApi.post(`sales-orders/${id}/departments/${departmentId}/bypass/`).json())
      )
    },
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: boardKeys.all })
    },
    onSuccess: onSuccess
  })

/**
 * Every cached copy of one order under the order lists — a tab's page, a whole order — rewritten by
 * `edit`.
 */
const isOrderPage = (data: unknown): data is { results: BoardOrder[] } =>
  !!data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)

const isOrder = (data: unknown): data is BoardOrder =>
  !!data && typeof data === 'object' && 'origin_items' in data

const patchCachedOrder = (
  client: QueryClient,
  orderId: string,
  edit: (order: BoardOrder) => BoardOrder
) => {
  const patch = (order: BoardOrder) => (order.id === orderId ? edit(order) : order)
  client.setQueriesData({ queryKey: boardKeys.orders() }, (data: unknown) =>
    isOrderPage(data)
      ? { ...data, results: data.results.map(patch) }
      : isOrder(data)
        ? patch(data)
        : data
  )
}

/** The newest cached copy of an order that has a real sales order, or the one given. */
const freshOrder = (client: QueryClient, order: BoardOrder) =>
  client
    .getQueriesData({ queryKey: boardKeys.orders() })
    .flatMap(([, data]) => (isOrderPage(data) ? data.results : isOrder(data) ? [data] : []))
    .find(cached => cached.id === order.id && (cached.sales_order?.id ?? 0) > 0) ?? order

/**
 * The order with `priority` on its row for the department, the row made up if it has none yet. A
 * made-up sales order carries id -1, which `ensureSalesOrderId` reads as none.
 */
const withPriority = (order: BoardOrder, departmentId: number, priority: Priority | null) => {
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
 * Set or clear an order's Priority. It belongs to one department and never leaks to another.
 *
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
        order: BoardOrder
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
      await client.cancelQueries({ queryKey: boardKeys.orders() })
      patchCachedOrder(client, order.id, cached => withPriority(cached, departmentId, priority))
    },
    // Only this order goes back: a snapshot of every list would also undo another order's pick that
    // is still on its way.
    onError: (_, { order, departmentId }, __, { client }) =>
      patchCachedOrder(client, order.id, cached =>
        withPriority(cached, departmentId, departmentStateOf(order, departmentId)?.priority ?? null)
      ),
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: boardKeys.all })
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
      day,
      reviewed
    }: {
      order: BoardOrder
      departmentId: number
      /** The part's production day: each day of a split order is reviewed on its own. */
      day: string
      reviewed: boolean
    }) => {
      const id = await ensureSalesOrderId(order)
      return authApi
        .patch(`sales-orders/${id}/departments/${departmentId}/`, {
          json: { reviewed },
          searchParams: { production_date: day }
        })
        .json()
    },
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: boardKeys.all })
    }
  })

const releaseResultSchema = z.object({
  released: z.catch(z.array(z.number()), []),
  exported: z.catch(z.array(z.number()), []),
  cutlists: z.catch(z.array(z.number()), [])
})

/** One production day of one order — what a row of the Scheduled tab releases. */
export type ReleaseDay = { sales_order_id: number; production_date: string }

/**
 * Release To Production: the ticked parts go to the floor and their cutlists and bendlists are made.
 * A part is one day of an order, so releasing Monday's part of a split order leaves its Wednesday part
 * to be reviewed and moved on its own p1 (335,505).
 *
 * One call for the batch rather than one per part — parts sharing a production date, gauge/colour
 * and priority share a cutlist, and that grouping only happens when they arrive together.
 */
type ReleaseInput = {
  days: ReleaseDay[]
  /** Rollforming's: the parts exported too — released whether or not they are in `days` p2 (542,607). */
  exportDays?: ReleaseDay[]
  departmentId: number
}

// A batch goes out whole or not at all; a refused one names every order that held it back.
const releaseFailureSchema = z.object({
  failed: z.array(z.object({ order: z.string(), reason: z.string() }))
})

export const useReleaseOrders = (
  onSuccess: (result: { released: number; exported: number; cutlists: number }) => void
) =>
  useMutation({
    meta: { errorTitle: 'Nothing was released' },
    mutationFn: async ({ days, exportDays, departmentId }: ReleaseInput) => {
      try {
        return releaseResultSchema.parse(
          await authApi
            .post(`departments/${departmentId}/release/`, {
              json: exportDays?.length ? { days, export_days: exportDays } : { days }
            })
            .json()
        )
      } catch (error) {
        if (error instanceof HTTPError) {
          const refused = releaseFailureSchema.safeParse(
            (error.data as { detail?: unknown } | undefined)?.detail
          )
          if (refused.success && refused.data.failed.length)
            error.message = refused.data.failed
              .map(({ order, reason }) => `${order}: ${reason}`)
              .join('; ')
        }
        throw error
      }
    },
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: boardKeys.all })
    },
    onSuccess: result =>
      onSuccess({
        released: result.released.length,
        exported: result.exported.length,
        cutlists: result.cutlists.length
      })
  })

/**
 * Send the order back to Unscheduled. This also discards the Manager's edits, as the board says.
 * `productionDate` takes back only that day's lines — one row of a split order; the order keeps its
 * priority and Reviewed while any line is still scheduled.
 */
export const useUnscheduleOrder = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({
      salesOrderId,
      departmentId,
      productionDate
    }: {
      salesOrderId: number
      departmentId: number
      productionDate?: string
    }) =>
      authApi
        .post(`sales-orders/${salesOrderId}/departments/${departmentId}/unschedule/`, {
          searchParams: productionDate ? { production_date: productionDate } : {}
        })
        .json(),
    onSettled: async (_, __, ___, ____, { client }) => {
      await client.invalidateQueries({ queryKey: boardKeys.all })
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
export const useUpdateLineItem = ({ released = false } = {}) =>
  useMutation({
    meta: { errorTitle: 'The line was not changed' },
    mutationFn: ({ itemId, edit }: { itemId: number; edit: LineItemEdit }) =>
      authApi.patch(`items/${itemId}/`, { json: edit }).json(),
    // A released line's new machine or Stock moves its cutlist, bendlists and what is left to wrap;
    // one still being reviewed has only the order lists to change.
    onSettled: async (_, __, ___, ____, { client }) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: boardKeys.orders() }),
        ...(released
          ? [
              client.invalidateQueries({ queryKey: boardKeys.cutlists() }),
              client.invalidateQueries({ queryKey: boardKeys.wrapping() })
            ]
          : [])
      ])
    }
  })

// EBMS keeps 0 for a product with no gauge on record, which is none rather than a gauge.
const gaugeOf = z._default(
  z.pipe(
    z.nullable(z.string()),
    z.transform(gauge => (gauge === null || Number(gauge) === 0 ? null : gauge))
  ),
  null
)

const stockCardSchema = z.object({
  id: z.number(),
  product_id: z._default(z.string(), ''),
  description: z._default(z.nullable(z.string()), null),
  stock_minimum: z._default(z.nullable(z.number()), null),
  order_qty: z._default(z.nullable(z.number()), null),
  image_id: z._default(z.nullable(z.number()), null),
  image_url: z._default(z.nullable(z.string()), null),
  qr_payload: z._default(z.nullable(z.string()), null),
  // Typed in by the Manager; EBMS has no trustworthy trim width.
  width: z._default(z.nullable(z.number()), null),
  // Offered while `width` is empty: the width every past order of the product agrees on.
  width_from_orders: z._default(z.nullable(z.number()), null),
  color: z._default(z.nullable(z.string()), null),
  gauge: gaugeOf
})

export type StockCard = z.infer<typeof stockCardSchema>

export const stockCardsQuery = queryOptions({
  queryKey: boardKeys.stockCards(),
  queryFn: async () => z.array(stockCardSchema).parse(await authApi.get('stock-cards/').json())
})

type StockCardValues = {
  stock_minimum: number
  order_qty: number
  image_id: number
  width: number | null
}

const stockCardProductSchema = z.object({
  product_id: z.string(),
  description: z._default(z.nullable(z.string()), null),
  color: z._default(z.nullable(z.string()), null),
  gauge: gaugeOf,
  width_from_orders: z._default(z.nullable(z.number()), null),
  has_card: z._default(z.boolean(), false)
})

/**
 * What the Create form fills in once a Product ID is typed p1 (71,307). An ID EBMS does not know
 * answers 404, which reads as `null` — the form says so rather than a toast.
 */
export const stockCardProductQuery = (productId: string) =>
  queryOptions({
    queryKey: [...boardKeys.stockCards(), 'product', productId] as const,
    enabled: productId.length > 0,
    retry: false,
    queryFn: async () => {
      try {
        return stockCardProductSchema.parse(
          await authApi.get(`stock-cards/product/${encodeURIComponent(productId)}/`).json()
        )
      } catch (error) {
        if (error instanceof HTTPError && error.response.status === 404) return null
        throw error
      }
    }
  })

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
      client.invalidateQueries({ queryKey: boardKeys.stockCards() })
  })

export const useDeleteStockCard = () =>
  useMutation({
    mutationFn: (id: number) => authApi.delete(`stock-cards/${id}/`),
    onSuccess: async (_, __, ___, { client }) => {
      await client.invalidateQueries({ queryKey: boardKeys.stockCards() })
    }
  })

const stockCardLabelSchema = z.object({
  id: z.number(),
  product_id: z._default(z.string(), ''),
  description: z._default(z.nullable(z.string()), null),
  stock_minimum: z._default(z.nullable(z.number()), null),
  order_qty: z._default(z.nullable(z.number()), null),
  width: z._default(z.nullable(z.number()), null),
  // Printed when no Width was typed on the card.
  width_from_orders: z._default(z.nullable(z.number()), null),
  color: z._default(z.nullable(z.string()), null),
  gauge: gaugeOf,
  image_url: z._default(z.nullable(z.string()), null),
  // What the label's QR encodes; scanning it back raises a stock order.
  qr: z._default(z.nullable(z.string()), null)
})

export type StockCardLabel = z.infer<typeof stockCardLabelSchema>

/** Print Selected p1 (72,335): the server answers with what each label carries, and the app prints it. */
export const usePrintStockCards = (onSuccess: (labels: StockCardLabel[]) => void) =>
  useMutation({
    meta: { errorTitle: 'Nothing was printed' },
    mutationFn: async (cardIds: number[]) =>
      z
        .array(stockCardLabelSchema)
        .parse(await authApi.post('stock-cards/print/', { json: { card_ids: cardIds } }).json()),
    onSuccess
  })

/**
 * One row of the Create Stock Order grid, once the blanks have been dropped. A line left without a
 * description or length takes the product's own from EBMS.
 */
type StockOrderLine = {
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
      await client.invalidateQueries({ queryKey: boardKeys.all })
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

/**
 * A cutlist belongs to the Slinet, which cuts the material; a bendlist belongs to one machine, which
 * bends it. Releasing an order to production is what creates them, and nothing ever adds to one: the
 * same gauge and colour released again later makes a second list beside the first.
 */
type CutlistKind = 'cutlist' | 'bendlist'

// One line item's share of a row — what a number in the Total column opens up. `quantity` is that
// share; the rest describes the line itself.
// A file EBMS holds on a product — its drawing among them. `url` is a signed link that expires, so it
// is read when the list is, never kept.
const productFileSchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  url: z._default(z.nullable(z.string()), null)
})

export type ProductFile = z.infer<typeof productFileSchema>

const cutlistSourceSchema = z.object({
  order: z._default(z.nullable(z.string()), null),
  // The printed number — a stock order's own «S» number — and «Stock» for its customer.
  order_number: z._default(z.nullable(z.string()), null),
  customer: z._default(z.nullable(z.string()), null),
  po_number: z._default(z.nullable(z.string()), null),
  origin_item: z._default(z.nullable(z.string()), null),
  quantity: z._default(z.number(), 0),
  // `null` once the line item is deleted; the breakdown outlives it.
  item_id: z._default(z.nullable(z.number()), null),
  product_id: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  qty_ordered: z._default(z.nullable(z.number()), null),
  pull_from_stock: z._default(z.nullable(z.number()), null),
  status: z._default(z.nullable(z.string()), null),
  is_stock: z._default(z.boolean(), false),
  // The product's pictures in EBMS; the bendlist's Drawing p1 (660,539).
  product_files: z._default(z.array(productFileSchema), [])
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
    queryKey: boardKeys.cutlistBoard(departmentId ?? 0, kind, machine, done),
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
      client.invalidateQueries({ queryKey: boardKeys.all })
  })

/**
 * Done takes the list off the Production tab and into Completed, where it stays for 90 days. The
 * server refuses it while any row is outstanding.
 */
export const useFinishCutlist = () =>
  useMutation({
    mutationFn: (cutlistId: number) => authApi.post(`cutlists/${cutlistId}/done/`).json(),
    onSettled: (_, __, ___, ____, { client }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: boardKeys.cutlists() }),
        client.invalidateQueries({ queryKey: boardKeys.remanufacturings() })
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
  // The EBMS lot autoid, so a coil has one before the floor has entered anything about it.
  id: z.string(),
  lot_autoid: z._default(z.string(), ''),
  lot_number: z._default(z.nullable(z.string()), null),
  product_id: z._default(z.nullable(z.string()), null),
  // Read live from the EBMS coil product behind the lot.
  color: z._default(z.nullable(z.string()), null),
  gauge: z._default(z.nullable(z.number()), null),
  width: z._default(z.nullable(z.number()), null),
  grade: z._default(z.nullable(z.number()), null),
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
 * The Cutlist Coils window: the coils checked into the Slinet of the list's colour and gauge, as EBMS
 * gives them on the products — a list with no gauge takes any. Width does not narrow it.
 */
export const cutlistCoilsQuery = (cutlistId: number | null) =>
  queryOptions({
    queryKey: boardKeys.cutlistCoils(cutlistId ?? 0),
    enabled: cutlistId !== null,
    queryFn: async () =>
      z.array(coilLotSchema).parse(await authApi.get(`cutlists/${cutlistId}/coils/`).json())
  })

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
    queryKey: boardKeys.completed(departmentId ?? 0),
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
        // What went to EBMS for the line: a stock order's batches, else ordered less stock.
        manufactured: z._default(z.number(), 0),
        length: z._default(z.nullable(z.number()), null),
        // The Line Item Notes, oldest first.
        notes: z.catch(z.array(z.string()), []),
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
    queryKey: boardKeys.completedOrder(departmentId ?? 0, order ?? ''),
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
const reprintSchema = z.object({
  package_id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  order_number: z._default(z.nullable(z.string()), null),
  location: z._default(z.nullable(z.string()), null),
  weight: z._default(z.nullable(z.number()), null),
  contents: z._default(
    z.array(z.object({ origin_item: z.string(), quantity: z._default(z.number(), 0) })),
    []
  )
})

export type Reprint = z.infer<typeof reprintSchema>

/** A label's data rebuilt from the package as it stands now — its location included — to print. */
export const useReprintPackage = () =>
  useMutation({
    meta: { errorTitle: 'The label was not printed' },
    mutationFn: async (packageId: number) =>
      reprintSchema.parse(await authApi.post(`packages/${packageId}/reprint/`).json())
  })

const coilPageSchema = z.object({
  count: z._default(z.number(), 0),
  results: z.array(coilLotSchema)
})

// With `department_id` the server reads and filters every coil for each page it answers, so the
// list is asked for in pages big enough to come back in one.
const COIL_PAGE_SIZE = 1000

const allCoils = async (searchParams: Record<string, number>) => {
  const pages = await allPages(
    async offset =>
      coilPageSchema.parse(
        await authApi
          .get('coils/lots/', { searchParams: { ...searchParams, limit: COIL_PAGE_SIZE, offset } })
          .json()
      ),
    COIL_PAGE_SIZE
  )
  return pages.flatMap(page => page.results)
}

/** Every coil in the company — All Coils. */
export const coilLotsQuery = queryOptions({
  queryKey: boardKeys.coilLots(),
  queryFn: () => allCoils({})
})

/** The coils the department's Coil Filter admits, folder filters included — Trim Coils. */
export const departmentCoilLotsQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: boardKeys.departmentCoilLots(departmentId ?? 0),
    enabled: departmentId !== undefined,
    queryFn: () => allCoils({ department_id: departmentId! })
  })

/** How many coils Trim Coils lists, for the tab strip: the page's count, without the coils. */
/** The Cutlist Coils window reads its coils through the cutlist, so both lists hear of a change. */
const invalidateCoils = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: boardKeys.coils() }),
    client.invalidateQueries({ queryKey: boardKeys.cutlists() }),
    // The tab strip's coil count rides on the order counts.
    client.invalidateQueries({ queryKey: [...boardKeys.orders(), 'counts'] })
  ])

/** Material Thickness, Core OD and the coil note — everything the floor types onto a coil. */
export const useUpdateCoilLot = () =>
  useMutation({
    mutationFn: ({
      lotId,
      edit
    }: {
      lotId: string
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
      lotId: string
      location: { in_trim?: boolean; in_rollforming?: boolean; in_slinet?: boolean }
    }) => authApi.post(`coils/lots/${lotId}/location/`, { json: location }).json(),
    onSettled: (_, __, ___, ____, { client }) => invalidateCoils(client)
  })

/** Enter exactly one of the three; the other two follow from the Material Thickness and Core OD. */
export type CoilFigures = { coil_thickness?: number; linear_feet?: number; weight?: number }

/**
 * One figure and the build to work it out with. A build left out is the coil's own; sent, Apply
 * reckons with it and keeps nothing, and the confirming call saves it with the figures.
 */
export type CoilAdjustment = CoilFigures & { material_thickness?: number; core_od?: number }

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
    mutationFn: async ({ lotId, values }: { lotId: string; values: CoilAdjustment }) =>
      coilApplySchema.parse(
        await authApi.post(`coils/lots/${lotId}/apply/`, { json: values }).json()
      )
  })

/** Confirming an adjustment: EBMS first, and only then the coil here. */
export const useConfirmCoilAdjustment = (onSuccess?: () => void) =>
  useMutation({
    mutationFn: ({ lotId, values }: { lotId: string; values: CoilAdjustment }) =>
      authApi.post(`coils/lots/${lotId}/adjust/`, { json: values }).json(),
    onSuccess,
    // Its callers word the failure differently — one coil, or a batch of them under one toast.
    meta: { skipErrorToast: true },
    onSettled: (_, __, ___, ____, { client }) => invalidateCoils(client)
  })

/** Confirming Deplete & Delete: zeroed in EBMS, then gone from here. */
export const useDepleteCoil = (onSuccess?: () => void) =>
  useMutation({
    mutationFn: (lotId: string) => authApi.post(`coils/lots/${lotId}/deplete/`).json(),
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
      client.invalidateQueries({ queryKey: boardKeys.coils() })
  })

/** Removing the filter admits no coil to the department's Trim Coils until another is set. */
export const useDeleteCoilFilter = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'The coil filter stayed' },
    mutationFn: (filterId: number) => authApi.delete(`coils/filters/${filterId}/`),
    onSuccess,
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: boardKeys.coils() })
  })

/** The folder tabs: only folders holding a coil that passes the department's filter. */
export const coilFoldersQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: [...boardKeys.coils(), 'folders', departmentId ?? 0] as const,
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
    queryKey: boardKeys.coilFilters(departmentId ?? 0),
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

const wrappingRowSchema = z.object({
  // The app's own row, which a line edit (Stock) is addressed to.
  item_id: z._default(z.nullable(z.number()), null),
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
  // Still true once a bypassed line is packed and reads Wrapped: it may never be remade.
  is_bypassed: z._default(z.boolean(), false),
  qty_ordered: z._default(z.number(), 0),
  // How much of the line comes off the shelf.
  from_stock: z._default(z.number(), 0),
  wrapped: z._default(z.number(), 0),
  left_to_wrap: z._default(z.number(), 0),
  // Wrapping is blocked until the trim has actually been made, by whatever «made» means here.
  can_wrap: z._default(z.boolean(), false),
  // A Rollforming line with no Supplier or Coil Number yet, which shuts `can_wrap` p2 (1011,367).
  coil_missing: z._default(z.boolean(), false),
  auto_fill_available: z._default(z.boolean(), false),
  auto_fill_amount: z._default(z.number(), 0),
  // Which window the bench opens: a stock order's Stock window, or the package modal.
  is_stock: z._default(z.boolean(), false),
  length: z._default(z.nullable(z.number()), null),
  is_standard_length: z._default(z.boolean(), true),
  // lb per piece, what a package's weight is worked out from.
  unit_weight: z._default(z.nullable(z.number()), null),
  // The order info block; a stock order has none of it.
  po: z._default(z.nullable(z.string()), null),
  salesman: z._default(z.nullable(z.string()), null),
  ship_via: z._default(z.nullable(z.string()), null),
  // ARINV's SHIP_DATE arrives as a full timestamp here; the board only ever means the day.
  ship_date: z._default(
    z.pipe(
      z.nullable(z.string()),
      z.transform(date => date?.slice(0, 10) ?? null)
    ),
    null
  )
})

export type WrappingRow = z.infer<typeof wrappingRowSchema>

const packagingOrderSchema = z.object({
  order: z.string(),
  order_number: z._default(z.nullable(z.string()), null),
  customer: z._default(z.nullable(z.string()), null),
  prep_date: z._default(z.nullable(z.string()), null),
  priority: z._default(z.nullable(z.string()), null),
  // From Dispatch; «N/A» for a pick-up p3 (1239,209).
  truck: z._default(z.nullable(z.string()), null),
  ship_via: z._default(z.nullable(z.string()), null),
  status: z._default(z.nullable(z.string()), null)
})

export type PackagingOrder = z.infer<typeof packagingOrderSchema>

/**
 * The Packaging tab's orders, by Prep Date then Priority — the same list for the Manager and the
 * Worker p3 (1076,348), (1249,187).
 */
export const packagingQuery = (departmentId: number) =>
  queryOptions({
    queryKey: boardKeys.packaging(departmentId),
    queryFn: async () =>
      z
        .array(packagingOrderSchema)
        .parse(await authApi.get(`departments/${departmentId}/packaging/`).json())
  })

/** Every line item released to production, with what is left to wrap on each. */
export const wrappingRowsQuery = (departmentId: number | undefined, day: string | null) =>
  queryOptions({
    queryKey: boardKeys.wrappingRows(departmentId ?? 0, day),
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

// The server sums package weights as floats (69.47999999999999); a pound to the hundredth is all
// anybody reads.
const hundredths = (weight: number) => Math.round(weight * 100) / 100

const pounds = z.pipe(z.number(), z.transform(hundredths))

const locationSlotSchema = z.object({
  location_id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  warehouse: z._default(z.nullable(z.string()), null),
  max_weight: z._default(z.nullable(z.number()), null),
  used_weight: z._default(pounds, 0),
  orders_on_it: z._default(z.number(), 0),
  multi_order: z._default(z.boolean(), false),
  max_orders: z._default(z.nullable(z.number()), null),
  // Greyed out once full — but never for the order being packed while it stands there already. The
  // board still lets the Worker ask for another department's locations.
  available: z._default(z.boolean(), true),
  // `null` is no Max Weight.
  remaining_weight: z._default(z.nullable(pounds), null),
  // Select Location opens on the default warehouse p1 (543,104).
  warehouse_is_default: z._default(z.boolean(), false)
})

export type LocationSlot = z.infer<typeof locationSlotSchema>

/**
 * The list behind Select Location, opened on this department's own locations. `order` is the autoid
 * being packed: a full cell it already stands on stays open to it.
 */
export const wrappingLocationsQuery = (
  departmentId: number | undefined,
  order: string | null,
  enabled: boolean
) =>
  queryOptions({
    queryKey: boardKeys.wrappingLocations(departmentId ?? 0, order),
    enabled: departmentId !== undefined && enabled,
    queryFn: async () =>
      z.array(locationSlotSchema).parse(
        await authApi
          .get('wrapping/locations/', {
            searchParams: { department_id: departmentId!, ...(order ? { order } : {}) }
          })
          .json()
      )
  })

const orderLocationSchema = z.object({
  location_id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  max_weight: z._default(z.nullable(z.number()), null),
  packages: z._default(z.number(), 0),
  // This order's packages; `used_weight` and `remaining_weight` count every order's on the cell.
  weight_on_it: z._default(pounds, 0),
  used_weight: z._default(pounds, 0),
  remaining_weight: z._default(z.nullable(pounds), null),
  // Only the newest location still takes packages; the earlier ones are marked, not hidden.
  orange: z._default(z.boolean(), false),
  current: z._default(z.boolean(), false)
})

export type OrderLocation = z.infer<typeof orderLocationSchema>

/** Where this order is standing. Everything but the newest is «put no more packages here». */
export const orderLocationsQuery = (order: string | null) =>
  queryOptions({
    queryKey: boardKeys.orderLocations(order ?? ''),
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
      client.invalidateQueries({ queryKey: boardKeys.all })
  })

export const useRemoveOrderLocation = () =>
  useMutation({
    meta: { errorTitle: 'The location stayed' },
    mutationFn: ({ order, locationId }: { order: string; locationId: number }) =>
      authApi.delete(`wrapping/orders/${order}/locations/${locationId}/`).json(),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: boardKeys.wrapping() })
  })

/** The packages made for an order still at the bench — See Packages. */
export const orderPackagesQuery = (order: string | null, enabled: boolean) =>
  queryOptions({
    queryKey: boardKeys.orderPackages(order ?? ''),
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
  is_standard_length: z._default(z.boolean(), true),
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
    queryKey: boardKeys.stockOrderRows(departmentId ?? 0, order ?? ''),
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
      client.invalidateQueries({ queryKey: boardKeys.wrapping() })
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
      client.invalidateQueries({ queryKey: boardKeys.all })
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
        quantity: z._default(z.number(), 0),
        // The stock-order line it was made against; empty for Stock Manufacturing.
        origin_item: z._default(z.nullable(z.string()), null)
      })
    ),
    []
  )
})

type ManufacturingBatch = z.infer<typeof manufacturingBatchSchema>

/** What has gone to EBMS as manufacturing batches, newest first. */
export const manufacturingBatchesQuery = (departmentId: number | undefined, enabled: boolean) =>
  queryOptions({
    queryKey: boardKeys.manufacturingBatches(departmentId ?? 0),
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
      client.invalidateQueries({ queryKey: boardKeys.all })
  })

/** A package packed wrong comes apart: its pieces go back to Left To Wrap. */
export const useDeletePackage = () =>
  useMutation({
    meta: { errorTitle: 'The package stayed' },
    mutationFn: (packageId: number) => authApi.delete(`wrapping/packages/${packageId}/`),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: boardKeys.all })
  })

const packageScanSchema = z.object({
  name: z._default(z.string(), ''),
  status: z.enum(['ok', 'deleted', 'unknown']),
  detail: z._default(z.nullable(z.string()), null)
})

export type PackageScan = z.infer<typeof packageScanSchema>

/**
 * What a package label's barcode is: a live package, one deleted since it was printed, or nothing
 * p1 (835,528). A read, but asked once per scan rather than cached, so a mutation.
 */
export const useScanPackage = () =>
  useMutation({
    meta: { errorTitle: 'The scan could not be checked' },
    mutationFn: async (name: string) =>
      packageScanSchema.parse(
        await authApi.get(`wrapping/packages/scan/${encodeURIComponent(name)}/`).json()
      )
  })

type PackageLine = { origin_item: string; quantity: number }

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
      client.invalidateQueries({ queryKey: boardKeys.all })
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
    queryKey: boardKeys.orderComplete(departmentId ?? 0, order ?? ''),
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
      client.invalidateQueries({ queryKey: boardKeys.all })
  })

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
  is_bent: z._default(z.boolean(), false),
  requested_by: z._default(z.nullable(z.string()), null),
  requested_at: z._default(z.nullable(z.string()), null)
})

export type Remanufacturing = z.infer<typeof remanufacturingSchema>

// Module-level, so every caller's `select` is the same function and the grouping runs once per fetch.
const byOriginItem = (page: { results: Remanufacturing[] }) => {
  const byItem = new Map<string, Remanufacturing[]>()
  for (const reman of page.results) {
    const list = byItem.get(reman.origin_item)
    if (list) list.push(reman)
    else byItem.set(reman.origin_item, [reman])
  }
  return byItem
}

// One page holds a department's: a remanufacture is an exception, not a queue.
const REMAN_PAGE_SIZE = 200

/** The department's remakes, keyed by the line item each came from, newest first. */
export const remanufacturingsQuery = (departmentId: number | undefined) =>
  queryOptions({
    queryKey: boardKeys.departmentRemanufacturings(departmentId ?? 0),
    enabled: departmentId !== undefined,
    queryFn: async () =>
      z.object({ count: z.number(), results: z.array(remanufacturingSchema) }).parse(
        await authApi
          .get('remanufacturings/', {
            searchParams: { department: departmentId!, limit: REMAN_PAGE_SIZE }
          })
          .json()
      ),
    select: byOriginItem
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
      client.invalidateQueries({ queryKey: boardKeys.all })
  })

// --- Rollforming coils: Supplier, Coil Number, the Slit Line --------------------

const coilOptionSchema = z.object({
  product_id: z.string(),
  description: z._default(z.nullable(z.string()), null),
  width: z._default(z.number(), 0),
  linear_feet: z._default(z.number(), 0)
})

export type CoilOption = z.infer<typeof coilOptionSchema>

/**
 * What a line can be rolled from: the coils of its colour and gauge with a Production Type of Coil
 * p2 (597,543), and the suppliers of those coils p2 (678,460).
 */
export const coilChoicesQuery = (originItem: string | null) =>
  queryOptions({
    queryKey: [...boardKeys.all, 'coil-choices', originItem ?? ''] as const,
    enabled: !!originItem,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [coils, suppliers] = await Promise.all([
        authApi.get(`coil-assignment/${originItem}/coils/`).json(),
        authApi.get(`coil-assignment/${originItem}/suppliers/`).json()
      ])
      return {
        coils: z.array(coilOptionSchema).parse(coils),
        suppliers: z
          .array(z.object({ supplier: z.string() }))
          .parse(suppliers)
          .map(({ supplier }) => supplier)
      }
    }
  })

/** A coil's Lot Numbers with something left on them; picking one fills the Coil Number p2 (690,509). */
export const coilNumbersQuery = (productId: string | null) =>
  queryOptions({
    queryKey: [...boardKeys.all, 'coil-lots', productId ?? ''] as const,
    enabled: !!productId,
    queryFn: async () =>
      z
        .array(z.object({ coil_number: z.string(), on_hand: z._default(z.number(), 0) }))
        .parse(await authApi.get(`coil-assignment/coils/${productId}/lots/`).json())
  })

const slitLineSchema = z.object({
  origin_item: z.string(),
  order: z._default(z.nullable(z.string()), null),
  // A stock order's own S number, product and quantity.
  invoice: z._default(z.nullable(z.string()), null),
  product_id: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  quantity: z._default(z.nullable(z.number()), null),
  production_date: z._default(z.nullable(z.string()), null),
  /** `coil`, `waiting_to_slit` or `slit`. */
  icon: z._default(z.nullable(z.string()), null),
  locked: z._default(z.boolean(), false),
  supplier: z._default(z.nullable(z.string()), null),
  coil_number: z._default(z.nullable(z.string()), null)
})

export type SlitLine = z.infer<typeof slitLineSchema>

/**
 * The Slit Line tab: what waits to be slit, or what has been, by Production Date then Priority
 * p2 (1204,296). A line carries the Supplier and Coil Number the Slit Line filled in, or «waiting...».
 */
export const slitLineQuery = (departmentId: number | undefined, slit: boolean) =>
  queryOptions({
    queryKey: [...boardKeys.all, 'slit-line', departmentId ?? 0, slit] as const,
    enabled: departmentId !== undefined,
    queryFn: async () =>
      z
        .array(slitLineSchema)
        .parse(
          await authApi
            .get('slit-line/', { searchParams: { department_id: departmentId!, slit } })
            .json()
        )
  })

const invalidateCoilAssignment = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: boardKeys.orders() }),
    client.invalidateQueries({ queryKey: [...boardKeys.all, 'slit-line'] })
  ])

/**
 * The Supplier, and a Coil Number under it, onto lines of one Product ID p2 (540,467). Both left out is
 * Undefined — any coil will do; a Coil Number needs a Supplier p2 (709,459).
 */
export const useAssignCoil = () =>
  useMutation({
    meta: { errorTitle: 'The coil was not assigned' },
    mutationFn: (input: {
      originItems: string[]
      supplier: string | null
      coilNumber: string | null
    }) =>
      authApi
        .post('coil-assignment/assign/', {
          json: {
            origin_items: input.originItems,
            supplier: input.supplier,
            coil_number: input.coilNumber
          }
        })
        .json(),
    onSettled: (_, __, ___, ____, { client }) => invalidateCoilAssignment(client)
  })

/**
 * Lines sent to the Slit Line p2 (566,565) with the Supplier and/or Coil Number the Manager chose at
 * Create p2 (586,558) — none leaves them to the Slit Line — or taken back before they are slit.
 */
export const useSlitRequest = () =>
  useMutation({
    meta: { errorTitle: 'The Slit Line was not changed' },
    mutationFn: (
      input:
        | { slit: true; originItems: string[]; supplier: string | null; coilNumber: string | null }
        | { slit: false; originItems: string[] }
    ) =>
      authApi
        .post(input.slit ? 'slit-line/request/' : 'slit-line/cancel/', {
          json: input.slit
            ? {
                origin_items: input.originItems,
                supplier: input.supplier,
                coil_number: input.coilNumber
              }
            : { origin_items: input.originItems }
        })
        .json(),
    onSettled: (_, __, ___, ____, { client }) => invalidateCoilAssignment(client)
  })

/**
 * The Slit Line marks material slit, with the Supplier and Coil Number it used — both may stay
 * Undefined. They fill into the line on the board, its scissors turning green p2 (1086,349).
 */
export const useMarkSlit = () =>
  useMutation({
    meta: { errorTitle: 'The material was not marked slit' },
    mutationFn: (input: {
      originItems: string[]
      supplier: string | null
      coilNumber: string | null
    }) =>
      authApi
        .post('slit-line/mark-slit/', {
          json: {
            origin_items: input.originItems,
            supplier: input.supplier,
            coil_number: input.coilNumber
          }
        })
        .json(),
    onSettled: (_, __, ___, ____, { client }) => invalidateCoilAssignment(client)
  })

// --- Rollforming Queue ------------------------------------------------------------------------

const queueLineSchema = z.object({
  item_id: z._default(z.nullable(z.number()), null),
  origin_item: z._default(z.string(), ''),
  order: z._default(z.nullable(z.string()), null),
  order_number: z._default(z.nullable(z.string()), null),
  product_id: z._default(z.nullable(z.string()), null),
  // What is left of the line to roll.
  quantity: z._default(z.number(), 0),
  length: z._default(z.nullable(z.number()), null),
  status: z._default(z.nullable(z.string()), null)
})

const queueRowSchema = z.object({
  // What a reorder names the row by. It changes when what the row combines does, so a reorder is
  // sent from a fresh read.
  key: z.string(),
  production_date: z._default(z.nullable(z.string()), null),
  material_id: z._default(z.nullable(z.string()), null),
  material: z._default(z.nullable(z.string()), null),
  profile: z._default(z.nullable(z.string()), null),
  linear_feet: z._default(z.number(), 0),
  weight: z._default(z.number(), 0),
  priority: z._default(z.nullable(z.object({ id: z.number(), name: z.string() })), null),
  supplier: z._default(z.nullable(z.string()), null),
  coil_number: z._default(z.nullable(z.string()), null),
  coil_icon: z._default(z.nullable(z.string()), null),
  coil_fields_locked: z._default(z.boolean(), false),
  gauge: z._default(z.nullable(z.string()), null),
  color: z._default(z.nullable(z.string()), null),
  // Runs off the coil in the machine — every row of that Supplier and Coil Number, whatever the day.
  current: z._default(z.boolean(), false),
  is_overdue: z._default(z.boolean(), false),
  lines: z._default(z.array(queueLineSchema), [])
})

export type QueueRow = z.infer<typeof queueRowSchema>

// Under the orders: a coil, a priority or a release that moves an order regroups its material.
const queueKey = (departmentId: number, flowId: number) =>
  [...boardKeys.orders(), 'queue', departmentId, flowId] as const

/**
 * A machine's Queue: the released material still to roll, a row per run of the same day, coil,
 * profile, priority, supplier, coil number and slit state p2 (493,630) — the same rows for the Manager
 * and the Worker p2 (935,297).
 */
export const queueQuery = (departmentId: number | undefined, flowId: number | undefined) =>
  queryOptions({
    queryKey: queueKey(departmentId ?? 0, flowId ?? 0),
    enabled: departmentId !== undefined && flowId !== undefined,
    queryFn: async () =>
      z.array(queueRowSchema).parse(
        await authApi
          .get('rollforming/queue/', {
            searchParams: { department_id: departmentId!, flow_id: flowId! }
          })
          .json()
      )
  })

type ReorderQueueInput = {
  departmentId: number
  flowId: number
  productionDate: string
  /** Every row of the day, once, in the new order; a row cannot cross the day line p2 (530,641). */
  keys: string[]
}

const currentCoilSchema = z.nullable(
  z.object({
    key: z._default(z.nullable(z.string()), null),
    supplier: z.string(),
    coil_number: z.string(),
    material_id: z._default(z.nullable(z.string()), null),
    gauge: z._default(z.nullable(z.string()), null),
    color: z._default(z.nullable(z.string()), null),
    set_at: z._default(z.nullable(z.string()), null)
  })
)

export type CurrentCoil = NonNullable<z.infer<typeof currentCoilSchema>>

const currentCoilKey = (flowId: number) => [...boardKeys.orders(), 'current-coil', flowId] as const

/** «Current Coil In The Rollformer» p2 (1007,312): what the machine is rolling off, or `null`. */
export const currentCoilQuery = (flowId: number | undefined) =>
  queryOptions({
    queryKey: currentCoilKey(flowId ?? 0),
    enabled: flowId !== undefined,
    queryFn: async () =>
      currentCoilSchema.parse(
        await authApi.get(`rollforming/machines/${flowId}/current-coil/`).json()
      )
  })

type CurrentCoilInput = {
  departmentId: number
  flowId: number
  /** The Queue row whose coil goes in; `null` takes the coil out. */
  key: string | null
}

/**
 * The Worker ticks the coil they put in the machine p2 (902,356); it replaces the one before. A row
 * with no Supplier or Coil Number is refused.
 */
export const useSetCurrentCoil = () =>
  useMutation({
    meta: { errorTitle: 'The coil in the machine did not change' },
    mutationFn: ({ flowId, key }: CurrentCoilInput) =>
      key === null
        ? authApi.delete(`rollforming/machines/${flowId}/current-coil/`)
        : authApi.post(`rollforming/machines/${flowId}/current-coil/`, { json: { key } }),
    onSettled: (_, __, { departmentId, flowId }, ___, { client }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: currentCoilKey(flowId) }),
        client.invalidateQueries({ queryKey: queueKey(departmentId, flowId) })
      ])
  })

/** The Manager drags the material within its day p2 (530,641), (498,662). */
export const useReorderQueue = () =>
  useMutation({
    meta: { errorTitle: 'The Queue kept its order' },
    mutationFn: ({ departmentId, flowId, productionDate, keys }: ReorderQueueInput) =>
      authApi
        .post('rollforming/queue/reorder/', {
          json: {
            department_id: departmentId,
            flow_id: flowId,
            production_date: productionDate,
            keys
          }
        })
        .json(),
    onSettled: (_, __, { departmentId, flowId }, ____, { client }) =>
      client.invalidateQueries({ queryKey: queueKey(departmentId, flowId) })
  })
