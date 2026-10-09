import { authApi } from '@/api/client'
import {
  infiniteQueryOptions,
  keepPreviousData,
  type InfiniteData,
  queryOptions,
  useMutation,
  type QueryClient
} from '@tanstack/react-query'
import { departmentRole } from '@/lib/departments'
import * as z from 'zod/mini'

const shippingKeys = {
  all: ['shipping'] as const,
  unscheduled: (filter: UnscheduledFilter) => [...shippingKeys.all, 'unscheduled', filter] as const,
  totals: (selection: Selection) => [...shippingKeys.all, 'totals', selection] as const,
  selection: (selection: Selection, shipDate: string | null) =>
    [...shippingKeys.all, 'selection', { ...selection, shipDate }] as const,
  scheduledDays: () => [...shippingKeys.all, 'scheduled'] as const,
  scheduled: (shipDate: string) => [...shippingKeys.scheduledDays(), shipDate] as const,
  allLoads: () => [...shippingKeys.all, 'loads'] as const,
  loads: (truckId: number, shipDate: string) =>
    [...shippingKeys.allLoads(), truckId, shipDate] as const,
  packages: (order: string) => [...shippingKeys.all, 'packages', order] as const,
  lines: (order: string) => [...shippingKeys.all, 'lines', order] as const,
  overdue: () => [...shippingKeys.all, 'overdue'] as const,
  route: (loadId: number) => [...shippingKeys.all, 'route', loadId] as const
}

/** What goes onto a truck together: sales orders by autoid, supplier pickups by their id. */
export type Selection = { orders: string[]; pickupIds: number[] }

const orderNoteSchema = z.object({
  has_note: z._default(z.boolean(), false),
  text: z._default(z.nullable(z.string()), null),
  author: z._default(z.nullable(z.string()), null),
  created_at: z._default(z.nullable(z.string()), null),
  read: z._default(z.boolean(), false)
})

export type OrderNote = z.infer<typeof orderNoteSchema>

const NO_NOTE: OrderNote = {
  has_note: false,
  text: null,
  author: null,
  created_at: null,
  read: false
}

// «2 of 3 ready»: the shipper sends what is done when the customer needs it (round 10, C1). A pickup
// carries no order, so 0 of 0.
const readinessShape = {
  lines_total: z._default(z.number(), 0),
  lines_ready: z._default(z.number(), 0)
}

export type Readiness = { lines_total: number; lines_ready: number }

const unscheduledOrderSchema = z.object({
  ...readinessShape,
  order: z.string(),
  order_number: z._default(z.nullable(z.string()), null),
  customer: z._default(z.nullable(z.string()), null),
  address: z._default(z.nullable(z.string()), null),
  city: z._default(z.nullable(z.string()), null),
  state: z._default(z.nullable(z.string()), null),
  zip: z._default(z.nullable(z.string()), null),
  country: z._default(z.nullable(z.string()), null),
  entry_date: z._default(z.nullable(z.string()), null),
  ship_date: z._default(z.nullable(z.string()), null),
  weight: z._default(z.number(), 0),
  longest_length: z._default(z.number(), 0),
  // EBMS's own; the list holds deliveries only until customer pickups are settled
  // (`client-questions.md` 6).
  ship_via: z._default(z.nullable(z.string()), null),
  // Past its ship date and not delivered p3 (605,628).
  is_overdue: z._default(z.boolean(), false),
  // The salesman's note and whether this user has dealt with it p3 (592,338).
  note: z._default(z.nullable(orderNoteSchema), null),
  // `null` until the app has a sales order for it; the first priority set makes one.
  sales_order_id: z._default(z.nullable(z.number()), null),
  // The order's priority in Shipping p3 (560,202).
  priority: z._default(
    z.nullable(z.object({ id: z.number(), name: z._default(z.string(), '') })),
    null
  )
})

export type UnscheduledOrder = z.infer<typeof unscheduledOrderSchema>

// Every open delivery in EBMS is a long list.
export const UNSCHEDULED_PAGE = 100

const unscheduledPageSchema = z.object({
  count: z._default(z.number(), 0),
  results: z._default(z.array(unscheduledOrderSchema), [])
})

