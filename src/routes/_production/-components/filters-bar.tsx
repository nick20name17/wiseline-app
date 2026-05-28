import { useSearch } from '@tanstack/react-router'

import { CutViewTabs } from './filters/cut-view'
import { getDefaultCategory } from '@/components/common/filters/category'
import { DateFilter } from '@/components/common/filters/date'
import { FlowsFilter } from '@/components/common/filters/flows'
import { DEFAULT_SCHEDULE_VALUE } from '@/components/common/filters/schedule'
import { WeekFilter } from '@/components/common/filters/week'
import { getVisibleFeatures } from '@/config/permissions/features'
import { useAuth } from '@/providers/auth'

export const ProductionFiltersBar = () => {
  const { user } = useAuth()
  const defaultCategory = getDefaultCategory(user)

  const {
    schedule = DEFAULT_SCHEDULE_VALUE,
    // flow = DEFAULT_FLOW,
    category = defaultCategory
  } = useSearch({
    from: '/_production/'
  })

  const visibleFeatures = getVisibleFeatures(user?.role ?? 'worker')

  return (
    <div className='flex items-center gap-3.5 not-has-[div]:hidden'>
      {schedule === 'scheduled' && visibleFeatures.has('dateFilter') ? <DateFilter /> : null}
      {schedule === 'scheduled' && visibleFeatures.has('weekFilter') ? <WeekFilter /> : null}
      {visibleFeatures.has('flowsFilter') ? <FlowsFilter /> : null}
      {category === 'wrapping' ? <CutViewTabs className='ml-auto' /> : null}
    </div>
  )
}
