import * as z from 'zod/mini'

import { DEFAULT_DATE_VALUE } from './date'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSearchParams } from '@/hooks/use-search-params'

const SCHEDULE_TABS_OPTIONS = [
  {
    value: 'all',
    label: 'All'
  },
  {
    value: 'unscheduled',
    label: 'Unscheduled'
  },
  {
    value: 'scheduled',
    label: 'Scheduled'
  }
] as const

export const SCHEDULE_TABS_VALUES = SCHEDULE_TABS_OPTIONS.map(({ value }) => value)
type ScheduleFilterOption = (typeof SCHEDULE_TABS_VALUES)[number]

export const DEFAULT_SCHEDULE_VALUE = 'scheduled'

export const ScheduleParamSchema = z.catch(
  z.optional(z.enum(SCHEDULE_TABS_VALUES)),
  DEFAULT_SCHEDULE_VALUE
)

export const ScheduleFilter = () => {
  const [{ schedule = DEFAULT_SCHEDULE_VALUE, category, flow }, setSearchParams] = useSearchParams()

  const handleScheduleChange = (value: ScheduleFilterOption) => {
    setSearchParams({
      schedule: value,
      category: value === 'all' ? 'all' : category,
      flow: value === 'all' ? 'all' : flow,
      date: value === 'scheduled' ? DEFAULT_DATE_VALUE : undefined
    })
  }

  return (
    <Tabs
      value={schedule}
      onValueChange={(value) => handleScheduleChange(value as ScheduleFilterOption)}
    >
      <TabsList>
        {SCHEDULE_TABS_OPTIONS.map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