/** Both ship-date ends are included; either may be left open. */
export type UnscheduledFilter = { search: string; shipFrom?: string; shipTo?: string }

/**
 * The delivery orders still waiting for a ship date and a truck p3 (605,182). A long list — every open
 * delivery in EBMS — so it is read a page at a time, each «Show more» fetching only the next.
 */
export const unscheduledQuery = ({ search, shipFrom, shipTo }: UnscheduledFilter) =>
  infiniteQueryOptions({
    queryKey: shippingKeys.unscheduled({ search, shipFrom, shipTo }),
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      unscheduledPageSchema.parse(
        await authApi
          .get('shipping/unscheduled/', {
            searchParams: {
              limit: UNSCHEDULED_PAGE,
              offset: pageParam,
              ...(search ? { search } : {}),
              ...(shipFrom ? { ship_date__gte: shipFrom } : {}),
              ...(shipTo ? { ship_date__lte: shipTo } : {})
            }
          })
          .json()
      ),
    getNextPageParam: (last, pages) => {
      const read = pages.reduce((total, page) => total + page.results.length, 0)
      return read < last.count && last.results.length ? read : undefined
    }
  })

const shipmentTotalsSchema = z.object({
  count: z._default(z.number(), 0),
  total_weight: z._default(z.number(), 0),
  longest_length: z._default(z.nullable(z.number()), null)
})

const NO_TOTALS = { count: 0, total_weight: 0, longest_length: null }

export type ShipmentTotals = z.infer<typeof shipmentTotalsSchema>

const selectionTotalsSchema = z.object({
  delivery: z._default(shipmentTotalsSchema, NO_TOTALS),
  pickup: z._default(shipmentTotalsSchema, NO_TOTALS)
})

/**
 * The Schedule window's two boxes: the Delivery Orders' weight and longest length p3 (586,243), and
 * the supplier Pickups' weight p3 (586,246), before any date or truck is picked.
 */
export const selectionTotalsQuery = (selection: Selection) =>
  queryOptions({
    queryKey: shippingKeys.totals(selection),
    enabled: selection.orders.length + selection.pickupIds.length > 0,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      selectionTotalsSchema.parse(
        await authApi
          .post('shipping/selection-totals/', {
            json: { orders: selection.orders, pickup_ids: selection.pickupIds }
          })
          .json()
      )
  })

const truckPanelSchema = z.object({
  truck_id: z.number(),
  name: z._default(z.string(), ''),
  weight_limit: z._default(z.nullable(z.number()), null),
  max_length: z._default(z.nullable(z.number()), null),
  already_assigned_weight: z._default(z.number(), 0),
  selected_delivery: z._default(shipmentTotalsSchema, NO_TOTALS),
  selected_pickup: z._default(shipmentTotalsSchema, NO_TOTALS),
  assigned_weight: z._default(z.number(), 0),
  over_weight_limit: z._default(z.boolean(), false)
})

export type TruckPanel = z.infer<typeof truckPanelSchema>

/**
 * The Schedule window's truck cards for a day: what each already carries, and what it would carry
 * with the selection on it — orange over its limit, and nothing more p3 (587,259). A read, sent as a
 * POST because the selection rides in the body.
 */
export const truckPanelsQuery = (selection: Selection, shipDate: string | null) =>
  queryOptions({
    queryKey: shippingKeys.selection(selection, shipDate),
    enabled: !!shipDate && selection.orders.length + selection.pickupIds.length > 0,
    queryFn: async () =>
      z.array(truckPanelSchema).parse(
        await authApi
          .post('shipping/truck-panels/', {
            json: { orders: selection.orders, pickup_ids: selection.pickupIds, ship_date: shipDate }
          })
          .json()
      )
  })

// Awaited, so a button stays busy until the Loads it moved are read back: a second click on a stale
// Load would be refused by the server.
const refreshLoads = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: shippingKeys.scheduledDays() }),
    client.invalidateQueries({ queryKey: shippingKeys.allLoads() })
  ])

/** A POST on the day's Loads: they and the truck cards are read back, nothing else. */
const useLoadPost = <T>(errorTitle: string, post: (input: T) => Promise<unknown>) =>
  useMutation({
    meta: { errorTitle },
    mutationFn: post,
    onSettled: (_, __, ___, ____, { client }) => refreshLoads(client)
  })

