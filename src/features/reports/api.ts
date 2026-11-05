import { authApi } from '@/api/client'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as z from 'zod/mini'
import type { MachineScope } from './lib/figures'
import type { Period } from './lib/period'

const departmentSchema = z.object({
  id: z.number(),
  name: z._default(z.string(), ''),
  code: z._default(z.string(), ''),
  position: z._default(z.nullable(z.number()), null),
  // lb; `null` is no ceiling. Trim's schema reads it too, and whichever fetches first fills the
  // shared cache, so every copy of this schema has to keep it.
  max_package_weight: z._default(z.nullable(z.number()), null)
})

export type Department = z.infer<typeof departmentSchema>

/** Same key and shape the boards use, so one copy of the departments is cached for all of them. */
export const departmentsQuery = queryOptions({
  queryKey: ['departments', 'all'] as const,
  queryFn: async () => z.array(departmentSchema).parse(await authApi.get('departments/all/').json())
})

const reportKeys = {
  all: ['reports'] as const,
  summary: (department: number, period: Period) =>
    [...reportKeys.all, 'summary', department, period.from, period.to] as const,
  spoiled: (department: number, period: Period) =>
    [...reportKeys.all, 'spoiled', department, period.from, period.to] as const,
  remakes: (department: number, period: Period, scope: MachineScope) =>
    [
      ...reportKeys.all,
      'remakes',
      department,
      period.from,
      period.to,
      scope === 'every' ? scope : scope.flowId
    ] as const
}

const countSchema = z.object({ times: z.number(), pieces: z.number() })

export type Count = z.infer<typeof countSchema>

const machineSummarySchema = z.object({
  // `null` gathers what came from no machine.
  flow_id: z.nullable(z.number()),
  machine: z._default(z.nullable(z.string()), null),
  spoiled: countSchema,
  remakes: countSchema
})

export type MachineSummary = z.infer<typeof machineSummarySchema>

/**
 * Per machine over the period: how often Stock was taken past the release figure (a spoiled part)
 * and how often a remake was asked for (Kevin's notes of 2026-11-02, N15). A spoiled part counts on
 * the machine the Stock change came from, a remake on the line's machine.
 */
export const summaryQuery = (departmentId: number | undefined, period: Period) =>
  queryOptions({
    queryKey: reportKeys.summary(departmentId ?? 0, period),
    enabled: departmentId !== undefined,
    // A new period keeps the old figures on screen until its own arrive, rather than a blank table.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      z
        .object({
          machines: z.array(machineSummarySchema),
          totals: z.object({ spoiled: countSchema, remakes: countSchema })
        })
        .parse(
          await authApi
            .get('spoiled-parts/summary/', {
              searchParams: {
                department_id: departmentId!,
                date_from: period.from,
                date_to: period.to
              }
            })
            .json()
        )
  })

const spoiledPartSchema = z.object({
  id: z.number(),
  order_number: z._default(z.nullable(z.string()), null),
  product_id: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  flow_id: z._default(z.nullable(z.number()), null),
  machine: z._default(z.nullable(z.string()), null),
  // The line's Stock before and after the change, and what it was at release.
  before: z._default(z.nullable(z.number()), null),
  after: z._default(z.nullable(z.number()), null),
  at_release: z._default(z.nullable(z.number()), null),
  spoiled: z._default(z.number(), 0),
  created_at: z._default(z.nullable(z.string()), null)
})

export type SpoiledPart = z.infer<typeof spoiledPartSchema>

/**
 * The department's spoiled parts over the period, newest first. One list for every machine, narrowed
 * on screen: a period's are few, and the server cannot ask for the ones with no machine.
 */
export const spoiledPartsQuery = (departmentId: number, period: Period) =>
  queryOptions({
    queryKey: reportKeys.spoiled(departmentId, period),
    queryFn: async () =>
      z.array(spoiledPartSchema).parse(
        await authApi
          .get('spoiled-parts/', {
            searchParams: {
              department_id: departmentId,
              date_from: period.from,
              date_to: period.to
            }
          })
          .json()
      )
  })

const remakeSchema = z.object({
  id: z.number(),
  order_number: z._default(z.nullable(z.string()), null),
  product_id: z._default(z.nullable(z.string()), null),
  description: z._default(z.nullable(z.string()), null),
  machine: z._default(z.nullable(z.string()), null),
  source: z._default(z.nullable(z.string()), null),
  remanufacturing_qty: z._default(z.nullable(z.number()), null),
  note: z._default(z.nullable(z.string()), null),
  status: z._default(z.nullable(z.string()), null),
  requested_by: z._default(z.nullable(z.string()), null),
  created_at: z._default(z.nullable(z.string()), null)
})

export type Remake = z.infer<typeof remakeSchema>

// A remake is an exception, not a queue: a period's fit one page.
const REMAKE_PAGE_SIZE = 500

/**
 * The department's remakes asked for over the period, on one machine or all. The server counts a
 * remake on the line's machine by the summary's own join, so a machine's list matches its figure.
 */
export const remakesQuery = (departmentId: number, period: Period, scope: MachineScope) =>
  queryOptions({
    queryKey: reportKeys.remakes(departmentId, period, scope),
    queryFn: async () =>
      z.object({ count: z.number(), results: z.array(remakeSchema) }).parse(
        await authApi
          .get('remanufacturings/', {
            searchParams: {
              department: departmentId,
              date_from: period.from,
              date_to: period.to,
              ...(scope === 'every'
                ? {}
                : scope.flowId === null
                  ? { flow_id__isnull: true }
                  : { flow_id: scope.flowId }),
              limit: REMAKE_PAGE_SIZE
            }
          })
          .json()
      )
  })
