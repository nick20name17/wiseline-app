import { authApi } from '@/api/client'
import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  useMutation,
  type QueryClient
} from '@tanstack/react-query'
import * as z from 'zod/mini'

const shippingKeys = {
  all: ['shipping'] as const,
  unscheduled: (search: string) => [...shippingKeys.all, 'unscheduled', { search }] as const,
  totals: (selection: Selection) => [...shippingKeys.all, 'totals', selection] as const,
  selection: (selection: Selection, shipDate: string | null) =>
    [...shippingKeys.all, 'selection', { ...selection, shipDate }] as const,
  scheduledDays: () => [...shippingKeys.all, 'scheduled'] as const,
  scheduled: (shipDate: string) => [...shippingKeys.scheduledDays(), shipDate] as const,
  allLoads: () => [...shippingKeys.all, 'loads'] as const,
  loads: (truckId: number, shipDate: string) =>
    [...shippingKeys.allLoads(), truckId, shipDate] as const,
  packages: (order: string) => [...shippingKeys.all, 'packages', order] as const,
  orderNotes: (orders: string[]) => [...shippingKeys.all, 'order-notes', orders] as const,
  route: (loadId: number) => [...shippingKeys.all, 'route', loadId] as const
}

/** What goes onto a truck together: sales orders by autoid, supplier pickups by their id. */
export type Selection = { orders: string[]; pickupIds: number[] }

const unscheduledOrderSchema = z.object({
  order: z.string(),
  order_number: z._default(z.nullable(z.string()), null),
  customer: z._default(z.nullable(z.string()), null),
  address: z._default(z.nullable(z.string()), null),
  city: z._default(z.nullable(z.string()), null),
  entry_date: z._default(z.nullable(z.string()), null),
  ship_date: z._default(z.nullable(z.string()), null),
  weight: z._default(z.number(), 0),
  longest_length: z._default(z.number(), 0),
  ship_via: z._default(z.nullable(z.string()), null)
})

export type UnscheduledOrder = z.infer<typeof unscheduledOrderSchema>

// Every open delivery in EBMS is a long list.
export const UNSCHEDULED_PAGE = 100

const unscheduledPageSchema = z.object({
  count: z._default(z.number(), 0),
  results: z._default(z.array(unscheduledOrderSchema), [])
})

/**
 * The delivery orders still waiting for a ship date and a truck p3 (605,182). A long list — every open
 * delivery in EBMS — so it is read a page at a time, each «Show more» fetching only the next.
 */
export const unscheduledQuery = (search: string) =>
  infiniteQueryOptions({
    queryKey: shippingKeys.unscheduled(search),
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      unscheduledPageSchema.parse(
        await authApi
          .get('shipping/unscheduled/', {
            searchParams: {
              limit: UNSCHEDULED_PAGE,
              offset: pageParam,
              ...(search ? { search } : {})
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
  assignment_id: z.number(),
  order: z._default(z.nullable(z.string()), null),
  order_number: z._default(z.nullable(z.string()), null),
  customer: z._default(z.nullable(z.string()), null),
  kind: z._default(z.string(), 'delivery'),
  weight: z._default(z.number(), 0),
  load_id: z._default(z.nullable(z.number()), null),
  status: z._default(z.nullable(z.string()), null)
})

export type Assignment = z.infer<typeof assignmentSchema>

const truckCardSchema = z.object({
  truck_id: z.number(),
  name: z._default(z.string(), ''),
  weight_limit: z._default(z.nullable(z.number()), null),
  delivery: kindTotalsSchema,
  pickup: kindTotalsSchema,
  orders: z._default(z.array(assignmentSchema), [])
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
  is_empty: z._default(z.boolean(), false)
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

const dayLoadSchema = z.object({
  ...loadTabSchema.shape,
  load_id: z.number(),
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

const packageSchema = z.object({
  package_id: z.number(),
  name: z._default(z.nullable(z.string()), null),
  weight: z._default(z.nullable(z.number()), null),
  location: z._default(z.nullable(z.string()), null),
  is_loaded: z._default(z.boolean(), false)
})

export type ShippingPackage = z.infer<typeof packageSchema>

/** An order's packages, each saying whether it is on the truck yet. */
export const orderPackagesQuery = (order: string) =>
  queryOptions({
    queryKey: shippingKeys.packages(order),
    queryFn: async () =>
      z.array(packageSchema).parse(await authApi.get(`wrapping/orders/${order}/packages/`).json())
  })

/**
 * Packages scanned onto the truck, or taken back off. The statuses follow on the server: the first
 * package Loading, all of an order's Loaded, all of the Load's Loaded p3 (592,489)-(592,523).
 */
export const useMarkLoaded = () =>
  useMutation({
    meta: { errorTitle: 'The package was not marked' },
    mutationFn: (input: { loadId: number; order: string; packageIds: number[]; loaded: boolean }) =>
      authApi
        .post(`shipping/loads/${input.loadId}/packages-loaded/`, {
          json: { package_ids: input.packageIds, loaded: input.loaded }
        })
        .json(),
    onSettled: (_, __, input, ___, { client }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: shippingKeys.packages(input.order) }),
        refreshLoads(client)
      ])
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
  route_id: z.number(),
  /** The delivery's place in the run; the warehouse the truck leaves from has none. */
  sequence: z._default(z.nullable(z.number()), null),
  dispatch_point: z._default(z.boolean(), false),
  order_number: z._default(z.nullable(z.string()), null),
  name: z._default(z.nullable(z.string()), null),
  address: z._default(z.nullable(z.string()), null),
  city: z._default(z.nullable(z.string()), null),
  state: z._default(z.nullable(z.string()), null)
})

export type Stop = z.infer<typeof stopSchema>

/** A Load's stops in delivery order, the warehouse first p3 (617,441). Empty until it is planned. */
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

const orderNoteSchema = z.object({
  has_note: z._default(z.boolean(), false),
  text: z._default(z.nullable(z.string()), null),
  author: z._default(z.nullable(z.string()), null),
  created_at: z._default(z.nullable(z.string()), null),
  read: z._default(z.boolean(), false)
})

/** The salesman's note on each order on screen, in one call p3 (592,338). */
export const orderNotesQuery = (orders: string[]) =>
  queryOptions({
    queryKey: shippingKeys.orderNotes(orders),
    enabled: orders.length > 0,
    queryFn: async () =>
      z
        .record(z.string(), orderNoteSchema)
        .parse(await authApi.post('orders/notes/', { json: { orders } }).json())
  })

/** Marks an order's note dealt with, or takes that back. */
export const useSetOrderNoteRead = () =>
  useMutation({
    meta: { errorTitle: 'The note was not updated' },
    mutationFn: ({ order, read }: { order: string; read: boolean }) =>
      authApi.post(`orders/${order}/note/${read ? 'read' : 'unread'}/`).json(),
    onSettled: (_, __, ___, ____, { client }) =>
      client.invalidateQueries({ queryKey: [...shippingKeys.all, 'order-notes'] })
  })