/**
 * Apply: the selection goes on the truck for the day, leaves Unscheduled and shows under that date and
 * truck in Scheduled p3 (566,273). The server pushes the ship date to EBMS. Applied again to orders
 * not on a Load yet, it reschedules them p3 (591,341).
 */
export const useApplyShipping = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'The orders were not scheduled' },
    mutationFn: (input: Selection & { shipDate: string; truckId: number }) =>
      authApi
        .post('shipping/apply/', {
          json: {
            orders: input.orders,
            pickup_ids: input.pickupIds,
            ship_date: input.shipDate,
            truck_id: input.truckId
          }
        })
        .json(),
    // Closed first: the refetch takes the scheduled orders out of the open window's selection.
    onSuccess: (_, __, ___, { client }) => {
      onSuccess()
      void client.invalidateQueries({ queryKey: [...shippingKeys.all, 'unscheduled'] })
      void client.invalidateQueries({ queryKey: shippingKeys.scheduledDays() })
    }
  })

const kindTotalsSchema = z.object({
  count: z._default(z.number(), 0),
  total_weight: z._default(z.number(), 0),
  unassigned_count: z._default(z.number(), 0),
  unassigned_weight: z._default(z.number(), 0),
  all_assigned: z._default(z.boolean(), true),
  over_weight_limit: z._default(z.boolean(), false)
})

const assignmentSchema = z.object({
  ...readinessShape,
  assignment_id: z.number(),
  order: z._default(z.nullable(z.string()), null),
  order_number: z._default(z.nullable(z.string()), null),
  customer: z._default(z.nullable(z.string()), null),
  kind: z._default(z.string(), 'delivery'),
  weight: z._default(z.number(), 0),
  load_id: z._default(z.nullable(z.number()), null),
  status: z._default(z.nullable(z.string()), null),
  // Past its ship date and not delivered p3 (605,628).
  is_overdue: z._default(z.boolean(), false)
})

export type Assignment = z.infer<typeof assignmentSchema>

const truckCardSchema = z.object({
  truck_id: z.number(),
  name: z._default(z.string(), ''),
  weight_limit: z._default(z.nullable(z.number()), null),
  delivery: kindTotalsSchema,
  pickup: kindTotalsSchema,
  orders: z._default(z.array(assignmentSchema), []),
  // Holding an overdue order p3 (593,606).
  is_overdue: z._default(z.boolean(), false)
})

export type TruckCard = z.infer<typeof truckCardSchema>

/** A tab for each truck on the day, with what it carries and what is not on a Load yet p3 (594,308). */
export const scheduledQuery = (shipDate: string) =>
  queryOptions({
    queryKey: shippingKeys.scheduled(shipDate),
    queryFn: async () =>
      z
        .array(truckCardSchema)
        .parse(
          await authApi.get('shipping/scheduled/', { searchParams: { ship_date: shipDate } }).json()
        )
  })

const loadTabSchema = z.object({
  // `null` on a day the truck has no Load yet: the tab is offered, and Add To Load creates it.
  load_id: z._default(z.nullable(z.number()), null),
  name: z._default(z.string(), ''),
  marker: z._default(z.string(), ''),
  position: z._default(z.number(), 0),
  status: z._default(z.nullable(z.string()), null),
  weight: z._default(z.number(), 0),
  orders: z._default(z.array(assignmentSchema), []),
  is_empty: z._default(z.boolean(), false),
  // Past its day and not delivered p3 (593,606); an empty Load never is.
  is_overdue: z._default(z.boolean(), false)
})

export type LoadTab = z.infer<typeof loadTabSchema>
/** A Load that exists: everything past Add To Load — the route, release, loading — is addressed to it. */
export type Load = LoadTab & { load_id: number }

export const isLoad = (tab: LoadTab): tab is Load => tab.load_id !== null

/** A truck's Loads for the day, the empty one to fill next among them p3 (592,359). */
export const loadsQuery = (truckId: number, shipDate: string) =>
  queryOptions({
    queryKey: shippingKeys.loads(truckId, shipDate),
    queryFn: async () =>
      z
        .array(loadTabSchema)
        .parse(
          await authApi
            .get(`shipping/trucks/${truckId}/loads/`, { searchParams: { ship_date: shipDate } })
            .json()
        )
  })

