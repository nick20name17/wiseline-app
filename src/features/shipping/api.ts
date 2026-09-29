import { authApi } from '@/api/client'
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  type QueryClient
} from '@tanstack/react-query'
import * as z from 'zod/mini'

const shippingKeys = {
  all: ['shipping'] as const,
  unscheduled: (search: string, limit: number) =>
    [...shippingKeys.all, 'unscheduled', { search, limit }] as const,
  selection: (orders: string[], shipDate: string | null) =>
    [...shippingKeys.all, 'selection', { orders, shipDate }] as const,
  scheduledDays: () => [...shippingKeys.all, 'scheduled'] as const,
  scheduled: (shipDate: string) => [...shippingKeys.scheduledDays(), shipDate] as const,
  allLoads: () => [...shippingKeys.all, 'loads'] as const,
  loads: (truckId: number, shipDate: string) =>
    [...shippingKeys.allLoads(), truckId, shipDate] as const,
  packages: (order: string) => [...shippingKeys.all, 'packages', order] as const
}

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

const unscheduledPageSchema = z.object({
  count: z._default(z.number(), 0),
  results: z._default(z.array(unscheduledOrderSchema), [])
})

/**
 * The delivery orders still waiting for a ship date and a truck p3 (605,182). A long list — every open
 * delivery in EBMS — so it is read a page at a time, the page growing as the Manager asks for more.
 */
export const unscheduledQuery = (search: string, limit: number) =>
  queryOptions({
    queryKey: shippingKeys.unscheduled(search, limit),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      unscheduledPageSchema.parse(
        await authApi
          .get('shipping/unscheduled/', {
            searchParams: { limit, offset: 0, ...(search ? { search } : {}) }
          })
          .json()
      )
  })

const shipmentTotalsSchema = z.object({
  count: z._default(z.number(), 0),
  total_weight: z._default(z.number(), 0),
  longest_length: z._default(z.nullable(z.number()), null)
})

const NO_TOTALS = { count: 0, total_weight: 0, longest_length: null }

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
export const truckPanelsQuery = (orders: string[], shipDate: string | null) =>
  queryOptions({
    queryKey: shippingKeys.selection(orders, shipDate),
    enabled: !!shipDate && orders.length > 0,
    queryFn: async () =>
      z.array(truckPanelSchema).parse(
        await authApi
          .post('shipping/truck-panels/', {
            json: { orders, pickup_ids: [], ship_date: shipDate }
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
 * truck in Scheduled p3 (566,273). The server pushes the ship date to EBMS.
 */
export const useApplyShipping = (onSuccess: () => void) =>
  useMutation({
    meta: { errorTitle: 'The orders were not scheduled' },
    mutationFn: (input: { orders: string[]; shipDate: string; truckId: number }) =>
      authApi
        .post('shipping/apply/', {
          json: {
            orders: input.orders,
            pickup_ids: [],
            ship_date: input.shipDate,
            truck_id: input.truckId
          }
        })
        .json(),
    onSuccess: async (_, __, ___, { client }) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: [...shippingKeys.all, 'unscheduled'] }),
        client.invalidateQueries({ queryKey: shippingKeys.scheduledDays() })
      ])
      onSuccess()
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
  load_id: z.number(),
  name: z._default(z.string(), ''),
  marker: z._default(z.string(), ''),
  position: z._default(z.number(), 0),
  status: z._default(z.nullable(z.string()), null),
  weight: z._default(z.number(), 0),
  orders: z._default(z.array(assignmentSchema), []),
  is_empty: z._default(z.boolean(), false)
})

export type LoadTab = z.infer<typeof loadTabSchema>

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

/** Add To Load: the ticked orders go on the Load; `loadId` is the tab being filled. */
export const useAddToLoad = () =>
  useLoadPost(
    'The orders were not added to the Load',
    (input: { assignmentIds: number[]; loadId: number }) =>
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
