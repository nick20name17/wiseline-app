import { authApi } from '@/api/client'
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  type QueryClient
} from '@tanstack/react-query'
import * as z from 'zod/mini'

/** Monday 1 to Sunday 7, as the server numbers weekdays. */
export const WEEKDAYS = [
  { day: 1, short: 'Mon', long: 'Monday' },
  { day: 2, short: 'Tue', long: 'Tuesday' },
  { day: 3, short: 'Wed', long: 'Wednesday' },
  { day: 4, short: 'Thu', long: 'Thursday' },
  { day: 5, short: 'Fri', long: 'Friday' },
  { day: 6, short: 'Sat', long: 'Saturday' },
  { day: 7, short: 'Sun', long: 'Sunday' }
] as const

const MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5]

const companySchema = z.object({
  // A profile saved before the work week existed answers without it; the server reads that as Mon–Fri.
  work_days: z.catch(z.array(z.int()), MONDAY_TO_FRIDAY)
})

const calendarDaySchema = z.object({
  date: z.string(),
  weekday: z.int(),
  is_work_day: z.boolean(),
  holiday: z.nullable(z.string()),
  working_day: z.nullable(z.string())
})

export type CalendarDay = z.infer<typeof calendarDaySchema>

/**
 * A date off though its weekday is worked (a holiday), or on though it is not (a working day). Both
 * lists answer the same shape; `kind` says which one a row came from.
 */
export type DayKind = 'holiday' | 'working_day'

export const KIND_LABELS: Record<DayKind, string> = {
  holiday: 'Holiday',
  working_day: 'Working day'
}

const exceptionSchema = z.object({
  id: z.number(),
  date: z.string(),
  name: z.string()
})

export type DayException = z.infer<typeof exceptionSchema> & { kind: DayKind }

export const exceptionPayloadSchema = z.object({
  date: z.string().check(z.minLength(1, 'Date is required')),
  name: z
    .string()
    .check(z.trim(), z.minLength(1, 'Name is required'), z.maxLength(255, 'At most 255 characters'))
})

export type ExceptionPayload = z.infer<typeof exceptionPayloadSchema>

const PATHS: Record<DayKind, string> = { holiday: 'holidays', working_day: 'working-days' }

export const workCalendarKeys = {
  all: ['work-calendar'] as const,
  week: () => [...workCalendarKeys.all, 'week'] as const,
  days: (year: number) => [...workCalendarKeys.all, 'days', { year }] as const,
  exceptions: (year: number) => [...workCalendarKeys.all, 'exceptions', { year }] as const
}

export const workWeekQuery = queryOptions({
  queryKey: workCalendarKeys.week(),
  queryFn: async () =>
    companySchema
      .parse(await authApi.get('profiles/company/').json())
      .work_days.toSorted((a, b) => a - b)
})

/** Every day of `year`, worked or not and why. */
export const calendarDaysQuery = (year: number) =>
  queryOptions({
    queryKey: workCalendarKeys.days(year),
    // Stepping to another year keeps the calendar where it is until that year's days are in.
    placeholderData: keepPreviousData,
    queryFn: async () =>
      z.array(calendarDaySchema).parse(
        await authApi
          .get('work-calendar/', {
            searchParams: { start: `${year}-01-01`, end: `${year}-12-31` }
          })
          .json()
      )
  })

/** The year's holidays and working days together, by date. */
export const exceptionsQuery = (year: number) =>
  queryOptions({
    queryKey: workCalendarKeys.exceptions(year),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const lists = await Promise.all(
        (Object.keys(PATHS) as DayKind[]).map(async kind =>
          z
            .array(exceptionSchema)
            .parse(await authApi.get(`${PATHS[kind]}/`, { searchParams: { year } }).json())
            .map(row => ({ ...row, kind }))
        )
      )
      return lists.flat().sort((a, b) => a.date.localeCompare(b.date))
    }
  })

/**
 * Which days are worked decides every department's strip, calendar and scheduling, queries other
 * features own. Those are not on screen here, so they are only marked stale and read again when a
 * board opens; this page's own are refetched. Refetching everything active also re-read the session
 * and the departments, which a work day does not touch.
 */
const invalidateDays = (client: QueryClient) => {
  void client.invalidateQueries({ refetchType: 'none' })
  return client.invalidateQueries({ queryKey: workCalendarKeys.all })
}

/** Admin only; the server refuses an empty week. */
export const useSaveWorkWeek = () =>
  useMutation({
    meta: { errorTitle: 'The work week was not saved' },
    mutationFn: (workDays: number[]) =>
      authApi.post('profiles/company/', { json: { work_days: workDays } }).json(),
    onSuccess: (_, __, ___, { client }) => invalidateDays(client)
  })

type DayToggle = { date: string; is_work_day: boolean; name?: string }

/**
 * One day worked or not. The server stores only what differs from the weekday: back to its weekday's
 * usual drops the holiday or working day, otherwise it becomes one, `name` or a default.
 */
export const useSetCalendarDay = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({ date, ...body }: DayToggle) =>
      authApi.put(`work-calendar/${date}/`, { json: body }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await invalidateDays(client)
      onSuccess()
    }
  })

export const useUpsertException = (onSuccess: () => void) =>
  useMutation({
    mutationFn: ({
      kind,
      id,
      payload
    }: {
      kind: DayKind
      id?: number
      payload: ExceptionPayload
    }) =>
      id
        ? authApi.patch(`${PATHS[kind]}/${id}/`, { json: payload }).json()
        : authApi.post(`${PATHS[kind]}/`, { json: payload }).json(),
    onSuccess: async (_, __, ___, { client }) => {
      await invalidateDays(client)
      onSuccess()
    }
  })

export const useDeleteException = () =>
  useMutation({
    mutationFn: ({ kind, id }: Pick<DayException, 'kind' | 'id'>) =>
      authApi.delete(`${PATHS[kind]}/${id}/`),
    onSuccess: (_, __, ___, { client }) => invalidateDays(client)
  })