const packageSchema = z.object({
  package_id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  weight: z._default(z.nullable(z.number()), null),
  location: z._default(z.nullable(z.string()), null),
  is_loaded: z._default(z.boolean(), false)
})

export type ShippingPackage = z.infer<typeof packageSchema>

const dayLoadSchema = z.object({
  ...loadTabSchema.shape,
  load_id: z.number(),
  // Each order's packages come with the day, so Loading reads them in this one request.
  orders: z._default(
    z.array(
      z.object({ ...assignmentSchema.shape, packages: z._default(z.array(packageSchema), []) })
    ),
    []
  ),
  truck: z._default(z.nullable(z.object({ id: z.number(), name: z.string() })), null)
})

export type DayLoad = z.infer<typeof dayLoadSchema>

/**
 * Every truck's Loads of the day in one of `statuses`, sorted by truck then Load: what Loading and the
 * Driver read. Empty Loads are left out.
 */
export const dayLoadsQuery = (shipDate: string, statuses: readonly string[]) =>
  queryOptions({
    queryKey: [...shippingKeys.allLoads(), 'day', shipDate, statuses] as const,
    queryFn: async () =>
      z.array(dayLoadSchema).parse(
        await authApi
          .get('shipping/loads/', {
            // This one is a FastAPI list: `status` repeated, not comma-joined.
            searchParams: new URLSearchParams([
              ['ship_date', shipDate],
              ...statuses.map(status => ['status', status])
            ])
          })
          .json()
      )
  })

/** Add To Load: the ticked orders go on the Load; `loadId` is the tab being filled, `null` a new one. */
export const useAddToLoad = () =>
  useLoadPost(
    'The orders were not added to the Load',
    (input: { assignmentIds: number[]; loadId: number | null }) =>
      authApi
        .post('shipping/loads/add/', {
          json: { assignment_ids: input.assignmentIds, load_id: input.loadId }
        })
        .json()
  )

export const useRemoveFromLoad = () =>
  useLoadPost('The order stayed on the Load', (assignmentIds: number[]) =>
    authApi.post('shipping/loads/remove/', { json: { assignment_ids: assignmentIds } }).json()
  )

/**
 * Release To Loading: the Load shows up in the Loading window, and it and its orders go Not Started
 * p3 (598,468).
 */
export const useReleaseLoad = () =>
  useLoadPost('The Load was not released', (loadId: number) =>
    authApi.post(`shipping/loads/${loadId}/release/`).json()
  )

const shippingLineSchema = z.object({
  origin_item: z.string(),
  // `null` for a line no department makes — bought in, so nothing to wait for.
  department: z._default(z.nullable(z.string()), null),
  product_id: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  quantity: z._default(z.number(), 0),
  packaged: z._default(z.number(), 0),
  status: z._default(z.nullable(z.string()), null),
  ready: z._default(z.boolean(), false)
})

export type ShippingLine = z.infer<typeof shippingLineSchema>

/** Every line of the order in every department, the ones not ready yet first. */
export const orderLinesQuery = (order: string) =>
  queryOptions({
    queryKey: shippingKeys.lines(order),
    queryFn: async () =>
      z.array(shippingLineSchema).parse(await authApi.get(`shipping/orders/${order}/lines/`).json())
  })

/** An order's packages, each saying whether it is on the truck yet. */
export const orderPackagesQuery = (order: string) =>
  queryOptions({
    queryKey: shippingKeys.packages(order),
    queryFn: async () =>
      z.array(packageSchema).parse(await authApi.get(`wrapping/orders/${order}/packages/`).json())
  })

type MarkLoadedInput = { loadId: number; packageIds: number[]; loaded: boolean }

const patchLoaded = (
  client: QueryClient,
  { loadId, packageIds }: MarkLoadedInput,
  loaded: boolean
) => {
  const marked = new Set(packageIds)
  client.setQueriesData<DayLoad[]>({ queryKey: [...shippingKeys.allLoads(), 'day'] }, loads =>
    loads?.map(load =>
      load.load_id === loadId
        ? {
            ...load,
            orders: load.orders.map(order => ({
              ...order,
              packages: order.packages.map(pack =>
                marked.has(pack.package_id) ? { ...pack, is_loaded: loaded } : pack
              )
            }))
          }
        : load
    )
  )
}

const markLoadedKey = ['shipping', 'mark-loaded'] as const

/**
 * Packages scanned onto the truck, or taken back off. The statuses follow on the server: the first
 * package Loading, all of an order's Loaded, all of the Load's Loaded p3 (592,489)-(592,523).
 *
 * The tick shows at once and comes off if refused; the statuses follow with the refetch.
 */
export const useMarkLoaded = () =>
  useMutation({
    meta: { errorTitle: 'The package was not marked' },
    mutationKey: markLoadedKey,
    // One package ticked twice quickly reaches the server in the order it was ticked.
    scope: { id: 'mark-loaded' },
    mutationFn: (input: MarkLoadedInput) =>
      authApi
        .post(`shipping/loads/${input.loadId}/packages-loaded/`, {
          json: { package_ids: input.packageIds, loaded: input.loaded }
        })
        .json(),
    onMutate: async (input, { client }) => {
      await client.cancelQueries({ queryKey: [...shippingKeys.allLoads(), 'day'] })
      patchLoaded(client, input, input.loaded)
    },
    onError: (_, input, __, { client }) => patchLoaded(client, input, !input.loaded),
    // The day's Loads carry the packages, so one refetch brings the ticks and the statuses.
    onSettled: (_, __, ___, ____, { client }) => {
      if (client.isMutating({ mutationKey: markLoadedKey }) > 1) return
      void refreshLoads(client)
    }
  })

/** The Driver has left: the Load and its orders go En Route, and lock p3 (592,540), (592,543). */
export const useLeftWarehouse = () =>
  useLoadPost('The Load did not leave', (loadId: number) =>
    authApi.post(`shipping/loads/${loadId}/left-warehouse/`).json()
  )

/** An order delivered; the Load follows once every one is p3 (592,558), (592,574). */
export const useDelivered = () =>
  useLoadPost('The order was not marked delivered', (assignmentIds: number[]) =>
    authApi.post('shipping/delivered/', { json: { assignment_ids: assignmentIds } }).json()
  )

/** The finished Load closes, its locations free once the last package left p3 (598,538). */
export const useCompleteLoad = () =>
  useLoadPost('The Load was not completed', (loadId: number) =>
    authApi.post(`shipping/loads/${loadId}/complete/`).json()
  )

const stopSchema = z.object({
  // `null` on the warehouse of a route never built: shown first, saved by the first plan.
  route_id: z._default(z.nullable(z.number()), null),
  /** The delivery's place in the run; the warehouse the truck leaves from has none. */
  sequence: z._default(z.nullable(z.number()), null),
  dispatch_point: z._default(z.boolean(), false),
  order_number: z._default(z.nullable(z.string()), null),
  name: z._default(z.nullable(z.string()), null),
  address: z._default(z.nullable(z.string()), null),
  city: z._default(z.nullable(z.string()), null),
  state: z._default(z.nullable(z.string()), null),
  zip: z._default(z.nullable(z.string()), null),
  country: z._default(z.nullable(z.string()), null)
})

export type Stop = z.infer<typeof stopSchema>

/** A Load's stops in delivery order, the warehouse first p3 (617,441), planned or not. */
export const routeQuery = (loadId: number) =>
  queryOptions({
    queryKey: shippingKeys.route(loadId),
    queryFn: async () =>
      z.array(stopSchema).parse(await authApi.get(`shipping/loads/${loadId}/route/`).json())
  })

/**
 * Plans the run from the Load's orders. Stops already placed keep their place; `rebuild` starts over,
 * for a Load whose orders have changed since.
 */
export const usePlanRoute = () =>
  useMutation({
    meta: { errorTitle: 'The route was not planned' },
    mutationFn: async (input: { loadId: number; rebuild: boolean }) =>
      z.array(stopSchema).parse(
        await authApi
          .post(`shipping/loads/${input.loadId}/route/`, {
            searchParams: { rebuild: input.rebuild }
          })
          .json()
      ),
    onSuccess: (stops, input, _, { client }) =>
      client.setQueryData(shippingKeys.route(input.loadId), stops)
  })

/** The deliveries in their new order after a drag; the server wants the whole sequence. */
export const useReorderRoute = () =>
  useMutation({
    meta: { errorTitle: 'The delivery order was not saved' },
    mutationFn: async (input: { loadId: number; routeIds: number[] }) =>
      z.array(stopSchema).parse(
        await authApi
          .patch(`shipping/loads/${input.loadId}/route/`, {
            json: { route_ids: input.routeIds }
          })
          .json()
      ),
    onSettled: (_, __, input, ___, { client }) =>
      client.invalidateQueries({ queryKey: shippingKeys.route(input.loadId) })
  })

export const pickupPayloadSchema = z.object({
  supplier: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, 'Supplier is required'),
      z.maxLength(255, 'At most 255 characters')
    ),
  description: z.string().check(z.trim(), z.maxLength(255, 'At most 255 characters')),
  weight: z.nullable(z.number().check(z.nonnegative('Cannot be negative'))),
  length: z.nullable(z.number().check(z.nonnegative('Cannot be negative')))
})

export type PickupPayload = z.infer<typeof pickupPayloadSchema>

/**
 * A supplier pickup — «things that a delivery driver needs to pickup for a supplier», not a customer
 * pickup p3 (586,248) — straight onto the truck for the day.
 */
export const useCreatePickup = () =>
  useLoadPost(
    'The pickup was not added',
    (input: PickupPayload & { shipDate: string; truckId: number }) =>
      authApi
        .post('shipping/pickups/', {
          json: {
            supplier: input.supplier,
            description: input.description || null,
            weight: input.weight,
            length: input.length,
            ship_date: input.shipDate,
            truck_id: input.truckId
          }
        })
        .json()
  )

/** Every order's note on a page of Unscheduled, keyed as the shared Order Notes window reads them. */
export const notesOf = (orders: UnscheduledOrder[]) =>
  Object.fromEntries(orders.map(order => [order.order, order.note ?? NO_NOTE]))

/**
 * Marks an order's note dealt with, or takes that back; the rows carry the state. The dot turns at
 * once and back if refused.
 */
export const useSetOrderNoteRead = () =>
  useMutation({
    meta: { errorTitle: 'The note was not updated' },
    scope: { id: 'shipping-note-read' },
    mutationFn: ({ order, read }: { order: string; read: boolean }) =>
      authApi.post(`orders/${order}/note/${read ? 'read' : 'unread'}/`).json(),
    onMutate: async ({ order, read }, { client }) => {
      await client.cancelQueries({ queryKey: [...shippingKeys.all, 'unscheduled'] })
      patchUnscheduled(client, order, row => ({ ...row, note: row.note && { ...row.note, read } }))
    },
    onError: (_, { order, read }, __, { client }) =>
      patchUnscheduled(client, order, row => ({
        ...row,
        note: row.note && { ...row.note, read: !read }
      })),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: [...shippingKeys.all, 'unscheduled'] })
  })

/** The ship days holding a shipment past its date and not delivered: red in the calendar p3 (605,628). */
export const overdueDaysQuery = queryOptions({
  queryKey: shippingKeys.overdue(),
  queryFn: async () =>
    z
      .object({ days: z._default(z.array(z.string()), []) })
      .parse(await authApi.get('shipping/overdue/').json()).days
})

const departmentSchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  code: z._default(z.string(), ''),
  position: z._default(z.nullable(z.number()), null),
  // lb; `null` is no ceiling. Trim's schema reads it too, and whichever fetches first fills the
  // shared cache, so every copy of this schema has to keep it.
  max_package_weight: z._default(z.nullable(z.number()), null)
})

const departmentsQuery = queryOptions({
  queryKey: ['departments', 'all'] as const,
  queryFn: async () => z.array(departmentSchema).parse(await authApi.get('departments/all/').json())
})

/** The user's role inside one department. Same key as the boards', so they share the answer. */
const departmentRoleQuery = (userId: number, departmentId: number) =>
  queryOptions({
    queryKey: ['departments', 'role', userId, departmentId] as const,
    queryFn: async () =>
      z
        .array(z.object({ user: z.number(), department: z.number(), role: z.string() }))
        .parse(
          await authApi
            .get('departments/users/assignments/', {
              searchParams: { user_id: userId, department_id: departmentId }
            })
            .json()
        )
        .find(row => row.user === userId && row.department === departmentId)?.role ?? null
  })

/**
 * The user's role in the Shipping department: `manager`, `worker`, `viewer`, or `null` for none. The
 * sidebar and the guards on Shipping's windows share it. `fetchQuery`, not `ensureQueryData`, so an
 * assignment invalidated in Settings is asked again rather than read stale; the inner reads leave
 * retrying to this query, or each of its retries would retry them again.
 */
export const shippingRoleQuery = (user: { id: number; role: string }) =>
  queryOptions({
    queryKey: ['departments', 'shipping-role', user.id, user.role] as const,
    queryFn: async ({ client }) => {
      const shipping = (await client.fetchQuery({ ...departmentsQuery, retry: false })).find(
        department => department.code === 'shipping'
      )
      const assigned = shipping
        ? await client.fetchQuery({ ...departmentRoleQuery(user.id, shipping.id), retry: false })
        : null
      return departmentRole(user.role, assigned)
    }
  })

/** Shipping is a department of its own, with its own priorities (`client-questions.md` 7). */
export const shippingDepartmentQuery = queryOptions({
  ...departmentsQuery,
  select: departments => departments.find(department => department.code === 'shipping') ?? null
})

const prioritySchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  color: z._default(z.nullable(z.string()), null),
  position: z._default(z.nullable(z.number()), null),
  // The board's copy reads it, and the cache entry is shared.
  department: z._default(z.nullable(z.number()), null)
})

export type Priority = z.infer<typeof prioritySchema>

/** The priorities to pick from in Shipping, Hierarchy 1 on top. Same key as the boards'. */
export const prioritiesQuery = (departmentId: number | undefined) =>
  queryOptions({
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
    select: (priorities: Priority[]) =>
      priorities.toSorted(
        (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER)
      )
  })

type UnscheduledPages = InfiniteData<z.infer<typeof unscheduledPageSchema>>

const patchUnscheduled = (
  client: QueryClient,
  order: string,
  patch: (row: UnscheduledOrder) => UnscheduledOrder
) =>
  client.setQueriesData<UnscheduledPages>(
    { queryKey: [...shippingKeys.all, 'unscheduled'] },
    data =>
      data && {
        ...data,
        pages: data.pages.map(page => ({
          ...page,
          results: page.results.map(row => (row.order === order ? patch(row) : row))
        }))
      }
  )

/**
 * An order's priority in Shipping. It shows the moment it is picked and snaps back if refused; an
 * order the app has no sales order for gets one first. `scope` keeps one order's picks in order.
 */
export const useSetShippingPriority = (order: string) =>
  useMutation({
    meta: { errorTitle: 'The priority was not saved' },
    scope: { id: `shipping-priority:${order}` },
    mutationFn: async (input: { departmentId: number; priority: Priority | null }, { client }) => {
      // Read now, not when clicked: a pick queued behind the one that made the sales order uses it.
      let id = client
        .getQueriesData<UnscheduledPages>({ queryKey: [...shippingKeys.all, 'unscheduled'] })
        .flatMap(([, data]) => data?.pages.flatMap(page => page.results) ?? [])
        .find(row => row.order === order)?.sales_order_id
      if (!id) {
        id = z
          .object({ id: z.number() })
          .parse(await authApi.post('sales-orders/', { json: { order } }).json()).id
        const created = id
        patchUnscheduled(client, order, row => ({ ...row, sales_order_id: created }))
      }
      return authApi
        .patch(`sales-orders/${id}/departments/${input.departmentId}/`, {
          json: { priority: input.priority?.id ?? null }
        })
        .json()
    },
    onMutate: async ({ priority }, { client }) => {
      await client.cancelQueries({ queryKey: [...shippingKeys.all, 'unscheduled'] })
      patchUnscheduled(client, order, row => ({
        ...row,
        priority: priority && { id: priority.id, name: priority.name }
      }))
    },
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: [...shippingKeys.all, 'unscheduled'] })
  })
